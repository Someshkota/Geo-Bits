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

function createVisualizationCard(viz) {
    // create card element
    const card = document.createElement('div');
    card.className = 'viz-card';

    // preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'viz-card__preview';
    if (viz.imageUrl) {
        const img = document.createElement('img');
        img.className = 'viz-card__image';
        img.src = viz.imageUrl;
        img.alt = viz.title || 'Visualization';
        img.onerror = function () {
            this.onerror = null;
            this.src = 'Assets/images/placeholder.png';
        };
        previewDiv.appendChild(img);
    } else {
        const txt = document.createElement('div');
        txt.className = 'viz-card__preview-text';
        txt.textContent = 'No preview';
        previewDiv.appendChild(txt);
    }

    // content area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'viz-card__content';

    const titleEl = document.createElement('h3');
    titleEl.className = 'viz-card__title';
    titleEl.textContent = viz.title || 'Untitled';

    const descEl = document.createElement('p');
    descEl.className = 'viz-card__description';
    descEl.textContent = viz.preview || '';

    const metaDiv = document.createElement('div');
    metaDiv.className = 'viz-card__meta';

    const catSpan = document.createElement('span');
    catSpan.className = 'viz-card__category';
    catSpan.textContent = viz.category || '';

    metaDiv.appendChild(catSpan);

    // actions area: View Image (new tab) and Details (modal)
    const actionsWrap = document.createElement('div');
    actionsWrap.style.display = 'flex';
    actionsWrap.style.gap = '8px';
    actionsWrap.style.marginTop = '12px';

    // View Image button (opens image in new tab)
    if (viz.imageUrl) {
        const viewBtn = document.createElement('a');
        viewBtn.className = 'btn btn--sm btn--outline';
        viewBtn.href = viz.imageUrl;
        viewBtn.target = '_blank';
        viewBtn.rel = 'noopener noreferrer';
        viewBtn.textContent = 'View Image';
        // prevent bubbling (not strictly necessary since card not clickable now)
        viewBtn.addEventListener('click', (e) => { e.stopPropagation(); });
        actionsWrap.appendChild(viewBtn);
    }

    // Details button (opens modal)
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn--sm btn--primary';
    detailsBtn.type = 'button';
    detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openVisualizationDetail(viz.id);
    });
    actionsWrap.appendChild(detailsBtn);

    // optional Open Source link if present
    if (viz.externalLink) {
        const sourceLink = document.createElement('a');
        sourceLink.className = 'btn btn--sm btn--outline';
        sourceLink.href = viz.externalLink;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'Open Source';
        sourceLink.addEventListener('click', (e) => e.stopPropagation());
        actionsWrap.appendChild(sourceLink);
    }

    // assemble
    contentDiv.appendChild(titleEl);
    contentDiv.appendChild(descEl);
    contentDiv.appendChild(metaDiv);
    contentDiv.appendChild(actionsWrap);

    card.appendChild(previewDiv);
    card.appendChild(contentDiv);

    return card;
}



function openVisualizationDetail(vizId) {
    showLoading();

    setTimeout(() => {
        // Guards
        if (!appData || !Array.isArray(appData.visualizations)) {
            console.error('No visualization data available for id:', vizId);
            hideLoading();
            modalBody.innerHTML = '<p style="color:var(--color-error)">Visualization data is not available right now.</p>';
            showModal();
            return;
        }

        const viz = appData.visualizations.find(v => v.id === vizId || String(v.id) === String(vizId));
        if (!viz) {
            console.warn('Visualization not found for id:', vizId);
            hideLoading();
            modalBody.innerHTML = '<p style="color:var(--color-text)">Sorry — we couldn\'t find that visualization.</p>';
            breadcrumbCurrent.textContent = 'Not found';
            showModal();
            return;
        }

        breadcrumbCurrent.textContent = viz.title || 'Visualization';

        // Clear modal body
        modalBody.innerHTML = '';

        // --- Preview ---
        const previewDiv = document.createElement('div');
        previewDiv.className = 'detail__preview';

        if (viz.imageUrl) {
            const img = document.createElement('img');
            img.src = viz.imageUrl;
            img.alt = viz.title || 'Visualization';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '12px';
            img.onerror = function () {
                this.onerror = null;
                this.src = 'Assets/images/placeholder.png';
                console.warn('Modal image failed to load:', viz.imageUrl);
            };
            previewDiv.appendChild(img);
        } else {
            const noPreview = document.createElement('div');
            noPreview.className = 'detail__preview-text';
            noPreview.textContent = 'No preview';
            previewDiv.appendChild(noPreview);
        }
        modalBody.appendChild(previewDiv);

        // --- Title ---
        const titleEl = document.createElement('h2');
        titleEl.className = 'detail__title';
        titleEl.textContent = viz.title || 'Untitled';
        modalBody.appendChild(titleEl);

        // --- Description ---
        const desc = document.createElement('div');
        desc.className = 'detail__description';
        desc.innerHTML = viz.detailContent?.description || viz.preview || '';
        modalBody.appendChild(desc);

        // --- Methodology section ---
        const methodologySection = document.createElement('div');
        methodologySection.className = 'detail__section';
        methodologySection.innerHTML = `<h3 class="detail__section-title">Methodology</h3>
                                   <div class="detail__methodology"><p>${viz.detailContent?.methodology || 'Not provided.'}</p></div>`;
        modalBody.appendChild(methodologySection);

        // --- Key insights ---
        const insightsSection = document.createElement('div');
        insightsSection.className = 'detail__section';
        insightsSection.innerHTML = `<h3 class="detail__section-title">Key Insights</h3>`;
        const insightsContainer = document.createElement('div');
        insightsContainer.className = 'detail__insights';
        const ul = document.createElement('ul');

        const insightsArr = (viz.detailContent && Array.isArray(viz.detailContent.keyInsights))
            ? viz.detailContent.keyInsights
            : ['No insights available.'];

        insightsArr.forEach(ins => {
            const li = document.createElement('li');
            li.textContent = ins;
            ul.appendChild(li);
        });

        insightsContainer.appendChild(ul);
        insightsSection.appendChild(insightsContainer);
        modalBody.appendChild(insightsSection);

        // --- Data Source ---
        const dataSourceSection = document.createElement('div');
        dataSourceSection.className = 'detail__section';
        dataSourceSection.innerHTML = `<h3 class="detail__section-title">Data Source</h3>
                                   <p><strong>${viz.dataSource || 'Unknown source'}</strong> - ${viz.publishDate || ''}</p>`;
        modalBody.appendChild(dataSourceSection);

        // --- Actions ---
        const actions = document.createElement('div');
        actions.className = 'detail__actions';

        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn btn--primary';
        shareBtn.textContent = 'Share';
        shareBtn.addEventListener('click', () => shareVisualization(viz.title || ''));

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'btn btn--secondary';
        bookmarkBtn.textContent = 'Bookmark';
        bookmarkBtn.addEventListener('click', () => bookmarkVisualization(viz.id));

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn--outline';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', () => downloadVisualization(viz.id));

        actions.appendChild(shareBtn);
        actions.appendChild(bookmarkBtn);
        actions.appendChild(downloadBtn);

        // External link (only if provided)
        if (viz.externalLink) {
            const linkA = document.createElement('a');
            linkA.className = 'btn btn--outline';
            linkA.href = viz.externalLink;
            linkA.target = '_blank';
            linkA.rel = 'noopener noreferrer';
            linkA.textContent = 'Open Source Page';
            // stopPropagation not needed here because the modal content isn't the clickable card,
            // but adding it is harmless
            linkA.addEventListener('click', (e) => { e.stopPropagation(); });
            actions.appendChild(linkA);
        } else {
            console.info('No externalLink for viz id', vizId);
        }

        modalBody.appendChild(actions);

        hideLoading();
        showModal();
    }, 200);
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

// Safe load for visualization data: prefer appData.visualizations from data.json,
// otherwise try to fetch a fallback file. Always call renderVisualizations() once done.
(async function loadVisualizationsIfNeeded() {
    try {
        // If visualizations already came inside data.json when loadDataAndRender ran, use them
        if (appData && Array.isArray(appData.visualizations) && appData.visualizations.length > 0) {
            // already available
            renderVisualizations();
            return;
        }

        // Otherwise try to fetch a fallback JSON file (adjust path if needed)
        const resp = await fetch('data/visualizations.json');
        if (!resp.ok) {
            console.warn('No data/visualizations.json found (status ' + resp.status + '). Falling back to empty visualizations.');
            appData.visualizations = appData.visualizations || [];
            renderVisualizations();
            return;
        }

        const data = await resp.json();
        appData.visualizations = data.visualizations || [];
        renderVisualizations();

    } catch (err) {
        console.error('Error loading visualizations fallback:', err);
        appData.visualizations = appData.visualizations || [];
        renderVisualizations();
    }
})();



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

// Robust client-side search that targets multiple sections (visualizations + article lists)
// Paste this at the end of app.js (replace any earlier search code)
(function setupSiteSearch() {
    const input = document.querySelector('.search-input');
    if (!input) return;

    // Containers we will look through (add more selectors if your markup uses different names)
    const containerSelectors = [
        '.visualization-grid',
        '.news-grid',
        '.latest-articles',
        '.posts-grid',
        '.articles-grid',
        '.latest-grid',
        '.news-list'
    ];

    // Card selectors to try inside each container (order matters: more specific first)
    const cardSelectors = [
        '.viz-card',
        '.post-card',
        '.news-item',
        '.article-card',
        '.card',
        '.item'
    ];

    let timer = null;
    const debounce = (fn, wait = 220) => {
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    };

    function findContainerElements() {
        // build an array of actual container DOM nodes that exist on the page
        return containerSelectors
            .map(sel => document.querySelector(sel))
            .filter(Boolean);
    }

    function findCardsInContainer(container) {
        for (const sel of cardSelectors) {
            const found = container.querySelectorAll(sel);
            if (found && found.length) return Array.from(found);
        }
        // fallback: use direct children that look like cards
        return Array.from(container.children).filter(c => c.nodeType === 1);
    }

    function setNoResultsMessage(container, text) {
        // use an id tied to the container to avoid duplicates
        const id = 'no-search-results-' + (container.dataset.searchId || (container.dataset.searchId = Math.random().toString(36).slice(2)));
        let msg = document.getElementById(id);
        if (!text) {
            if (msg) msg.remove();
            return;
        }
        if (!msg) {
            msg = document.createElement('div');
            msg.id = id;
            msg.className = 'no-search-results';
            msg.style.color = 'var(--color-text-secondary)';
            msg.style.padding = '18px 12px';
            msg.style.textAlign = 'center';
            container.parentNode.insertBefore(msg, container.nextSibling);
        }
        msg.textContent = text;
    }

    function runSearch() {
        const q = input.value.trim().toLowerCase();
        const containers = findContainerElements();

        // if no known containers found, fallback to searching the whole page for ".viz-card" and any common article selectors
        if (!containers.length) {
            const fallback = document.querySelectorAll('.viz-card, .post-card, .news-item, .article-card');
            if (!fallback.length) return;
            Array.from(fallback).forEach(card => {
                const text = (card.innerText || '').toLowerCase();
                card.style.display = (!q || text.includes(q)) ? '' : 'none';
            });
            // no global no-results messaging here
            return;
        }

        // For each container, hide/show its cards and show a per-container no-results message if needed
        containers.forEach(container => {
            const cards = findCardsInContainer(container);
            if (!cards.length) {
                setNoResultsMessage(container, q ? `No results for "${q}"` : '');
                return;
            }

            let anyVisible = false;
            cards.forEach(card => {
                const titleNodes = card.querySelectorAll('h1,h2,h3,h4,.viz-card__title,.post-title,.post-card__title');
                let titleText = '';
                if (titleNodes && titleNodes.length) {
                    titleText = Array.from(titleNodes).map(n => (n.textContent || '')).join(' ').toLowerCase();
                }
                const fullText = (card.innerText || '').toLowerCase();
                const matches = !q || titleText.includes(q) || fullText.includes(q);
                card.style.display = matches ? '' : 'none';
                if (matches) anyVisible = true;
            });

            setNoResultsMessage(container, anyVisible ? '' : (q ? `No results for "${q}"` : ''));
        });
    }

    // Run search after small delay to allow dynamic rendering to finish (e.g., after visual cards are created)
    const debouncedRun = debounce(runSearch, 180);

    // Hook input
    input.addEventListener('input', debouncedRun);

    // Also run once on load in case there is an initial value in the search box
    window.addEventListener('load', () => setTimeout(runSearch, 300));
})();
