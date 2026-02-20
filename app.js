/**
 * Ologundudu – Agege Civic Chronicle
 * THE MERGED ENGINE: Kimi's UI + Gemini's AI Brain
 */

const CONFIG = {
    storageKey: 'ologundudu_data_v2',
    maxChars: 15000
};

// --- State Management ---
const State = {
    data: { news: [], auth: false, currentFilter: 'agege' },
    
    init() { this.load(); },
    
    load() {
        try {
            const stored = localStorage.getItem(CONFIG.storageKey);
            if (stored) this.data = JSON.parse(stored);
        } catch (e) { console.error('Storage error:', e); }
    },
    
    save() {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data)); } 
        catch (e) { console.error('Save error:', e); }
    },
    
    addNews(news) {
        news.id = Date.now().toString();
        news.createdAt = new Date().toISOString();
        this.data.news.unshift(news);
        this.save();
        return news;
    },
    
    updateNews(id, updates) {
        const index = this.data.news.findIndex(n => n.id === id);
        if (index !== -1) {
            this.data.news[index] = { ...this.data.news[index], ...updates };
            this.save();
            return this.data.news[index];
        }
        return null;
    },
    
    getNewsByFilter(filter) {
        let filtered = this.data.news;
        if (filter === 'agege') filtered = this.data.news.filter(n => n.priority === 'agege');
        else if (filter === 'lagos') filtered = this.data.news.filter(n => n.priority === 'lagos');
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    getStats() {
        return {
            agege: this.data.news.filter(n => n.priority === 'agege').length,
            lagos: this.data.news.filter(n => n.priority === 'lagos').length,
            pending: this.data.news.filter(n => !n.approved).length
        };
    }
};

// --- Authentication (Repurposed for OpenAI API Key) ---
const Auth = {
    check() {
        return localStorage.getItem('openai_key_ologundudu') !== null;
    },
    
    login(apiKey) {
        if (apiKey.startsWith('sk-')) {
            localStorage.setItem('openai_key_ologundudu', apiKey);
            State.data.auth = true;
            return true;
        }
        return false;
    },
    
    logout() {
        localStorage.removeItem('openai_key_ologundudu');
        State.data.auth = false;
        Router.go('login');
    }
};

// --- Routing & UI Logic ---
const Router = {
    currentPage: 'login',
    init() { this.checkAuth(); },
    
    checkAuth() {
        if (!Auth.check() && this.currentPage !== 'login') this.go('login');
        else if (Auth.check() && this.currentPage === 'login') this.go('home');
        else this.render();
    },
    
    go(page) {
        this.currentPage = page;
        this.checkAuth();
    },
    
    render() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        if (this.currentPage === 'login') {
            document.getElementById('auth-screen').classList.remove('hidden');
            // Change Kimi's label to ask for API Key instead of Admin Password
            document.querySelector('label[for="password"]').textContent = "OpenAI API Key";
            document.querySelector('.input-hint').textContent = "Starts with 'sk-'. Stored locally.";
        } else {
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById(`page-${this.currentPage}`).classList.add('active');
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.page === this.currentPage);
            });
            if (this.currentPage === 'home') NewsFilter.render();
        }
    }
};

const NewsFilter = {
    set(filter) {
        State.data.currentFilter = filter;
        State.save();
        this.render();
    },
    
    render() {
        const filter = State.data.currentFilter;
        const news = State.getNewsByFilter(filter);
        const stats = State.getStats();
        
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        document.getElementById('stat-agege').textContent = stats.agege;
        document.getElementById('stat-lagos').textContent = stats.lagos;
        document.getElementById('stat-pending').textContent = stats.pending;
        
        const container = document.getElementById('news-container');
        const emptyState = document.getElementById('empty-state');
        
        if (news.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = news.map(item => this.renderCard(item)).join('');
        }
    },
    
    renderCard(item) {
        const date = new Date(item.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
        const priorityClass = item.priority === 'agege' ? 'badge-primary' : 'badge-secondary';
        const priorityLabel = item.priority === 'agege' ? 'AGEGE FIRST' : 'LAGOS RELATED';
        
        return `
            <article class="news-card" data-id="${item.id}">
                <div class="news-header">
                    <div>
                        <div class="news-meta">
                            <span class="news-source">${item.source}</span>
                            <span class="news-date">${date}</span>
                        </div>
                        <h3 class="news-title">${item.title}</h3>
                        <p class="news-excerpt">${item.content}</p>
                    </div>
                    <div class="news-badges">
                        <span class="badge ${priorityClass}">${priorityLabel}</span>
                        ${!item.approved ? '<span class="badge badge-pending">PENDING</span>' : ''}
                    </div>
                </div>
                <div class="news-footer">
                    <div class="news-actions">
                        ${!item.approved ? 
                            `<button class="btn btn-success btn-sm" onclick="NewsActions.approve('${item.id}')">Approve</button>` :
                            `<button class="btn btn-secondary btn-sm" onclick="NewsActions.revoke('${item.id}')">Revoke</button>`
                        }
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="NewsActions.generate('${item.id}')">Generate</button>
                </div>
            </article>
        `;
    }
};

const NewsActions = {
    approve(id) { State.updateNews(id, { approved: true }); NewsFilter.render(); },
    revoke(id) { State.updateNews(id, { approved: false }); NewsFilter.render(); },
    generate(id) {
        const news = State.data.news.find(n => n.id === id);
        if (!news) return;
        document.getElementById('compose-text').value = `Headline: ${news.title}\n\nDetails: ${news.content}`;
        Voice.updateCount();
        Router.go('compose');
    }
};

const Modal = {
    open(id) { document.getElementById(`modal-${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; },
    close(id) { document.getElementById(`modal-${id}`).classList.add('hidden'); document.body.style.overflow = ''; }
};

const Form = {
    selectPriority(el, value) {
        document.querySelectorAll('.priority-card').forEach(card => {
            card.classList.remove('active');
            card.querySelector('input').checked = false;
        });
        el.classList.add('active');
        el.querySelector('input').checked = true;
    },
    
    submit(e) {
        e.preventDefault();
        const news = {
            title: document.getElementById('news-title').value,
            content: document.getElementById('news-content').value,
            source: document.getElementById('news-source').value,
            url: document.getElementById('news-url').value,
            priority: document.querySelector('input[name="priority"]:checked').value,
            approved: false
        };
        State.addNews(news);
        Modal.close('add-news');
        document.getElementById('form-add-news').reset();
        if (Router.currentPage === 'home') NewsFilter.render(); else Router.go('home');
    }
};

const Voice = {
    current: 'civic',
    set(mode) {
        this.current = mode;
        document.querySelectorAll('.voice-card').forEach(card => card.classList.remove('active'));
        event.currentTarget.closest('.voice-card').classList.add('active');
    },
    updateCount() {
        const text = document.getElementById('compose-text').value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        document.getElementById('word-count').textContent = `${words.toLocaleString()} words`;
        document.getElementById('char-count').textContent = `${text.length.toLocaleString()} / ${CONFIG.maxChars.toLocaleString()}`;
    }
};

// --- REAL OPENAI GENERATOR ---
const Generator = {
    async run() {
        const text = document.getElementById('compose-text').value;
        if (!text.trim()) return alert('Please enter content to generate');
        
        const apiKey = localStorage.getItem('openai_key_ologundudu');
        if (!apiKey) {
            alert("Session expired. Please log out and re-enter your API Key.");
            return Auth.logout();
        }

        const mode = Voice.current;
        this.showLoading();

        const systemPrompt = `You are 'Ologundudu', the voice of the Agege Civic Chronicle. 
        Rewrite the provided news into 10 distinct social media formats.
        Current Mode: ${mode === 'civic' ? 'Civic Amplification (Formal, authoritative)' : 'Reflective Motivational (Inspirational, uses Nigerian proverbs)'}.
        You MUST return the response strictly as a JSON object with these exact keys:
        "blog", "newsletter", "whatsapp", "instagram", "facebook", "linkedin", "tiktok", "snapchat", "x", "rednote".`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const outputs = JSON.parse(data.choices[0].message.content);
            this.renderOutputs(outputs);

        } catch (error) {
            alert('API Error: ' + error.message);
            document.getElementById('tabs-content').innerHTML = `
                <div class="output-placeholder">
                    <p style="color:var(--red-500)">Engine Failure: ${error.message}</p>
                    <span>Check your API key or network connection.</span>
                </div>`;
        }
    },
    
    showLoading() {
        document.getElementById('tabs-content').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Engine Processing via OpenAI... Do not close.</span>
            </div>
        `;
    },
    
    renderOutputs(outputs) {
        const platforms = Object.keys(outputs);
        const headers = document.getElementById('tabs-header');
        const content = document.getElementById('tabs-content');
        
        headers.innerHTML = platforms.map((p, i) => 
            `<button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="Generator.switchTab('${p}')" data-platform="${p}">${p.toUpperCase()}</button>`
        ).join('');
        
        content.innerHTML = platforms.map((p, i) => 
            `<div class="tab-pane ${i === 0 ? 'active' : ''}" id="pane-${p}">
                <div class="output-header">
                    <div class="output-title">${p.toUpperCase()}</div>
                    <button class="btn-copy" onclick="Generator.copy('${p}')">Copy</button>
                </div>
                <div class="output-box" id="output-${p}">${outputs[p]}</div>
            </div>`
        ).join('');
        
        this._outputs = outputs;
    },
    
    switchTab(platform) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById(`pane-${platform}`).classList.add('active');
    },
    
    copy(platform) {
        navigator.clipboard.writeText(this._outputs[platform]).then(() => {
            const btn = event.target;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
    }
};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    State.init();
    Router.init();
    
    // Auth login intercepts
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const apiKey = document.getElementById('password').value;
        if (Auth.login(apiKey)) Router.go('home');
        else {
            const err = document.getElementById('auth-error');
            err.textContent = "Invalid Key. Must start with 'sk-'";
            err.classList.remove('hidden');
        }
    });
    
    document.getElementById('form-add-news').addEventListener('submit', Form.submit);
    document.getElementById('compose-text').addEventListener('input', () => Voice.updateCount());
});

window.Router = Router; window.Auth = Auth; window.Modal = Modal; 
window.Form = Form; window.NewsFilter = NewsFilter; window.NewsActions = NewsActions; 
window.Voice = Voice; window.Generator = Generator;

