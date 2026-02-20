/**
 * Ologundudu – Agege Civic Chronicle
 * Vanilla JS Application Architecture
 */

// Configuration
const CONFIG = {
    password: 'admin123',
    storageKey: 'ologundudu_data_v2',
    maxChars: 15000,
    agegeKeywords: ['Agege', 'Orile Agege', 'Agbado', 'Iju', 'Pen Cinema', 'Ogba', 'Oko-Oba', 'Abule Egba', 'Ojuwoye', 'Dopemu', 'Alagba', 'Papa Uku', 'Idi Oro']
};

// State Management
const State = {
    data: {
        news: [],
        auth: false,
        currentFilter: 'agege'
    },
    
    init() {
        this.load();
        if (this.data.news.length === 0) {
            this.seedData();
        }
    },
    
    load() {
        try {
            const stored = localStorage.getItem(CONFIG.storageKey);
            if (stored) {
                this.data = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Storage error:', e);
        }
    },
    
    save() {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('Save error:', e);
        }
    },
    
    seedData() {
        const sampleNews = [
            {
                id: '1',
                title: 'Agege Local Government Launches Road Rehabilitation Project',
                content: 'The Agege Local Government Administration has commenced comprehensive rehabilitation of major roads across the LGA. The project, which began at Old Abeokuta Motor Road, aims to ease transportation difficulties faced by residents and traders in the densely populated area. Chairman of the council emphasized that this is part of the administration\'s commitment to infrastructural development.',
                source: 'Agege LGA Official',
                url: '',
                priority: 'agege',
                approved: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Lagos State Announces New Health Initiative for Mainland Residents',
                content: 'The Lagos State Ministry of Health has unveiled a comprehensive healthcare program targeting underserved communities across the mainland. The initiative includes mobile clinics and free health screenings. While the program covers multiple LGAs, officials noted that Agege and Orile Agege have been prioritized due to population density and existing healthcare gaps.',
                source: 'Lagos Ministry of Health',
                url: '',
                priority: 'lagos',
                approved: true,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: '3',
                title: 'Pen Cinema Bridge Construction Reaches 80% Completion',
                content: 'Construction work on the Pen Cinema Bridge has reached significant milestone with completion now at 80%. The project, which has faced delays due to funding issues, is now expected to be commissioned next quarter. Residents of Agege and surrounding areas have expressed optimism about the reduced traffic congestion the bridge will bring.',
                source: 'Vanguard Nigeria',
                url: '',
                priority: 'agege',
                approved: false,
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        
        this.data.news = sampleNews;
        this.save();
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
    
    deleteNews(id) {
        this.data.news = this.data.news.filter(n => n.id !== id);
        this.save();
    },
    
    getNewsByFilter(filter) {
        let filtered = this.data.news;
        
        if (filter === 'agege') {
            filtered = this.data.news.filter(n => n.priority === 'agege');
        } else if (filter === 'lagos') {
            filtered = this.data.news.filter(n => n.priority === 'lagos');
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    getStats() {
        return {
            agege: this.data.news.filter(n => n.priority === 'agege').length,
            lagos: this.data.news.filter(n => n.priority === 'lagos').length,
            pending: this.data.news.filter(n => !n.approved).length
        };
    },
    
    getRecentApproved(limit = 3) {
        return this.data.news
            .filter(n => n.approved)
            .slice(0, limit);
    }
};

// Authentication
const Auth = {
    check() {
        return State.data.auth;
    },
    
    login(password) {
        if (password === CONFIG.password) {
            State.data.auth = true;
            State.save();
            return true;
        }
        return false;
    },
    
    logout() {
        State.data.auth = false;
        State.save();
        Router.go('login');
    }
};

// Routing
const Router = {
    currentPage: 'login',
    
    init() {
        this.checkAuth();
    },
    
    checkAuth() {
        if (!Auth.check() && this.currentPage !== 'login') {
            this.go('login');
        } else if (Auth.check() && this.currentPage === 'login') {
            this.go('home');
        } else {
            this.render();
        }
    },
    
    go(page) {
        this.currentPage = page;
        this.checkAuth();
    },
    
    render() {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        if (this.currentPage === 'login') {
            document.getElementById('auth-screen').classList.remove('hidden');
        } else {
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById(`page-${this.currentPage}`).classList.add('active');
            
            // Update nav
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.page === this.currentPage);
            });
            
            // Page-specific init
            if (this.currentPage === 'home') {
                NewsFilter.render();
            }
        }
    }
};

// News Filter & Display
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
        
        // Update toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Update stats
        document.getElementById('stat-agege').textContent = stats.agege;
        document.getElementById('stat-lagos').textContent = stats.lagos;
        document.getElementById('stat-pending').textContent = stats.pending;
        
        // Render news
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
        const date = new Date(item.createdAt).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
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
                            `<button class="btn btn-success btn-sm" onclick="NewsActions.approve('${item.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                                Approve
                            </button>` :
                            `<button class="btn btn-secondary btn-sm" onclick="NewsActions.revoke('${item.id}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Revoke
                            </button>`
                        }
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="NewsActions.generate('${item.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        Generate
                    </button>
                </div>
            </article>
        `;
    }
};

// News Actions
const NewsActions = {
    approve(id) {
        State.updateNews(id, { approved: true });
        NewsFilter.render();
    },
    
    revoke(id) {
        State.updateNews(id, { approved: false });
        NewsFilter.render();
    },
    
    generate(id) {
        const news = State.data.news.find(n => n.id === id);
        if (!news) return;
        
        // Pre-fill compose page
        document.getElementById('compose-text').value = `${news.title}\n\n${news.content}`;
        Voice.updateCount();
        
        // Switch to compose
        Router.go('compose');
    }
};

// Modal System
const Modal = {
    open(id) {
        document.getElementById(`modal-${id}`).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },
    
    close(id) {
        document.getElementById(`modal-${id}`).classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Form Handling
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
        
        if (Router.currentPage === 'home') {
            NewsFilter.render();
        } else {
            Router.go('home');
        }
    }
};

// Voice System
const Voice = {
    current: 'civic',
    
    set(mode) {
        this.current = mode;
        document.querySelectorAll('.voice-card').forEach(card => {
            card.classList.remove('active');
        });
        event.currentTarget.closest('.voice-card').classList.add('active');
    },
    
    updateCount() {
        const text = document.getElementById('compose-text').value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        document.getElementById('word-count').textContent = `${words.toLocaleString()} words`;
        document.getElementById('char-count').textContent = `${text.length.toLocaleString()} / ${CONFIG.maxChars.toLocaleString()}`;
    }
};

// Content Generator (Voice DNA)
const Generator = {
    proverbs: [
        "Ile la tin ko eso re, ode ni a tin mu wa",
        "Eni a fe lo le, a ki i mo ni iwa",
        "Ajo o dabi ile, sugbon a le daa si",
        "Bi a ba n gunyan ni a o maa gun owo",
        "Owore ile ki i se owo ode"
    ],
    
    run() {
        const text = document.getElementById('compose-text').value;
        if (!text.trim()) {
            alert('Please enter content to generate');
            return;
        }
        
        const correlate = document.getElementById('correlate-news').checked;
        const mode = Voice.current;
        
        // Show loading
        this.showLoading();
        
        // Simulate generation delay
        setTimeout(() => {
            const contextNews = correlate ? State.getRecentApproved(3) : [];
            const outputs = this.generate(text, mode, contextNews);
            this.renderOutputs(outputs);
        }, 800);
    },
    
    showLoading() {
        const container = document.getElementById('tabs-content');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Generating 10 platform formats...</span>
            </div>
        `;
    },
    
    generate(text, mode, contextNews) {
        const outputs = {};
        const platforms = ['blog', 'newsletter', 'whatsapp', 'instagram', 'facebook', 'linkedin', 'tiktok', 'snapchat', 'x', 'rednote'];
        
        platforms.forEach(platform => {
            outputs[platform] = this.generateForPlatform(platform, text, mode, contextNews);
        });
        
        return outputs;
    },
    
    generateForPlatform(platform, text, mode, contextNews) {
        const isCivic = mode === 'civic';
        const proverb = this.proverbs[Math.floor(Math.random() * this.proverbs.length)];
        const context = contextNews.length > 0 ? 
            `\n\nDrawing from recent developments including ${contextNews[0].title.toLowerCase()}, we connect these threads to our ongoing community narrative.` : '';
        
        switch(platform) {
            case 'blog':
                return isCivic ? 
                    `We commend the thoughtful consideration evident in recent developments affecting our community.\n\n${text}${context}\n\nFurthermore, it is imperative that we acknowledge the sustained efforts of administrative bodies in addressing the infrastructural needs of Agege Local Government Area. From Ogba to Orile Agege, residents continue to demonstrate the resilience that characterizes our community.\n\nConsequently, we remain committed to providing accurate reportage that serves the true interests of the Agege people.` :
                    `"${proverb}"\n\nMy brothers and sisters in Agege, as we gather in spirit across our beloved Local Government—from the hardworking traders to the dedicated students—I invite you to reflect on these developments.\n\n${text}${context}\n\nThe spirit of our community has always been one of resilience and unity. Like the ancient iroko tree that withstands the storm, so too does Agege stand strong because we are interconnected.\n\nLet us embrace these changes with the wisdom of our forebears. May peace and prosperity continue to find a home in every household from Abule Egba to Oko-Oba.`;
            
            case 'newsletter':
                return isCivic ?
                    `Subject: Agege Civic Chronicle - Official Community Update\n\nDear Resident,\n\nWe bring you formal notification of developments affecting our Local Government Area.\n\n${text}${context}\n\nWe remain committed to transparent reportage and civic engagement.\n\nBest regards,\nOlogundudu Chronicle Team` :
                    `Subject: From the Heart of Agege - Weekly Reflection\n\nGreetings neighbor,\n\nAs the elders say, "${proverb}"\n\n${text}${context}\n\nWalk in wisdom and community spirit.\n\nWith care,\nOlogundudu Team`;
            
            case 'whatsapp':
                return isCivic ?
                    `*Agege Civic Chronicle Update*\n\n${text.substring(0, 300)}${text.length > 300 ? '...' : ''}${context}\n\nPlease share with neighbors. For verification, contact our editorial team.\n\n_Forwarded from Ologundudu Chronicle_` :
                    `*Word from Agege* 🌳\n\n${text.substring(0, 300)}${text.length > 300 ? '...' : ''}${context}\n\nRemember: "${proverb}"\n\nLet's keep supporting one another. Unity is strength.\n\n#Agege #Community`;
            
            case 'instagram':
                const excerpt = text.substring(0, 120);
                return isCivic ?
                    `Official community update 📋\n\n${excerpt}...\n\nSwipe for details →\n\nStay informed. Stay engaged.\n\n#Agege #OrileAgege #LagosPolitics #CivicDuty #CommunityFirst #AgegeLGA` :
                    `From our hearts to yours 💚\n\n${excerpt}...\n\n"${proverb}"\n\nTogether we rise. Together we thrive.\n\n#Agege #CommunityLove #Ologundudu #Lagos`;
            
            case 'facebook':
                return isCivic ?
                    `OFFICIAL AGEGE CIVIC UPDATE\n\n${text}${context}\n\nWe encourage all Agege residents to share their thoughts respectfully below. Constructive dialogue strengthens our democracy.\n\n#AgegeCommunity #CivicEngagement` :
                    `A Thought for Our Community\n\n${text}${context}\n\n"${proverb}"\n\nWhat are your thoughts, neighbors? How can we support one another better?\n\nBlessings to all Agege families. 🙏`;
            
            case 'linkedin':
                return isCivic ?
                    `Policy Update: Agege Local Government Area\n\n${text}${context}\n\nKey implications for stakeholders:\n• Infrastructure development trajectory\n• Community resource allocation\n• Long-term urban planning considerations\n\nProfessionals and policy enthusiasts are invited to engage with data-driven insights below.` :
                    `Community Leadership Reflection: Agege Context\n\n${text}${context}\n\nThe intersection of traditional community values and modern governance offers rich lessons for organizational leadership.\n\n"${proverb}"\n\n#CommunityDevelopment #Leadership #Lagos`;
            
            case 'tiktok':
                return isCivic ?
                    `[VISUAL: Aerial view of Agege streets, Pen Cinema area]\n[AUDIO: Upbeat instrumental]\n\nNARRATOR: "Agege! Important news just dropped..."\n\n[VISUAL: Text overlay with key points]\n"${text.substring(0, 100)}..."\n\n[VISUAL: Community scenes]\n"Stay informed, stay involved!"\n\n[VISUAL: Ologundudu logo]` :
                    `[VISUAL: Sunset over Agege rooftops]\n[AUDIO: Soft traditional music]\n\nNARRATOR: "${proverb}"\n\n[VISUAL: Slow pan across neighborhoods]\n"${text.substring(0, 100)}..."\n\n[VISUAL: Faces of residents]\n"Home is Agege. And there's no place like it."\n\n[VISUAL: Fade to black]`;
            
            case 'snapchat':
                return isCivic ?
                    `Heads up Agege! 📍\n\n${text.substring(0, 80)}...\n\nTap for full story!` :
                    `Agege fam 💚\n\n${text.substring(0, 80)}...\n\n"${proverb.substring(0, 30)}..."`;
            
            case 'x':
                return isCivic ?
                    `1/ Important update for Agege LGA residents:\n\n${text.substring(0, 110)}...${context}\n\n2/ We remain committed to accurate reportage serving the true interests of Agege people. From Ogba to Orile Agege.\n\n3/ For full details, see our blog. Link in bio.\n\n#Agege #LagosPolitics` :
                    `1/ "${proverb}"\n\n2/ ${text.substring(0, 110)}...${context}\n\n3/ To my neighbors in Abule Egba, Oko-Oba, Iju - let's keep supporting one another.\n\n4/ What does community mean to you? Reply below.\n\n#Agege #CommunityFirst`;
            
            case 'rednote':
                return `I was walking through the familiar streets of Agege this morning, past the early morning traders, past the school children in their uniforms, and I found myself thinking about our community's story.\n\n${text}${context}\n\nThere's something profound about watching a community wake up to its own potential. In the calls of the market women, in the quiet determination of students heading to libraries - there is a narrative of resilience.\n\nWe are Agege. We are more than statistics. We are neighbors, families, dreamers, builders. And our story continues to unfold, written by each of us every single day.`;
            
            default:
                return text;
        }
    },
    
    renderOutputs(outputs) {
        const platforms = Object.keys(outputs);
        const headers = document.getElementById('tabs-header');
        const content = document.getElementById('tabs-content');
        
        // Build tabs
        headers.innerHTML = platforms.map((p, i) => 
            `<button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="Generator.switchTab('${p}')" data-platform="${p}">${this.formatLabel(p)}</button>`
        ).join('');
        
        // Build panes
        content.innerHTML = platforms.map((p, i) => 
            `<div class="tab-pane ${i === 0 ? 'active' : ''}" id="pane-${p}">
                <div class="output-header">
                    <div>
                        <div class="output-title">${this.formatLabel(p)}</div>
                        <div class="output-desc">${this.getDescription(p)}</div>
                    </div>
                    <button class="btn-copy" onclick="Generator.copy('${p}')">Copy</button>
                </div>
                <div class="output-box" id="output-${p}">${outputs[p]}</div>
            </div>`
        ).join('');
        
        // Store for copying
        this._outputs = outputs;
    },
    
    switchTab(platform) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(`pane-${platform}`).classList.add('active');
    },
    
    copy(platform) {
        const text = this._outputs[platform];
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
    
    formatLabel(platform) {
        const labels = {
            x: 'X (Twitter)',
            rednote: 'RedNote'
        };
        return labels[platform] || platform.charAt(0).toUpperCase() + platform.slice(1);
    },
    
    getDescription(platform) {
        const descs = {
            blog: 'Full article, 800-1200 words',
            newsletter: 'Email format with subject',
            whatsapp: 'Mobile messaging style',
            instagram: 'Caption with hashtags',
            facebook: 'Community post format',
            linkedin: 'Professional, policy-focused',
            tiktok: '60s video script with cues',
            snapchat: 'Brief update under 100 chars',
            x: 'Thread format (1/, 2/, etc.)',
            rednote: 'Narrative storytelling'
        };
        return descs[platform] || '';
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    State.init();
    Router.init();
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        if (Auth.login(password)) {
            Router.go('home');
        } else {
            document.getElementById('auth-error').classList.remove('hidden');
        }
    });
    
    // Add news form
    document.getElementById('form-add-news').addEventListener('submit', Form.submit);
    
    // Compose textarea
    document.getElementById('compose-text').addEventListener('input', () => Voice.updateCount());
    
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        }
    });
});

// Expose globals for onclick handlers
window.Router = Router;
window.Auth = Auth;
window.Modal = Modal;
window.Form = Form;
window.NewsFilter = NewsFilter;
window.NewsActions = NewsActions;
window.Voice = Voice;
window.Generator = Generator;
