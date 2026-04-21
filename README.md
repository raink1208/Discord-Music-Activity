# Discord Music Status

Now Playing App (https://www.nowplayingapp.com/) で再生中の楽曲情報を
Discord Rich Presenceに表示するアプリです。

## セットアップ

### かんたん（exe版 - Node.js不要）

1. [Releases](https://github.com/raink1208/Discord-Music-Activity/releases) から `DiscordMusicActivity.exe` をダウンロード
2. ダブルクリックで起動
3. 初回は対話形式で設定が始まります（Discord Application ID・Webhook URL などを入力）
4. 設定は `config.json` として exe の隣に自動保存されます

### 開発者向け（ソースから実行）

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックしてアプリケーションを作成
3. アプリケーション名を入力（例: `Music Status`）
4. **Application ID** をコピー

### 2. Rich Presence アセットの設定（任意）

1. Developer Portal のアプリケーション設定 → 「Rich Presence」→「Art Assets」
2. 画像をアップロード（例: `music` という名前でアイコンをアップロード）
3. セットアップウィザードまたは `config.json` の `presence.largeImageKey` をアップロードした画像名に合わせる

### 3. アートワーク表示の設定（任意）

Now Playing が取得したアルバムアートを Discord に表示するには、Discord Webhook を使います。

1. Discord のテキストチャンネル設定 → 「連携サービス」→「ウェブフック」→「新しいウェブフック」
2. ウェブフック URL をコピー
3. セットアップウィザードまたは `config.json` の `webhookUrl` に貼り付け
4. （任意）[x.gd](https://xgd.io/) の API キーを取得し `xgdApiKey` に設定すると、URL が短縮されより安定して表示されます

### 4. Now Playing App の設定

1. Now Playing アプリを起動
2. オーバーレイURL（デフォルト: `http://localhost:9000`）を確認
3. 2台構成（DJ PC + 配信PC）の場合は、リモートアドレスの設定も確認

### 5. 設定

`config.json` を編集：

```json
{
  "clientId": "ここにApplication IDを貼り付け",
  "nowPlayingOverlayUrl": "http://localhost:9000",
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "xgdApiKey": "（任意）x.gd APIキー",
  "verbose": false,
  "presence": {
    "largeImageKey": "music",
    "largeImageText": "Now Playing",
    "smallImageKey": "play",
    "smallImageText": "再生中"
  }
}
```

初回起動時はセットアップウィザードが自動で起動し、対話形式で設定できます（`clientId`・`nowPlayingOverlayUrl`・`webhookUrl`・画像キーを入力）。

### 6. インストール & 実行

```bash
npm install
npm start
```

### ビルド（exe 生成）

```bash
npm run package
```

`dist/DiscordMusicActivity.exe` が生成されます。

## 動作の仕組み

1. Now Playing App がDJソフト/ハードウェアから楽曲情報を取得
2. 本アプリが Socket.IO で Now Playing に直接接続
3. トラック変更イベント（`trackUpdate` / `animate`）をリアルタイムで受信
4. アートワーク画像を Discord Webhook 経由でアップロードし CDN URL を取得（`webhookUrl` 設定時）
5. Discord Rich Presence を即時更新（ポーリング不要）

## 取得できる情報

| 情報 | Rich Presence での表示箇所 |
|------|---------------------------|
| 曲名 (`title`) | details 行 |
| アーティスト (`artist`) | state 行 |
| レーベル (`label`) | 大きい画像のツールチップ |
| アートワーク (`artwork`) | 大きい画像（`webhookUrl` 設定時）|

## 必要環境

### exe 版
- Windows 10/11
- Discord デスクトップアプリ（起動中であること）
- Now Playing App（オーバーレイ起動中であること）
- 対応DJソフト / ハードウェア（Rekordbox, Traktor, Serato, Pioneer CDJ 等）

### ソースから実行する場合
- 上記に加えて Node.js 18+

## 設定項目

| キー | 説明 | デフォルト |
|------|------|-----------|
| `clientId` | Discord Application ID | (必須) |
| `nowPlayingOverlayUrl` | Now Playing オーバーレイURL | `http://localhost:9000` |
| `webhookUrl` | アートワーク用 Discord Webhook URL | (任意) |
| `xgdApiKey` | x.gd URL短縮 API キー | (任意) |
| `verbose` | デバッグログを出力する | `false` |
| `presence.largeImageKey` | 大きい画像のアセット名（アートワークなし時） | `music` |
| `presence.largeImageText` | 大きい画像のツールチップ | `Now Playing` |
| `presence.smallImageKey` | 小さい画像のアセット名 | `play` |
| `presence.smallImageText` | 小さい画像のツールチップ | `再生中` |
