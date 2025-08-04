# ライフログ Chrome 拡張機能：実装資料

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術仕様](#技術仕様)
3. [ファイル構造](#ファイル構造)
4. [実装手順](#実装手順)
5. [セキュリティ考慮事項](#セキュリティ考慮事項)
6. [テスト戦略](#テスト戦略)
7. [デプロイメント](#デプロイメント)

## プロジェクト概要

### 目的

ユーザーの Web ブラウジング履歴を自動的に記録し、後から振り返りやすい形で表示する Chrome 拡張機能を開発します。

### 主要機能

- 閲覧履歴の自動記録
- 記録データの表示・検索・フィルタリング
- 統計情報の表示
- データのエクスポート・インポート
- メモ機能

## 技術仕様

### 開発環境

- **言語**: JavaScript (ES6+)
- **マニフェスト**: Manifest V3
- **ブラウザ**: Chrome 88+
- **パッケージマネージャー**: npm/yarn

### 使用技術

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **データベース**: Chrome Storage API (local/sync)
- **バックアップ**: IndexedDB (大量データ用)
- **UI フレームワーク**: バニラ JS + CSS Grid/Flexbox
- **ビルドツール**: Webpack/Vite (オプション)

### Chrome Extension API

```javascript
// 必要な権限
{
  "permissions": [
    "history",
    "tabs",
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

## ファイル構造

```
life-log-chrome-extension/
├── manifest.json                 # 拡張機能の設定ファイル
├── package.json                  # プロジェクト設定
├── src/
│   ├── background/
│   │   ├── background.js         # バックグラウンドスクリプト
│   │   ├── history-tracker.js    # 履歴追跡ロジック
│   │   └── data-manager.js       # データ管理ロジック
│   ├── popup/
│   │   ├── popup.html            # ポップアップUI
│   │   ├── popup.js              # ポップアップロジック
│   │   └── popup.css             # ポップアップスタイル
│   ├── options/
│   │   ├── options.html          # オプションページUI
│   │   ├── options.js            # オプションページロジック
│   │   └── options.css           # オプションページスタイル
│   ├── content/
│   │   └── content.js            # コンテンツスクリプト
│   ├── utils/
│   │   ├── storage.js            # ストレージ操作ユーティリティ
│   │   ├── date-utils.js         # 日付操作ユーティリティ
│   │   └── export-utils.js       # エクスポート機能ユーティリティ
│   └── components/
│       ├── history-list.js       # 履歴リストコンポーネント
│       ├── statistics.js         # 統計表示コンポーネント
│       └── search-filter.js      # 検索・フィルターコンポーネント
├── assets/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── images/
├── dist/                         # ビルド出力ディレクトリ
├── tests/                        # テストファイル
├── docs/                         # ドキュメント
└── README.md
```

## 実装手順

### Phase 1: 基盤構築 (1-2 週間)

#### 1.1 プロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir life-log-chrome-extension
cd life-log-chrome-extension

# package.json初期化
npm init -y

# 必要な依存関係インストール
npm install --save-dev webpack webpack-cli
npm install --save-dev @types/chrome
```

#### 1.2 マニフェストファイル作成

```json
{
  "manifest_version": 3,
  "name": "Life Log",
  "version": "1.0.0",
  "description": "Web browsing history logger for life review",
  "permissions": ["history", "tabs", "storage", "alarms", "notifications"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/background.js"
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

#### 1.3 データ構造定義

```javascript
// src/utils/data-structure.js
export const HistoryEntry = {
  id: String, // UUID
  url: String, // 完全なURL
  title: String, // ページタイトル
  domain: String, // ドメイン名
  timestamp: Date, // アクセス日時
  visitDuration: Number, // 滞在時間（秒）
  notes: String, // ユーザーメモ
  tags: Array, // タグ
  category: String, // カテゴリ
};

export const UserSettings = {
  autoRecord: Boolean, // 自動記録の有効/無効
  excludedDomains: Array, // 除外ドメイン
  retentionDays: Number, // データ保持期間
  exportFormat: String, // エクスポート形式
  notifications: Boolean, // 通知の有効/無効
};
```

### Phase 2: コア機能実装 (2-3 週間)

#### 2.1 バックグラウンドスクリプト

```javascript
// src/background/background.js
import { HistoryTracker } from "./history-tracker.js";
import { DataManager } from "./data-manager.js";

class BackgroundService {
  constructor() {
    this.historyTracker = new HistoryTracker();
    this.dataManager = new DataManager();
    this.init();
  }

  async init() {
    // 初期化処理
    await this.dataManager.initialize();
    this.historyTracker.startTracking();
    this.setupAlarms();
  }

  setupAlarms() {
    // 定期的なデータ整理
    chrome.alarms.create("dataCleanup", { periodInMinutes: 1440 }); // 24時間
  }
}

new BackgroundService();
```

#### 2.2 履歴追跡機能

```javascript
// src/background/history-tracker.js
export class HistoryTracker {
  constructor() {
    this.currentTab = null;
    this.visitStartTime = null;
  }

  startTracking() {
    chrome.history.onVisited.addListener(this.handleHistoryVisit.bind(this));
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
  }

  async handleHistoryVisit(historyItem) {
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
    // ドメイン分類ロジック
    if (domain.includes("google.com")) return "search";
    if (domain.includes("youtube.com")) return "entertainment";
    if (domain.includes("github.com")) return "development";
    return "general";
  }
}
```

#### 2.3 データ管理機能

```javascript
// src/background/data-manager.js
export class DataManager {
  constructor() {
    this.storage = chrome.storage.local;
  }

  async initialize() {
    // 初期設定の確認・作成
    const settings = await this.getSettings();
    if (!settings) {
      await this.createDefaultSettings();
    }
  }

  async saveHistoryEntry(entry) {
    const key = `history_${entry.id}`;
    await this.storage.set({ [key]: entry });

    // 統計データの更新
    await this.updateStatistics(entry);
  }

  async getHistoryEntries(filters = {}) {
    const entries = [];
    const data = await this.storage.get(null);

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("history_")) {
        if (this.matchesFilters(value, filters)) {
          entries.push(value);
        }
      }
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  async updateStatistics(entry) {
    const stats = await this.getStatistics();
    const date = new Date(entry.timestamp).toDateString();

    if (!stats.dailyVisits[date]) {
      stats.dailyVisits[date] = {};
    }

    if (!stats.dailyVisits[date][entry.domain]) {
      stats.dailyVisits[date][entry.domain] = 0;
    }

    stats.dailyVisits[date][entry.domain]++;
    await this.storage.set({ statistics: stats });
  }
}
```

### Phase 3: UI 実装 (2-3 週間)

#### 3.1 ポップアップ UI

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

      <div class="search-section">
        <input type="text" id="search-input" placeholder="Search history..." />
        <select id="filter-category">
          <option value="">All categories</option>
          <option value="search">Search</option>
          <option value="entertainment">Entertainment</option>
          <option value="development">Development</option>
        </select>
      </div>

      <div class="history-list" id="history-list">
        <!-- 履歴エントリが動的に追加される -->
      </div>

      <footer class="popup-footer">
        <button id="view-all">View All</button>
        <button id="export-data">Export</button>
      </footer>
    </div>

    <script src="popup.js"></script>
  </body>
</html>
```

#### 3.2 ポップアップロジック

```javascript
// src/popup/popup.js
import { HistoryList } from "../components/history-list.js";
import { Statistics } from "../components/statistics.js";

class PopupController {
  constructor() {
    this.historyList = new HistoryList();
    this.statistics = new Statistics();
    this.init();
  }

  async init() {
    await this.loadQuickStats();
    await this.loadRecentHistory();
    this.setupEventListeners();
  }

  async loadQuickStats() {
    const today = new Date().toDateString();
    const stats = await this.getStatistics();
    const todayCount = stats.dailyVisits[today]
      ? Object.values(stats.dailyVisits[today]).reduce((a, b) => a + b, 0)
      : 0;

    document.getElementById("today-count").textContent = todayCount;
  }

  async loadRecentHistory() {
    const entries = await this.getHistoryEntries({ limit: 10 });
    this.historyList.render(entries);
  }

  setupEventListeners() {
    document
      .getElementById("search-input")
      .addEventListener("input", this.handleSearch.bind(this));

    document
      .getElementById("filter-category")
      .addEventListener("change", this.handleFilter.bind(this));

    document
      .getElementById("view-all")
      .addEventListener("click", () =>
        chrome.tabs.create({ url: "src/options/options.html" })
      );

    document
      .getElementById("export-data")
      .addEventListener("click", this.handleExport.bind(this));
  }
}

new PopupController();
```

### Phase 4: オプションページ実装 (1-2 週間)

#### 4.1 オプションページ UI

```html
<!-- src/options/options.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="options.css" />
  </head>
  <body>
    <div class="options-container">
      <header>
        <h1>Life Log Settings</h1>
      </header>

      <nav class="options-nav">
        <button class="nav-btn active" data-tab="general">General</button>
        <button class="nav-btn" data-tab="history">History</button>
        <button class="nav-btn" data-tab="export">Export</button>
        <button class="nav-btn" data-tab="privacy">Privacy</button>
      </nav>

      <main class="options-content">
        <!-- タブコンテンツが動的に切り替わる -->
      </main>
    </div>

    <script src="options.js"></script>
  </body>
</html>
```

### Phase 5: 高度な機能実装 (1-2 週間)

#### 5.1 エクスポート機能

```javascript
// src/utils/export-utils.js
export class ExportManager {
  async exportToCSV(entries) {
    const headers = [
      "Date",
      "Time",
      "Title",
      "URL",
      "Domain",
      "Category",
      "Notes",
    ];
    const csvContent = [
      headers.join(","),
      ...entries.map((entry) =>
        [
          new Date(entry.timestamp).toLocaleDateString(),
          new Date(entry.timestamp).toLocaleTimeString(),
          `"${entry.title}"`,
          entry.url,
          entry.domain,
          entry.category,
          `"${entry.notes}"`,
        ].join(",")
      ),
    ].join("\n");

    return this.downloadFile(csvContent, "life-log.csv", "text/csv");
  }

  async exportToJSON(entries) {
    const jsonContent = JSON.stringify(entries, null, 2);
    return this.downloadFile(jsonContent, "life-log.json", "application/json");
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });
  }
}
```

#### 5.2 統計機能

```javascript
// src/components/statistics.js
export class Statistics {
  async generateDailyStats() {
    const entries = await this.getHistoryEntries();
    const stats = {
      totalVisits: entries.length,
      uniqueDomains: new Set(entries.map((e) => e.domain)).size,
      topDomains: this.getTopDomains(entries),
      categoryBreakdown: this.getCategoryBreakdown(entries),
      timeDistribution: this.getTimeDistribution(entries),
    };

    return stats;
  }

  getTopDomains(entries) {
    const domainCount = {};
    entries.forEach((entry) => {
      domainCount[entry.domain] = (domainCount[entry.domain] || 0) + 1;
    });

    return Object.entries(domainCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }
}
```

## セキュリティ考慮事項

### データ保護

1. **ローカルストレージ**: すべてのデータはローカルに保存
2. **暗号化**: 機密データの暗号化検討
3. **最小権限**: 必要最小限の権限のみ要求
4. **データ削除**: ユーザーによる完全データ削除機能

### プライバシー保護

1. **透明性**: データ収集の明確な説明
2. **同意**: ユーザーの明示的同意
3. **制御**: ユーザーによる記録制御
4. **匿名化**: 必要に応じたデータ匿名化

## テスト戦略

### 単体テスト

```javascript
// tests/history-tracker.test.js
import { HistoryTracker } from "../src/background/history-tracker.js";

describe("HistoryTracker", () => {
  test("should extract domain correctly", () => {
    const tracker = new HistoryTracker();
    expect(tracker.extractDomain("https://www.google.com/search")).toBe(
      "www.google.com"
    );
  });
});
```

### 統合テスト

- Chrome 拡張機能の動作テスト
- データ永続化テスト
- UI 操作テスト

### パフォーマンステスト

- 大量データ処理テスト
- メモリ使用量テスト
- レスポンス時間テスト

## デプロイメント

### 開発環境

1. Chrome 拡張機能の開発者モード有効化
2. `chrome://extensions/`で拡張機能を読み込み
3. ホットリロード設定

### 本番環境

1. Chrome Web Store 用パッケージ作成
2. プライバシーポリシー作成
3. ストア登録申請

### 配布方法

1. **Chrome Web Store**: 公式配布
2. **GitHub Releases**: 開発版配布
3. **手動インストール**: 開発者向け

## 今後の拡張計画

### 短期目標 (1-3 ヶ月)

- 基本的な履歴記録・表示機能
- 検索・フィルター機能
- データエクスポート機能

### 中期目標 (3-6 ヶ月)

- 統計・分析機能の強化
- カテゴリ自動分類の改善
- メモ・タグ機能の充実

### 長期目標 (6 ヶ月以上)

- AI による行動分析
- 他ブラウザ対応
- クラウド同期機能

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/tut_best_practices/)
