const API_BASE = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", async () => {
    await loadHome();
    
    // Restore player state from URL hash on refresh (e.g. #movie/slug)
    const hash = window.location.hash;
    if (hash.startsWith('#movie/')) {
        const slug = hash.replace('#movie/', '');
        if (slug) {
            openPlayer(null, slug);
        }
    }
});

function toggleMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    if (drawer) {
        drawer.classList.toggle('active');
    }
}

function closeMobileDrawer(e) {
    const drawer = document.getElementById('mobile-drawer');
    if (drawer && e.target === drawer) {
        drawer.classList.remove('active');
    }
}

function toggleMobileSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.classList.toggle('mobile-active');
        if (searchBar.classList.contains('mobile-active')) {
            const input = document.getElementById('searchInput');
            if (input) input.focus();
        }
    }
}

// Full YouTube & Netflix Style Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }

    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';
    const keyCode = e.keyCode || e.which;

    // Escape: Close shortcuts modal if open
    if (key === 'escape') {
        const modal = document.getElementById('shortcuts-modal');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            return;
        }
    }
    
    const playerPage = document.getElementById('player-page');
    if (!playerPage || playerPage.classList.contains('hidden') || !player) {
        return;
    }

    // Space (code 'Space', key ' ', keyCode 32) or K: Play / Pause
    if (code === 'Space' || key === ' ' || key === 'k' || keyCode === 32) {
        e.preventDefault();
        e.stopPropagation();
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
        return;
    }

    // F: Toggle Fullscreen
    if (key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (player.fullscreen) {
            player.fullscreen.toggle();
        }
        return;
    }

    // M: Mute / Unmute
    if (key === 'm') {
        e.preventDefault();
        e.stopPropagation();
        player.muted = !player.muted;
        return;
    }

    // C: Toggle Captions
    if (key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        if (player.captions) {
            player.captions.toggle();
        }
        return;
    }

    // ArrowRight: Seek forward 5s
    if (code === 'ArrowRight' || keyCode === 39) {
        e.preventDefault();
        e.stopPropagation();
        player.forward(5);
        return;
    }

    // L: Seek forward 10s
    if (key === 'l') {
        e.preventDefault();
        e.stopPropagation();
        player.forward(10);
        return;
    }

    // ArrowLeft: Seek backward 5s
    if (code === 'ArrowLeft' || keyCode === 37) {
        e.preventDefault();
        e.stopPropagation();
        player.rewind(5);
        return;
    }

    // J: Seek backward 10s
    if (key === 'j') {
        e.preventDefault();
        e.stopPropagation();
        player.rewind(10);
        return;
    }

    // ArrowUp: Volume Up +10%
    if (code === 'ArrowUp' || keyCode === 38) {
        e.preventDefault();
        e.stopPropagation();
        player.volume = Math.min(1, player.volume + 0.1);
        return;
    }

    // ArrowDown: Volume Down -10%
    if (code === 'ArrowDown' || keyCode === 40) {
        e.preventDefault();
        e.stopPropagation();
        player.volume = Math.max(0, player.volume - 0.1);
        return;
    }

    // Number keys 0-9: Seek to percentage (0% - 90%)
    if (key >= '0' && key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const pct = parseInt(key) * 10;
        if (player.duration) {
            player.currentTime = (player.duration * pct) / 100;
        }
        return;
    }
}, true);

function onLogoClick() {
    closePlayer();
    loadHome();
}

function showLoader() {
    document.getElementById('main-loader').classList.add('active');
    document.getElementById('content-area').innerHTML = '';
}

function hideLoader() {
    document.getElementById('main-loader').classList.remove('active');
}

async function loadHome() {
    showLoader();
    try {
        const response = await fetch(`${API_BASE}/home`);
        const data = await response.json();
        hideLoader();
        renderHome(data.sections);
    } catch (error) {
        hideLoader();
        document.getElementById('content-area').innerHTML = `<p style="color:#ff3d71">Error loading home: ${error.message}</p>`;
    }
}

function renderHome(sections) {
    const contentArea = document.getElementById('content-area');
    let html = '';

    sections.forEach(section => {
        if (section.section === 'Banner' && section.items.length > 0) {
            const banner = section.items[0];
            html += `
                <div class="banner-container">
                    <div class="banner-slide active" style="background-image: url('${banner.poster_url}')">
                        <div class="banner-content">
                            <h2 class="banner-title">${banner.name}</h2>
                            <button class="banner-btn" onclick="openPlayer('${banner.subject_id}', '${banner.slug || ''}')">
                                ▶ Play Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (section.items.length > 0) {
            html += `
                <h3 class="section-title">${section.section}</h3>
                <div class="movie-grid">
                    ${section.items.map(item => `
                        <div class="movie-card" onclick="openPlayer('${item.subject_id}', '${item.slug || ''}')">
                            ${item.badge ? `<div class="badge">${item.badge}</div>` : ''}
                            <img src="${item.poster_url || ''}" class="movie-poster" alt="${item.name}">
                            <div class="movie-info">
                                <div class="movie-title">${item.name}</div>
                                <div class="movie-meta">
                                    <span>${item.rating ? '⭐ ' + item.rating : ''}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });

    contentArea.innerHTML = html;
}

async function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim();
        if (query) {
            showLoader();
            try {
                const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                hideLoader();
                renderSearch(data.items, query);
            } catch (error) {
                hideLoader();
                document.getElementById('content-area').innerHTML = `<p style="color:#ff3d71">Search failed: ${error.message}</p>`;
            }
        }
    }
}

function renderSearch(items, query) {
    const contentArea = document.getElementById('content-area');
    let html = `<h3 class="section-title">Search Results for "${query}"</h3>`;
    
    if (items.length === 0) {
        html += `<p>No results found.</p>`;
    } else {
        html += `<div class="movie-grid">`;
        html += items.map(item => `
            <div class="movie-card" onclick="openPlayer('${item.subject_id}', '${item.slug || ''}')">
                <img src="${item.poster_url || ''}" class="movie-poster" alt="${item.name}">
                <div class="movie-info">
                    <div class="movie-title">${item.name}</div>
                </div>
            </div>
        `).join('');
        html += `</div>`;
    }
    contentArea.innerHTML = html;
}

let currentSubjectId = null;
let currentSlug = null;
let hlsInstance = null;
let player = null;

function destroyPlayer() {
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    if (player) {
        player.destroy();
        player = null;
    }
}

function resetVideoElement() {
    destroyPlayer();
    const container = document.getElementById('player-container');
    if (container) {
        container.innerHTML = '<video id="video-player" class="player" playsinline crossorigin="anonymous" preload="auto"></video>';
    }
    return document.getElementById('video-player');
}

async function openPlayer(subjectId, slug) {
    if (!slug) return;
    
    // Update URL hash to preserve state on refresh
    window.location.hash = 'movie/' + slug;
    
    const playerPage = document.getElementById('player-page');
    const msg = document.getElementById('player-message');
    const metaTitle = document.getElementById('meta-title');
    
    currentSlug = slug;
    currentSubjectId = subjectId;
    
    metaTitle.textContent = "Loading...";
    document.getElementById('meta-desc').textContent = "";
    document.getElementById('meta-year').textContent = "";
    document.getElementById('meta-genres-val').textContent = "";
    document.getElementById('meta-rating-val').textContent = "8.0";

    document.getElementById('app').style.display = 'none';
    playerPage.classList.remove('hidden');
    
    requestAnimationFrame(() => {
        playerPage.classList.add('active');
    });

    msg.innerHTML = '<div class="loader active" style="margin:0 auto 15px auto; display:block;"></div><p style="margin-top: 15px; font-weight:600;">Loading Details...</p>';
    
    try {
        const detailResponse = await fetch(`${API_BASE}/detail/${encodeURIComponent(slug)}`);
        const result = await detailResponse.json();
        const data = result.data || {};
        const subject = data.subject || {};
        
        currentSubjectId = subject.subjectId || subjectId;
        
        metaTitle.textContent = subject.title || 'Unknown Title';
        document.getElementById('meta-rating-val').textContent = subject.imdbRatingValue || '8.0';
        document.getElementById('meta-desc').textContent = subject.description || '';
        
        if (subject.releaseDate) {
            document.getElementById('meta-year').textContent = subject.releaseDate.substring(0, 10);
        }
        
        const typeName = subject.typeName || '';
        const genres = (subject.genres || []).map(g => g.name).join(' / ');
        const area = (subject.areaList || []).map(a => a.name).join(' / ');
        let descLine = [area, typeName, genres].filter(Boolean).join(' / ');
        
        const genresVal = document.getElementById('meta-genres-val');
        if (genresVal) genresVal.textContent = descLine;
        
        let seasons = [];
        if (data.resource && data.resource.seasons && data.resource.seasons.length > 0) {
            seasons = data.resource.seasons;
        }

        const seasonSelect = document.getElementById('season-select');
        if (seasons.length > 0) {
            seasonSelect.style.display = 'block';
            seasonSelect.innerHTML = '';
            seasons.forEach((seasonObj) => {
                const opt = document.createElement('option');
                opt.value = seasonObj.se;
                opt.textContent = 'Season ' + (seasonObj.se < 10 ? '0' + seasonObj.se : seasonObj.se);
                opt.dataset.maxep = seasonObj.maxEp;
                seasonSelect.appendChild(opt);
            });
            
            seasonSelect.onchange = function() {
                const selectedOpt = seasonSelect.options[seasonSelect.selectedIndex];
                const maxEp = parseInt(selectedOpt.dataset.maxep);
                const se = parseInt(selectedOpt.value);
                renderEpisodes(maxEp, se);
                playStream(currentSubjectId, currentSlug, se, 1);
            };
            
            renderEpisodes(seasons[0].maxEp, seasons[0].se);
            playStream(currentSubjectId, currentSlug, seasons[0].se, 1);
        } else {
            seasonSelect.style.display = 'none';
            document.getElementById('episodes-grid').innerHTML = '';
            playStream(currentSubjectId, currentSlug, 0, 0);
        }

    } catch (error) {
        msg.innerHTML = `<span style="color: #ff3d71">Error loading details: ${error.message}</span>`;
    }
}

function renderEpisodes(count, seasonNumber) {
    const epGrid = document.getElementById('episodes-grid');
    epGrid.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const num = i < 10 ? `0${i}` : i;
        const btn = document.createElement('div');
        btn.className = 'ep-box';
        btn.setAttribute('data-ep', i);
        
        if (i === 1) {
            btn.classList.add('active');
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4v11H4zm6-5h4v16h-4zm6 8h4v8h-4z"/></svg>`;
        } else {
            btn.textContent = num;
        }
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ep-box').forEach(b => {
                b.classList.remove('active');
                const epNum = b.getAttribute('data-ep');
                b.textContent = parseInt(epNum) < 10 ? `0${epNum}` : epNum;
            });
            btn.classList.add('active');
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4v11H4zm6-5h4v16h-4zm6 8h4v8h-4z"/></svg>`;
            playStream(currentSubjectId, currentSlug, seasonNumber, i);
        });
        
        epGrid.appendChild(btn);
    }
}

function injectCustomPlyrBadges(playerInstance, defaultRes = 720) {
    setTimeout(() => {
        const controls = playerInstance.elements.controls;
        if (!controls) return;
        
        let infoDiv = controls.querySelector('.plyr-custom-info');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.className = 'plyr-custom-info';
            infoDiv.innerHTML = `
                <button type="button" class="plyr-quality-btn" id="plyr-quality-btn" title="Change Quality">
                    <span id="plyr-quality-txt">${defaultRes}P</span>
                </button>
            `;
            // Insert to the LEFT of Captions icon ([CC])
            const captionsBtn = controls.querySelector('[data-plyr="captions"]');
            if (captionsBtn) {
                controls.insertBefore(infoDiv, captionsBtn);
            } else {
                const settingsBtn = controls.querySelector('[data-plyr="settings"]');
                if (settingsBtn) {
                    controls.insertBefore(infoDiv, settingsBtn);
                } else {
                    controls.appendChild(infoDiv);
                }
            }
        }

        const qBtn = document.getElementById('plyr-quality-btn');
        if (qBtn) {
            qBtn.onclick = (e) => {
                e.stopPropagation();
                const container = playerInstance.elements.container;
                const settingsBtn = controls.querySelector('[data-plyr="settings"]');
                
                if (settingsBtn) {
                    const menuContainer = container ? container.querySelector('.plyr__menu__container') : null;
                    const isMenuOpen = menuContainer && !menuContainer.hidden && menuContainer.style.display !== 'none';
                    
                    if (!isMenuOpen) {
                        settingsBtn.click();
                    }
                    
                    // Directly open Quality panel inside popover menu
                    setTimeout(() => {
                        const targetMenu = container ? container.querySelector('.plyr__menu__container') : null;
                        if (targetMenu) {
                            const qualitySubBtn = targetMenu.querySelector('button[value="quality"]');
                            if (qualitySubBtn) {
                                qualitySubBtn.click();
                            }
                        }
                    }, 40);
                }
            };
        }
        
        playerInstance.on('qualitychange', event => {
            const qTxt = document.getElementById('plyr-quality-txt');
            if (qTxt && event.detail.quality) {
                qTxt.textContent = `${event.detail.quality}P`;
            }
        });
    }, 150);
}

async function fetchStreamData(subjectId, slug, seVal, epVal) {
    const [streamRes, capRes] = await Promise.all([
        fetch(`${API_BASE}/api/stream/${subjectId}?detail_path=${encodeURIComponent(slug)}&se=${seVal}&ep=${epVal}`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/stream/${subjectId}/captions?detail_path=${encodeURIComponent(slug)}&se=${seVal}&ep=${epVal}`).then(r => r.json()).catch(() => ({}))
    ]);
    return { data: streamRes || {}, capData: capRes || {} };
}

async function playStream(subjectId, slug, se=1, ep=1) {
    const msg = document.getElementById('player-message');
    msg.innerHTML = '<div class="loader active" style="margin:0 auto 15px auto; display:block;"></div><p style="margin-top: 15px; font-weight:600;">Locating Stream...</p>';
    
    const video = resetVideoElement();

    try {
        // First try requested se/ep
        let { data, capData } = await fetchStreamData(subjectId, slug, se, ep);
        
        // Automatic Fallback Pipeline for Movies and Shows if initial fetch yields 0 streams
        if (!data.sources?.length && !data.hls?.length) {
            const fallbacks = [
                { s: 0, e: 0 },
                { s: 1, e: 1 },
                { s: 0, e: 1 }
            ];
            for (const fb of fallbacks) {
                if (fb.s === se && fb.e === ep) continue;
                const alt = await fetchStreamData(subjectId, slug, fb.s, fb.e);
                if (alt.data.sources?.length || alt.data.hls?.length) {
                    data = alt.data;
                    capData = alt.capData;
                    break;
                }
            }
        }
        
        if (!data.has_resource && (!data.sources || data.sources.length === 0) && (!data.hls || data.hls.length === 0)) {
            msg.innerHTML = `<span style="color: #ff3d71">${data.note || 'No playable stream found.'}</span>`;
            return;
        }

        // Build Plyr subtitle tracks array
        const plyrTracks = (capData.captions && capData.captions.length > 0)
            ? capData.captions.filter(c => c.url).map((c, idx) => {
                const proxiedCapUrl = `${API_BASE}/api/proxy_caption?url=${encodeURIComponent(btoa(c.url))}`;
                const label = c.lanName || c.lan || 'Subtitle';
                const lang = c.lan || 'en';
                const isDefault = (lang.toLowerCase().includes('en') || idx === 0);
                return {
                    kind: 'captions',
                    label: label,
                    srclang: lang,
                    src: proxiedCapUrl,
                    default: isDefault
                };
            })
            : [];
        
        const subtitleLabels = plyrTracks.map(t => t.label);
        const subsVal = document.getElementById('meta-subs-val');
        if (subsVal && subtitleLabels.length > 0) {
            subsVal.textContent = 'Subtitles: ' + subtitleLabels.slice(0, 8).join(', ');
        }

        // Build DOM track elements
        let tracksHtml = '';
        plyrTracks.forEach(t => {
            tracksHtml += `<track kind="${t.kind}" label="${t.label}" srclang="${t.srclang}" src="${t.src}" ${t.default ? 'default' : ''}>`;
        });

        const parseRes = (r) => {
            if (typeof r === 'number') return r;
            const match = String(r || '').match(/\d+/);
            if (match) return parseInt(match[0]);
            const lower = String(r || '').toLowerCase();
            if (lower.includes('1080') || lower.includes('fhd')) return 1080;
            if (lower.includes('720') || lower.includes('hd')) return 720;
            if (lower.includes('480') || lower.includes('sd')) return 480;
            if (lower.includes('360')) return 360;
            return 720;
        };

        // Check for MP4 sources
        if (data.sources && data.sources.length > 0) {
            const validSources = data.sources.filter(s => s.url);
            if (validSources.length > 0) {
                validSources.sort((a, b) => parseRes(b.resolution) - parseRes(a.resolution));

                const plyrSources = validSources.map((s) => {
                    const qualityNum = parseRes(s.resolution);
                    const proxiedUrl = s.url.startsWith('http') 
                        ? `${API_BASE}/api/proxy_stream?url=${encodeURIComponent(btoa(s.url))}` 
                        : `${API_BASE}${s.url}`;
                    return { src: proxiedUrl, type: 'video/mp4', size: qualityNum };
                });

                let sourcesHtml = '';
                plyrSources.forEach(s => {
                    sourcesHtml += `<source src="${s.src}" type="${s.type}" size="${s.size}">`;
                });

                video.innerHTML = sourcesHtml + tracksHtml;
                msg.innerHTML = '';

                const availableQualities = Array.from(new Set(plyrSources.map(s => s.size))).sort((a,b) => b-a);
                const defaultQuality = availableQualities[0] || 720;

                player = new Plyr(video, {
                    controls: getPlayerControls(),
                    settings: ['captions', 'quality', 'speed'],
                    ratio: '16:9',
                    seekTime: 5,
                    resetOnEnd: false,
                    invertTime: false,
                    keyboard: { focused: false, global: true },
                    captions: { active: true, language: 'auto', update: true },
                    quality: {
                        default: defaultQuality,
                        options: availableQualities.length > 0 ? availableQualities : [1080, 720, 480, 360],
                        forced: true
                    }
                });

                player.source = {
                    type: 'video',
                    sources: plyrSources,
                    tracks: plyrTracks
                };

                player.on('canplay', () => {
                    if (player.captions) {
                        player.captions.active = true;
                    }
                });

                injectCustomPlyrBadges(player, defaultQuality);
                attachProgressTracker(subjectId, se, ep);
                player.play().catch(e => console.log("Autoplay deferred:", e));
                return;
            }
        }

        // Fallback to HLS
        if (data.hls && data.hls.length > 0) {
            const hlsUrl = typeof data.hls[0] === 'string' ? data.hls[0] : (data.hls[0].url || data.hls[0]);
            const proxiedStreamUrl = hlsUrl.startsWith('http')
                ? `${API_BASE}/api/proxy_stream?url=${encodeURIComponent(btoa(hlsUrl))}`
                : `${API_BASE}${hlsUrl}`;

            video.innerHTML = tracksHtml;
            msg.innerHTML = '';

            if (Hls.isSupported()) {
                hlsInstance = new Hls({
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    lowLatencyMode: true,
                    enableWorker: true
                });
                hlsInstance.loadSource(proxiedStreamUrl);
                hlsInstance.attachMedia(video);
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                    const availableQualities = Array.from(new Set(hlsInstance.levels.map(l => l.height).filter(Boolean))).sort((a,b) => b-a);
                    const defaultQuality = availableQualities[0] || 720;

                    player = new Plyr(video, {
                        controls: getPlayerControls(),
                        settings: ['captions', 'quality', 'speed'],
                        ratio: '16:9',
                        seekTime: 5,
                        resetOnEnd: false,
                        invertTime: false,
                        keyboard: { focused: false, global: true },
                        captions: { active: true, language: 'auto', update: true },
                        quality: {
                            default: defaultQuality,
                            options: availableQualities.length > 0 ? availableQualities : [1080, 720, 480, 360],
                            forced: true
                        }
                    });

                    player.source = {
                        type: 'video',
                        sources: [{ src: proxiedStreamUrl, type: 'application/x-mpegURL' }],
                        tracks: plyrTracks
                    };

                    player.on('canplay', () => {
                        if (player.captions) {
                            player.captions.active = true;
                        }
                    });

                    injectCustomPlyrBadges(player, defaultQuality);

                    player.on('qualitychange', e => {
                        const newQuality = e.detail.quality;
                        const levelIndex = hlsInstance.levels.findIndex(l => l.height === newQuality);
                        if (levelIndex !== -1) hlsInstance.currentLevel = levelIndex;
                    });
                    attachProgressTracker(subjectId, se, ep);
                    player.play().catch(e => console.log("Autoplay deferred:", e));
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = proxiedStreamUrl;
                player = new Plyr(video, {
                    controls: getPlayerControls(),
                    settings: ['captions', 'quality', 'speed'],
                    ratio: '16:9',
                    seekTime: 5,
                    resetOnEnd: false,
                    invertTime: false,
                    keyboard: { focused: false, global: true },
                    captions: { active: true, language: 'auto', update: true }
                });

                player.source = {
                    type: 'video',
                    sources: [{ src: proxiedStreamUrl, type: 'application/x-mpegURL' }],
                    tracks: plyrTracks
                };

                injectCustomPlyrBadges(player, 720);
                attachProgressTracker(subjectId, se, ep);
                player.play().catch(e => console.log("Autoplay deferred:", e));
            }
            return;
        }

        msg.innerHTML = '<span style="color: #ff3d71">No stream URL found.</span>';

    } catch (error) {
        console.error(error);
        msg.innerHTML = `<span style="color: #ff3d71">Error loading video: ${error.message}</span>`;
    }
}

function attachProgressTracker(subjectId, se, ep) {
    if (!player) return;
    const key = `progress_${subjectId}_${se}_${ep}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
        player.once('canplay', () => {
            player.currentTime = parseFloat(saved);
        });
    }
    
    player.on('timeupdate', () => {
        if (player.currentTime > 5) {
            localStorage.setItem(key, player.currentTime);
        }
    });
}

function closePlayer() {
    const playerPage = document.getElementById('player-page');
    const appMain = document.getElementById('app');
    
    destroyPlayer();
    
    currentSubjectId = null;
    currentSlug = null;
    
    // Clear URL hash without jumping page
    if (window.location.hash.startsWith('#movie/')) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    playerPage.classList.remove('active');
    setTimeout(() => {
        playerPage.classList.add('hidden');
        appMain.style.display = 'block';
    }, 300);
}

function getPlayerControls() {
    return [
        'play-large',
        'play',
        'mute',
        'volume',
        'current-time',
        'duration',
        'progress',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
    ];
}
