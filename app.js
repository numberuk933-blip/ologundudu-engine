// app.js - Ologundudu Engine with Auto-Refresh & Classic UI

const CONFIG = {
  password: 'admin123',
  apiEndpoint: '/api/generate',
  maxPlatforms: 3,
  
  // Auto-refresh settings
  refreshInterval: 60 * 60 * 1000, // 1 hour default
  minRefreshInterval: 5 * 60 * 1000, // 5 minutes minimum
  
  newsSources: [
    { name: 'Punch Nigeria', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://punchng.com/feed/', priority: 'high' },
    { name: 'Vanguard', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.vanguardngr.com/feed/', priority: 'high' },
    { name: 'Guardian Nigeria', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://guardian.ng/feed/', priority: 'high' },
    { name: 'The Nation', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://thenationonlineng.net/feed/', priority: 'medium' },
    { name: 'Premium Times', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.premiumtimesng.com/feed/', priority: 'high' },
    { name: 'Sahara Reporters', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://saharareporters.com/rss.xml', priority: 'medium' },
    { name: 'BBC News Africa', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/world/africa/rss.xml', priority: 'medium' },
    { name: 'Al Jazeera Africa', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.com/xml/rss/all.xml', priority: 'medium' },
    { name: 'Cable Nigeria', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.thecable.ng/feed/', priority: 'high' },
    { name: 'News Agency of Nigeria', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://nannews.ng/feed/', priority: 'medium' },
    { name: 'Lagos State Gov', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://lagosstate.gov.ng/feed/', priority: 'high' },
    { name: 'Daily Trust', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://dailytrust.com/feed/', priority: 'medium' }
  ],
  
  keywords: {
    agege: ['agege', 'orile agege', 'agbado', 'iju', 'pen cinema', 'ogba', 'oko-oba', 'abule egba', 'ojuwoye', 'dopemu', 'alagba', 'papa uku', 'idi oro', 'agege stadium', 'agege lga', 'agege local government'],
    lagos: ['lagos', 'mainland', 'ikeja', 'yaba', 'surulere', 'oshodi', 'mushin', 'lagos state', 'sanwo-olu', 'ambode', 'eko', 'lagos island', 'victoria island', 'lekki', 'ajah', 'ikorodu', 'badagry', 'epe'],
    nigeria: ['nigeria', 'abuja', 'fct', 'federal', 'buhari', 'tinubu', 'national assembly', 'senate', 'house of reps', 'minister', 'presidency', 'nigerian'],
    politics: ['governor', 'commissioner', 'senator', 'representative', 'house of assembly', 'local government', 'chairman', 'council', 'election', 'political', 'apc', 'pdp', 'labour party', 'lp', '2027', '2023', 'poll', 'vote'],
    infrastructure: ['road', 'bridge', 'highway', 'construction', 'rehabilitation', 'project', 'contract', 'commissioning', 'inauguration', 'development'],
    security: ['police', 'army', 'military', 'security', 'crime', 'kidnap', 'bandit', 'terrorist', 'peace', 'violence', 'protest', ' unrest'],
    health: ['health', 'hospital', 'clinic', 'medical', 'doctor', 'nurse', 'disease', 'covid', 'malaria', 'healthcare', 'pharmacy'],
    education: ['school', 'university', 'student', 'education', 'teacher', 'academic', 'lasu', 'unilag', 'yabatech', 'exam', 'waec', 'jamb']
  },
  
  storageKeys: {
    auth: 'ologundudu_auth',
    history: 'ologundudu_history_v2',
    savedNews: 'ologundudu_saved_news',
    lastRefresh: 'ologundudu_last_refresh',
    cache: 'ologundudu_news_cache'
  }
};

const State = {
  auth: false,
  currentPage: 'login',
  news: [],
  filteredNews: [],
  voice: 'civic',
  generated: null,
  history: [],
  savedNews: [],
  searchQuery: '',
  activeFilters: { agege: true, lagos: true, nigeria: true, general: true },
  isRefreshing: false,
  lastRefresh: null,
  refreshTimer: null
};

const Storage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
  
  init() {
    State.history = Storage.get(CONFIG.storageKeys.history) || [];
    State.savedNews = Storage.get(CONFIG.storageKeys.savedNews) || [];
    State.auth = Storage.get(CONFIG.storageKeys.auth) || false;
    State.lastRefresh = Storage.get(CONFIG.storageKeys.lastRefresh);
    
    // Load cached news if fresh (less than 1 hour)
    const cache = Storage.get(CONFIG.storageKeys.cache);
    if (cache && State.lastRefresh) {
      const age = Date.now() - State.lastRefresh;
      if (age < CONFIG.refreshInterval) {
        State.news = cache;
        State.filteredNews = [...cache];
      }
    }
  },
  
  saveHistory(item) {
    State.history.unshift(item);
    if (State.history.length > 100) State.history = State.history.slice(0, 100);
    Storage.set(CONFIG.storageKeys.history, State.history);
  },
  
  saveNews(item) {
    const exists = State.savedNews.find(n => n.url === item.url);
    if (!exists) {
      State.savedNews.unshift({ ...item, savedAt: new Date().toISOString() });
      Storage.set(CONFIG.storageKeys.savedNews, State.savedNews);
      return true;
    }
    return false;
  },
  
  deleteHistory(id) {
    State.history = State.history.filter(h => h.id !== id);
    Storage.set(CONFIG.storageKeys.history, State.history);
  },
  
  clearHistory() {
    State.history = [];
    Storage.set(CONFIG.storageKeys.history, []);
  },
  
  saveCache(news) {
    Storage.set(CONFIG.storageKeys.cache, news);
    Storage.set(CONFIG.storageKeys.lastRefresh, Date.now());
    State.lastRefresh = Date.now();
  }
};

const Auth = {
  check() { return State.auth; },
  
  login(pw) {
  State.auth = true;
  Storage.set(CONFIG.storageKeys.auth, true);
  return true;
}
  
  logout() {
    State.auth = false;
    Storage.set(CONFIG.storageKeys.auth, false);
    clearInterval(State.refreshTimer);
    Router.go('login');
  }
};

const Router = {
  go(page) {
    State.currentPage = page;
    
    document.getElementById('auth-screen').classList.toggle('hidden', page !== 'login');
    document.getElementById('app-screen').classList.toggle('hidden', page === 'login');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (page !== 'login') {
      document.getElementById(`page-${page}`).classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    }
    
    if (page === 'home') {
      NewsFeed.load();
      RefreshSystem.startAutoRefresh();
    } else {
      RefreshSystem.stopAutoRefresh();
    }
    
    if (page === 'history') HistoryBank.render();
    if (page === 'saved') SavedNews.render();
  }
};

// Beautiful Refresh System
const RefreshSystem = {
  startAutoRefresh() {
    this.stopAutoRefresh();
    // Check every minute if we should refresh
    State.refreshTimer = setInterval(() => {
      this.checkAutoRefresh();
    }, 60000);
    this.updateStatus();
  },
  
  stopAutoRefresh() {
    if (State.refreshTimer) {
      clearInterval(State.refreshTimer);
      State.refreshTimer = null;
    }
  },
  
  checkAutoRefresh() {
    if (!State.lastRefresh) return;
    
    const age = Date.now() - State.lastRefresh;
    if (age >= CONFIG.refreshInterval) {
      // Auto-refresh if on home page and not manually refreshing
      if (State.currentPage === 'home' && !State.isRefreshing) {
        this.showAutoRefreshNotification();
      }
    }
    this.updateStatus();
  },
  
  showAutoRefreshNotification() {
    const banner = document.getElementById('refresh-banner');
    if (banner) {
      banner.classList.remove('hidden');
      setTimeout(() => {
        banner.classList.add('show');
      }, 100);
    }
  },
  
  dismissBanner() {
    const banner = document.getElementById('refresh-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => banner.classList.add('hidden'), 300);
    }
  },
  
  async manualRefresh() {
    if (State.isRefreshing) return;
    
    // Check minimum interval
    if (State.lastRefresh) {
      const sinceLast = Date.now() - State.lastRefresh;
      if (sinceLast < CONFIG.minRefreshInterval) {
        const wait = Math.ceil((CONFIG.minRefreshInterval - sinceLast) / 60000);
        this.showToast(`Please wait ${wait} minute${wait > 1 ? 's' : ''} before refreshing`, 'warning');
        return;
      }
    }
    
    State.isRefreshing = true;
    this.dismissBanner();
    this.updateButtonState(true);
    
    try {
      await NewsFeed.load(true); // true = force refresh
      
      // Success animation
      this.showToast('Fresh news loaded from 12 sources', 'success');
      this.triggerConfetti();
      
    } catch (error) {
      this.showToast('Refresh failed. Using cached news.', 'error');
    } finally {
      State.isRefreshing = false;
      this.updateButtonState(false);
      this.updateStatus();
    }
  },
  
  updateButtonState(isRefreshing) {
    const btn = document.getElementById('refresh-btn');
    const icon = document.getElementById('refresh-icon');
    
    if (!btn) return;
    
    if (isRefreshing) {
      btn.disabled = true;
      btn.classList.add('refreshing');
      if (icon) icon.classList.add('spinning');
      btn.innerHTML = `
        <svg id="refresh-icon" class="spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>Refreshing...</span>
      `;
    } else {
      btn.disabled = false;
      btn.classList.remove('refreshing');
      btn.innerHTML = `
        <svg id="refresh-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>Refresh News</span>
      `;
    }
  },
  
  updateStatus() {
    const statusEl = document.getElementById('refresh-status');
    const dotEl = document.getElementById('status-dot');
    
    if (!State.lastRefresh) {
      if (statusEl) statusEl.textContent = 'Never updated';
      if (dotEl) dotEl.className = 'status-dot offline';
      return;
    }
    
    const age = Date.now() - State.lastRefresh;
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(age / 3600000);
    
    let text;
    if (minutes < 1) text = 'Just now';
    else if (minutes < 60) text = `${minutes}m ago`;
    else if (hours < 24) text = `${hours}h ago`;
    else text = new Date(State.lastRefresh).toLocaleDateString();
    
    if (statusEl) statusEl.textContent = text;
    
    // Status color
    if (dotEl) {
      if (age < 3600000) dotEl.className = 'status-dot fresh';
      else if (age < 7200000) dotEl.className = 'status-dot recent';
      else dotEl.className = 'status-dot stale';
    }
  },
  
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</div>
      <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },
  
  triggerConfetti() {
    // Simple CSS confetti effect
    const colors = ['#d4af37', '#6b5742', '#22c55e', '#f59e0b', '#3b82f6'];
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
      }, i * 50);
    }
  }
};

// News Feed System
const NewsFeed = {
  async load(forceRefresh = false) {
    const container = document.getElementById('rss-feed');
    const loading = document.getElementById('rss-loading');
    const error = document.getElementById('rss-error');
    
    // Use cache if available and not forced
    if (!forceRefresh && State.news.length > 0) {
      this.render(State.filteredNews);
      RefreshSystem.updateStatus();
      return;
    }
    
    loading.classList.remove('hidden');
    container.classList.add('hidden');
    error.classList.add('hidden');
    
    const allNews = [];
    const errors = [];
    let successCount = 0;
    
    // Fetch from all 12 sources with progress tracking
    const promises = CONFIG.newsSources.map(async (source, index) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(source.url, { signal: controller.signal });
        clearTimeout(timeout);
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          data.items.slice(0, 5).forEach(item => {
            const text = `${item.title} ${item.description || ''} ${item.content || ''}`;
            const classification = this.classify(text);
            
            allNews.push({
              id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: item.title,
              content: item.description || item.content || '',
              fullContent: item.content || item.description || '',
              source: source.name,
              url: item.link,
              pubDate: item.pubDate,
              classification: classification,
              relevanceScore: classification.score,
              keywords: classification.matched,
              categories: classification.categories,
              fetchedAt: new Date().toISOString()
            });
          });
          successCount++;
        }
      } catch (e) {
        console.error(`Failed ${source.name}:`, e.message);
        errors.push(source.name);
      }
      
      // Update progress if visible
      this.updateLoadingProgress(successCount, CONFIG.newsSources.length);
    });
    
    await Promise.all(promises);
    
    // Sort by relevance
    allNews.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    State.news = allNews;
    State.filteredNews = [...allNews];
    
    // Save to cache
    Storage.saveCache(allNews);
    
    loading.classList.add('hidden');
    
    if (State.news.length === 0) {
      error.classList.remove('hidden');
      error.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>All 12 sources unavailable. ${errors.length} failed. Using demo data.</span>
      `;
      State.news = this.getDemoNews();
      State.filteredNews = [...State.news];
    }
    
    this.render(State.filteredNews);
    this.updateStats();
    this.renderSourceFilters();
    RefreshSystem.updateStatus();
  },
  
  updateLoadingProgress(current, total) {
    const progressEl = document.getElementById('loading-progress');
    if (progressEl) {
      progressEl.textContent = `${current}/${total} sources`;
    }
  },
  
  classify(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    let matched = [];
    let categories = [];
    let primaryType = 'general';
    
    Object.entries(CONFIG.keywords).forEach(([category, keywords]) => {
      let categoryScore = 0;
      keywords.forEach(kw => {
        if (lowerText.includes(kw)) {
          categoryScore += (category === 'agege') ? 20 : (category === 'lagos') ? 10 : 5;
          matched.push(kw);
          if (!categories.includes(category)) categories.push(category);
        }
      });
      score += categoryScore;
      
      if (categoryScore > 0) {
        if (category === 'agege') primaryType = 'agege';
        else if (category === 'lagos' && primaryType === 'general') primaryType = 'lagos';
        else if (category === 'nigeria' && primaryType === 'general') primaryType = 'nigeria';
      }
    });
    
    return { type: primaryType, score, matched: [...new Set(matched)], categories };
  },
  
  getDemoNews() {
    return [
      {
        id: 'demo_1',
        title: 'Agege Local Government Commences Major Road Rehabilitation',
        content: 'The Agege LGA administration has begun comprehensive repairs on Old Abeokuta Motor Road, Iju Road, and Pen Cinema axis to ease transportation for thousands of daily commuters.',
        source: 'Demo Feed',
        url: '#',
        pubDate: new Date().toISOString(),
        classification: { type: 'agege', score: 40, matched: ['agege', 'road', 'iju', 'pen cinema'], categories: ['agege', 'infrastructure', 'lagos'] }
      },
      {
        id: 'demo_2',
        title: 'Lagos State Governor Sanwo-Olu Announces New Health Initiative',
        content: 'Mobile clinics to serve underserved communities in Agege, Oshodi, and Ikorodu starting next month with free screenings and vaccinations.',
        source: 'Demo Feed',
        url: '#',
        pubDate: new Date(Date.now() - 3600000).toISOString(),
        classification: { type: 'lagos', score: 25, matched: ['lagos', 'health', 'agege'], categories: ['lagos', 'health'] }
      },
      {
        id: 'demo_3',
        title: 'Federal Government Approves New Infrastructure Bond for Lagos',
        content: 'N500 billion bond to fund critical infrastructure projects across Lagos State including Agege corridor improvements.',
        source: 'Demo Feed',
        url: '#',
        pubDate: new Date(Date.now() - 7200000).toISOString(),
        classification: { type: 'nigeria', score: 20, matched: ['federal', 'lagos', 'infrastructure'], categories: ['nigeria', 'infrastructure', 'lagos'] }
      }
    ];
  },
  
  search(query) {
    State.searchQuery = query.toLowerCase();
    this.applyFilters();
  },
  
  toggleFilter(type) {
    State.activeFilters[type] = !State.activeFilters[type];
    this.applyFilters();
  },
  
  applyFilters() {
    State.filteredNews = State.news.filter(item => {
      if (!State.activeFilters[item.classification.type]) return false;
      if (State.searchQuery) {
        const searchText = `${item.title} ${item.content} ${item.source}`.toLowerCase();
        if (!searchText.includes(State.searchQuery)) return false;
      }
      return true;
    });
    this.render(State.filteredNews);
  },
  
  render(news) {
    const container = document.getElementById('rss-feed');
    const countEl = document.getElementById('results-count');
    
    if (countEl) countEl.textContent = `${news.length} fresh stor${news.length === 1 ? 'y' : 'ies'}`;
    
    if (news.length === 0) {
      container.innerHTML = `
        <div class="empty-state elegant">
          <div class="empty-icon">📰</div>
          <h3>No stories match your search</h3>
          <p>Try adjusting your filters or search terms</p>
          <button class="btn btn-secondary" onclick="NewsFeed.clearFilters()">Clear all filters</button>
        </div>
      `;
      container.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = news.map((item, index) => {
      const type = item.classification.type;
      const badgeClass = `badge-${type}`;
      const badgeText = type === 'agege' ? 'AGEGE' : type === 'lagos' ? 'LAGOS' : type === 'nigeria' ? 'NIGERIA' : 'GENERAL';
      const isSaved = State.savedNews.some(s => s.url === item.url);
      const timeAgo = this.getTimeAgo(item.pubDate);
      
      return `
        <article class="news-card elegant-card" data-id="${item.id}">
          <div class="card-glow ${type}"></div>
          
          <div class="news-priority ${badgeClass}">
            <span class="priority-pulse"></span>
            ${badgeText}
            ${item.relevanceScore > 15 ? '<span class="trending">🔥</span>' : ''}
          </div>
          
          <div class="news-actions-top">
            <button class="btn-icon elegant ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); NewsFeed.save('${item.id}')" title="${isSaved ? 'Saved to bank' : 'Save for later'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
          
          <div class="news-meta elegant">
            <span class="source-badge">${item.source}</span>
            <span class="time-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${timeAgo}
            </span>
          </div>
          
          <h3 class="news-title elegant">${item.title}</h3>
          <p class="news-excerpt elegant">${item.content.substring(0, 180)}...</p>
          
          ${item.keywords && item.keywords.length > 0 ? `
            <div class="keyword-tags elegant">
              ${item.keywords.slice(0, 4).map(k => `<span class="keyword-tag">${k}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="card-footer" onclick="NewsFeed.use(${State.news.indexOf(item)})">
            <span class="rewrite-text">Rewrite for Ologundudu</span>
            <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </article>
      `;
    }).join('');
    
    container.classList.remove('hidden');
  },
  
  getTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      
      if (minutes < 5) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString('en-NG', {day: 'numeric', month: 'short'});
    } catch (e) {
      return 'Recently';
    }
  },
  
  renderSourceFilters() {
    const container = document.getElementById('source-filters');
    if (!container) return;
    
    const counts = {
      agege: State.news.filter(n => n.classification.type === 'agege').length,
      lagos: State.news.filter(n => n.classification.type === 'lagos').length,
      nigeria: State.news.filter(n => n.classification.type === 'nigeria').length,
      general: State.news.filter(n => n.classification.type === 'general').length
    };
    
    container.innerHTML = `
      <label class="filter-chip elegant ${State.activeFilters.agege ? 'active' : ''}" onclick="NewsFeed.toggleFilter('agege')">
        <span class="chip-dot agege"></span>
        <span class="chip-label">Agege</span>
        <span class="chip-count">${counts.agege}</span>
      </label>
      <label class="filter-chip elegant ${State.activeFilters.lagos ? 'active' : ''}" onclick="NewsFeed.toggleFilter('lagos')">
        <span class="chip-dot lagos"></span>
        <span class="chip-label">Lagos</span>
        <span class="chip-count">${counts.lagos}</span>
      </label>
      <label class="filter-chip elegant ${State.activeFilters.nigeria ? 'active' : ''}" onclick="NewsFeed.toggleFilter('nigeria')">
        <span class="chip-dot nigeria"></span>
        <span class="chip-label">Nigeria</span>
        <span class="chip-count">${counts.nigeria}</span>
      </label>
      <label class="filter-chip elegant ${State.activeFilters.general ? 'active' : ''}" onclick="NewsFeed.toggleFilter('general')">
        <span class="chip-dot general"></span>
        <span class="chip-label">General</span>
        <span class="chip-count">${counts.general}</span>
      </label>
    `;
  },
  
  updateStats() {
    const stats = {
      agege: State.news.filter(n => n.classification.type === 'agege').length,
      lagos: State.news.filter(n => n.classification.type === 'lagos').length,
      nigeria: State.news.filter(n => n.classification.type === 'nigeria').length,
      total: State.news.length
    };
    
    ['agege', 'lagos', 'nigeria', 'total'].forEach(key => {
      const el = document.getElementById(`stat-${key}`);
      if (el) {
        el.style.opacity = '0';
        setTimeout(() => {
          el.textContent = stats[key];
          el.style.opacity = '1';
        }, 200);
      }
    });
  },
  
  save(id) {
    const item = State.news.find(n => n.id === id);
    if (item) {
      const saved = Storage.saveNews(item);
      if (saved) {
        this.render(State.filteredNews);
        RefreshSystem.showToast('Saved to your news bank', 'success');
      } else {
        RefreshSystem.showToast('Already saved', 'warning');
      }
    }
  },
  
  use(index) {
    const item = State.news[index];
    if (!item) return;
    
    document.getElementById('compose-text').value = 
      `${item.title}\n\n${item.fullContent || item.content}\n\nSource: ${item.source}`;
    Voice.updateCount();
    Router.go('compose');
  },
  
  clearFilters() {
    State.searchQuery = '';
    State.activeFilters = { agege: true, lagos: true, nigeria: true, general: true };
    document.getElementById('search-input').value = '';
    this.applyFilters();
    this.renderSourceFilters();
  }
};

// History Bank
const HistoryBank = {
  render() {
    const container = document.getElementById('history-list');
    const emptyState = document.getElementById('history-empty');
    const statsEl = document.getElementById('history-stats');
    
    if (!container) return;
    
    if (statsEl) {
      const total = State.history.length;
      const thisWeek = State.history.filter(h => {
        const date = new Date(h.createdAt);
        return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }).length;
      
      statsEl.innerHTML = `
        <div class="stat-pill elegant">
          <span class="pill-number">${total}</span>
          <span class="pill-label">Total generations</span>
        </div>
        <div class="stat-pill elegant accent">
          <span class="pill-number">${thisWeek}</span>
          <span class="pill-label">This week</span>
        </div>
      `;
    }
    
    if (State.history.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = State.history.map(item => {
      const date = new Date(item.createdAt);
      const platforms = item.platforms.map(p => 
        `<span class="platform-mini ${p}">${p}</span>`
      ).join('');
      
      return `
        <div class="history-card elegant" data-id="${item.id}">
          <div class="history-header">
            <div class="history-datetime">
              <span class="date">${date.toLocaleDateString('en-NG', {day: 'numeric', month: 'short'})}</span>
              <span class="time">${date.toLocaleTimeString('en-NG', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div class="history-voice-badge ${item.voice}">
              ${item.voice === 'civic' ? '🏛️ Civic' : '🌟 Reflective'}
            </div>
          </div>
          
          <div class="history-preview elegant">
            "${item.originalText.substring(0, 100)}..."
          </div>
          
          <div class="history-platforms">
            ${platforms}
          </div>
          
          <div class="history-actions elegant">
            <button class="btn-action view" onclick="HistoryBank.view('${item.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
            <button class="btn-action regenerate" onclick="HistoryBank.regenerate('${item.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Regenerate
            </button>
            <button class="btn-action delete" onclick="HistoryBank.delete('${item.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },
  
  view(id) {
    const item = State.history.find(h => h.id === id);
    if (!item) return;
    
    State.generated = item.results;
    Generator.render(item.results, true);
    Router.go('compose');
    setTimeout(() => {
      document.getElementById('results-area')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  },
  
  regenerate(id) {
    const item = State.history.find(h => h.id === id);
    if (!item) return;
    
    document.getElementById('compose-text').
    document.getElementById('compose-text').value = item.originalText;
    Voice.set(item.voice);
    Voice.updateCount();
    Router.go('compose');
  },
  
  delete(id) {
    if (confirm('Remove this from your history?')) {
      Storage.deleteHistory(id);
      this.render();
      RefreshSystem.showToast('Removed from history', 'success');
    }
  },
  
  clearAll() {
    if (confirm('Clear all generation history? This cannot be undone.')) {
      Storage.clearHistory();
      this.render();
      RefreshSystem.showToast('History cleared', 'success');
    }
  }
};

// Saved News Bank
const SavedNews = {
  render() {
    const container = document.getElementById('saved-list');
    const emptyState = document.getElementById('saved-empty');
    
    if (!container) return;
    
    if (State.savedNews.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = State.savedNews.map((item, index) => {
      const type = item.classification?.type || 'general';
      const badgeClass = `badge-${type}`;
      const badgeText = type === 'agege' ? 'AGEGE' : type === 'lagos' ? 'LAGOS' : type === 'nigeria' ? 'NIGERIA' : 'SAVED';
      
      return `
        <article class="news-card elegant-card saved" data-index="${index}">
          <div class="card-glow ${type}"></div>
          
          <div class="news-priority ${badgeClass}">
            <span class="priority-pulse"></span>
            ${badgeText}
          </div>
          
          <div class="news-actions-top">
            <button class="btn-icon elegant danger" onclick="SavedNews.remove(${index})" title="Remove from saved">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <div class="news-meta elegant">
            <span class="source-badge">${item.source}</span>
            <span class="saved-date">Saved ${new Date(item.savedAt).toLocaleDateString('en-NG', {day: 'numeric', month: 'short'})}</span>
          </div>
          
          <h3 class="news-title elegant">${item.title}</h3>
          <p class="news-excerpt elegant">${item.content.substring(0, 180)}...</p>
          
          <div class="card-footer" onclick="SavedNews.use(${index})">
            <span class="rewrite-text">Rewrite for Ologundudu</span>
            <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </article>
      `;
    }).join('');
  },
  
  use(index) {
    const item = State.savedNews[index];
    if (!item) return;
    
    document.getElementById('compose-text').value = 
      `${item.title}\n\n${item.fullContent || item.content}\n\nSource: ${item.source}`;
    Voice.updateCount();
    Router.go('compose');
  },
  
  remove(index) {
    State.savedNews.splice(index, 1);
    Storage.set(CONFIG.storageKeys.savedNews, State.savedNews);
    this.render();
    RefreshSystem.showToast('Removed from saved news', 'success');
  }
};

// Voice Selection
const Voice = {
  set(mode) {
    State.voice = mode;
    document.querySelectorAll('.voice-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.voice === mode);
    });
  },
  
  updateCount() {
    const text = document.getElementById('compose-text')?.value || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wordCount = document.getElementById('word-count');
    const charCount = document.getElementById('char-count');
    if (wordCount) wordCount.textContent = `${words.toLocaleString()} words`;
    if (charCount) charCount.textContent = `${text.length.toLocaleString()} / 15,000`;
  }
};

// Platform Selection
const PlatformSelect = {
  update() {
    const checkboxes = document.querySelectorAll('input[name="platform"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    const count = selected.length;
    
    const countEl = document.getElementById('selection-count');
    const btn = document.getElementById('generate-btn');
    
    if (countEl) countEl.textContent = `${count}/${CONFIG.maxPlatforms} selected`;
    if (btn) {
      btn.disabled = count === 0 || count > CONFIG.maxPlatforms;
      btn.innerHTML = count > 0 ? 
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
         Generate ${count} Platform${count > 1 ? 's' : ''}` :
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
         Select Platforms`;
    }
    
    document.querySelectorAll('.platform-card').forEach(card => {
      const checkbox = card.querySelector('input');
      card.classList.toggle('selected', checkbox.checked);
      card.classList.toggle('disabled', count >= CONFIG.maxPlatforms && !checkbox.checked);
    });
    
    return selected;
  }
};

// Generator
const Generator = {
  async run() {
    const text = document.getElementById('compose-text')?.value.trim();
    const platforms = PlatformSelect.update();
    
    if (!text) {
      RefreshSystem.showToast('Please enter content to generate', 'warning');
      return;
    }
    if (platforms.length === 0) {
      RefreshSystem.showToast('Please select at least 1 platform', 'warning');
      return;
    }
    if (platforms.length > CONFIG.maxPlatforms) {
      RefreshSystem.showToast(`Maximum ${CONFIG.maxPlatforms} platforms allowed`, 'warning');
      return;
    }
    
    const btn = document.getElementById('generate-btn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner-sm"></div> Crafting...`;
    
    try {
      const useContext = document.getElementById('use-context')?.checked ?? false;
      const contextNews = useContext ? State.news.slice(0, 3) : [];
      
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          platforms,
          voice: State.voice,
          contextNews
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      State.generated = data.platforms;
      
      // Save to history
      const historyItem = {
        id: `gen_${Date.now()}`,
        originalText: text,
        platforms: platforms,
        voice: State.voice,
        results: data.platforms,
        createdAt: new Date().toISOString()
      };
      Storage.saveHistory(historyItem);
      
      this.render(data.platforms);
      RefreshSystem.showToast('Content generated successfully!', 'success');
      
    } catch (error) {
      console.error('Generation error:', error);
      RefreshSystem.showToast(`Generation failed: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  },
  
  render(platforms, fromHistory = false) {
    const container = document.getElementById('results-area');
    const grid = document.getElementById('results-grid');
    
    if (!grid) return;
    
    grid.innerHTML = Object.entries(platforms).map(([name, content]) => `
      <div class="result-card elegant">
        <div class="result-header">
          <div class="result-title">
            <span class="platform-icon-lg">${this.getIcon(name)}</span>
            <div class="platform-info">
              <strong>${this.formatName(name)}</strong>
              <span class="format-hint">${this.getFormatHint(name)}</span>
            </div>
          </div>
          <button class="btn-copy-elegant" onclick="Generator.copy('${name}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
        <div class="result-content elegant">${this.escapeHtml(content)}</div>
      </div>
    `).join('');
    
    if (fromHistory) {
      const notice = document.createElement('div');
      notice.className = 'history-banner';
      notice.innerHTML = `
        <span>📚 Viewing from history</span>
        <button onclick="Generator.clear()">Create new</button>
      `;
      grid.insertBefore(notice, grid.firstChild);
    }
    
    container.classList.remove('hidden');
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  },
  
  copy(name) {
    const text = State.generated[name];
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.target.closest('button');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
        btn.classList.remove('copied');
      }, 2000);
    });
  },
  
  clear() {
    const container = document.getElementById('results-area');
    const grid = document.getElementById('results-grid');
    const text = document.getElementById('compose-text');
    
    if (container) container.classList.add('hidden');
    if (grid) grid.innerHTML = '';
    if (text) {
      text.value = '';
      Voice.updateCount();
    }
    
    State.generated = null;
    document.querySelectorAll('input[name="platform"]').forEach(cb => cb.checked = false);
    PlatformSelect.update();
  },
  
  getIcon(name) {
    const icons = {
      blog: '📝', newsletter: '📧', whatsapp: '💬', instagram: '📷',
      facebook: '👥', linkedin: '💼', tiktok: '🎵', snapchat: '👻',
      x: '𝕏', rednote: '📖'
    };
    return icons[name] || '📄';
  },
  
  formatName(name) {
    return name === 'x' ? 'X (Twitter)' : name.charAt(0).toUpperCase() + name.slice(1);
  },
  
  getFormatHint(name) {
    const hints = {
      blog: '800-1200 words', newsletter: 'Email format', whatsapp: 'Mobile messaging',
      instagram: 'Caption + hashtags', facebook: 'Community post', linkedin: 'Professional',
      tiktok: '60s video script', snapchat: 'Brief update', x: 'Thread format', rednote: 'Narrative'
    };
    return hints[name] || '';
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  Storage.init();
  
  // Login handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = document.getElementById('password').value;
      if (Auth.login(pw)) {
        Router.go('home');
      } else {
        const error = document.getElementById('auth-error');
        if (error) {
          error.classList.remove('hidden');
          error.style.animation = 'shake 0.5s';
        }
      }
    });
  }
  
  // Search handler
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      NewsFeed.search(e.target.value);
    });
  }
  
  // Textarea counter
  const composeText = document.getElementById('compose-text');
  if (composeText) {
    composeText.addEventListener('input', () => Voice.updateCount());
  }
  
  // Check auth state
  if (State.auth) {
    Router.go('home');
  }
});

// Expose globals
window.Router = Router;
window.Auth = Auth;
window.NewsFeed = NewsFeed;
window.HistoryBank = HistoryBank;
window.SavedNews = SavedNews;
window.Voice = Voice;
window.PlatformSelect = PlatformSelect;
window.Generator = Generator;
window.RefreshSystem = RefreshSystem;
window.Storage = Storage;
