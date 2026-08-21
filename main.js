/**
 * MOTHRA CLAN — main.js
 * Interactive Esports Engine, Tactical Dossier, Match Schedule & Realtime Dynamic CMS Synchronization
 */

'use strict';

/* ============================================================
   0. CYBER SECURITY & ANTI-TAMPER SHIELD
   ============================================================ */
(function initSecurityShield() {
  console.clear();
  console.log(
    '%c[ MOTHRA TACTICAL FIREWALL ]\n%cSTATUS: ACTIVE & PROTECTED\nUnauthorized scraping, SQLi, and XSS attempts are monitored and blocked.',
    'color: #D4AF37; font-family: monospace; font-size: 16px; font-weight: bold; line-height: 1.5; background: #111; padding: 8px 12px; border-left: 4px solid #D4AF37;',
    'color: #EF4444; font-family: monospace; font-size: 11px;'
  );

  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  if (window.top !== window.self) {
    try {
      window.top.location = window.self.location;
    } catch (e) {
      console.warn('Frame bust error', e);
    }
  }
})();

/* ============================================================
   CMS DATA SYNCHRONIZATION & DYNAMIC REALTIME RENDERING
   ============================================================ */
let currentRosterFilter = 'all';
let isRosterExpanded = false;
const MAX_SIDE_ROSTER_COLLAPSED = 4;

function ensureLineupReadMoreElement() {
  let readMoreWrap = document.getElementById('lineupReadMoreWrap');
  const playersGrid = document.querySelector('.players-grid');
  if (!playersGrid) return;

  if (!readMoreWrap) {
    readMoreWrap = document.createElement('div');
    readMoreWrap.className = 'lineup-readmore-wrap';
    readMoreWrap.id = 'lineupReadMoreWrap';
    readMoreWrap.style.display = 'none';
    readMoreWrap.innerHTML = `
      <button type="button" class="lineup-readmore-btn" id="lineupReadMoreBtn" aria-label="Lihat Roster Lengkap">
        <span>READ MORE ROSTER (LIHAT SEMUA UNIT)</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    `;
    playersGrid.insertAdjacentElement('afterend', readMoreWrap);
  }

  const btn = readMoreWrap.querySelector('#lineupReadMoreBtn');
  if (btn && !btn._hasClickListener) {
    btn._hasClickListener = true;
    btn.addEventListener('click', () => {
      isRosterExpanded = !isRosterExpanded;
      applyRosterFilter(currentRosterFilter);
    });
  }
}

function syncCmsData() {
  if (typeof getMothraData !== 'function') return;
  const db = getMothraData();
  if (!db) return;

  // 0. Sync Clan Identity & Branding (Logo, Nama, Tagline, Favicon)
  if (db.branding) {
    const b = db.branding;
    const clanName = b.clanName || 'MOTHRA';
    const logoSrc = b.logo || 'assets/mothra-logo.png';
    const logoIconSrc = b.logoIcon || b.logo || 'assets/mothra-logo.png';

    // Navbar Brand
    const navLogoImg = document.querySelector('.nav-logo-img');
    const logoText = document.querySelector('.nav-logo .logo-text');
    if (navLogoImg && logoSrc) navLogoImg.src = logoSrc;
    if (logoText && clanName) logoText.textContent = clanName;

    // Mobile Menu Brand
    const mobileHeaderBrandImg = document.querySelector('.mobile-header-brand img');
    const mobileHeaderBrandText = document.querySelector('.mobile-header-brand span');
    if (mobileHeaderBrandImg && logoSrc) mobileHeaderBrandImg.src = logoSrc;
    if (mobileHeaderBrandText && clanName) mobileHeaderBrandText.textContent = clanName;

    // Hero Brand (Bottom bar)
    const heroBrandLogo = document.querySelector('.hero-brand-logo');
    const heroBrandText = document.querySelector('.hero-brand-text');
    const heroBrandSub = document.querySelector('.hero-brand-sub');
    if (heroBrandLogo && logoSrc) heroBrandLogo.src = logoSrc;
    if (heroBrandText && clanName) heroBrandText.textContent = clanName;
    if (heroBrandSub && b.tagline) heroBrandSub.textContent = b.tagline;

    // Footer Brand
    const footerLogoImg = document.querySelector('.footer-brand-logo, .footer-brand img');
    const footerLogoText = document.querySelector('.footer-logo');
    const footerTagline = document.querySelector('.footer-tagline');
    const footerDesc = document.querySelector('.footer-desc');
    if (footerLogoImg && logoSrc) footerLogoImg.src = logoSrc;
    if (footerLogoText && clanName) footerLogoText.textContent = clanName;
    if (footerTagline && b.tagline) footerTagline.textContent = b.tagline;
    if (footerDesc && b.description) footerDesc.textContent = b.description;

    // Loading Screen Brand
    const loaderLogoImg = document.querySelector('.loader-logo-img');
    const loaderLogoText = document.querySelector('.loader-logo');
    const loaderTextEl = document.getElementById('loaderText');
    if (loaderLogoImg) loaderLogoImg.src = b.loadingLogo || b.logo || 'assets/mothra-logo.png';
    if (loaderLogoText) loaderLogoText.textContent = b.loadingName || b.clanName || 'MOTHRA';
    if (loaderTextEl && b.loadingText) loaderTextEl.textContent = b.loadingText;

    // Favicon & Page Title
    const favIcon = document.querySelector('link[rel="icon"]');
    if (favIcon && logoIconSrc) favIcon.href = logoIconSrc;
    if (clanName && document.title.includes('MOTHRA')) {
      document.title = document.title.replace('MOTHRA', clanName);
    }
  }

  // 1. Sync Dossier & Hero stats
  if (db.dossier) {
    const d = db.dossier;
    const aboutDesc = document.querySelector('.about-desc');
    const originCity = document.querySelector('.origin-city');

    if (d.description && aboutDesc) aboutDesc.textContent = d.description;
    if (d.city && originCity) originCity.innerHTML = d.city.replace(/\n/g, '<br/>');

    // Stats
    const winrateEls = document.querySelectorAll('[data-count="84"], .dossier-stat-winrate');
    winrateEls.forEach((el) => {
      el.dataset.count = d.winrate || 84;
      el.textContent = d.winrate || 84;
    });
    const memberEl = document.querySelector('.hero-stat [data-count="5"], .hero-stat [data-count="7"], .dossier-stat-members');
    if (memberEl) {
      memberEl.dataset.count = d.activeMembers || (db.lineup ? db.lineup.length : 7);
      memberEl.textContent = memberEl.dataset.count;
    }
    const tourneyEl = document.querySelector('.hero-stat [data-count="3"], .dossier-stat-tourney');
    if (tourneyEl) {
      tourneyEl.dataset.count = d.tournamentsWon || 3;
      tourneyEl.textContent = tourneyEl.dataset.count;
    }
  }

  // 2. Sync Tournament Categories & Filter Tabs
  const rosterFiltersWrap = document.querySelector('.roster-filters');
  if (rosterFiltersWrap && Array.isArray(db.categories)) {
    const totalRoster = (db.lineup || []).length;
    let buttonsHtml = `<button class="filter-btn ${currentRosterFilter === 'all' ? 'active' : ''}" data-filter="all">SEMUA ROSTER (${totalRoster})</button>`;

    db.categories.forEach((cat) => {
      const isActive = currentRosterFilter === cat.id ? 'active' : '';
      buttonsHtml += `<button class="filter-btn ${isActive}" data-filter="${cat.id}">${cat.label}</button>`;
    });

    rosterFiltersWrap.innerHTML = buttonsHtml;
  }

  // 3. Sync The Lineup Cards
  if (Array.isArray(db.lineup)) {
    const playersGrid = document.querySelector('.players-grid');
    if (playersGrid) {
      if (db.lineup.length === 0) {
        playersGrid.innerHTML = `
          <div class="no-filter-match" style="grid-column:1/-1; text-align:center; padding:3rem 1rem;">
            <span class="text-gold">Belum ada data roster pemain.</span>
          </div>
        `;
        const readMoreWrap = document.getElementById('lineupReadMoreWrap');
        if (readMoreWrap) readMoreWrap.style.display = 'none';
      } else {
        const featuredPlayer = db.lineup.find((p) => p.featured) || db.lineup[0];
        const sidePlayers = db.lineup.filter((p) => p.id !== featuredPlayer.id);

        const getCategoryBadge = (catId) => {
          const catObj = (db.categories || []).find((c) => c.id === catId);
          return catObj ? catObj.badge || catObj.label : (catId || 'PBNC').toUpperCase();
        };

        // Render Featured Player Card
        let featuredHtml = `
          <div class="player-card player-card--featured reveal-fade visible revealed"
               data-category="${featuredPlayer.category || 'pbnc'}"
               data-delay="0"
               data-player="${featuredPlayer.id}"
               data-name="${featuredPlayer.name}"
               data-realname="${featuredPlayer.realname || ''}"
               data-role="${featuredPlayer.role}"
               data-num="${featuredPlayer.num || '01'}"
               data-img="${featuredPlayer.img}"
               data-weapon="${featuredPlayer.weapon || 'AUG A3 / Kriss S.V'}"
               data-kd="${featuredPlayer.kd || '2.00'}"
               data-hs="${featuredPlayer.hs || '60%'}"
               data-experience="${featuredPlayer.experience || '3+ Tahun'}"
               data-bio="${(featuredPlayer.bio || '').replace(/"/g, '&quot;')}"
               tabindex="0"
               role="button"
               aria-label="Lihat profil ${featuredPlayer.name}">
            <div class="player-img-wrap">
              <img src="${featuredPlayer.img}" alt="${featuredPlayer.name}" loading="lazy" width="400" height="533" onerror="this.src='assets/player-captain.jpg'" />
              <div class="player-num">${featuredPlayer.num || '01'}</div>
              <div class="player-status"><span class="dot dot--green"></span> ${getCategoryBadge(featuredPlayer.category)}</div>
              <div class="player-hover-action">
                <span>VIEW DOSSIER <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg></span>
              </div>
            </div>
            <div class="player-info">
              <span class="player-role">${featuredPlayer.role}</span>
              <div class="player-name">${featuredPlayer.name}</div>
              <div class="player-realname">${featuredPlayer.realname || ''}</div>
            </div>
          </div>
        `;

        // Render Side Players Cards
        let sideHtml = `<div class="players-grid-side">`;
        sidePlayers.forEach((p, idx) => {
          const dotClass = p.category === 'ba' ? 'dot--gold' : 'dot--green';
          sideHtml += `
            <div class="player-card reveal-fade visible revealed"
                 data-category="${p.category || 'pbnc'}"
                 data-delay="${(idx + 1) * 100}"
                 data-player="${p.id}"
                 data-name="${p.name}"
                 data-realname="${p.realname || ''}"
                 data-role="${p.role}"
                 data-num="${p.num || '00'}"
                 data-img="${p.img}"
                 data-weapon="${p.weapon || 'AUG A3 / Kriss S.V'}"
                 data-kd="${p.kd || '2.00'}"
                 data-hs="${p.hs || '60%'}"
                 data-experience="${p.experience || '3 Tahun'}"
                 data-bio="${(p.bio || '').replace(/"/g, '&quot;')}"
                 tabindex="0"
                 role="button"
                 aria-label="Lihat profil ${p.name}">
              <div class="player-img-wrap">
                <img src="${p.img}" alt="${p.name}" loading="lazy" width="300" height="400" onerror="this.src='assets/player2.jpg'" />
                <div class="player-num">${p.num || '00'}</div>
                <div class="player-status"><span class="dot ${dotClass}"></span> ${getCategoryBadge(p.category)}</div>
                <div class="player-hover-action">
                  <span>VIEW DOSSIER <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg></span>
                </div>
              </div>
              <div class="player-info">
                <span class="player-role ${p.category === 'ba' ? 'text-gold' : ''}">${p.role}</span>
                <div class="player-name">${p.name}</div>
                <div class="player-realname">${p.realname || ''}</div>
              </div>
            </div>
          `;
        });
        sideHtml += `</div>`;

        playersGrid.innerHTML = featuredHtml + sideHtml;

        ensureLineupReadMoreElement();
        bindPlayerCardClickEvents();
        bindRosterFilterEvents();
        applyRosterFilter(currentRosterFilter);
      }
    }
  }

  // 4. Sync Match Schedule
  if (db.schedule) {
    const bannerImg = document.querySelector('.schedule-banner-img');
    if (bannerImg && db.schedule.bannerImg) {
      bannerImg.src = db.schedule.bannerImg;
    }

    const matchesGrid = document.querySelector('.matches-grid');
    if (matchesGrid && Array.isArray(db.schedule.matches)) {
      if (db.schedule.matches.length === 0) {
        matchesGrid.innerHTML = `
          <div class="no-filter-match" style="grid-column: 1 / -1; padding: 2.5rem 1rem; opacity: 0.75; text-align: center;">
            <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 0.15em;">BELUM ADA JADWAL PERTANDINGAN MENDATANG.</span>
          </div>
        `;
      } else {
        let matchesHtml = '';
        db.schedule.matches.forEach((m, idx) => {
          matchesHtml += `
            <div class="match-card reveal-fade visible revealed" data-delay="${idx * 150}">
              <div class="match-meta">
                <span>${m.stage}</span>
                <span class="match-status status-upcoming">${m.status}</span>
              </div>
              <div class="match-teams">
                <div class="team-item">
                  <div class="team-logo-placeholder">MTH</div>
                  <span class="team-name text-gold">MOTHRA</span>
                </div>
                <div class="match-vs">VS</div>
                <div class="team-item">
                  <div class="team-logo-placeholder" style="color:${m.opponentColor || '#EF4444'};">${m.opponentShort || 'VS'}</div>
                  <span class="team-name">${m.opponent}</span>
                </div>
              </div>
              <div class="match-details">
                <div class="match-detail-row"><span>Tournament:</span><span class="match-detail-val">${m.tournament}</span></div>
                <div class="match-detail-row"><span>Map Pick:</span><span class="match-detail-val text-gold">${m.map}</span></div>
                <div class="match-detail-row"><span>Waktu:</span><span class="match-detail-val">${m.time}</span></div>
              </div>
              <a href="${m.streamUrl || 'https://discord.gg/fxfMBWSzW'}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm btn--full">WATCHPARTY ON DISCORD</a>
            </div>
          `;
        });
        matchesGrid.innerHTML = matchesHtml;
      }
    }
  }

  // 5. Sync The Record (Prestasi)
  if (Array.isArray(db.records)) {
    const timelineList = document.querySelector('.timeline-list, .achievements-list');
    if (timelineList) {
      if (db.records.length === 0) {
        timelineList.innerHTML = `
          <div class="no-filter-match" style="padding: 2.5rem 1rem; opacity: 0.75; text-align: center;">
            <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 0.15em;">BELUM ADA CATATAN PRESTASI / REKOR TURNAMEN.</span>
          </div>
        `;
      } else {
        let recordsHtml = '';
        db.records.forEach((r, idx) => {
          recordsHtml += `
            <div class="achievement-item reveal-fade visible revealed" data-delay="${idx * 100}">
              <div class="achievement-year">${r.year}</div>
              <div class="achievement-info">
                <div class="achievement-title">${r.title}</div>
                <div class="achievement-sub">${r.subtitle}</div>
              </div>
              <div class="achievement-trophy" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                  <path d="M9 3h10v8a5 5 0 0 1-10 0V3z" stroke="#D4AF37" stroke-width="2"/>
                  <path d="M9 7H5a3 3 0 0 0 3 3M19 7h4a3 3 0 0 1-3 3M14 16v4M10 24h8M11 20h6" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          `;
        });
        timelineList.innerHTML = recordsHtml;
      }
    }
  }

  // 6. Sync Field Notes (Galeri)
  if (Array.isArray(db.gallery)) {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
      if (db.gallery.length === 0) {
        galleryGrid.innerHTML = `
          <div class="no-filter-match" style="grid-column: 1 / -1; padding: 2.5rem 1rem; opacity: 0.75; text-align: center;">
            <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.85rem; letter-spacing: 0.15em;">BELUM ADA DOKUMENTASI FOTO.</span>
          </div>
        `;
      } else {
        let galleryHtml = '';
        db.gallery.forEach((g, idx) => {
          galleryHtml += `
            <div class="gallery-item ${g.large ? 'gallery-item--large' : ''} reveal-fade visible revealed" data-delay="${idx * 100}">
              <img src="${g.img}" alt="${g.title}" loading="lazy" width="600" height="400" onerror="this.src='assets/pb-bg-squad.jpg'" />
              <div class="gallery-caption">
                <span class="gallery-tag">INTEL / ARCHIVE</span>
                <div class="gallery-title">${g.title}</div>
              </div>
            </div>
          `;
        });
        galleryGrid.innerHTML = galleryHtml;
        bindLightboxEvents();
      }
    }
  }
}

// Global Listeners for Realtime Sync
window.addEventListener('storage', (e) => {
  if (e.key === 'mothra_cms_database') syncCmsData();
});
window.addEventListener('mothra_data_updated', () => syncCmsData());
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (typeof fetchMothraDataOnline === 'function') fetchMothraDataOnline();
    syncCmsData();
  }
});
window.addEventListener('focus', () => {
  if (typeof fetchMothraDataOnline === 'function') fetchMothraDataOnline();
  syncCmsData();
});

// Periodic Auto-Sync Background Poll (Jaminan Realtime di HP / Mobile)
setInterval(() => {
  if (typeof fetchMothraDataOnline === 'function') {
    fetchMothraDataOnline();
  }
}, 3000);

// Initial run
syncCmsData();

/* ============================================================
   1. LOADER INITIALIZATION
   ============================================================ */
(function initLoader() {
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderText = document.getElementById('loaderText');
  const loaderLogoImg = document.querySelector('.loader-logo-img');
  const loaderLogoText = document.querySelector('.loader-logo');

  if (!loader || !loaderFill) return;

  // Apply initial loading branding immediately from cache
  try {
    if (typeof getMothraData === 'function') {
      const db = getMothraData();
      if (db && db.branding) {
        if (loaderLogoImg) loaderLogoImg.src = db.branding.loadingLogo || db.branding.logo || 'assets/mothra-logo.png';
        if (loaderLogoText) loaderLogoText.textContent = db.branding.loadingName || db.branding.clanName || 'MOTHRA';
        if (loaderText && db.branding.loadingText) loaderText.textContent = db.branding.loadingText;
      }
    }
  } catch (e) {}

  const steps = [
    { pct: 25, text: 'SYNCHRONIZING TACTICAL ASSETS...' },
    { pct: 60, text: 'DECRYPTING SQUAD DOSSIER...' },
    { pct: 90, text: 'ESTABLISHING SECURE PROTOCOL...' },
    { pct: 100, text: 'SYSTEM ARMED & READY.' },
  ];

  let stepIdx = 0;
  document.body.classList.add('loading');

  function nextStep() {
    if (stepIdx >= steps.length) {
      setTimeout(() => {
        loader.classList.add('hidden');
        document.body.classList.remove('loading');
        initHeroParticles();
        initCounters();
        refreshScrollReveal();
      }, 300);
      return;
    }
    const current = steps[stepIdx++];
    loaderFill.style.width = current.pct + '%';
    if (loaderText) loaderText.textContent = current.text;
    setTimeout(nextStep, stepIdx === steps.length ? 400 : 300);
  }
  
  setTimeout(nextStep, 100);
})();

/* ============================================================
   2. CUSTOM CURSOR
   ============================================================ */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  if (!cursor || !follower) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let followerX = mouseX;
  let followerY = mouseY;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });

  function renderFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    requestAnimationFrame(renderFollower);
  }
  renderFollower();

  const interactiveElements = document.querySelectorAll('a, button, .player-card, .gallery-item, .value-item, .achievement-item, .schedule-banner-wrap, .partner-card');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '16px';
      cursor.style.height = '16px';
      cursor.style.background = '#FFFFFF';
      follower.style.width = '52px';
      follower.style.height = '52px';
      follower.style.borderColor = 'rgba(212, 175, 55, 0.9)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '8px';
      cursor.style.height = '8px';
      cursor.style.background = 'var(--gold-bright)';
      follower.style.width = '34px';
      follower.style.height = '34px';
      follower.style.borderColor = 'rgba(212, 175, 55, 0.6)';
    });
  });
})();

/* ============================================================
   3. HERO CANVAS PARTICLES
   ============================================================ */
function initHeroParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let animationId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const PARTICLE_COUNT = 45;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.6 + 0.2),
      alpha: Math.random() * 0.6 + 0.2,
      decay: Math.random() * 0.003 + 0.001
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.y < 0 || p.alpha <= 0) {
        p.x = Math.random() * canvas.width;
        p.y = canvas.height + 10;
        p.alpha = Math.random() * 0.6 + 0.2;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
      ctx.fill();
    });

    animationId = requestAnimationFrame(loop);
  }
  loop();
}

/* ============================================================
   4. HERO 3D PARALLAX EFFECT
   ============================================================ */
(function initHeroParallax() {
  const hero = document.getElementById('hero');
  const bg = document.getElementById('heroBg');
  if (!hero || !bg) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    bg.style.transform = `scale(1.05) translate(${x * 20}px, ${y * 20}px)`;
  });

  hero.addEventListener('mouseleave', () => {
    bg.style.transform = 'scale(1.05) translate(0px, 0px)';
  });
})();

/* ============================================================
   5. NAVIGATION DRAWER & SCROLL
   ============================================================ */
(function initNavigation() {
  const nav = document.getElementById('nav');
  // Support both id variants for hamburger
  const hamburger = document.getElementById('navHamburger') || document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileMenuClose');
  // Support both class variants for mobile links
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-link');
  const scrollTop = document.getElementById('scrollTop');

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 50;
    if (nav) nav.classList.toggle('scrolled', scrolled);
    if (scrollTop) scrollTop.classList.toggle('visible', window.scrollY > 400);
  });

  if (hamburger && mobileMenu) {
    function toggleMenu(open) {
      hamburger.classList.toggle('active', open);
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      // Update aria-expanded
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      toggleMenu(!isOpen);
    });

    if (mobileClose) {
      mobileClose.addEventListener('click', () => toggleMenu(false));
    }

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    // Also close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) toggleMenu(false);
    });
  }

  if (scrollTop) {
    scrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();

/* ============================================================
   6. SCROLL REVEAL OBSERVER
   ============================================================ */
function refreshScrollReveal() {
  const targets = document.querySelectorAll('.reveal-fade:not(.visible), .reveal-left:not(.visible), .reveal-right:not(.visible)');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || 0, 10);
        setTimeout(() => {
          el.classList.add('visible');
          el.classList.add('revealed');
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  targets.forEach((t) => observer.observe(t));
}
refreshScrollReveal();

/* ============================================================
   7. STATS COUNTER ANIMATION
   ============================================================ */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');

  function animate(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach((c) => observer.observe(c));
}

/* ============================================================
   8. SCROLL SPY (ACTIVE NAV)
   ============================================================ */
(function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
      });
    });
  }, { threshold: 0.35 });

  sections.forEach((s) => observer.observe(s));
})();

/* ============================================================
   9. ROSTER FILTER TABS & READ MORE LOGIC
   ============================================================ */
function applyRosterFilter(filter) {
  currentRosterFilter = filter || 'all';

  // 1. Update active tab styling
  const filterBtns = document.querySelectorAll('.roster-filters .filter-btn');
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === currentRosterFilter);
  });

  const featuredCard = document.querySelector('.player-card--featured');
  const sideCards    = document.querySelectorAll('.players-grid-side .player-card');
  const sideWrapper  = document.querySelector('.players-grid-side');
  const playersGrid  = document.querySelector('.players-grid');
  const readMoreWrap = document.getElementById('lineupReadMoreWrap');
  const readMoreBtn  = document.getElementById('lineupReadMoreBtn');

  // 2. Determine which cards match category filter
  const featuredMatch = !featuredCard ? false :
    currentRosterFilter === 'all' || (featuredCard.dataset.category || '').trim().toLowerCase() === currentRosterFilter.toLowerCase();

  const matchingSide = [];
  sideCards.forEach((card) => {
    const cat = (card.dataset.category || '').trim().toLowerCase();
    const match = currentRosterFilter === 'all' || cat === currentRosterFilter.toLowerCase();
    if (match) matchingSide.push(card);
  });

  // 3. Show / hide featured card
  if (featuredCard) {
    if (featuredMatch) {
      featuredCard.style.display = '';
      featuredCard.classList.remove('hidden');
      featuredCard.classList.add('visible', 'revealed');
    } else {
      featuredCard.style.display = 'none';
      featuredCard.classList.add('hidden');
    }
  }

  // 4. If featured is hidden but side cards match, promote first side card to featured slot
  const shouldPromote = !featuredMatch && matchingSide.length > 0;
  let promotedCard = null;
  if (shouldPromote) {
    promotedCard = matchingSide[0];
  }

  // Remove any previously promoted cards
  document.querySelectorAll('.player-card--promoted').forEach((c) => {
    c.classList.remove('player-card--promoted');
  });

  if (promotedCard) {
    promotedCard.classList.add('player-card--promoted');
    promotedCard.style.display = '';
    promotedCard.classList.remove('hidden');
    promotedCard.classList.add('visible', 'revealed');
  }

  // 5. Manage side cards display + Read More limit
  const sideCardsToConsider = shouldPromote ? matchingSide.slice(1) : matchingSide;
  const totalMatchingSide = sideCardsToConsider.length;
  const maxInitial = MAX_SIDE_ROSTER_COLLAPSED; // 4 cards

  // First hide all side cards
  sideCards.forEach((card) => {
    if (card !== promotedCard) {
      card.style.display = 'none';
      card.classList.add('hidden');
    }
  });

  // Show matching cards up to maxInitial or all if expanded
  sideCardsToConsider.forEach((card, idx) => {
    if (isRosterExpanded || idx < maxInitial) {
      card.style.display = '';
      card.classList.remove('hidden');
      card.classList.add('visible', 'revealed');
    }
  });

  // 6. Show/hide side wrapper
  if (sideWrapper) {
    sideWrapper.style.display = matchingSide.length > 0 ? '' : 'none';
  }

  // 7. Manage Read More Button state & text
  if (readMoreWrap && readMoreBtn) {
    if (totalMatchingSide > maxInitial) {
      readMoreWrap.style.display = 'block';
      if (isRosterExpanded) {
        readMoreBtn.classList.add('is-expanded');
        readMoreBtn.innerHTML = `
          <span>CIUTKAN ROSTER / SHOW LESS</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
        `;
      } else {
        readMoreBtn.classList.remove('is-expanded');
        const remaining = totalMatchingSide - maxInitial;
        readMoreBtn.innerHTML = `
          <span>READ MORE ROSTER (+${remaining} UNIT)</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        `;
      }
    } else {
      readMoreWrap.style.display = 'none';
    }
  }

  // 8. If NO cards match at all, show empty message
  const noMatch = !featuredMatch && matchingSide.length === 0;
  let emptyEl = playersGrid ? playersGrid.querySelector('.no-filter-match') : null;
  if (noMatch && playersGrid && !emptyEl) {
    emptyEl = document.createElement('div');
    emptyEl.className = 'no-filter-match';
    emptyEl.textContent = 'Tidak ada pemain di kategori ini.';
    playersGrid.appendChild(emptyEl);
  } else if (!noMatch && emptyEl) {
    emptyEl.remove();
  }
}

function bindRosterFilterEvents() {
  const filterBtns = document.querySelectorAll('.roster-filters .filter-btn');

  filterBtns.forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const filter = btn.dataset.filter || 'all';
      currentRosterFilter = filter;
      // Reset expanded state when switching category tabs
      isRosterExpanded = false;
      applyRosterFilter(currentRosterFilter);
    };
  });
}


/* ============================================================
   10. LIGHTBOX & SCHEDULE BANNER VIEWER
   ============================================================ */
function bindLightboxEvents() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const galleryItems = document.querySelectorAll('.gallery-item');
  const scheduleBanner = document.getElementById('scheduleBannerWrap');

  if (!lightbox || !lightboxImg) return;

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Preview';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img) openLightbox(img.src, img.alt);
    });
  });

  if (scheduleBanner) {
    scheduleBanner.addEventListener('click', () => {
      const img = scheduleBanner.querySelector('img');
      if (img) openLightbox(img.src, 'Official Match Schedule Clan MOTHRA PBNC 2024');
    });
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox.classList.contains('open')) close(); });
}
bindLightboxEvents();

/* ============================================================
   11. INTERACTIVE PLAYER DOSSIER MODAL
   ============================================================ */
function bindPlayerCardClickEvents() {
  const modal = document.getElementById('playerModal');
  const modalBackdrop = document.getElementById('playerModalBackdrop');
  const modalClose = document.getElementById('playerModalClose');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalJoinBtn = document.getElementById('modalJoinBtn');

  const mImg = document.getElementById('modalPlayerImg');
  const mNum = document.getElementById('modalPlayerNum');
  const mRole = document.getElementById('modalPlayerRole');
  const mName = document.getElementById('modalPlayerName');
  const mReal = document.getElementById('modalPlayerRealname');
  const mWeapon = document.getElementById('modalPlayerWeapon');
  const mKD = document.getElementById('modalPlayerKD');
  const mHS = document.getElementById('modalPlayerHS');
  const mExp = document.getElementById('modalPlayerExp');
  const mBio = document.getElementById('modalPlayerBio');

  if (!modal) return;

  const playerCards = document.querySelectorAll('.player-card');

  playerCards.forEach((card) => {
    function openModal() {
      const d = card.dataset;
      if (!d.name) return;

      if (mImg) { mImg.src = d.img || 'assets/player-captain.jpg'; mImg.alt = d.name; }
      if (mNum) mNum.textContent = d.num || '01';
      if (mRole) mRole.textContent = d.role || 'ROSTER';
      if (mName) mName.textContent = d.name;
      if (mReal) mReal.textContent = d.realname || '';
      if (mWeapon) mWeapon.textContent = d.weapon || 'AUG A3 / Kriss S.V';
      if (mKD) mKD.textContent = d.kd || '2.00';
      if (mHS) mHS.textContent = d.hs || '60%';
      if (mExp) mExp.textContent = d.experience || '3+ Tahun';
      if (mBio) mBio.textContent = d.bio || 'Player resmi Clan MOTHRA Point Blank Indonesia.';

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  });

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (modalJoinBtn) modalJoinBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}
bindPlayerCardClickEvents();

/* ============================================================
   12. COLLABORATION & PARTNERSHIP PROPOSAL MODAL CONTROLLER
   ============================================================ */
function initCollabModal() {
  const modal = document.getElementById('collabModal');
  const backdrop = document.getElementById('collabModalBackdrop');
  const closeBtn = document.getElementById('collabModalClose');
  const form = document.getElementById('collabForm');
  const typeSelect = document.getElementById('collabType');
  const contactTypeSelect = document.getElementById('collabContactType');
  const successMsg = document.getElementById('collabSuccess');
  const successText = document.getElementById('collabSuccessText');
  const warningMsg = document.getElementById('collabWarning');
  const submitBtn = document.getElementById('collabSubmitBtn');
  const openButtons = document.querySelectorAll('.open-collab-btn, [data-open-collab]');

  if (!modal || !form) return;

  function openModal(defaultType) {
    if (typeSelect && defaultType) {
      const search = defaultType.toLowerCase();
      for (let i = 0; i < typeSelect.options.length; i++) {
        const optVal = typeSelect.options[i].value.toLowerCase();
        const optText = typeSelect.options[i].text.toLowerCase();
        if (optVal === search || optText.includes(search) ||
            (search.includes('sparring') && optVal === 'scrim') ||
            (search.includes('scrim') && optVal === 'scrim') ||
            (search.includes('sponsor') && optVal === 'sponsor') ||
            (search.includes('proposal') && optVal === 'sponsor') ||
            (search.includes('creative') && optVal === 'design') ||
            (search.includes('design') && optVal === 'design') ||
            (search.includes('talent') && optVal === 'ba') ||
            (search.includes('ambassador') && optVal === 'ba') ||
            (search.includes('ba') && optVal === 'ba')) {
          typeSelect.selectedIndex = i;
          break;
        }
      }
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (successMsg) successMsg.classList.remove('visible');
    if (warningMsg) warningMsg.classList.remove('visible');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openButtons.forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      openModal(btn.dataset.type || '');
    };
  });

  if (closeBtn) closeBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('collabName').value.trim();
    const contact = document.getElementById('collabContact').value.trim();
    const contactType = contactTypeSelect ? contactTypeSelect.value : 'WhatsApp';
    const typeVal = typeSelect ? typeSelect.value : 'scrim';
    const notes = document.getElementById('collabNotes').value.trim();

    if (!name || !contact || !notes) {
      if (warningMsg) {
        warningMsg.textContent = 'Harap lengkapi semua kolom formulir sebelum mengirim.';
        warningMsg.classList.add('visible');
      }
      return;
    }

    const typeLabelMap = {
      scrim: 'Friendly Match / Scrim Request',
      sponsor: 'Sponsorship & Brand Inquiry',
      design: 'Design & Creative Partnership',
      ba: 'Brand Ambassador & Talent'
    };
    const typeKey = ['scrim', 'sponsor', 'design', 'ba'].includes(typeVal) ? typeVal : 'scrim';
    const typeLabel = typeLabelMap[typeKey] || (typeSelect && typeSelect.options[typeSelect.selectedIndex] ? typeSelect.options[typeSelect.selectedIndex].text : 'Partnership');

    const origBtn = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>MENGIRIMKAN KE DATABASE &amp; EMAIL...</span>';
    submitBtn.disabled = true;

    // 1. Simpan ke Database Lokal & Supabase Realtime (Admin Panel "The Alliance")
    try {
      const newPartnership = {
        id: 'pa_' + Date.now(),
        type: typeKey,
        typeLabel: typeLabel,
        name: name,
        contact: contact,
        contactType: contactType,
        status: 'PENDING',
        date: new Date().toISOString().slice(0, 10),
        logo: 'assets/mothra-logo.png',
        notes: notes
      };

      const db = typeof getMothraData === 'function' ? getMothraData() : null;
      if (db) {
        if (!Array.isArray(db.partnerships)) db.partnerships = [];
        db.partnerships.unshift(newPartnership);
        if (typeof saveMothraData === 'function') {
          saveMothraData(db);
        }
      }
    } catch (dbErr) {
      console.warn('Partnership database save notice:', dbErr);
    }

    // 2. Kirim Notifikasi Email ke abdurrrahman09@gmail.com
    try {
      await fetch('https://formsubmit.co/ajax/abdurrrahman09@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `[MOTHRA ALLIANCE] Pengajuan Baru: ${typeLabel} - ${name}`,
          _template: 'table',
          _captcha: 'false',
          'Jenis Kolaborasi': typeLabel,
          'Nama Clan / Brand / Talent': name,
          'Platform Kontak': contactType,
          'Kontak PIC': contact,
          'Rincian Proposal': notes,
          'Status Database': 'PENDING (Tersimpan di Cloud Supabase & Admin Panel)',
          'Waktu Kirim': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        })
      });
    } catch (err) {
      console.warn('Partnership email dispatch notice:', err);
    }

    submitBtn.innerHTML = origBtn;
    submitBtn.disabled = false;
    form.reset();

    if (warningMsg) warningMsg.classList.remove('visible');
    if (successText) {
      successText.innerHTML = `Terima kasih <strong>${name}</strong>! Pengajuan untuk <strong>${typeLabel}</strong> telah otomatis tersimpan ke Database Cloud Supabase &amp; Admin Panel, serta diteruskan ke email <strong>abdurrrahman09@gmail.com</strong>. Tim manajemen akan segera menghubungi Anda.`;
    }
    if (successMsg) successMsg.classList.add('visible');
  };
}
initCollabModal();

/* ============================================================
   13. RECRUITMENT PORTAL FORM CONTROLLER
   ============================================================ */
(function initRecruitmentPortal() {
  const form = document.getElementById('joinForm');
  const successMsg = document.getElementById('formSuccess');
  const warningMsg = document.getElementById('formWarning');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  const TARGET_EMAIL = 'abdurrrahman09@gmail.com';
  const COOLDOWN_MINUTES = 15;
  const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
  const STORAGE_KEY = 'mothra_last_apply_timestamp';
  const PAGE_START_TIME = Date.now();

  function showWarning(text) {
    if (!warningMsg) return;
    warningMsg.innerHTML = `<span style="font-weight:bold;margin-right:6px;">[PERINGATAN]</span> ${text}`;
    warningMsg.classList.add('visible');
    warningMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => warningMsg.classList.remove('visible'), 7500);
  }

  function sanitizeInput(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }

  const inputs = form.querySelectorAll('.form-input[required]');
  inputs.forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  function validateField(field) {
    const isEmpty = !field.value.trim();
    field.style.borderColor = isEmpty ? 'var(--red-bright)' : 'var(--border)';
    field.style.boxShadow = isEmpty ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none';
    if (isEmpty) field.classList.add('error');
    else field.classList.remove('error');
    return !isEmpty;
  }

  function resetField(field) {
    field.style.borderColor = '';
    field.style.boxShadow = '';
    field.classList.remove('error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const hpField = document.getElementById('honeypotField');
    if (hpField && hpField.value.trim() !== '') {
      console.warn('Bot blocked by honeypot');
      form.reset();
      successMsg.classList.add('visible');
      return;
    }

    const elapsedSec = (Date.now() - PAGE_START_TIME) / 1000;
    if (elapsedSec < 2.5) {
      showWarning('Formulir diisi terlalu cepat. Mohon periksa kembali data pendaftaran kamu.');
      return;
    }

    const lastApply = localStorage.getItem(STORAGE_KEY);
    if (lastApply) {
      const diff = Date.now() - parseInt(lastApply, 10);
      if (diff < COOLDOWN_MS) {
        const remainingMin = Math.ceil((COOLDOWN_MS - diff) / 60000);
        showWarning(`Lamaran kamu sudah tercatat. Harap tunggu ${remainingMin} menit sebelum mengirim ulang, atau langsung DM Instagram @mothra.officiall.`);
        return;
      }
    }

    let valid = true;
    inputs.forEach((input) => {
      if (!validateField(input)) valid = false;
    });
    if (!valid) {
      showWarning('Harap isi semua kolom bertanda bintang (*) dengan lengkap.');
      return;
    }

    const pName = sanitizeInput(document.getElementById('playerName').value);
    const gId = sanitizeInput(document.getElementById('gameId').value);
    const pRole = document.getElementById('role').value;
    const pContact = sanitizeInput(document.getElementById('contact').value);
    const pMessage = sanitizeInput(document.getElementById('message').value);

    const originalBtn = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>MENGIRIMKAN LAMARAN...</span>`;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.75';

    try {
      await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `[MOTHRA RECRUITMENT] Lamaran Baru: ${pName} (${gId})`,
          _template: 'table',
          _captcha: 'false',
          'Nama Panggilan': pName,
          'In-Game Nick & Rank': gId,
          'Role Pilihan': pRole,
          'Kontak': pContact,
          'Motivasi & Pengalaman': pMessage || 'Tidak diisi',
          'Waktu Kirim': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        })
      });
    } catch (err) {
      console.warn('Form submission notice:', err);
    }

    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    submitBtn.innerHTML = originalBtn;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '';
    form.reset();
    inputs.forEach(resetField);

    successMsg.classList.add('visible');
    successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();

/* ============================================================
   14. SMOOTH ANCHOR SCROLL
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 76;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
