import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { debug, error } from "./logger.js";

// アートワークURL → Discord CDN URLのキャッシュ
const cache = new Map();

/**
 * アートワークをDiscord Webhookにアップロードし、CDN URLを返す
 * - https:// URLはそのまま返す
 * - http:// URL（ローカル）やファイルパスはWebhook経由でアップロード
 * - 同じアートワークは再アップロードしない（キャッシュ）
 */
export async function resolveArtworkUrl(artwork, webhookUrl, xgdApiKey) {
  if (!artwork) return null;

  // 既にhttps://ならそのまま使える（ただしDiscord CDNは短縮が必要）
  const isDiscordCdn = artwork.startsWith("https://cdn.discordapp.com") ||
                       artwork.startsWith("https://media.discordapp.net");
  if (artwork.startsWith("https://") && !isDiscordCdn) return artwork;

  // キャッシュ確認
  if (cache.has(artwork)) {
    debug(`アートワークキャッシュヒット: ${artwork}`);
    return cache.get(artwork);
  }

  if (!webhookUrl) return null;

  try {
    debug(`アートワークをWebhookにアップロード中: ${artwork}`);
    const imageBuffer = await fetchImageBuffer(artwork);
    if (!imageBuffer) return null;

    const cdnUrl = await uploadToWebhook(webhookUrl, imageBuffer);
    if (!cdnUrl) return null;

    // x.gd でURL短縮してDiscord CDNのブロックを回避
    const finalUrl = xgdApiKey ? await shortenUrl(cdnUrl, xgdApiKey) : cdnUrl;
    const resultUrl = finalUrl || cdnUrl;

    debug(`アップロード成功: ${resultUrl}`);
    cache.set(artwork, resultUrl);
    return resultUrl;
  } catch (err) {
    error(`アートワークアップロード失敗: ${err.message}`);
    return null;
  }
}

async function shortenUrl(longUrl, apiKey) {
  try {
    const encoded = encodeURIComponent(longUrl);
    const res = await fetch(`https://xgd.io/V1/shorten?url=${encoded}&key=${apiKey}`);
    if (!res.ok) {
      error(`x.gd API エラー (${res.status})`);
      return null;
    }
    const json = await res.json();
    if (json.status === 200 && json.shorturl) {
      debug(`URL短縮成功: ${json.shorturl}`);
      return json.shorturl;
    }
    error(`x.gd 短縮失敗: ${json.message ?? json.status}`);
    return null;
  } catch (err) {
    error(`x.gd 短縮エラー: ${err.message}`);
    return null;
  }
}

async function fetchImageBuffer(source) {
  // ローカルHTTP URL (http://localhost:... など)
  if (source.startsWith("http://")) {
    const res = await fetch(source);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  // ファイルパス
  if (existsSync(source)) {
    return readFile(source);
  }

  return null;
}

async function uploadToWebhook(webhookUrl, imageBuffer) {
  // multipart/form-data を手動構築（Node 18 の fetch + Blob 対応）
  const boundary = "----ArtworkUpload" + Date.now();
  const filename = "artwork.png";

  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    "Content-Type: image/png",
    "",
  ].join("\r\n");

  const footer = `\r\n--${boundary}--\r\n`;

  const headerBuf = Buffer.from(header + "\r\n");
  const footerBuf = Buffer.from(footer);
  const body = Buffer.concat([headerBuf, imageBuffer, footerBuf]);

  const res = await fetch(webhookUrl + "?wait=true", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook POST失敗 (${res.status}): ${text}`);
  }

  const msg = await res.json();

  if (msg.attachments && msg.attachments.length > 0) {
    return msg.attachments[0].url;
  }

  return null;
}
