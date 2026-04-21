import RPC from "discord-rpc";
import { resolveArtworkUrl } from "./artwork.js";
import { log, debug, error } from "./logger.js";

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
  const largeImage = resolvedArtwork || config.presence.largeImageKey;

  debug(`プレゼンス更新: ${song} / ${artist}`);
  debug(`アートワーク URL: ${resolvedArtwork || '(none)'}`);

  const assets = {
    large_image: resolvedArtwork,
    large_text: config.presence.largeImageText,
    small_image: config.presence.smallImageKey,
    small_text: config.presence.smallImageText,
  };

  // BPMやレーベル情報があればlarge_textに追加
  const extra = [label, bpm ? `${bpm} BPM` : null].filter(Boolean).join(" | ");
  if (extra) {
    assets.large_text = extra;
  }

  await client.request("SET_ACTIVITY", {
    pid: process.pid,
    activity: {
      type: 2,
      name: song,
      details: `🎵 ${song}`,
      state: `🎤 ${artist}`,
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
