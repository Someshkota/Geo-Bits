// --- 1. INITIAL VARIABLES ---
let appData = {}; // This will hold our data from data.json
let filteredData = {};
let currentSearchTerm = '';

// --- 2. DOM ELEMENT DECLARATIONS ---
// We declare these early so all functions can access them.
const newsGrid = document.querySelector('.news-grid');
const visualizationGrid = document.querySelector('.visualization-grid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const modal = document.getElementById('detailModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
const loadingSpinner = document.getElementById('loadingSpinner');


// --- 3. INITIALIZE THE APPLICATION ---
document.addEventListener('DOMContentLoaded', function () {
    loadDataAndRender();
    setupEventListeners();
});


// --- 4. CORE FUNCTIONS ---

// Fetches your data.json file
async function loadDataAndRender() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        appData = await response.json();
        filteredData = { ...appData };

        renderNewsArticles();
        renderVisualizations();

    } catch (error) {
        console.error("Could not load data from data.json:", error);
        newsGrid.innerHTML = '<p style="color: red;">Error: Could not load news articles.</p>';
        visualizationGrid.innerHTML = '<p style="color: red;">Error: Could not load visualizations.</p>';
    }
}

// Render News Articles
function renderNewsArticles() {
    if (!filteredData.news_articles) return;
    newsGrid.innerHTML = '';

    filteredData.news_articles.forEach(article => {
        const newsCard = createNewsCard(article);
        newsGrid.appendChild(newsCard);
    });
}

// ** MODIFIED FUNCTION **
// Create News Card - The "Read More" button is now a link
function createNewsCard(article) {
    const card = document.createElement('div');
    card.className = 'news-card';

    const tagsHTML = article.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // The button is now an anchor tag `<a>` that links to the external publication
    // It opens the link in a new tab (`target="_blank"`)
    card.innerHTML = `
        <div class="news-card__header">
            <span class="news-card__source">${article.source}</span>
            <span class="news-card__date">${article.date}</span>
        </div>
        <h3 class="news-card__title">${article.title}</h3>
        <p class="news-card__preview">${article.preview}</p>
        <div class="news-card__meta">
            <span class="news-card__author">By ${article.author}</span>
            <span class="news-card__read-time">${article.readTime}</span>
        </div>
        <div class="news-card__tags">${tagsHTML}</div>
        <a href="${article.externalLink}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">Read More</a>
    `;

    return card;
}

// Render Visualizations
function renderVisualizations() {
    if (!filteredData.visualizations) return;
    visualizationGrid.innerHTML = '';

    filteredData.visualizations.forEach(viz => {
        const vizCard = createVisualizationCard(viz);
        visualizationGrid.appendChild(vizCard);
    });
}

// Create Visualization Card
function createVisualizationCard(viz) {
    const card = document.createElement('div');
    card.className = 'viz-card';
    card.onclick = () => openVisualizationDetail(viz.id);

    card.innerHTML = `
        <div class="viz-card__preview">
            <div class="viz-card__preview-text">📊</div>
        </div>
        <div class="viz-card__content">
            <h3 class="viz-card__title">${viz.title}</h3>
            <p class="viz-card__description">${viz.preview}</p>
            <div class="viz-card__meta">
                <span class="viz-card__category">${viz.category}</span>
                <span class="viz-card__date">${viz.publishDate}</span>
            </div>
            <p class="viz-card__source">Source: ${viz.dataSource}</p>
        </div>
    `;

    return card;
}

// Open Visualization Detail
function openVisualizationDetail(vizId) {
    showLoading();

    setTimeout(() => {
        const viz = appData.visualizations.find(v => v.id === vizId);
        if (!viz) return;

        breadcrumbCurrent.textContent = viz.title;

        const insightsHTML = viz.detailContent.keyInsights
            .map(insight => `<li>${insight}</li>`)
            .join('');

        const relatedHTML = viz.detailContent.relatedViz
            .map(related => `<span class="tag">${related}</span>`)
            .join('');

        modalBody.innerHTML = `
            <div class="detail__preview">
                <div class="detail__preview-text">📊 ${viz.category}</div>
            </div>
            <h2 class="detail__title">${viz.title}</h2>
            <div class="detail__description">${viz.detailContent.description}</div>
            
            <div class="detail__section">
                <h3 class="detail__section-title">Methodology</h3>
                <div class="detail__methodology">
                    <p>${viz.detailContent.methodology}</p>
                </div>
            </div>
            
            <div class="detail__section">
                <h3 class="detail__section-title">Key Insights</h3>
                <div class="detail__insights">
                    <ul>${insightsHTML}</ul>
                </div>
            </div>
            
            <div class="detail__section">
                <h3 class="detail__section-title">Technical Specifications</h3>
                <div class="detail__technical">
                    <p>${viz.detailContent.technicalSpecs}</p>
                </div>
            </div>
            
            <div class="detail__section">
                <h3 class="detail__section-title">Data Source</h3>
                <p><strong>${viz.dataSource}</strong> - ${viz.publishDate}</p>
            </div>
            
            <div class="detail__section">
                <h3 class="detail__section-title">Related Visualizations</h3>
                <div class="detail__related">${relatedHTML}</div>
            </div>
            
            <div class="detail__actions">
                <button class="btn btn--primary" onclick="shareVisualization('${viz.title}')">Share</button>
                <button class="btn btn--secondary" onclick="bookmarkVisualization(${vizId})">Bookmark</button>
                <button class="btn btn--outline" onclick="downloadVisualization(${vizId})">Download</button>
            </div>
        `;

        hideLoading();
        showModal();
    }, 800);
}

// Open News Detail (This function is no longer used by the cards but kept for potential future use)
function openNewsDetail(articleId) {
    showLoading();

    setTimeout(() => {
        const article = appData.news_articles.find(a => a.id === articleId);
        if (!article) return;

        breadcrumbCurrent.textContent = article.title;

        const paragraphs = article.fullContent.split('\n\n')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');

        const tagsHTML = article.tags
            .map(tag => `<span class="tag">${tag}</span>`)
            .join('');

        modalBody.innerHTML = `
            <div class="detail__preview">
                <div class="detail__preview-text">📰 ${article.category}</div>
            </div>
            <h2 class="detail__title">${article.title}</h2>
            <div class="news-card__meta" style="margin-bottom: 24px;">
                <span class="news-card__author">By ${article.author}</span>
                <span class="news-card__source">${article.source}</span>
                <span class="news-card__date">${article.date}</span>
                <span class="news-card__read-time">${article.readTime}</span>
            </div>
            <div class="detail__description">${paragraphs}</div>
            <div class="detail__section">
                <h3 class="detail__section-title">Tags</h3>
                <div class="detail__related">${tagsHTML}</div>
            </div>
            <div class="detail__actions">
                <button class="btn btn--primary" onclick="shareArticle('${article.title}')">Share</button>
                <button class="btn btn--secondary" onclick="bookmarkArticle(${articleId})">Bookmark</button>
            </div>
        `;

        hideLoading();
        showModal();
    }, 600);
}

// Modal Functions
function showModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Loading Functions
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

// Search Functionality
function performSearch(searchTerm) {
    if (!searchTerm.trim()) {
        filteredData = { ...appData };
    } else {
        const term = searchTerm.toLowerCase();

        filteredData.news_articles = appData.news_articles.filter(article =>
            article.title.toLowerCase().includes(term) ||
            article.preview.toLowerCase().includes(term) ||
            article.tags.some(tag => tag.toLowerCase().includes(term)) ||
            article.category.toLowerCase().includes(term)
        );

        filteredData.visualizations = appData.visualizations.filter(viz =>
            viz.title.toLowerCase().includes(term) ||
            viz.preview.toLowerCase().includes(term) ||
            viz.category.toLowerCase().includes(term) ||
            viz.tags.some(tag => tag.toLowerCase().includes(term))
        );
    }

    renderNewsArticles();
    renderVisualizations();
}

// Action Functions
function shareVisualization(title) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Check out this visualization: ${title}`,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(`${title} - ${window.location.href}`)
            .then(() => alert('Link copied to clipboard!'));
    }
}

function shareArticle(title) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Interesting article: ${title}`,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(`${title} - ${window.location.href}`)
            .then(() => alert('Link copied to clipboard!'));
    }
}

function bookmarkVisualization(vizId) {
    const viz = appData.visualizations.find(v => v.id === vizId);
    alert(`"${viz.title}" has been bookmarked!`);
}

function bookmarkArticle(articleId) {
    const article = appData.news_articles.find(a => a.id === articleId);
    alert(`"${article.title}" has been bookmarked!`);
}

function downloadVisualization(vizId) {
    const viz = appData.visualizations.find(v => v.id === vizId);
    alert(`Downloading "${viz.title}" - Feature coming soon!`);
}

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', () => {
        currentSearchTerm = searchInput.value;
        performSearch(currentSearchTerm);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearchTerm = searchInput.value;
            performSearch(currentSearchTerm);
        }
    });

    modalClose.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', hideModal);

    document.getElementById('breadcrumbHome').addEventListener('click', (e) => {
        e.preventDefault();
        hideModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideModal();
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

