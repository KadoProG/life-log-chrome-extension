// Life Log Popup Script
class LifeLogPopup {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Life Log Popup initialized');
    
    // DOM要素の取得
    this.elements = {
      loggingToggle: document.getElementById('loggingToggle'),
      todayCount: document.getElementById('todayCount'),
      totalCount: document.getElementById('totalCount'),
      historyList: document.getElementById('historyList'),
      viewAllBtn: document.getElementById('viewAllBtn'),
      optionsBtn: document.getElementById('optionsBtn')
    };

    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 初期データの読み込み
    await this.loadData();
  }

  setupEventListeners() {
    // ログ記録のトグル
    this.elements.loggingToggle.addEventListener('change', (e) => {
      this.toggleLogging(e.target.checked);
    });

    // ボタンクリックイベント
    this.elements.viewAllBtn.addEventListener('click', () => {
      this.openOptionsPage();
    });

    this.elements.optionsBtn.addEventListener('click', () => {
      this.openOptionsPage();
    });
  }

  async loadData() {
    try {
      // 統計データの取得
      const statsResponse = await this.sendMessage({ action: 'getStats' });
      if (statsResponse.success) {
        this.updateStats(statsResponse.data);
      }

      // 最近の履歴の取得
      const entriesResponse = await this.sendMessage({ action: 'getRecentEntries', limit: 5 });
      if (entriesResponse.success) {
        this.updateHistoryList(entriesResponse.data);
      }

      // ログ記録の状態を取得
      const statusResponse = await this.sendMessage({ action: 'getLoggingStatus' });
      if (statusResponse.success) {
        this.elements.loggingToggle.checked = statusResponse.enabled;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showError('データの読み込みに失敗しました');
    }
  }

  async toggleLogging(enabled) {
    try {
      const response = await this.sendMessage({ 
        action: 'toggleLogging', 
        enabled: enabled 
      });
      
      if (response.success) {
        console.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        // トグルを元に戻す
        this.elements.loggingToggle.checked = !enabled;
        this.showError('設定の変更に失敗しました');
      }
    } catch (error) {
      console.error('Failed to toggle logging:', error);
      this.elements.loggingToggle.checked = !enabled;
      this.showError('設定の変更に失敗しました');
    }
  }

  updateStats(stats) {
    this.elements.todayCount.textContent = stats.todayEntries;
    this.elements.totalCount.textContent = stats.totalEntries;
  }

  updateHistoryList(entries) {
    if (entries.length === 0) {
      this.elements.historyList.innerHTML = '<div class="empty-state">履歴がありません</div>';
      return;
    }

    const historyHTML = entries.map(entry => this.createHistoryItemHTML(entry)).join('');
    this.elements.historyList.innerHTML = historyHTML;

    // 履歴アイテムのクリックイベントを設定
    const historyItems = this.elements.historyList.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.openUrl(entries[index].url);
      });
    });
  }

  createHistoryItemHTML(entry) {
    const time = this.formatTime(entry.timestamp);
    const title = entry.title || entry.domain || 'Unknown';
    
    return `
      <div class="history-item">
        <div class="history-icon"></div>
        <div class="history-content">
          <div class="history-title">${this.escapeHtml(title)}</div>
          <div class="history-domain">${this.escapeHtml(entry.domain)}</div>
        </div>
        <div class="history-time">${time}</div>
      </div>
    `;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return '今';
    } else if (diffMins < 60) {
      return `${diffMins}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  openUrl(url) {
    chrome.tabs.create({ url: url });
  }

  openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  showError(message) {
    // 簡単なエラー表示（実際の実装ではより洗練されたUIを使用）
    console.error(message);
  }
}

// ポップアップを初期化
document.addEventListener('DOMContentLoaded', () => {
  new LifeLogPopup();
}); 