import { createInterface } from "readline";

function ask(rl, question, defaultValue) {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

export async function runSetupWizard(existingConfig) {
  console.log("");
  console.log("=".repeat(50));
  console.log("  Discord Music Status - 初期設定");
  console.log("=".repeat(50));
  console.log("");
  console.log("Discord Developer Portal でアプリケーションを作成し、");
  console.log("Application ID を取得してください。");
  console.log("https://discord.com/developers/applications");
  console.log("");
  console.log("x.gd APIキーはアートワークURLの短縮に使用します（任意）。");
  console.log("https://x.gd/api-register でAPIキーを取得できます。");
  console.log("");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const clientId = await ask(
      rl,
      "Discord Application ID",
      existingConfig?.clientId !== "YOUR_DISCORD_APPLICATION_ID"
        ? existingConfig?.clientId
        : undefined
    );

    if (!clientId) {
      console.error("Application ID は必須です。");
      process.exit(1);
    }

    const nowPlayingUrl = await ask(
      rl,
      "Now Playing オーバーレイURL",
      existingConfig?.nowPlayingOverlayUrl || "http://localhost:9000"
    );

    const webhookUrl = await ask(
      rl,
      "アートワーク用 Discord Webhook URL (空欄でスキップ)",
      existingConfig?.webhookUrl || ""
    );

    const xgdApiKey = await ask(
      rl,
      "x.gd APIキー (空欄でスキップ)",
      existingConfig?.xgdApiKey || ""
    );

    const largeImageKey = await ask(
      rl,
      "Rich Presence 大きい画像キー",
      existingConfig?.presence?.largeImageKey || "music"
    );

    const largeImageText = await ask(
      rl,
      "Rich Presence 大きい画像テキスト",
      existingConfig?.presence?.largeImageText || "Now Playing"
    );

    console.log("");
    console.log("設定内容:");
    console.log(`  Application ID: ${clientId}`);
    console.log(`  Now Playing URL: ${nowPlayingUrl}`);
    if (webhookUrl) console.log(`  Webhook URL: ${webhookUrl}`);
    if (xgdApiKey) console.log(`  x.gd APIキー: ${xgdApiKey}`);
    console.log(`  画像キー: ${largeImageKey}`);
    console.log("");

    const confirm = await ask(rl, "この設定で保存しますか? (Y/n)", "Y");
    if (confirm.toLowerCase() === "n") {
      console.log("設定をキャンセルしました。");
      process.exit(0);
    }

    return {
      clientId,
      nowPlayingOverlayUrl: nowPlayingUrl,
      webhookUrl: webhookUrl || "",
      xgdApiKey: xgdApiKey || "",
      presence: {
        largeImageKey,
        largeImageText,
        smallImageKey: existingConfig?.presence?.smallImageKey || "play",
        smallImageText: existingConfig?.presence?.smallImageText || "再生中",
      },
    };
  } finally {
    rl.close();
  }
}
