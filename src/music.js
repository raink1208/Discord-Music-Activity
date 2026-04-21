import { io } from "socket.io-client";
import { randomUUID } from "crypto";
import { log, debug } from "./logger.js";

const SERVICE = "NowPlayingTrackReceivers";

let socket = null;
let currentTrack = null;
let onTrackChange = null;

/**
 * Now Playing App の Socket.IO サーバーに接続し、
 * リアルタイムでトラック更新を受け取る
 */
export async function connectNowPlaying(overlayUrl, callback) {
  onTrackChange = callback;

  // Now Playing の設定から接続先を決定
  let socketUrl = overlayUrl;
  try {
    const config = await fetchJson(`${overlayUrl}/config`);
    if (config && config.appType === "streaming" && config.nowPlayingRemote) {
      const { address, port } = config.nowPlayingRemote;
      socketUrl = `http://${address}:${port}`;
    }
  } catch {
    // デフォルトのoverlayUrlに接続
  }

  return new Promise((resolve, reject) => {
    socket = io(socketUrl, { reconnection: true });

    socket.on("connect", () => {
      log(`Now Playing に接続しました (${socket.id})`);
      debug(`接続先 URL: ${socketUrl}`);
      socket.emit("id", SERVICE);
      // 現在のトラック情報を取得
      requestCurrentTrack();
      resolve();
    });

    socket.on("connect_error", (err) => {
      reject(new Error(`Now Playing への接続に失敗: ${err.message}`));
    });

    socket.on("disconnect", () => {
      log("Now Playing から切断されました");
    });

    socket.on("trackUpdate", (data) => {
      debug(`trackUpdate 受信: ${JSON.stringify(data?.args?.[0]?.title)}`);
      handleTrackUpdate(data.args[0]);
    });

    socket.on("animate", (data) => {
      debug(`animate 受信: ${JSON.stringify(data?.args?.[0]?.title)}`);
      handleTrackUpdate(data.args[0]);
    });

    socket.on("reload", () => {
      // 再接続時に現在のトラックを再取得
      requestCurrentTrack();
    });
  });
}

function requestCurrentTrack() {
  const responseId = randomUUID();
  socket.once(responseId, (data) => {
    if (data && data.result) {
      handleTrackUpdate(data.result);
    }
  });
  socket.emit("service-call", {
    from: SERVICE,
    to: "NowPlayingHistory",
    fn: "getCurrentTrack",
    args: [],
    responseId,
  });
}

function handleTrackUpdate(track) {
  if (!track || !track.title || !track.artist) {
    currentTrack = null;
  } else {
    currentTrack = {
      song: track.title,
      artist: track.artist,
      label: track.label || null,
      artwork: track.artwork || null,
    };
  }
  if (onTrackChange) {
    onTrackChange(currentTrack);
  }
}

export function getCurrentTrack() {
  return currentTrack;
}

export function disconnectNowPlaying() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) return null;
    return res.json();
  });
}
