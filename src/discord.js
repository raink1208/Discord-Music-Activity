import RPC from "discord-rpc";
import { resolveArtworkUrl } from "./artwork.js";
import { log, debug, error } from "./logger.js";

/**
 * {SONG}, {ARTIST}, {LABEL}, {BPM} を実際の値に置換する
 * 値が空の場合は空文字列になる
 */
function formatText(template, { song, artist, label, bpm }) {
  return template
    .replace(/\{SONG\}/g, song || "")
    .replace(/\{ARTIST\}/g, artist || "")
    .replace(/\{LABEL\}/g, label || "")
    .replace(/\{BPM\}/g, bpm ? String(bpm) : "");
}

let client = null;
let connected = false;

export async function connect(clientId) {
  client = new RPC.Client({ transport: "ipc" });

  client.on("ready", () => {
    log(`Discord RPC 接続完了: ${client.user.username}`);
    connected = true;
  });

  client.on("disconnected", () => {
    log("Discord RPC 切断されました");
    connected = false;
  });

  await client.login({ clientId });
}

export async function updatePresence({ song, artist, label, artwork, bpm, config }) {
  if (!client || !connected) return;

  // Webhook経由でアートワークをDiscord CDNにアップロードし、x.gdで短縮
  const resolvedArtwork = await resolveArtworkUrl(artwork, config.webhookUrl, config.xgdApiKey);

  debug(`プレゼンス更新: ${song} / ${artist}`);
  debug(`アートワーク URL: ${resolvedArtwork || '(none)'}`);

  const assets = {
    large_image: resolvedArtwork,
  };

  // BPMやレーベル情報があればlarge_textに追加
  const extra = [label, bpm ? `${bpm} BPM` : null].filter(Boolean).join(" | ");
  if (extra) {
    assets.large_text = extra;
  }

  const vars = { song, artist, label, bpm };
  const nameText    = formatText(config.presence.nameFormat    || "{SONG}",            vars);
  const detailsText = formatText(config.presence.detailsFormat || "🎵 {SONG}",         vars);
  const stateText   = formatText(config.presence.stateFormat   || "🎤 {ARTIST}",       vars);

  await client.request("SET_ACTIVITY", {
    pid: process.pid,
    activity: {
      type: 2,
      name: nameText,
      details: detailsText,
      state: stateText,
      assets,
      instance: false,
    },
  });
}

export async function clearPresence() {
  if (!client || !connected) return;
  await client.clearActivity();
}

export function isConnected() {
  return connected;
}

export async function destroy() {
  if (client) {
    await client.destroy();
    connected = false;
  }
}
