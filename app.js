/**
 * Ologundudu – Journalist First Edition
 * Zero-database, RSS-fed, checkbox-selective generation
 */

const CONFIG = {
  password: 'admin123',
  apiEndpoint: '/api/generate', // Vercel serverless function
  rssFeeds: [
    'https://api.rss2json.com/v1/api.json?rss_url=https://punchng.com/feed/',
    'https://api.rss2json.com/v1/api.json?rss_url=https://guardian.ng/feed/'
  ],
  maxPlatforms: 3,
  demoNews: [
    {
      title: 'Agege Local Government Announces New Infrastructure Project',
      content: 'The administration has commenced comprehensive road rehabilitation across major routes in Agege LGA, including Old Abeokuta Motor Road and Iju Road.',
      source: 'Agege LGA',
      priority: 'agege',
      pubDate: new Date().toISOString()
    },
    {
      title: 'Lagos State Health Initiative Targets Mainland Communities',
      content: 'New healthcare program prioritizes Agege and Orile Agege with mobile clinics and free screenings.',
      source: 'Lagos Ministry',
      priority: 'lagos',
      pubDate: new Date(Date.now() - 86400000).toISOString()
    }
  ]
};

// State
const State = {
  auth: false,
  currentPage: 'login',
  rssNews: [],
  voice: 'civic',
  generated: null
};

// Auth
const Auth = {
  login(pw) {
    if (pw === CONFIG.password) {
      State.auth = true;
      return true;
    }
    return false;
  },
  logout() {
    State.auth = false;
    Router.go('login');
  }
};

// Router
const Router = {
  go(page) {
    State.currentPage = page;
    
    // Toggle screens
    document.getElementById('auth-screen').classList.toggle('hidden', page !== 'login');
    document.getElementById('app-screen').classList.toggle('hidden', page === 'login');
    
    // Toggle pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (page !== 'login') {
      document.getElementById(`page-${page}`).classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    }
    
    // Page init
    if (page === 'home') RSSFeed.load();
  }
};

// RSS Feed Loader
const RSSFeed = {
  async load() {
    const container = document.getElementById('rss-feed');
    const loading = document.getElementById('rss-loading');
    const error = document.getElementById('rss-error');
    
    loading.classList.remove('hidden');
    container.classList.add('hidden');
    error.classList.add('hidden');
    
    try {
      // Try to fetch live feeds
      const promises = CONFIG.rssFeeds.map(url => 
        fetch(url).then(r => r.json()).catch(() => ({ items: [] }))
      );
      
      const results = await Promise.all(promises);
      let allItems = [];
      
      results.forEach((result, idx) => {
        if (result.items) {
          const source = idx === 0 ? 'Punch' : 'Guardian';
          result.items.slice(0, 3).forEach(item => {
            allItems.push({
              title: item.title,
              content: item.description || item.content,
              source: source,
              url: item.link,
              priority: this.detectAgege(item.title + ' ' + (item.description || '')) ? 'agege' : 'lagos',
              pubDate: item.pubDate
            });
          });
        }
      });
      
      // If no live data, use demo
      if (allItems.length === 0) {
        allItems = CONFIG.demoNews;
        error.classList.remove('hidden');
      }
      
      State.rssNews = allItems;
      this.render(allItems);
      
    } catch (e) {
      console.error('RSS Error:', e);
      State.rssNews = CONFIG.demoNews;
      this.render(CONFIG.demoNews);
      error.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  },
  
  detectAgege(text) {
    const keywords = ['agege', 'orile agege', 'agbado', 'iju', 'pen cinema', 'ogba', 'oko-oba', 'abule egba'];
    return keywords.some(k => text.toLowerCase().includes(k));
  },
  
  render(items) {
    const container = document.getElementById('rss-feed');
    container.innerHTML = items.map(item => `
      <article class="news-card rss-card" onclick="RSSFeed.use('${items.indexOf(item)}')">
        <div class="rss-badge ${item.priority === 'agege' ? 'badge-primary' : 'badge-secondary'}">
          ${item.priority === 'agege' ? 'AGEGE' : 'LAGOS'}
        </div>
        <div class="news-meta">
          <span class="news-source">${item.source}</span>
          <span class="news-date">${new Date(item.pubDate).toLocaleDateString()}</span>
        </div>
        <h3 class="news-title">${item.title}</h3>
        <p class="news-excerpt">${item.content.substring(0, 200)}...</p>
        <div class="rss-action">
          <span>Click to rewrite →</span>
        </div>
      </article>
    `).join('');
    container.classList.remove('hidden');
  },
  
  use(index) {
    const item = State.rssNews[index];
    document.getElementById('compose-text').value = `${item.title}\n\n${item.content}`;
    Voice.updateCount();
    Router.go('compose');
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
    const text = document.getElementById('compose-text').value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('word-count').textContent = `${words.toLocaleString()} words`;
    document.getElementById('char-count').textContent = `${text.length.toLocaleString()} / 15,000`;
  }
};

// Platform Selection (Max 3)
const PlatformSelect = {
  update() {
    const checkboxes = document.querySelectorAll('input[name="platform"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    const count = selected.length;
    
    // Update UI
    document.getElementById('selection-count').textContent = `${count}/${CONFIG.maxPlatforms} selected`;
    document.getElementById('generate-btn').disabled = count === 0 || count > CONFIG.maxPlatforms;
    
    // Visual feedback
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
    const text = document.getElementById('compose-text').value.trim();
    const platforms = PlatformSelect.update();
    
    if (!text) {
      alert('Please enter content to generate');
      return;
    }
    if (platforms.length === 0) {
      alert('Please select at least 1 platform');
      return;
    }
    if (platforms.length > CONFIG.maxPlatforms) {
      alert(`Maximum ${CONFIG.maxPlatforms} platforms allowed to prevent timeouts`);
      return;
    }
    
    const btn = document.getElementById('generate-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner-sm"></div> Generating...`;
    
    try {
      const useContext = document.getElementById('use-context').checked;
      const contextNews = useContext ? State.rssNews.slice(0, 3) : [];
      
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
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      State.generated = data.platforms;
      this.render(data.platforms);
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Generation failed. Check console or try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },
  
  render(platforms) {
    const container = document.getElementById('results-area');
    const grid = document.getElementById('results-grid');
    
    grid.innerHTML = Object.entries(platforms).map(([name, content]) => `
      <div class="result-card">
        <div class="result-header">
          <div class="result-title">
            <span class="platform-icon-sm">${this.getIcon(name)}</span>
            <strong>${this.formatName(name)}</strong>
          </div>
          <button class="btn-copy-sm" onclick="Generator.copy('${name}')">Copy</button>
        </div>
        <div class="result-content">${this.escapeHtml(content)}</div>
      </div>
    `).join('');
    
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth' });
  },
  
  copy(name) {
    const text = State.generated[name];
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.target;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  },
  
  clear() {
    document.getElementById('results-area').classList.add('hidden');
    document.getElementById('results-grid').innerHTML = '';
    State.generated = null;
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('password').value;
    if (Auth.login(pw)) {
      Router.go('home');
    } else {
      document.getElementById('auth-error').classList.remove('hidden');
    }
  });
  
  // Textarea counter
  document.getElementById('compose-text').addEventListener('input', () => Voice.updateCount());
});

// Expose globals
window.Router = Router;
window.Auth = Auth;
window.RSSFeed = RSSFeed;
window.Voice = Voice;
window.PlatformSelect = PlatformSelect;
window.Generator = Generator;
