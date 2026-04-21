import { readFileSync, writeFileSync, existsSync } from "fs";
import { createInterface } from "readline";
import { dirname, join, resolve } from "path";
import { connectNowPlaying, disconnectNowPlaying } from "./music.js";
import { connect, updatePresence, clearPresence, destroy } from "./discord.js";
import { runSetupWizard } from "./setup.js";
import { setVerbose, log, debug, error } from "./logger.js";

// exe実行時は process.execPath の隣、開発時は project root
async function getBaseDir() {
  if (process.pkg) {
    return dirname(process.execPath);
  }
  // ESM 開発時
  try {
    const url = import.meta.url;
    if (url) {
      const { fileURLToPath } = await import("url");
      return join(dirname(fileURLToPath(url)), "..");
    }
  } catch {
    // CJSバンドル時はimport.meta.urlが使えない
  }
  return resolve(".");
}

// エラー時にコンソールを開いたまま待機
function waitForKeyAndExit(code) {
  log("");
  log("Enterキーを押すと終了します...");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.once("line", () => {
    rl.close();
    process.exit(code);
  });
  // stdinが閉じられた場合（コンソール閉じ等）もそのまま終了
  rl.once("close", () => process.exit(code));
}

let config = {};
let lastTrackKey = null;

function formatTrack(track) {
  return track ? `${track.artist} - ${track.song}` : null;
}

async function onTrackChange(track) {
  const currentKey = formatTrack(track);
  if (currentKey === lastTrackKey) return;

  if (track) {
    log(`♪ ${track.artist} - ${track.song}`);
    debug(`アートワーク: ${track.artwork || 'なし'} / レーベル: ${track.label || 'なし'}`);
    await updatePresence({
      song: track.song,
      artist: track.artist,
      label: track.label,
      artwork: track.artwork,
      bpm: null,
      config,
    });
  } else {
    if (lastTrackKey) {
      log("再生停止 - ステータスをクリア");
    }
    await clearPresence();
  }

  lastTrackKey = currentKey;
}

async function main() {
  const baseDir = await getBaseDir();
  const configPath = join(baseDir, "config.json");

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  // verboseモードの初期化（config または --verbose フラグ）
  const verboseMode = config.verbose || process.argv.includes("--verbose");
  setVerbose(verboseMode);
  if (verboseMode) {
    log("[DEBUG] verboseモード有効");
  }

  // 初回起動時または未設定の場合、セットアップウィザードを実行
  if (!config.clientId || config.clientId === "YOUR_DISCORD_APPLICATION_ID") {
    config = await runSetupWizard(config);
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    log(`設定を保存しました: ${configPath}`);
    log("");
  }

  log("Discord Music Status を起動中...");

  try {
    await connect(config.clientId);
  } catch (err) {
    error("Discord への接続に失敗しました。Discordが起動しているか確認してください。");
    error(err.message);
    return waitForKeyAndExit(1);
  }

  try {
    await connectNowPlaying(config.nowPlayingOverlayUrl, onTrackChange);
  } catch (err) {
    error("Now Playing への接続に失敗しました。Now Playing が起動しているか確認してください。");
    error(err.message);
    return waitForKeyAndExit(1);
  }

  log("");
  log("トラック更新を待機中...");
  log("このウィンドウを閉じるとアプリが終了します。");
  log("");
}

// graceful shutdown（Ctrl+C / コンソール閉じ）
async function shutdown() {
  log("\n終了中...");
  disconnectNowPlaying();
  await clearPresence();
  await destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGHUP", shutdown);
process.on("SIGTERM", shutdown);

main();
