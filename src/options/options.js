// Life Log Options Script
class LifeLogOptions {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Life Log Options initialized');
    
    // DOM要素の取得
    this.elements = {
      autoLoggingToggle: document.getElementById('autoLoggingToggle'),
      exportBtn: document.getElementById('exportBtn'),
      clearDataBtn: document.getElementById('clearDataBtn'),
      totalEntries: document.getElementById('totalEntries'),
      todayEntries: document.getElementById('todayEntries'),
      uniqueDomains: document.getElementById('uniqueDomains'),
      historyList: document.getElementById('historyList')
    };

    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 初期データの読み込み
    await this.loadData();
  }

  setupEventListeners() {
    // 自動記録のトグル
    this.elements.autoLoggingToggle.addEventListener('change', (e) => {
      this.toggleAutoLogging(e.target.checked);
    });

    // エクスポートボタン
    this.elements.exportBtn.addEventListener('click', () => {
      this.exportData();
    });

    // データ削除ボタン
    this.elements.clearDataBtn.addEventListener('click', () => {
      this.clearData();
    });
  }

  async loadData() {
    try {
      // 統計データの取得
      const statsResponse = await this.sendMessage({ action: 'getStats' });
      if (statsResponse.success) {
        this.updateStats(statsResponse.data);
      }

      // 最近の履歴の取得（より多くの履歴を表示）
      const entriesResponse = await this.sendMessage({ action: 'getRecentEntries', limit: 20 });
      if (entriesResponse.success) {
        this.updateHistoryList(entriesResponse.data);
      }

      // ログ記録の状態を取得
      const statusResponse = await this.sendMessage({ action: 'getLoggingStatus' });
      if (statusResponse.success) {
        this.elements.autoLoggingToggle.checked = statusResponse.enabled;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showError('データの読み込みに失敗しました');
    }
  }

  async toggleAutoLogging(enabled) {
    try {
      const response = await this.sendMessage({ 
        action: 'toggleLogging', 
        enabled: enabled 
      });
      
      if (response.success) {
        console.log(`Auto logging ${enabled ? 'enabled' : 'disabled'}`);
        this.showSuccess(`自動記録を${enabled ? '有効' : '無効'}にしました`);
      } else {
        // トグルを元に戻す
        this.elements.autoLoggingToggle.checked = !enabled;
        this.showError('設定の変更に失敗しました');
      }
    } catch (error) {
      console.error('Failed to toggle auto logging:', error);
      this.elements.autoLoggingToggle.checked = !enabled;
      this.showError('設定の変更に失敗しました');
    }
  }

  updateStats(stats) {
    this.elements.todayEntries.textContent = stats.todayEntries;
    this.elements.totalEntries.textContent = stats.totalEntries;
    
    // ユニークドメイン数を計算
    const uniqueDomains = new Set(stats.topDomains.map(item => item.domain)).size;
    this.elements.uniqueDomains.textContent = uniqueDomains;
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
        year: 'numeric',
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

  async exportData() {
    try {
      const response = await this.sendMessage({ action: 'getRecentEntries', limit: 1000 });
      if (response.success && response.data.length > 0) {
        this.downloadCSV(response.data);
        this.showSuccess('データをエクスポートしました');
      } else {
        this.showError('エクスポートするデータがありません');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showError('データのエクスポートに失敗しました');
    }
  }

  downloadCSV(entries) {
    const headers = ['タイトル', 'URL', 'ドメイン', '日時'];
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => [
        `"${(entry.title || '').replace(/"/g, '""')}"`,
        `"${entry.url}"`,
        `"${entry.domain}"`,
        `"${new Date(entry.timestamp).toLocaleString('ja-JP')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `life-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async clearData() {
    if (!confirm('すべての記録データを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      await chrome.storage.local.remove(['lifeLogEntries']);
      this.showSuccess('データを削除しました');
      
      // 統計と履歴を更新
      this.updateStats({ totalEntries: 0, todayEntries: 0, topDomains: [] });
      this.updateHistoryList([]);
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showError('データの削除に失敗しました');
    }
  }

  openUrl(url) {
    chrome.tabs.create({ url: url });
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

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // 簡単な通知表示（実際の実装ではより洗練されたUIを使用）
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// オプションページを初期化
document.addEventListener('DOMContentLoaded', () => {
  new LifeLogOptions();
}); 