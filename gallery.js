// gallery.js — Combined slider + thumbnails + full gallery (single IIFE)
(async function () {
    const viewport = document.getElementById('galleryViewport');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const controlsWrap = document.getElementById('galleryControls');
    const metaEl = document.getElementById('galleryMeta');
    const thumbStrip = document.getElementById('thumbStrip');
    const fullGalleryGrid = document.getElementById('fullGalleryGrid');

    // load data.json
    let appData = { visualizations: [] };
    try {
        const resp = await fetch('data.json');
        if (resp.ok) appData = await resp.json();
    } catch (err) {
        console.error('Failed to load data.json', err);
    }

    const items = Array.isArray(appData.visualizations) ? appData.visualizations : [];
    if (!items.length) {
        if (viewport) viewport.innerHTML = '<div style="padding:32px;color:var(--color-text-secondary);">No visuals available.</div>';
        if (thumbStrip) thumbStrip.innerHTML = '';
        if (fullGalleryGrid) fullGalleryGrid.innerHTML = '';
        return;
    }

    // build DOM: track with three slides (prev, current, next)
    if (!viewport) {
        console.error('galleryViewport not found in DOM.');
        return;
    }
    viewport.innerHTML = ''; // clear
    const track = document.createElement('div');
    track.className = 'gallery-track';
    viewport.appendChild(track);

    // helper to create slide element (returns a slide element with img inside)
    const createSlide = (item) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        const img = document.createElement('img');
        img.alt = item.title || 'Visualization';
        img.src = item.imageUrl || '';
        img.onerror = () => { img.src = 'Assets/images/placeholder.png'; };
        slide.appendChild(img);
        return slide;
    };

    let index = 0;
    // we will keep three slide DOM nodes to animate efficiently
    const slides = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
    slides.forEach(s => s.className = 'gallery-slide');
    slides.forEach(s => track.appendChild(s));

    // populate the three slides (prev, current, next)
    function populateSlides() {
        const prevIndex = (index - 1 + items.length) % items.length;
        const nextIndex = (index + 1) % items.length;
        slides[0].innerHTML = '';
        slides[0].appendChild(createSlide(items[prevIndex]).firstChild.cloneNode(true));
        slides[1].innerHTML = '';
        slides[1].appendChild(createSlide(items[index]).firstChild.cloneNode(true));
        slides[2].innerHTML = '';
        slides[2].appendChild(createSlide(items[nextIndex]).firstChild.cloneNode(true));
        // reset transform to center slide (index 1)
        track.style.transform = 'translateX(-100%)';
    }

    // initial populate
    populateSlides();
    track.style.transition = 'none';
    track.style.transform = 'translateX(-100%)';
    requestAnimationFrame(() => { track.style.transition = ''; });

    let isAnimating = false;

    // render control buttons below main viewport
    function renderControls(item) {
        if (!controlsWrap) return;
        controlsWrap.innerHTML = '';
        if (item.imageUrl) {
            const viewBtn = document.createElement('a');
            viewBtn.className = 'btn btn--outline';
            viewBtn.textContent = 'View Image';
            viewBtn.href = item.imageUrl;
            viewBtn.target = '_blank';
            viewBtn.rel = 'noopener noreferrer';
            controlsWrap.appendChild(viewBtn);
        }

        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'btn btn--primary';
        detailsBtn.textContent = 'Details';
        detailsBtn.addEventListener('click', () => {
            if (typeof openVisualizationDetail === 'function') openVisualizationDetail(items[index].id);
            else alert('Details not available.');
        });
        controlsWrap.appendChild(detailsBtn);

        if (item.externalLink) {
            const sourceBtn = document.createElement('a');
            sourceBtn.className = 'btn btn--outline';
            sourceBtn.textContent = 'Open Source';
            sourceBtn.href = item.externalLink;
            sourceBtn.target = '_blank';
            sourceBtn.rel = 'noopener noreferrer';
            controlsWrap.appendChild(sourceBtn);
        }

        if (metaEl) metaEl.textContent = `${index + 1} / ${items.length} — ${item.title || ''} ${item.dataSource ? ' • ' + item.dataSource : ''}`;
    }

    // animation duration (single declaration)
    const animationDuration = 520; // ms (keep in sync with CSS)

    // slideTo uses transitionend to avoid flicker
    function slideTo(delta) {
        if (isAnimating) return;
        isAnimating = true;
        const direction = delta > 0 ? 1 : -1;
        track.style.transition = `transform ${animationDuration}ms cubic-bezier(.16,1,.3,1)`;
        track.style.transform = (direction > 0) ? 'translateX(-200%)' : 'translateX(0%)';

        const onTransitionEnd = (ev) => {
            if (ev.propertyName !== 'transform') return;
            track.removeEventListener('transitionend', onTransitionEnd);

            index = (index + delta + items.length) % items.length;

            populateSlides();

            track.style.transition = 'none';
            track.style.transform = 'translateX(-100%)';
            // force reflow
            // eslint-disable-next-line no-unused-expressions
            track.offsetHeight;

            requestAnimationFrame(() => {
                track.style.transition = '';
                isAnimating = false;
            });

            renderControls(items[index]);
            // update thumbnail / full gallery active states if present
            updateActiveThumbnail();
            updateFullGalleryActive();
        };

        track.addEventListener('transitionend', onTransitionEnd);
    }

    // bind nav
    if (prevBtn) prevBtn.addEventListener('click', () => slideTo(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => slideTo(1));

    // keyboard nav
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') slideTo(-1);
        if (e.key === 'ArrowRight') slideTo(1);
    });

    // touch swipe
    let startX = null;
    viewport.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
    viewport.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 40) slideTo(-1);
        else if (dx < -40) slideTo(1);
        startX = null;
    });

    // preload neighbors
    function preload(idx) {
        [idx, (idx + 1) % items.length, (idx - 1 + items.length) % items.length].forEach(i => {
            const url = items[i].imageUrl;
            if (!url) return;
            const im = new Image();
            im.src = url;
        });
    }
    preload(index);

    // initial render controls
    renderControls(items[index]);

    /********** Thumbnail strip (3 across) **********/
    function getThumbUrl(item) {
        if (!item) return '';
        if (item.thumb400) return item.thumb400;
        if (!item.imageUrl) return '';
        const url = item.imageUrl;
        if (url.match(/-400w/i) || url.match(/thumb-400/i)) return url;
        const m = url.match(/^(.*?)(\.[a-zA-Z0-9]+)$/);
        if (!m) return url;
        const base = m[1];
        return base + '-400w.webp';
    }

    function renderThumbnails() {
        if (!thumbStrip) return;
        thumbStrip.innerHTML = '';
        items.forEach((it, idx) => {
            const card = document.createElement('div');
            card.className = 'thumb-card';
            card.dataset.index = idx;

            const img = document.createElement('img');
            img.alt = it.title || 'Visual thumbnail';
            img.src = getThumbUrl(it) || it.imageUrl || 'Assets/images/placeholder.png';
            img.onerror = () => {
                if (img.src !== it.imageUrl) img.src = it.imageUrl || 'Assets/images/placeholder.png';
            };

            card.appendChild(img);
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                goToIndex(idx);
            });

            thumbStrip.appendChild(card);
        });

        updateActiveThumbnail();
    }

    function updateActiveThumbnail() {
        if (!thumbStrip) return;
        const nodes = thumbStrip.querySelectorAll('.thumb-card');
        nodes.forEach(n => n.classList.remove('active'));
        const active = thumbStrip.querySelector(`.thumb-card[data-index="${index}"]`);
        if (active) active.classList.add('active');
        if (active && typeof active.scrollIntoView === 'function') {
            active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    function renderFullGallery() {
        if (!fullGalleryGrid) return;
        fullGalleryGrid.innerHTML = '';

        // show exactly 6 cards (2 rows × 3 columns)
        const SLOTS = 6;

        for (let slot = 0; slot < SLOTS; slot++) {
            const item = items[slot];
            const card = document.createElement('div');
            card.className = 'full-card';
            card.dataset.index = slot;

            if (item) {
                /* ---------------- IMAGE ------------------- */
                const img = document.createElement('img');
                img.src = item.thumb400
                    ? item.thumb400
                    : item.imageUrl
                        ? item.imageUrl.replace(/\.[a-z]+$/i, "-400w.webp")
                        : "";
                img.alt = item.title || "Visual";
                img.onerror = () => { img.src = item.imageUrl || "Assets/images/placeholder.png"; };
                card.appendChild(img);

                /* ---------------- TITLE ------------------- */
                const title = document.createElement('div');
                title.className = 'full-card-title';
                title.textContent = item.title || "Untitled Visual";
                card.appendChild(title);

                /* ---------------- DESCRIPTION ------------------- */
                const desc = document.createElement('div');
                desc.className = 'full-card-description';
                desc.textContent = item.summary || "A comparative visualization...";
                card.appendChild(desc);

                /* ---------------- CATEGORY TAG ------------------- */
                if (item.tags && item.tags.length > 0) {
                    const tag = document.createElement('span');
                    tag.className = 'full-card-tag';
                    tag.textContent = item.tags[0];
                    card.appendChild(tag);
                }

                /* ---------------- BUTTON ROW ------------------- */
                const btnRow = document.createElement('div');
                btnRow.className = 'full-card-buttons';

                // View Image
                const viewBtn = document.createElement('a');
                viewBtn.className = 'btn btn--outline small-btn';
                viewBtn.href = item.imageUrl;
                viewBtn.target = "_blank";
                viewBtn.textContent = "View Image";

                // Details
                const detailsBtn = document.createElement('button');
                detailsBtn.className = 'btn btn--primary small-btn';
                detailsBtn.textContent = "Details";
                detailsBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openVisualizationDetail(item.id);
                });

                // Open Source
                if (item.externalLink) {
                    const sourceBtn = document.createElement('a');
                    sourceBtn.className = 'btn btn--outline small-btn';
                    sourceBtn.href = item.externalLink;
                    sourceBtn.target = "_blank";
                    sourceBtn.textContent = "Open Source";
                    btnRow.appendChild(sourceBtn);
                }

                btnRow.appendChild(viewBtn);
                btnRow.appendChild(detailsBtn);
                card.appendChild(btnRow);

                /* ---------------- CLICK CARD TO JUMP ------------------- */
                card.addEventListener("click", () => {
                    goToIndex(slot);
                    window.scrollTo({
                        top: viewport.getBoundingClientRect().top + window.scrollY - 24,
                        behavior: "smooth",
                    });
                });

            } else {
                /* ---------------- EMPTY PLACEHOLDER ------------------- */
                card.classList.add("empty");
                const inner = document.createElement("div");
                inner.className = "placeholder-inner";
                inner.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;">Empty slot</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">
          Add an item in data.json to fill this slot
        </div>`;
                card.appendChild(inner);
            }

            fullGalleryGrid.appendChild(card);
        }

        updateFullGalleryActive();
    }


    function updateFullGalleryActive() {
        if (!fullGalleryGrid) return;
        const cards = fullGalleryGrid.querySelectorAll('.full-card');
        cards.forEach(c => c.classList.remove('active'));
        const active = fullGalleryGrid.querySelector(`.full-card[data-index="${index}"]`);
        if (active) active.classList.add('active');
    }

    /********** Helper: jump to an index (used by thumbnails & full gallery) **********/
    function goToIndex(newIndex) {
        if (newIndex < 0 || newIndex >= items.length) return;
        // choose shortest direction for animation
        const forwardDistance = (newIndex - index + items.length) % items.length;
        const backwardDistance = (index - newIndex + items.length) % items.length;
        // If direct neighbors, animate one step; otherwise just set index and repopulate instantly
        if (forwardDistance === 1) {
            slideTo(1);
        } else if (backwardDistance === 1) {
            slideTo(-1);
        } else {
            index = newIndex;
            populateSlides();
            renderControls(items[index]);
            updateActiveThumbnail();
            updateFullGalleryActive();
        }
    }
    // expose for debugging or external usage
    window.goToIndex = goToIndex;

    // initial render for thumbnails and full gallery (if containers exist)
    renderThumbnails();
    renderFullGallery();

})(); // end IIFE
