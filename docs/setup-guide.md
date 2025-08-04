# ライフログ Chrome 拡張機能：セットアップガイド

## 前提条件

- Node.js 16.0 以上
- Chrome 88 以上
- Git

## 1. プロジェクト初期化

### 1.1 プロジェクトディレクトリの作成

```bash
# プロジェクトディレクトリに移動
cd life-log-chrome-extension

# package.jsonの初期化
npm init -y
```

### 1.2 必要な依存関係のインストール

```bash
# 開発依存関係
npm install --save-dev webpack webpack-cli webpack-dev-server
npm install --save-dev @types/chrome
npm install --save-dev jest @types/jest
npm install --save-dev eslint prettier

# 本番依存関係（必要に応じて）
npm install uuid
npm install date-fns
```

### 1.3 package.json の設定

```json
{
  "name": "life-log-chrome-extension",
  "version": "1.0.0",
  "description": "Web browsing history logger for life review",
  "main": "src/background/background.js",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.{js,html,css}"
  },
  "keywords": ["chrome-extension", "life-log", "history"],
  "author": "Your Name",
  "license": "MIT"
}
```

## 2. プロジェクト構造の作成

### 2.1 ディレクトリ構造の作成

```bash
# メインディレクトリの作成
mkdir -p src/{background,popup,options,content,utils,components}
mkdir -p assets/{icons,images}
mkdir -p dist
mkdir -p tests
```

### 2.2 基本ファイルの作成

```bash
# マニフェストファイル
touch manifest.json

# バックグラウンドスクリプト
touch src/background/background.js
touch src/background/history-tracker.js
touch src/background/data-manager.js

# ポップアップファイル
touch src/popup/popup.html
touch src/popup/popup.js
touch src/popup/popup.css

# オプションページファイル
touch src/options/options.html
touch src/options/options.js
touch src/options/options.css

# ユーティリティファイル
touch src/utils/storage.js
touch src/utils/date-utils.js
touch src/utils/export-utils.js

# コンポーネントファイル
touch src/components/history-list.js
touch src/components/statistics.js
touch src/components/search-filter.js
```

## 3. 開発環境の設定

### 3.1 Webpack 設定

```javascript
// webpack.config.js
const path = require("path");

module.exports = {
  entry: {
    background: "./src/background/background.js",
    popup: "./src/popup/popup.js",
    options: "./src/options/options.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 9000,
  },
};
```

### 3.2 ESLint 設定

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": "warn",
    "no-console": "warn",
  },
};
```

### 3.3 Prettier 設定

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 4. Chrome 拡張機能の開発者モード設定

### 4.1 Chrome 拡張機能の有効化

1. Chrome ブラウザで `chrome://extensions/` にアクセス
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトのルートディレクトリを選択

### 4.2 ホットリロードの設定

```javascript
// src/background/background.js に追加
if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
  });
}
```

## 5. 基本的なマニフェストファイルの作成

```json
{
  "manifest_version": 3,
  "name": "Life Log",
  "version": "1.0.0",
  "description": "Web browsing history logger for life review",
  "permissions": ["history", "tabs", "storage", "alarms", "notifications"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_title": "Life Log"
  },
  "options_page": "src/options/options.html",
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

## 6. 基本的なポップアップの作成

### 6.1 HTML ファイル

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div class="popup-container">
      <header class="popup-header">
        <h1>Life Log</h1>
        <div class="quick-stats">
          <span id="today-count">0</span> visits today
        </div>
      </header>

      <div class="history-list" id="history-list">
        <!-- 履歴エントリが動的に追加される -->
      </div>

      <footer class="popup-footer">
        <button id="view-all">View All</button>
        <button id="export-data">Export</button>
      </footer>
    </div>

    <script src="../dist/popup.js"></script>
  </body>
</html>
```

### 6.2 CSS ファイル

```css
/* src/popup/popup.css */
body {
  width: 400px;
  min-height: 300px;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.quick-stats {
  font-size: 12px;
  color: #666;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

button:hover {
  background-color: #0056b3;
}
```

### 6.3 JavaScript ファイル

```javascript
// src/popup/popup.js
class PopupController {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadQuickStats();
    await this.loadRecentHistory();
    this.setupEventListeners();
  }

  async loadQuickStats() {
    try {
      const data = await chrome.storage.local.get("statistics");
      const stats = data.statistics || { dailyVisits: {} };
      const today = new Date().toDateString();
      const todayCount = stats.dailyVisits[today]
        ? Object.values(stats.dailyVisits[today]).reduce((a, b) => a + b, 0)
        : 0;

      document.getElementById("today-count").textContent = todayCount;
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async loadRecentHistory() {
    try {
      const data = await chrome.storage.local.get(null);
      const entries = [];

      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("history_")) {
          entries.push(value);
        }
      }

      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.renderHistoryList(entries.slice(0, 5));
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }

  renderHistoryList(entries) {
    const container = document.getElementById("history-list");
    container.innerHTML = "";

    if (entries.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">No history yet</p>';
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div class="history-title">${entry.title}</div>
        <div class="history-domain">${entry.domain}</div>
        <div class="history-time">${new Date(
          entry.timestamp
        ).toLocaleTimeString()}</div>
      `;
      container.appendChild(item);
    });
  }

  setupEventListeners() {
    document.getElementById("view-all").addEventListener("click", () => {
      chrome.tabs.create({ url: "src/options/options.html" });
    });

    document.getElementById("export-data").addEventListener("click", () => {
      this.handleExport();
    });
  }

  async handleExport() {
    try {
      const data = await chrome.storage.local.get(null);
      const entries = [];

      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("history_")) {
          entries.push(value);
        }
      }

      const csvContent = this.convertToCSV(entries);
      this.downloadCSV(csvContent, "life-log.csv");
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  }

  convertToCSV(entries) {
    const headers = ["Date", "Time", "Title", "URL", "Domain"];
    const csvContent = [
      headers.join(","),
      ...entries.map((entry) =>
        [
          new Date(entry.timestamp).toLocaleDateString(),
          new Date(entry.timestamp).toLocaleTimeString(),
          `"${entry.title}"`,
          entry.url,
          entry.domain,
        ].join(",")
      ),
    ].join("\n");

    return csvContent;
  }

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });
  }
}

// ポップアップの初期化
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
```

## 7. 基本的なバックグラウンドスクリプトの作成

```javascript
// src/background/background.js
class BackgroundService {
  constructor() {
    this.init();
  }

  async init() {
    console.log("Life Log extension initialized");
    this.setupEventListeners();
    await this.initializeStorage();
  }

  setupEventListeners() {
    // 履歴の変更を監視
    chrome.history.onVisited.addListener(this.handleHistoryVisit.bind(this));

    // タブの変更を監視
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));

    // 拡張機能のインストール/更新時の処理
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
  }

  async handleHistoryVisit(historyItem) {
    try {
      const entry = {
        id: this.generateUUID(),
        url: historyItem.url,
        title: historyItem.title,
        domain: this.extractDomain(historyItem.url),
        timestamp: new Date(historyItem.lastVisitTime),
        visitDuration: 0,
        notes: "",
        tags: [],
        category: this.categorizeDomain(historyItem.url),
      };

      await this.saveHistoryEntry(entry);
      await this.updateStatistics(entry);
    } catch (error) {
      console.error("Error handling history visit:", error);
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  categorizeDomain(url) {
    const domain = this.extractDomain(url);
    if (domain.includes("google.com")) return "search";
    if (domain.includes("youtube.com")) return "entertainment";
    if (domain.includes("github.com")) return "development";
    return "general";
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  async saveHistoryEntry(entry) {
    const key = `history_${entry.id}`;
    await chrome.storage.local.set({ [key]: entry });
  }

  async updateStatistics(entry) {
    const data = await chrome.storage.local.get("statistics");
    const stats = data.statistics || { dailyVisits: {} };
    const date = new Date(entry.timestamp).toDateString();

    if (!stats.dailyVisits[date]) {
      stats.dailyVisits[date] = {};
    }

    if (!stats.dailyVisits[date][entry.domain]) {
      stats.dailyVisits[date][entry.domain] = 0;
    }

    stats.dailyVisits[date][entry.domain]++;
    await chrome.storage.local.set({ statistics: stats });
  }

  async initializeStorage() {
    const data = await chrome.storage.local.get(["settings", "statistics"]);

    if (!data.settings) {
      const defaultSettings = {
        autoRecord: true,
        excludedDomains: [],
        retentionDays: 365,
        exportFormat: "csv",
        notifications: false,
      };
      await chrome.storage.local.set({ settings: defaultSettings });
    }

    if (!data.statistics) {
      await chrome.storage.local.set({ statistics: { dailyVisits: {} } });
    }
  }

  handleInstalled(details) {
    console.log("Extension installed/updated:", details.reason);
  }

  handleTabActivated(activeInfo) {
    // タブがアクティブになった時の処理
    console.log("Tab activated:", activeInfo.tabId);
  }

  handleTabUpdated(tabId, changeInfo, tab) {
    // タブが更新された時の処理
    if (changeInfo.status === "complete") {
      console.log("Tab updated:", tabId, tab.url);
    }
  }
}

// バックグラウンドサービスの初期化
new BackgroundService();
```

## 8. 開発とテスト

### 8.1 開発サーバーの起動

```bash
# 開発モードでビルド（ファイル監視）
npm run dev

# または本番ビルド
npm run build
```

### 8.2 テストの実行

```bash
# テストの実行
npm test

# リントの実行
npm run lint

# コードフォーマット
npm run format
```

### 8.3 Chrome 拡張機能の再読み込み

1. `chrome://extensions/` にアクセス
2. 拡張機能の「更新」ボタンをクリック
3. または、拡張機能を無効化してから再度有効化

## 9. デバッグ

### 9.1 バックグラウンドスクリプトのデバッグ

1. `chrome://extensions/` で拡張機能の「詳細」をクリック
2. 「バックグラウンドページを検証」をクリック
3. 開発者ツールが開き、コンソールログを確認可能

### 9.2 ポップアップのデバッグ

1. 拡張機能のアイコンを右クリック
2. 「要素を検証」をクリック
3. ポップアップの開発者ツールが開く

### 9.3 オプションページのデバッグ

1. 拡張機能の「オプション」をクリック
2. オプションページで F12 を押す
3. 開発者ツールが開く

## 10. 次のステップ

1. **基本機能の実装**: 履歴記録、表示、検索機能
2. **UI/UX の改善**: より使いやすいインターフェース
3. **統計機能の追加**: 詳細な分析機能
4. **エクスポート機能の強化**: より多くの形式に対応
5. **テストの追加**: 単体テスト、統合テスト
6. **パフォーマンスの最適化**: 大量データの処理改善

## トラブルシューティング

### よくある問題

1. **拡張機能が読み込まれない**

   - マニフェストファイルの構文エラーを確認
   - 必要なファイルが存在するか確認

2. **権限エラー**

   - manifest.json の permissions を確認
   - Chrome 拡張機能の権限設定を確認

3. **ストレージエラー**

   - chrome.storage API の使用方法を確認
   - 非同期処理の適切な実装を確認

4. **ビルドエラー**
   - Node.js のバージョンを確認
   - 依存関係のインストールを確認
