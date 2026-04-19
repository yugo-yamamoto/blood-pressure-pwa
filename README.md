# 血圧手帳 PWA (Blood Pressure Diary)

Gemini APIを活用した、シンプルでプライバシー重視の血圧管理PWAです。
カメラで血圧計のデジタル表示を撮影するだけで、AI（Gemini 2.5 Flash-Lite）が数値を自動的に読み取り、記録をサポートします。

## 🌟 主な機能

- **AI OCR 登録**: カメラで血圧計を撮影し、最高血圧・最低血圧・心拍数を自動抽出。
- **データ管理**: 端末内ストレージ（IndexedDB）にデータを保存。外部サーバーに血圧データは送信されません。
- **履歴一覧・編集**: 過去の記録を一覧表示し、タップして内容の修正や削除が可能。
- **推移グラフ**: 最高血圧と最低血圧の推移を視覚的に把握。
- **データポータビリティ**: 記録をCSV形式でダウンロード。また、CSVをアップロードすることで別の端末からのデータ移行も可能。
- **PWA対応**: ホーム画面に追加して、ネイティブアプリのように利用可能。

## 🚀 使い方

1. **GitHub Pages 等で公開したURLにアクセス**します。
2. **「設定」タブ**に移動し、ご自身の [Google AI Studio](https://aistudio.google.com/) で取得した **Gemini API キー**を入力・保存してください。
3. **「記録」タブ**の「カメラを起動する」ボタンから撮影を開始し、血圧計を撮影して数値を読み取ります。
4. 内容を確認し「保存する」ボタンを押すと記録が完了します。

## 🛠 技術スタック

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **AI/OCR**: [Gemini API](https://ai.google.dev/) (gemini-2.5-flash-lite)
- **Architecture**: PWA (Progressive Web App)

## 🔒 プライバシーについて

- 血圧データはブラウザ内の IndexedDB にのみ保存され、外部サーバーにアップロードされることはありません。
- Gemini API キーも端末内の localStorage に保存され、APIリクエスト時以外に外部へ送信されることはありません。

## 📄 ライセンス

MIT License
