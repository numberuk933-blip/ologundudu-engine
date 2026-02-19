// --- State Management ---
let currentNews = [];
let selectedArticle = null;

// --- Setup API Key from Local Storage ---
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

if (localStorage.getItem('openai_key')) {
    apiKeyInput.value = localStorage.getItem('openai_key');
}

saveKeyBtn.addEventListener('click', () => {
    localStorage.setItem('openai_key', apiKeyInput.value);
    alert('API Key saved to your browser safely!');
});

// --- Fetch RSS Logic ---
const fetchRssBtn = document.getElementById('fetchRssBtn');
const rssUrlInput = document.getElementById('rssUrlInput');
const newsFeed = document.getElementById('newsFeed');

fetchRssBtn.addEventListener('click', async () => {
    const rssUrl = rssUrlInput.value;
    if (!rssUrl) return alert('Please enter an RSS URL');

    newsFeed.innerHTML = '<p>Scanning radar...</p>';
    
    try {
        // We use corsproxy to bypass browser restrictions on static sites
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
        const data = await response.json();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.querySelectorAll("item");
        
        currentNews = [];
        newsFeed.innerHTML = '';

        items.forEach((item, index) => {
            if (index > 15) return; // Limit to 15 items
            const title = item.querySelector("title").textContent;
            const link = item.querySelector("link").textContent;
            let description = item.querySelector("description") ? item.querySelector("description").textContent : "No description available.";
            
            // Clean HTML tags from description
            description = description.replace(/<[^>]*>?/gm, '');

            const article = { title, link, description };
            currentNews.push(article);

            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <h3>${title}</h3>
                <p>${description.substring(0, 100)}...</p>
            `;
            card.onclick = () => selectArticle(article);
            newsFeed.appendChild(card);
        });

    } catch (error) {
        newsFeed.innerHTML = '<p style="color:red;">Failed to fetch RSS. The site might block proxies.</p>';
        console.error(error);
    }
});

// --- Article Selection ---
const selectedNewsDiv = document.getElementById('selectedNews');
const generateBtn = document.getElementById('generateBtn');

function selectArticle(article) {
    selectedArticle = article;
    selectedNewsDiv.innerHTML = `
        <h3>${article.title}</h3>
        <p>${article.description}</p>
        <a href="${article.link}" target="_blank" style="color:var(--gold); font-size:0.8rem;">Read Source</a>
    `;
    generateBtn.disabled = false;
}

// --- AI Generation Logic ---
const voiceMode = document.getElementById('voiceMode');
const generatedContentDiv = document.getElementById('generatedContent');
const loadingDiv = document.getElementById('loading');

generateBtn.addEventListener('click', async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) return alert('Please save your OpenAI API key at the top first!');
    if (!selectedArticle) return;

    generateBtn.disabled = true;
    loadingDiv.classList.remove('hidden');
    generatedContentDiv.classList.add('hidden');
    generatedContentDiv.innerHTML = '';

    const mode = voiceMode.value;
    const systemPrompt = `You are 'Ologundudu', the voice of the Agege Civic Chronicle. 
    Rewrite the provided news article into 10 distinct social media formats.
    Current Mode: ${mode === 'civic' ? 'Civic Amplification (Formal, authoritative, community-centric, mobilizing)' : 'Reflective Motivational (Inspirational, focusing on human spirit, uses local Nigerian/Agege proverbs)'}.
    
    You MUST return the response strictly as a JSON object with the following keys exactly:
    "whatsapp", "x", "tiktok", "facebook", "instagram", "linkedin", "youtube", "threads", "telegram", "pinterest".
    Do not include any markdown outside the JSON.`;

    const userPrompt = `Title: ${selectedArticle.title}\nDetails: ${selectedArticle.description}`;

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
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const generations = JSON.parse(data.choices[0].message.content);

        // Render the 10 platforms
        Object.entries(generations).forEach(([platform, text]) => {
            const card = document.createElement('div');
            card.className = 'platform-card';
            card.innerHTML = `
                <h4>${platform}</h4>
                <p>${text}</p>
            `;
            generatedContentDiv.appendChild(card);
        });

        generatedContentDiv.classList.remove('hidden');

    } catch (error) {
        alert('API Error: ' + error.message);
        console.error(error);
    } finally {
        generateBtn.disabled = false;
        loadingDiv.classList.add('hidden');
    }
});

