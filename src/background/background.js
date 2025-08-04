// Life Log Chrome Extension - Background Script
class LifeLogBackground {
  constructor() {
    this.isEnabled = true;
    this.init();
  }

  async init() {
    console.log('Life Log Background Service initialized');
    
    // 設定を読み込み
    await this.loadSettings();
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // 定期的なデータ整理を設定
    this.setupAlarms();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['isEnabled']);
      this.isEnabled = result.isEnabled !== false; // デフォルトは有効
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  setupEventListeners() {
    // 履歴訪問イベント
    chrome.history.onVisited.addListener((historyItem) => {
      if (this.isEnabled) {
        this.logHistoryEntry(historyItem);
      }
    });

    // タブ更新イベント
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.isEnabled && changeInfo.status === 'complete' && tab.url) {
        this.logTabEntry(tab);
      }
    });

    // メッセージリスナー
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 非同期レスポンスのため
    });
  }

  setupAlarms() {
    // 毎日午前0時にデータ整理
    chrome.alarms.create('dailyCleanup', {
      when: this.getNextMidnight(),
      periodInMinutes: 24 * 60 // 24時間
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'dailyCleanup') {
        this.performDailyCleanup();
      }
    });
  }

  getNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  async logHistoryEntry(historyItem) {
    try {
      const entry = {
        id: this.generateId(),
        url: historyItem.url,
        title: historyItem.title,
        timestamp: new Date().toISOString(),
        domain: this.extractDomain(historyItem.url),
        type: 'history'
      };

      await this.saveEntry(entry);
      console.log('Logged history entry:', entry.title);
    } catch (error) {
      console.error('Failed to log history entry:', error);
    }
  }

  async logTabEntry(tab) {
    try {
      const entry = {
        id: this.generateId(),
        url: tab.url,
        title: tab.title,
        timestamp: new Date().toISOString(),
        domain: this.extractDomain(tab.url),
        type: 'tab'
      };

      await this.saveEntry(entry);
      console.log('Logged tab entry:', entry.title);
    } catch (error) {
      console.error('Failed to log tab entry:', error);
    }
  }

  async saveEntry(entry) {
    try {
      const result = await chrome.storage.local.get(['lifeLogEntries']);
      const entries = result.lifeLogEntries || [];
      
      // 重複チェック（同じURLで5分以内の場合はスキップ）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isDuplicate = entries.some(existing => 
        existing.url === entry.url && 
        new Date(existing.timestamp) > fiveMinutesAgo
      );

      if (!isDuplicate) {
        entries.unshift(entry); // 新しいエントリを先頭に追加
        
        // 最大1000件まで保持
        if (entries.length > 1000) {
          entries.splice(1000);
        }

        await chrome.storage.local.set({ lifeLogEntries: entries });
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getStats':
        const stats = await this.getStats();
        sendResponse({ success: true, data: stats });
        break;
      
      case 'getRecentEntries':
        const entries = await this.getRecentEntries(request.limit || 10);
        sendResponse({ success: true, data: entries });
        break;
      
      case 'toggleLogging':
        this.isEnabled = request.enabled;
        await chrome.storage.local.set({ isEnabled: this.isEnabled });
        sendResponse({ success: true, enabled: this.isEnabled });
        break;
      
      case 'getLoggingStatus':
        sendResponse({ success: true, enabled: this.isEnabled });
        break;
      
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  async getStats() {
    try {
      const result = await chrome.storage.local.get(['lifeLogEntries']);
      const entries = result.lifeLogEntries || [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayEntries = entries.filter(entry => 
        new Date(entry.timestamp) >= today
      );

      const domainCounts = {};
      entries.forEach(entry => {
        domainCounts[entry.domain] = (domainCounts[entry.domain] || 0) + 1;
      });

      const topDomains = Object.entries(domainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }));

      return {
        totalEntries: entries.length,
        todayEntries: todayEntries.length,
        topDomains
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { totalEntries: 0, todayEntries: 0, topDomains: [] };
    }
  }

  async getRecentEntries(limit = 10) {
    try {
      const result = await chrome.storage.local.get(['lifeLogEntries']);
      const entries = result.lifeLogEntries || [];
      return entries.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent entries:', error);
      return [];
    }
  }

  async performDailyCleanup() {
    try {
      const result = await chrome.storage.local.get(['lifeLogEntries']);
      const entries = result.lifeLogEntries || [];
      
      // 30日以上古いエントリを削除
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredEntries = entries.filter(entry => 
        new Date(entry.timestamp) >= thirtyDaysAgo
      );

      await chrome.storage.local.set({ lifeLogEntries: filteredEntries });
      console.log(`Daily cleanup completed. Removed ${entries.length - filteredEntries.length} old entries.`);
    } catch (error) {
      console.error('Failed to perform daily cleanup:', error);
    }
  }
}

// バックグラウンドサービスを初期化
new LifeLogBackground(); 