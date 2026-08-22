/**
 * MOTHRA CLAN — admin.js
 * Admin Controller, Authentication Guard, Local PC Image Uploads & Full Tournament Category CRUD System
 */

'use strict';

// ============================================================
// 1. AUTHENTICATION (Dynamic Users via Supabase / localStorage)
// ============================================================
const AUTH_SESSION_KEY = 'mothra_admin_auth_active';
const AUTH_USER_KEY    = 'mothra_admin_current_user';

// Fallback credentials (saat db belum siap)
const FALLBACK_USERS = [
  { id: 'u_1', email: 'abdurrrahman09@gmail.com', password: 'Senayan@18', role: 'SUPER ADMIN', name: 'Abdurrahman', status: 'ACTIVE' },
  { id: 'u_1', email: 'abdurrahman09@gmail.com',  password: 'Senayan@18', role: 'SUPER ADMIN', name: 'Abdurrahman', status: 'ACTIVE' },
  { id: 'u_1', email: 'abdurrahman271@gmail.com', password: 'Senayan@18', role: 'SUPER ADMIN', name: 'Abdurrahman', status: 'ACTIVE' },
  { id: 'u_1', email: 'admin',                    password: 'Senayan@18', role: 'SUPER ADMIN', name: 'Abdurrahman', status: 'ACTIVE' }
];

let db = null;

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) || 'null'); } catch { return null; }
}

function showToast(msg) {
  const t = document.getElementById('toastMsg');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 4000);
}

function updateOperatorBadge(user) {
  const badge = document.querySelector('.top-bar [style*="OPERATOR"]');
  if (badge && user) badge.textContent = `OPERATOR: ${user.email} [${user.role || 'ADMIN'}]`;
}

function checkAuth() {
  const loginScreen   = document.getElementById('loginScreen');
  const dashboardWrap = document.getElementById('dashboardWrap');
  if (!loginScreen || !dashboardWrap) return;

  if (!db) db = getMothraData();

  // Sync login screen logo from DB
  const loginLogoEl = document.getElementById('adminLoginLogo');
  if (loginLogoEl && db && db.branding) {
    loginLogoEl.src = db.branding.loginLogo || db.branding.logo || 'assets/mothra-logo.png';
  }

  // Sync admin panel browser tab favicon from DB
  if (db && db.branding) {
    const adminFavicon = document.querySelector('link[rel="icon"]');
    if (adminFavicon) {
      adminFavicon.href = db.branding.logoIcon || db.branding.logo || 'assets/mothra-logo.png';
    }
  }

  const isAuth = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  if (isAuth) {
    loginScreen.classList.add('hidden');
    dashboardWrap.classList.remove('hidden');
    updateOperatorBadge(getCurrentUser());
    initDashboard();
  } else {
    loginScreen.classList.remove('hidden');
    dashboardWrap.classList.add('hidden');
  }
}

// ============================================================
// LOGIN HANDLER & BRUTE-FORCE SECURITY DEFENSE
// ============================================================
const LOGIN_ATTEMPTS_KEY = 'mothra_login_fail_count';
const LOGIN_LOCKOUT_KEY  = 'mothra_login_lockout_until';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 Detik cooldown

function getLockoutRemaining() {
  try {
    const lockedUntil = parseInt(sessionStorage.getItem(LOGIN_LOCKOUT_KEY) || '0', 10);
    const now = Date.now();
    if (lockedUntil > now) {
      return Math.ceil((lockedUntil - now) / 1000);
    }
  } catch (e) {}
  return 0;
}

// Bind login form after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  const loginForm     = document.getElementById('loginForm');
  const loginEmail    = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginAlert    = document.getElementById('loginAlert');
  const logoutBtn     = document.getElementById('logoutBtn');

  // Pastikan form login selalu KOSONG saat halaman pertama kali dibuka
  if (loginEmail) {
    loginEmail.value = '';
    loginEmail.setAttribute('autocomplete', 'off');
  }
  if (loginPassword) {
    loginPassword.value = '';
    loginPassword.setAttribute('autocomplete', 'off');
  }

  // Cek apakah sedang dalam masa lockout keamanan
  function checkLockoutState() {
    const remaining = getLockoutRemaining();
    if (remaining > 0) {
      if (loginAlert) {
        loginAlert.textContent = `🛡️ [SECURITY LOCKOUT] Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${remaining} detik untuk mencegah serangan brute-force.`;
        loginAlert.classList.add('visible');
      }
      return true;
    }
    return false;
  }

  checkLockoutState();

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (checkLockoutState()) return;

      let rawEmail = ((loginEmail && loginEmail.value) || '').trim();
      let rawPwd   = ((loginPassword && loginPassword.value) || '').trim();

      if (!rawEmail || !rawPwd) {
        if (loginAlert) {
          loginAlert.textContent = 'Harap masukkan Email Operator dan Password secara manual.';
          loginAlert.classList.add('visible');
        }
        return;
      }

      // Deteksi & Tangkal SQL Injection pada Form Login
      const sqliPattern = /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|OR\s+['"\d\w]+=|--|\/\*)\b)/i;
      if (sqliPattern.test(rawEmail) || sqliPattern.test(rawPwd)) {
        console.warn('⚠️ [CYBER SHIELD] Percobaan SQL Injection terdeteksi dan diblokir:', rawEmail);
        if (loginAlert) {
          loginAlert.textContent = '⛔ [BLOCKED] Karakter atau query SQL tidak valid terdeteksi oleh Tactical Firewall.';
          loginAlert.classList.add('visible');
        }
        if (loginPassword) loginPassword.value = '';
        return;
      }

      // Sanitasi input
      const inputEmail = (typeof sanitizeSecurityInput === 'function' ? sanitizeSecurityInput(rawEmail) : rawEmail).toLowerCase();
      const inputPwd   = rawPwd;

      // Get users from db (Supabase-synced) or fallback
      let users = FALLBACK_USERS;
      try {
        const loaded = getMothraData();
        if (loaded && loaded.users && loaded.users.length > 0) {
          users = [...loaded.users, ...FALLBACK_USERS]; // merge, db takes priority
        }
      } catch (e2) {}

      const matched = users.find(u =>
        u.email.toLowerCase() === inputEmail &&
        u.password === inputPwd &&
        u.status !== 'INACTIVE'
      );

      if (matched) {
        // Reset failed attempts upon successful login
        sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        sessionStorage.removeItem(LOGIN_LOCKOUT_KEY);
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(matched));
        if (loginAlert) loginAlert.classList.remove('visible');
        checkAuth();
        showToast(`🎖️ Selamat datang, ${matched.name || matched.email}! [${matched.role}]`);
      } else {
        // Increment failed attempts counter
        let failCount = parseInt(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10) + 1;
        sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, failCount.toString());

        if (failCount >= MAX_FAILED_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
          sessionStorage.setItem(LOGIN_LOCKOUT_KEY, lockUntil.toString());
          if (loginAlert) {
            loginAlert.textContent = `🛡️ [SECURITY LOCKOUT] 5 kali percobaan gagal berturut-turut. Akses ditangguhkan selama 60 detik untuk mencegah serangan brute-force.`;
            loginAlert.classList.add('visible');
          }
        } else {
          if (loginAlert) {
            const sisa = MAX_FAILED_ATTEMPTS - failCount;
            loginAlert.textContent = `Email atau Password salah, atau akun dinonaktifkan. (Sisa percobaan: ${sisa})`;
            loginAlert.classList.add('visible');
          }
        }
        if (loginPassword) { loginPassword.value = ''; loginPassword.focus(); }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      if (loginEmail) loginEmail.value = '';
      if (loginPassword) loginPassword.value = '';
      checkAuth();
      showToast('Berhasil keluar dari panel admin.');
    });
  }

  // Run auth check
  checkAuth();
});

// ============================================================
// 2. DASHBOARD NAVIGATION TABS & REALTIME DATA SYNC
// ============================================================
let _justSaved = false; // Flag: cegah Supabase overwrite data yg baru saja disimpan (termasuk nilai 0)

function initDashboard() {
  db = getMothraData();
  renderAllPanels();

  // Tarik data online terbaru dari Supabase
  if (typeof fetchMothraDataOnline === 'function') {
    fetchMothraDataOnline().then((onlineData) => {
      if (onlineData && !_justSaved) {
        db = onlineData;
        renderAllPanels();
        console.log('✅ [ADMIN] Data online Supabase berhasil disinkronkan ke panel admin.');
      }
    }).catch(() => {});
  }
}

function renderAllPanels() {
  if (!db) db = getMothraData();
  renderOverviewStats();
  renderBrandingForm();
  renderDossierForm();
  renderCategoriesTable();
  populateCategoryDropdown();
  renderRolesTable();
  populateRoleDropdown();
  renderLineupTable();
  renderScheduleTable();
  renderPartnershipsTable();
  renderRecordsTable();
  renderGalleryTable();
  renderSupabasePanel();
  renderUsersTable();
  renderAdsPanel();
}

// Dengarkan event update data realtime dari Supabase
window.addEventListener('mothra_data_updated', (e) => {
  if (sessionStorage.getItem(AUTH_SESSION_KEY) === 'true') {
    db = e.detail || getMothraData();
    renderAllPanels();
  }
});

// Unified Navigation: Sidebar Items & Mobile Quick-Nav Items
const navItems = document.querySelectorAll('.nav-item');
const quickNavItems = document.querySelectorAll('.mobile-quick-item');
const panels   = document.querySelectorAll('.admin-panel');
const adminSidebar = document.getElementById('adminSidebar');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
const adminMobileToggle = document.getElementById('adminMobileToggle');
const adminSidebarClose = document.getElementById('adminSidebarClose');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

function switchAdminPanel(panelId) {
  if (!panelId) return;

  // Update Sidebar Nav
  navItems.forEach((b) => b.classList.toggle('active', b.dataset.panel === panelId));
  
  // Update Mobile Quick Nav
  quickNavItems.forEach((b) => {
    const isTarget = b.dataset.panel === panelId;
    b.classList.toggle('active', isTarget);
    if (isTarget && b.scrollIntoView) {
      b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // Switch Panel
  panels.forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(panelId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Panel-specific re-renders
    if (panelId === 'panelRoles' && typeof renderRolesTable === 'function') {
      renderRolesTable();
    } else if (panelId === 'panelLineup' && typeof renderLineupTable === 'function') {
      renderLineupTable();
    } else if (panelId === 'panelCategories' && typeof renderCategoriesTable === 'function') {
      renderCategoriesTable();
    }
  }

  // Close Mobile Drawer
  closeAdminDrawer();
}

function openAdminDrawer() {
  if (adminSidebar) adminSidebar.classList.add('open');
  if (adminSidebarBackdrop) adminSidebarBackdrop.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeAdminDrawer() {
  if (adminSidebar) adminSidebar.classList.remove('open');
  if (adminSidebarBackdrop) adminSidebarBackdrop.classList.remove('visible');
  document.body.style.overflow = '';
}

// Bind Sidebar Items
navItems.forEach((btn) => {
  btn.addEventListener('click', () => switchAdminPanel(btn.dataset.panel));
});

// Bind Mobile Quick Nav Items
quickNavItems.forEach((btn) => {
  btn.addEventListener('click', () => switchAdminPanel(btn.dataset.panel));
});

// Bind Mobile Drawer Controls
if (adminMobileToggle) adminMobileToggle.addEventListener('click', openAdminDrawer);
if (adminSidebarClose) adminSidebarClose.addEventListener('click', closeAdminDrawer);
if (adminSidebarBackdrop) adminSidebarBackdrop.addEventListener('click', closeAdminDrawer);

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    checkAuth();
    showToast('Berhasil keluar dari panel admin.');
  });
}


/* ============================================================
   HELPER: LOCAL PC IMAGE FILE UPLOAD WITH CANVAS COMPRESSION
   ============================================================ */
function compressAndReadFile(file, maxWidth = 1000, maxHeight = 1000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupImageUploader(fileInputId, textInputId, previewImgId, maxW = 1000, maxH = 1000) {
  const fileInput = document.getElementById(fileInputId);
  const textInput = document.getElementById(textInputId);
  const previewImg = document.getElementById(previewImgId);

  if (!fileInput || !textInput || !previewImg) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WEBP, dll).');
      return;
    }

    try {
      const compressedDataUrl = await compressAndReadFile(file, maxW, maxH, 0.88);
      textInput.value = compressedDataUrl;
      previewImg.src = compressedDataUrl;
      showToast(`Foto "${file.name}" siap disimpan ke website!`);
    } catch (err) {
      console.error('Error processing image upload', err);
      alert('Gagal memproses gambar: ' + err.message);
    }
  });

  textInput.addEventListener('input', () => {
    const val = textInput.value.trim();
    if (val) {
      previewImg.src = val;
    }
  });
}

// Initialize File Uploaders
setupImageUploader('bLogoFile', 'bLogo', 'bLogoPreviewTag', 600, 600);
setupImageUploader('bLogoIconFile', 'bLogoIcon', 'bLogoIconPreviewTag', 400, 400);
setupImageUploader('bLoginLogoFile', 'bLoginLogo', 'bLoginLogoPreviewTag', 600, 600);
setupImageUploader('bLoadingLogoFile', 'bLoadingLogo', 'bLoadingLogoPreviewTag', 600, 600);
setupImageUploader('bHeroBgFile', 'bHeroBg', 'bHeroBgPreviewTag', 1920, 1080);
setupImageUploader('pImgFile', 'pImg', 'pImgPreviewTag', 800, 1000);
setupImageUploader('gImgFile', 'gImg', 'gImgPreviewTag', 1200, 800);
setupImageUploader('paLogoFile', 'paLogo', 'paLogoPreviewTag', 600, 600);
setupImageUploader('bannerImgFile', 'bannerImgUrl', 'bannerPreviewImg', 1200, 700);
setupImageUploader('adsPromoImgFile', 'adsPromoImgUrl', 'adsPromoImgPreview', 1200, 500);
setupImageUploader('sponsorLogoFile', 'sponsorLogo', 'sponsorLogoPreview', 400, 400);

/* ============================================================
   00 / BRANDING, HERO & CLAN IDENTITY CMS
   ============================================================ */
const brandingForm = document.getElementById('brandingForm');
function renderBrandingForm() {
  const b = db.branding || {};
  const h = db.hero || {};

  const nameEl = document.getElementById('bClanName');
  if (nameEl) nameEl.value = b.clanName || 'MOTHRA';
  const fullNameEl = document.getElementById('bClanFullName');
  if (fullNameEl) fullNameEl.value = b.clanFullName || 'MOTHRA ESPORTS';
  const taglineEl = document.getElementById('bTagline');
  if (taglineEl) taglineEl.value = b.tagline || 'TACTICAL ESPORTS SQUAD • NO FEAR. NO EXCUSES.';
  const descEl = document.getElementById('bDesc');
  if (descEl) descEl.value = b.description || 'Clan Point Blank Indonesia kompetitif berbasis disiplin, loyalitas, dan insting tempur tingkat tinggi.';
  
  // Main Clan Logo
  const logoEl = document.getElementById('bLogo');
  if (logoEl) logoEl.value = b.logo || 'assets/mothra-logo.png';
  const logoPrev = document.getElementById('bLogoPreviewTag');
  if (logoPrev) logoPrev.src = b.logo || 'assets/mothra-logo.png';

  // Favicon & Icon Transparan
  const logoIconEl = document.getElementById('bLogoIcon');
  if (logoIconEl) logoIconEl.value = b.logoIcon || 'assets/Logo_Clan_MOTHRA_-_Transparan_NO_TEXT.png';
  const logoIconPrev = document.getElementById('bLogoIconPreviewTag');
  if (logoIconPrev) logoIconPrev.src = b.logoIcon || 'assets/Logo_Clan_MOTHRA_-_Transparan_NO_TEXT.png';

  // Admin Login Screen Logo
  const loginLogoEl = document.getElementById('bLoginLogo');
  if (loginLogoEl) loginLogoEl.value = b.loginLogo || b.logo || 'assets/mothra-logo.png';
  const loginLogoPrev = document.getElementById('bLoginLogoPreviewTag');
  if (loginLogoPrev) loginLogoPrev.src = b.loginLogo || b.logo || 'assets/mothra-logo.png';

  // Hero Section Header Customization
  const heroBadgeEl = document.getElementById('bHeroBadge');
  if (heroBadgeEl) heroBadgeEl.value = h.badge || 'POINT BLANK INDONESIA • OFFICIAL SQUAD';
  const heroTitle1El = document.getElementById('bHeroTitle1');
  if (heroTitle1El) heroTitle1El.value = h.titleLine1 !== undefined ? h.titleLine1 : 'THE';
  const heroTitleHlEl = document.getElementById('bHeroTitleHighlight');
  if (heroTitleHlEl) heroTitleHlEl.value = h.titleHighlight !== undefined ? h.titleHighlight : 'HUNT';
  const heroTitle2El = document.getElementById('bHeroTitle2');
  if (heroTitle2El) heroTitle2El.value = h.titleLine2 !== undefined ? h.titleLine2 : 'NEVER STOPS.';
  const heroSubEl = document.getElementById('bHeroSubtitle');
  if (heroSubEl) heroSubEl.value = h.subtitle || 'Jakarta, Indonesia — Est. 2020 — Unit MTH-08';
  const heroBgEl = document.getElementById('bHeroBg');
  if (heroBgEl) heroBgEl.value = h.bgImage || 'assets/hero-bg.jpg';
  const heroBgPrev = document.getElementById('bHeroBgPreviewTag');
  if (heroBgPrev) heroBgPrev.src = h.bgImage || 'assets/hero-bg.jpg';

  // Loading Screen Branding
  const loadNameEl = document.getElementById('bLoadingName');
  if (loadNameEl) loadNameEl.value = b.loadingName || b.clanName || 'MOTHRA';
  const loadTextEl = document.getElementById('bLoadingText');
  if (loadTextEl) loadTextEl.value = b.loadingText || 'ESTABLISHING TACTICAL UPLINK...';
  const loadLogoEl = document.getElementById('bLoadingLogo');
  if (loadLogoEl) loadLogoEl.value = b.loadingLogo || b.logo || 'assets/mothra-logo.png';
  const loadLogoPrev = document.getElementById('bLoadingLogoPreviewTag');
  if (loadLogoPrev) loadLogoPrev.src = b.loadingLogo || b.logo || 'assets/mothra-logo.png';

  // Live update admin sidebar brand & logo
  const adminLogo = document.getElementById('adminSidebarLogo');
  if (adminLogo && b.logo) adminLogo.src = b.logo;
  const adminText = document.getElementById('adminSidebarBrandText');
  if (adminText && b.clanName) adminText.textContent = b.clanName;

  // Live update admin login logo
  const loginScreenLogo = document.getElementById('adminLoginLogo');
  if (loginScreenLogo) loginScreenLogo.src = b.loginLogo || b.logo || 'assets/mothra-logo.png';

  // Live update admin panel browser tab favicon (icon di tab browser)
  const adminFavicon = document.querySelector('link[rel="icon"]');
  if (adminFavicon) {
    const iconSrc = b.logoIcon || b.logo || 'assets/mothra-logo.png';
    adminFavicon.href = iconSrc;
  }
  // Also update mobile brand logo in mobile header
  const mobileLogo = document.querySelector('.mobile-brand-logo');
  if (mobileLogo && b.logo) mobileLogo.src = b.logo;
}

if (brandingForm) {
  brandingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    db.branding = {
      clanName: (document.getElementById('bClanName').value || 'MOTHRA').trim(),
      clanFullName: (document.getElementById('bClanFullName').value || 'MOTHRA ESPORTS').trim(),
      tagline: (document.getElementById('bTagline').value || '').trim(),
      description: (document.getElementById('bDesc').value || '').trim(),
      logo: (document.getElementById('bLogo').value || 'assets/mothra-logo.png').trim(),
      logoIcon: (document.getElementById('bLogoIcon').value || 'assets/Logo_Clan_MOTHRA_-_Transparan_NO_TEXT.png').trim(),
      loginLogo: (document.getElementById('bLoginLogo').value || document.getElementById('bLogo').value || 'assets/mothra-logo.png').trim(),
      loadingName: (document.getElementById('bLoadingName').value || document.getElementById('bClanName').value || 'MOTHRA').trim(),
      loadingText: (document.getElementById('bLoadingText').value || 'ESTABLISHING TACTICAL UPLINK...').trim(),
      loadingLogo: (document.getElementById('bLoadingLogo').value || document.getElementById('bLogo').value || 'assets/mothra-logo.png').trim()
    };

    db.hero = {
      badge: (document.getElementById('bHeroBadge').value || 'POINT BLANK INDONESIA • OFFICIAL SQUAD').trim(),
      titleLine1: (document.getElementById('bHeroTitle1').value || 'THE').trim(),
      titleHighlight: (document.getElementById('bHeroTitleHighlight').value || 'HUNT').trim(),
      titleLine2: (document.getElementById('bHeroTitle2').value || 'NEVER STOPS.').trim(),
      subtitle: (document.getElementById('bHeroSubtitle').value || 'Jakarta, Indonesia — Est. 2020 — Unit MTH-08').trim(),
      bgImage: (document.getElementById('bHeroBg').value || 'assets/hero-bg.jpg').trim()
    };

    saveMothraData(db);
    renderBrandingForm();
    showToast('🛡️ Identitas, Hero Section & Preloader berhasil disimpan ke Supabase!');
  });
}

/* ============================================================
   OVERVIEW PANEL
   ============================================================ */
function renderOverviewStats() {
  document.getElementById('statRosterCount').textContent = db.lineup ? db.lineup.length : 0;
  document.getElementById('statCategoryCount').textContent = db.categories ? db.categories.length : 0;
  document.getElementById('statMatchCount').textContent = (db.schedule && db.schedule.matches) ? db.schedule.matches.length : 0;
  const partnerEl = document.getElementById('statOverviewPartnerCount');
  if (partnerEl) partnerEl.textContent = db.partnerships ? db.partnerships.length : 0;
  document.getElementById('statRecordCount').textContent = db.records ? db.records.length : 0;
  document.getElementById('statGalleryCount').textContent = db.gallery ? db.gallery.length : 0;
}

/* ============================================================
   ADS & SPONSOR MANAGEMENT CMS
   ============================================================ */
let _editingSponsorId = null;

function renderAdsPanel() {
  if (!db || !db.ads) return;
  const ads = db.ads;

  // Top Bar form
  const topEnabled = document.getElementById('adsTopEnabled');
  const topText = document.getElementById('adsTopText');
  const topLinkText = document.getElementById('adsTopLinkText');
  const topLinkUrl = document.getElementById('adsTopLinkUrl');
  if (topEnabled && ads.topBanner) {
    topEnabled.checked = !!ads.topBanner.enabled;
    if (topText) topText.value = ads.topBanner.text || '';
    if (topLinkText) topLinkText.value = ads.topBanner.linkText || 'KLAIM PROMO ➔';
    if (topLinkUrl) topLinkUrl.value = ads.topBanner.linkUrl || '';
  }

  // Sponsor Ticker form
  const tickerEnabled = document.getElementById('adsTickerEnabled');
  const tickerLabel = document.getElementById('adsTickerLabel');
  if (tickerEnabled && ads.sponsorTicker) {
    tickerEnabled.checked = !!ads.sponsorTicker.enabled;
    if (tickerLabel) tickerLabel.value = ads.sponsorTicker.label || 'OFFICIAL CLAN SPONSORS & TACTICAL PARTNERS';
    // Dimension fields
    const st = ads.sponsorTicker;
    const el = (id) => document.getElementById(id);
    if (el('adsLogoWidth')) el('adsLogoWidth').value = st.logoWidth !== undefined ? st.logoWidth : 36;
    if (el('adsLogoHeight')) el('adsLogoHeight').value = st.logoHeight !== undefined ? st.logoHeight : 36;
    if (el('adsCardMinWidth')) el('adsCardMinWidth').value = st.cardMinWidth !== undefined ? st.cardMinWidth : 140;
    if (el('adsItemPaddingX')) el('adsItemPaddingX').value = st.itemPaddingX !== undefined ? st.itemPaddingX : 14;
    if (el('adsItemPaddingY')) el('adsItemPaddingY').value = st.itemPaddingY !== undefined ? st.itemPaddingY : 8;
    if (el('adsFontSize')) el('adsFontSize').value = st.fontSize !== undefined ? st.fontSize : 14;
    if (el('adsTickerSpeed')) el('adsTickerSpeed').value = st.speed !== undefined ? st.speed : 24;
    // Init live preview
    updateSponsorPreviewBadge();
  }
  renderSponsorsTable();

  // Promo Banner form
  const promoEnabled = document.getElementById('adsPromoEnabled');
  const promoTag = document.getElementById('adsPromoTag');
  const promoTitle = document.getElementById('adsPromoTitle');
  const promoDesc = document.getElementById('adsPromoDesc');
  const promoBtnText = document.getElementById('adsPromoBtnText');
  const promoBtnUrl = document.getElementById('adsPromoBtnUrl');
  const promoImgUrl = document.getElementById('adsPromoImgUrl');
  const promoImgPreview = document.getElementById('adsPromoImgPreview');
  if (promoEnabled && ads.promoBanner) {
    promoEnabled.checked = !!ads.promoBanner.enabled;
    if (promoTag) promoTag.value = ads.promoBanner.tag || 'OFFICIAL SPONSORED PARTNER';
    if (promoTitle) promoTitle.value = ads.promoBanner.title || '';
    if (promoDesc) promoDesc.value = ads.promoBanner.description || '';
    if (promoBtnText) promoBtnText.value = ads.promoBanner.btnText || 'KUNJUNGI STORE RESMI ➔';
    if (promoBtnUrl) promoBtnUrl.value = ads.promoBanner.btnUrl || '';
    if (promoImgUrl) promoImgUrl.value = ads.promoBanner.img || '';
    if (promoImgPreview && ads.promoBanner.img) promoImgPreview.src = ads.promoBanner.img;
  }
}

function renderSponsorsTable() {
  const tbody = document.getElementById('adsSponsorsTableBody');
  if (!tbody) return;
  const sponsors = (db && db.ads && db.ads.sponsorTicker && Array.isArray(db.ads.sponsorTicker.sponsors))
    ? db.ads.sponsorTicker.sponsors : [];
  if (sponsors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1rem;">Belum ada sponsor. Klik "+ TAMBAH SPONSOR" untuk menambahkan.</td></tr>`;
    return;
  }
  tbody.innerHTML = sponsors.map((sp, idx) => `
    <tr>
      <td><img src="${sp.logo || 'assets/mothra-logo.png'}" alt="${sp.name || ''}" style="width:36px;height:36px;object-fit:contain;filter:brightness(1.2);" /></td>
      <td style="font-weight:700;">${sp.name || '-'}</td>
      <td style="color:var(--gold);font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sp.link || '-'}</td>
      <td>
        <button type="button" onclick="window.editSponsor(${idx})" class="action-btn" title="Edit Sponsor">✏️</button>
        <button type="button" onclick="window.deleteSponsor(${idx})" class="action-btn action-btn--danger" title="Hapus Sponsor">🗑️</button>
      </td>
    </tr>
  `).join('');
}

window.openAddSponsorModal = function() {
  _editingSponsorId = null;
  const title = document.getElementById('sponsorModalTitle');
  if (title) title.textContent = 'TAMBAH SPONSOR BARU';
  const nameInp = document.getElementById('sponsorName');
  if (nameInp) nameInp.value = '';
  const linkInp = document.getElementById('sponsorLink');
  if (linkInp) linkInp.value = '';
  const logoInp = document.getElementById('sponsorLogo');
  if (logoInp) logoInp.value = '';
  const logoPrev = document.getElementById('sponsorLogoPreview');
  if (logoPrev) logoPrev.src = 'assets/mothra-logo.png';
  const saveBtn = document.getElementById('sponsorSaveBtn');
  if (saveBtn) saveBtn.textContent = '💾 TAMBAH SPONSOR ➔';

  const modal = document.getElementById('sponsorCrudModal');
  if (modal) {
    modal.style.removeProperty('display');
    modal.classList.add('open');
  }
};

window.editSponsor = function(idx) {
  if (!db || !db.ads || !db.ads.sponsorTicker || !Array.isArray(db.ads.sponsorTicker.sponsors)) return;
  const sp = db.ads.sponsorTicker.sponsors[idx];
  if (!sp) return;
  _editingSponsorId = idx;
  const title = document.getElementById('sponsorModalTitle');
  if (title) title.textContent = `EDIT SPONSOR: ${sp.name || ''}`;
  const nameInp = document.getElementById('sponsorName');
  if (nameInp) nameInp.value = sp.name || '';
  const linkInp = document.getElementById('sponsorLink');
  if (linkInp) linkInp.value = sp.link || '';
  const logoInp = document.getElementById('sponsorLogo');
  if (logoInp) logoInp.value = sp.logo || '';
  const logoPrev = document.getElementById('sponsorLogoPreview');
  if (logoPrev) logoPrev.src = sp.logo || 'assets/mothra-logo.png';
  const saveBtn = document.getElementById('sponsorSaveBtn');
  if (saveBtn) saveBtn.textContent = '💾 SIMPAN PERUBAHAN ➔';

  const modal = document.getElementById('sponsorCrudModal');
  if (modal) {
    modal.style.removeProperty('display');
    modal.classList.add('open');
  }
};

window.closeSponsorModal = function() {
  const modal = document.getElementById('sponsorCrudModal');
  if (modal) {
    modal.classList.remove('open');
  }
};

window.deleteSponsor = function(idx) {
  if (!confirm('Hapus sponsor ini dari Sponsor Ticker?')) return;
  if (!db || !db.ads || !db.ads.sponsorTicker || !Array.isArray(db.ads.sponsorTicker.sponsors)) return;
  db.ads.sponsorTicker.sponsors.splice(idx, 1);
  saveMothraData(db);
  renderSponsorsTable();
  showToast('Sponsor berhasil dihapus.');
};

// Direct button listener for + TAMBAH SPONSOR
const addSponsorBtn = document.getElementById('openAddSponsorBtn');
if (addSponsorBtn) {
  addSponsorBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.openAddSponsorModal();
  });
}

// Auto close on backdrop click
const sponsorModalEl = document.getElementById('sponsorCrudModal');
if (sponsorModalEl) {
  sponsorModalEl.addEventListener('click', (e) => {
    if (e.target === sponsorModalEl) {
      window.closeSponsorModal();
    }
  });
}

// Sponsor Form Submit (Add/Edit)
const sponsorCrudForm = document.getElementById('sponsorCrudForm');
if (sponsorCrudForm) {
  sponsorCrudForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!db.ads) db.ads = { topBanner: {}, sponsorTicker: { sponsors: [] }, promoBanner: {} };
    if (!db.ads.sponsorTicker) db.ads.sponsorTicker = { sponsors: [] };
    if (!Array.isArray(db.ads.sponsorTicker.sponsors)) db.ads.sponsorTicker.sponsors = [];

    const sp = {
      id: _editingSponsorId !== null && db.ads.sponsorTicker.sponsors[_editingSponsorId] ? (db.ads.sponsorTicker.sponsors[_editingSponsorId].id || `sp_${Date.now()}`) : `sp_${Date.now()}`,
      name: (document.getElementById('sponsorName').value || '').trim(),
      link: (document.getElementById('sponsorLink').value || '').trim(),
      logo: (document.getElementById('sponsorLogo').value || 'assets/mothra-logo.png').trim()
    };

    if (_editingSponsorId !== null && db.ads.sponsorTicker.sponsors[_editingSponsorId]) {
      db.ads.sponsorTicker.sponsors[_editingSponsorId] = sp;
    } else {
      db.ads.sponsorTicker.sponsors.push(sp);
    }
    saveMothraData(db);
    renderSponsorsTable();
    window.closeSponsorModal();
    showToast(_editingSponsorId !== null ? '✅ Sponsor berhasil diperbarui!' : '✅ Sponsor baru berhasil ditambahkan!');
  });
}

// Save Ads Ticker config + toggle + dimensions
window.saveAdsTicker = function() {
  if (!db.ads) db.ads = { topBanner: {}, sponsorTicker: { sponsors: [] }, promoBanner: {} };
  if (!db.ads.sponsorTicker) db.ads.sponsorTicker = { sponsors: [] };
  const el = (id) => document.getElementById(id);
  db.ads.sponsorTicker.enabled = !!(el('adsTickerEnabled') && el('adsTickerEnabled').checked);
  db.ads.sponsorTicker.label = (el('adsTickerLabel') ? el('adsTickerLabel').value : 'OFFICIAL CLAN SPONSORS & TACTICAL PARTNERS').trim();
  // Save dimension / sizing settings
  const parseVal = (id, def) => { const v = el(id); return v && v.value !== '' ? parseInt(v.value) : def; };
  db.ads.sponsorTicker.logoWidth     = parseVal('adsLogoWidth',    36);
  db.ads.sponsorTicker.logoHeight    = parseVal('adsLogoHeight',   36);
  db.ads.sponsorTicker.cardMinWidth  = parseVal('adsCardMinWidth', 140);
  db.ads.sponsorTicker.itemPaddingX  = parseVal('adsItemPaddingX', 14);
  db.ads.sponsorTicker.itemPaddingY  = parseVal('adsItemPaddingY', 8);
  db.ads.sponsorTicker.fontSize      = parseVal('adsFontSize',     14);
  db.ads.sponsorTicker.speed         = parseVal('adsTickerSpeed',  24);
  saveMothraData(db);
  showToast('🎽 Sponsor Ticker & Ukuran Kotak berhasil disimpan ke Supabase!');
};

// Live Preview Kotak Sponsor
window.updateSponsorPreviewBadge = function() {
  const el = (id) => document.getElementById(id);
  const logoW   = parseInt(el('adsLogoWidth')   ? el('adsLogoWidth').value   : 36) || 36;
  const logoH   = parseInt(el('adsLogoHeight')  ? el('adsLogoHeight').value  : 36) || 36;
  const padX    = parseInt(el('adsItemPaddingX') ? el('adsItemPaddingX').value : 14) || 14;
  const padY    = parseInt(el('adsItemPaddingY') ? el('adsItemPaddingY').value : 8) || 8;
  const fontSz  = parseInt(el('adsFontSize')    ? el('adsFontSize').value    : 14) || 14;
  const minW    = parseInt(el('adsCardMinWidth') ? el('adsCardMinWidth').value : 0) || 0;
  const badge   = el('adsSponsorPreviewBadge');
  const imgEl   = el('adsSponsorPreviewImg');
  const textEl  = el('adsSponsorPreviewText');
  if (!badge) return;
  badge.style.padding = `${padY}px ${padX}px`;
  if (minW > 0) badge.style.minWidth = `${minW}px`; else badge.style.minWidth = '';
  if (imgEl) { imgEl.style.width = `${logoW}px`; imgEl.style.height = `${logoH}px`; imgEl.style.maxWidth = `${logoW}px`; imgEl.style.maxHeight = `${logoH}px`; }
  if (textEl) textEl.style.fontSize = `${fontSz}px`;
  // Use first real sponsor logo if available
  if (db && db.ads && db.ads.sponsorTicker && Array.isArray(db.ads.sponsorTicker.sponsors) && db.ads.sponsorTicker.sponsors.length > 0) {
    const first = db.ads.sponsorTicker.sponsors[0];
    if (imgEl && first.logo) imgEl.src = first.logo;
    if (textEl && first.name) textEl.textContent = first.name;
  }
};

// Top Bar Form Submit
const adsTopForm = document.getElementById('adsTopForm');
if (adsTopForm) {
  adsTopForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!db.ads) db.ads = { topBanner: {}, sponsorTicker: { sponsors: [] }, promoBanner: {} };
    db.ads.topBanner = {
      enabled: !!(document.getElementById('adsTopEnabled') && document.getElementById('adsTopEnabled').checked),
      text: (document.getElementById('adsTopText').value || '').trim(),
      linkText: (document.getElementById('adsTopLinkText').value || 'KLAIM PROMO ➔').trim(),
      linkUrl: (document.getElementById('adsTopLinkUrl').value || '#').trim()
    };
    saveMothraData(db);
    showToast('📣 Bar Pengumuman berhasil disimpan ke Supabase!');
  });
}

// Promo Banner Form Submit
const adsPromoForm = document.getElementById('adsPromoForm');
if (adsPromoForm) {
  adsPromoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!db.ads) db.ads = { topBanner: {}, sponsorTicker: { sponsors: [] }, promoBanner: {} };
    db.ads.promoBanner = {
      enabled: !!(document.getElementById('adsPromoEnabled') && document.getElementById('adsPromoEnabled').checked),
      tag: (document.getElementById('adsPromoTag').value || 'OFFICIAL SPONSORED PARTNER').trim(),
      title: (document.getElementById('adsPromoTitle').value || '').trim(),
      description: (document.getElementById('adsPromoDesc').value || '').trim(),
      btnText: (document.getElementById('adsPromoBtnText').value || 'KUNJUNGI STORE RESMI ➔').trim(),
      btnUrl: (document.getElementById('adsPromoBtnUrl').value || '#').trim(),
      img: (document.getElementById('adsPromoImgUrl').value || 'assets/hero-bg.jpg').trim()
    };
    saveMothraData(db);
    showToast('🎯 Promo Banner berhasil disimpan ke Supabase!');
  });
}

/* ============================================================
   01 / THE DOSSIER (ABOUT & 3 CORE VALUES) CMS
   ============================================================ */
const dossierForm = document.getElementById('dossierForm');
function renderDossierForm() {
  const d = db.dossier || {};
  const vals = Array.isArray(d.values) && d.values.length >= 3 ? d.values : [
    { title: "PLAY SMART", description: "Eksekusi strategi sebelum ego pribadi." },
    { title: "PLAY AS ONE", description: "Kekuatan kami adalah kesatuan dan komunikasi." },
    { title: "STAY SHARP", description: "Refleks tajam, mental tenang dalam clutch moment." }
  ];

  // Narasi Utama
  document.getElementById('dosTagline').value = d.tagline || 'DISIPLIN. LOYALITAS. INSTING.';
  document.getElementById('dosDesc').value = d.description || '';

  // Kartu Markas Tactical Division (Tengah)
  const divLabelEl = document.getElementById('dosDivisionLabel');
  if (divLabelEl) divLabelEl.value = d.divisionLabel || 'TACTICAL DIVISION';
  document.getElementById('dosCity').value = d.city || 'JAKARTA - INDONESIA';
  document.getElementById('dosUnit').value = d.unit || 'UNIT / MTH-08';
  document.getElementById('dosStatus').value = d.status || 'ACTIVE ROSTER';

  // 3 Nilai Taktis Core Values (Kanan)
  const v1Title = document.getElementById('dosVal1Title');
  const v1Desc = document.getElementById('dosVal1Desc');
  const v2Title = document.getElementById('dosVal2Title');
  const v2Desc = document.getElementById('dosVal2Desc');
  const v3Title = document.getElementById('dosVal3Title');
  const v3Desc = document.getElementById('dosVal3Desc');

  if (v1Title) v1Title.value = vals[0].title || 'PLAY SMART';
  if (v1Desc) v1Desc.value = vals[0].description || 'Eksekusi strategi sebelum ego pribadi.';
  if (v2Title) v2Title.value = vals[1].title || 'PLAY AS ONE';
  if (v2Desc) v2Desc.value = vals[1].description || 'Kekuatan kami adalah kesatuan dan komunikasi.';
  if (v3Title) v3Title.value = vals[2].title || 'STAY SHARP';
  if (v3Desc) v3Desc.value = vals[2].description || 'Refleks tajam, mental tenang dalam clutch moment.';

  // Statistik Performa
  document.getElementById('dosWinrate').value = d.winrate || 95;
  document.getElementById('dosMembers').value = (d.activeMembers !== undefined && d.activeMembers !== null) ? d.activeMembers : 250;
  document.getElementById('dosTournaments').value = (d.tournamentsWon !== undefined && d.tournamentsWon !== null) ? d.tournamentsWon : 3;
}

if (dossierForm) {
  dossierForm.addEventListener('submit', (e) => {
    e.preventDefault();
    db.dossier = {
      tagline: document.getElementById('dosTagline').value.trim(),
      description: document.getElementById('dosDesc').value.trim(),
      divisionLabel: (document.getElementById('dosDivisionLabel') ? document.getElementById('dosDivisionLabel').value : 'TACTICAL DIVISION').trim(),
      city: document.getElementById('dosCity').value.trim(),
      unit: document.getElementById('dosUnit').value.trim(),
      status: document.getElementById('dosStatus').value.trim(),
      values: [
        {
          title: (document.getElementById('dosVal1Title') ? document.getElementById('dosVal1Title').value : 'PLAY SMART').trim(),
          description: (document.getElementById('dosVal1Desc') ? document.getElementById('dosVal1Desc').value : 'Eksekusi strategi sebelum ego pribadi.').trim()
        },
        {
          title: (document.getElementById('dosVal2Title') ? document.getElementById('dosVal2Title').value : 'PLAY AS ONE').trim(),
          description: (document.getElementById('dosVal2Desc') ? document.getElementById('dosVal2Desc').value : 'Kekuatan kami adalah kesatuan dan komunikasi.').trim()
        },
        {
          title: (document.getElementById('dosVal3Title') ? document.getElementById('dosVal3Title').value : 'STAY SHARP').trim(),
          description: (document.getElementById('dosVal3Desc') ? document.getElementById('dosVal3Desc').value : 'Refleks tajam, mental tenang dalam clutch moment.').trim()
        }
      ],
      winrate: parseInt(document.getElementById('dosWinrate').value, 10) || 95,
      activeMembers: Math.min(250, Math.max(1, parseInt(document.getElementById('dosMembers').value, 10) || 250)),
      tournamentsWon: (function(){ const v = parseInt(document.getElementById('dosTournaments').value, 10); return isNaN(v) ? 0 : Math.max(0, v); })()
    };

    // Set flag agar Supabase fetch tidak overwrite nilai baru (termasuk 0) sebelum upsert selesai
    _justSaved = true;
    setTimeout(() => { _justSaved = false; }, 5000); // Reset setelah 5 detik
    saveMothraData(db);
    renderDossierForm();
    showToast('📖 The Dossier, Kartu Markas & 3 Nilai Taktis berhasil disimpan ke Supabase!');
  });
}

/* ============================================================
   02 / KATEGORI TURNAMEN CRUD (PBNC, PBSC, PBIC, PBLC, dll)
   ============================================================ */
const categoriesTableBody = document.getElementById('categoriesTableBody');
const categoryModal = document.getElementById('categoryCrudModal');
const categoryForm = document.getElementById('categoryCrudForm');
let editingCategoryId = null;

function renderCategoriesTable() {
  if (!categoriesTableBody) return;
  if (!Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = [
      { id: "pbnc", label: "PBNC (NATIONAL)", badge: "PBNC ROSTER", fullName: "Point Blank National Championship" },
      { id: "pbsc", label: "PBSC (STAR)", badge: "PBSC ROSTER", fullName: "Point Blank Star Championship" },
      { id: "pbic", label: "PBIC (INTERNATIONAL)", badge: "PBIC ROSTER", fullName: "Point Blank International Championship" },
      { id: "pblc", label: "PBLC (LADIES)", badge: "PBLC LADIES", fullName: "Point Blank Ladies Championship" },
      { id: "ba", label: "BRAND AMBASSADOR", badge: "OFFICIAL BA", fullName: "Official Brand Ambassador & Streamer" }
    ];
  }

  categoriesTableBody.innerHTML = '';
  db.categories.forEach((cat) => {
    const playerCount = (db.lineup || []).filter((p) => p.category === cat.id).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-tag badge-tag--gold">${cat.id}</span></td>
      <td><strong>${cat.label}</strong></td>
      <td style="color:var(--gray-light);font-size:0.85rem;">${cat.fullName || '-'}</td>
      <td><span class="badge-tag badge-tag--blue">${cat.badge || cat.label}</span></td>
      <td><strong style="color:var(--gold);">${playerCount} Roster</strong></td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editCategory('${cat.id}')">Edit</button>
          <button class="btn-action-del" onclick="deleteCategory('${cat.id}')">Hapus</button>
        </div>
      </td>
    `;
    categoriesTableBody.appendChild(tr);
  });
  renderOverviewStats();
  populateCategoryDropdown();
}

function populateCategoryDropdown() {
  const pCategory = document.getElementById('pCategory');
  if (!pCategory) return;
  pCategory.innerHTML = '';
  (db.categories || []).forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `[${cat.id.toUpperCase()}] ${cat.label} — ${cat.fullName || ''}`;
    pCategory.appendChild(opt);
  });
}

window.openAddCategoryModal = function() {
  editingCategoryId = null;
  document.getElementById('categoryModalTitle').textContent = 'TAMBAH KATEGORI TURNAMEN BARU';
  categoryForm.reset();
  const idEl = document.getElementById('catId');
  idEl.readOnly = false;
  categoryModal.classList.add('open');
};

window.editCategory = function(id) {
  const cat = (db.categories || []).find((c) => c.id === id);
  if (!cat) return;
  editingCategoryId = id;
  document.getElementById('categoryModalTitle').textContent = `EDIT KATEGORI TURNAMEN: ${cat.label}`;
  const idEl = document.getElementById('catId');
  idEl.value = cat.id;
  idEl.readOnly = true;
  document.getElementById('catLabel').value = cat.label;
  document.getElementById('catFullName').value = cat.fullName || '';
  document.getElementById('catBadge').value = cat.badge || cat.label;
  categoryModal.classList.add('open');
};

window.deleteCategory = function(id) {
  if (confirm(`Yakin ingin menghapus kategori turnamen "${id}"? Pemain pada kategori ini akan dialihkan ke kategori default.`)) {
    db.categories = (db.categories || []).filter((c) => c.id !== id);
    const fallbackId = db.categories.length ? db.categories[0].id : 'pbnc';
    (db.lineup || []).forEach((p) => {
      if (p.category === id) p.category = fallbackId;
    });
    saveMothraData(db);
    renderCategoriesTable();
    renderLineupTable();
    showToast('Kategori turnamen berhasil dihapus.');
  }
};

categoryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const catId = document.getElementById('catId').value.trim().toLowerCase().replace(/\s+/g, '_');
  const catLabel = document.getElementById('catLabel').value.trim();
  const catFullName = document.getElementById('catFullName').value.trim();
  const catBadge = document.getElementById('catBadge').value.trim() || catLabel;

  if (!Array.isArray(db.categories)) db.categories = [];

  if (editingCategoryId) {
    const idx = db.categories.findIndex((c) => c.id === editingCategoryId);
    if (idx !== -1) {
      db.categories[idx] = { id: editingCategoryId, label: catLabel, fullName: catFullName, badge: catBadge };
    }
  } else {
    if (db.categories.some((c) => c.id === catId)) {
      alert('Kode Kategori Turnamen sudah ada! Harap gunakan kode lain.');
      return;
    }
    db.categories.push({ id: catId, label: catLabel, fullName: catFullName, badge: catBadge });
  }

  saveMothraData(db);
  renderCategoriesTable();
  renderLineupTable();
  categoryModal.classList.remove('open');
  showToast(editingCategoryId ? 'Kategori turnamen berhasil diperbarui!' : 'Kategori turnamen baru berhasil ditambahkan!');
});

/* ============================================================
   02B / MANAJEMEN ROLE TACTICAL CRUD (IGL, RUSHER, SNIPER, DLL)
   ============================================================ */
let editingRoleId = null;

function ensureDefaultRoles() {
  if (!db) db = getMothraData();
  if (!db.roles || !Array.isArray(db.roles) || db.roles.length === 0) {
    db.roles = [
      { id: "igl", label: "IGL / CAPTAIN", description: "In-Game Leader & Tactical Shotcaller" },
      { id: "rusher", label: "RUSHER / ATTACKER", description: "Frontline Entry Fragger & Assault" },
      { id: "sniper", label: "SNIPER / MARKSMAN", description: "Long-Range Precision Specialist" },
      { id: "pointman", label: "POINTMAN / HITTER", description: "Fast SMG & CQC Specialist" },
      { id: "support", label: "SUPPORT / BACKUP", description: "Utility, Cover & Secondary Fragger" },
      { id: "flex", label: "FLEX / SIXTH MAN", description: "Multi-Role Tactical Sub & Rotation" },
      { id: "ba", label: "BRAND AMBASSADOR", description: "Official Brand Ambassador & Streamer" },
      { id: "coach", label: "HEAD COACH", description: "Tactical Strategist & Analyst" }
    ];
  }
}

function renderRolesTable() {
  const tbody = document.getElementById('rolesTableBody');
  if (!tbody) return;

  ensureDefaultRoles();

  tbody.innerHTML = '';
  db.roles.forEach((r) => {
    const playerCount = (db.lineup || []).filter((p) => p.role && (p.role.toLowerCase() === r.label.toLowerCase() || p.role.toLowerCase() === r.id.toLowerCase())).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-tag badge-tag--gold">${r.id}</span></td>
      <td><strong style="color:var(--white);">${r.label}</strong></td>
      <td style="color:var(--gray-light);font-size:0.85rem;">${r.description || '-'}</td>
      <td><strong style="color:var(--gold);">${playerCount} Roster</strong></td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editRole('${r.id}')">Edit</button>
          <button class="btn-action-del" onclick="deleteRole('${r.id}')">Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  populateRoleDropdown();
}

function populateRoleDropdown() {
  const pRole = document.getElementById('pRole');
  if (!pRole) return;
  const currentVal = pRole.value;

  ensureDefaultRoles();

  pRole.innerHTML = '';
  (db.roles || []).forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.label;
    opt.textContent = `${r.label} ${r.description ? '— ' + r.description : ''}`;
    pRole.appendChild(opt);
  });

  if (currentVal) {
    pRole.value = currentVal;
  }
}

window.openAddRoleModal = function() {
  editingRoleId = null;
  const titleEl = document.getElementById('roleModalTitle');
  if (titleEl) titleEl.textContent = 'TAMBAH ROLE TACTICAL BARU';
  const form = document.getElementById('roleCrudForm');
  if (form) form.reset();
  const idEl = document.getElementById('rId');
  if (idEl) idEl.readOnly = false;
  const modal = document.getElementById('roleCrudModal');
  if (modal) modal.classList.add('open');
};

window.closeRoleModal = function() {
  const modal = document.getElementById('roleCrudModal');
  if (modal) modal.classList.remove('open');
};

window.editRole = function(id) {
  ensureDefaultRoles();
  const r = (db.roles || []).find((x) => x.id === id);
  if (!r) return;
  editingRoleId = id;
  const titleEl = document.getElementById('roleModalTitle');
  if (titleEl) titleEl.textContent = `EDIT ROLE: ${r.label}`;
  const idEl = document.getElementById('rId');
  if (idEl) {
    idEl.value = r.id;
    idEl.readOnly = true;
  }
  const labelEl = document.getElementById('rLabel');
  if (labelEl) labelEl.value = r.label;
  const descEl = document.getElementById('rDesc');
  if (descEl) descEl.value = r.description || '';
  const modal = document.getElementById('roleCrudModal');
  if (modal) modal.classList.add('open');
};

window.deleteRole = function(id) {
  ensureDefaultRoles();
  const r = (db.roles || []).find((x) => x.id === id);
  const roleName = r ? r.label : id;
  if (confirm(`Yakin ingin menghapus role "${roleName}"? Role pada pemain terkait akan tetap tersimpan.`)) {
    db.roles = (db.roles || []).filter((x) => x.id !== id);
    saveMothraData(db);
    renderRolesTable();
    populateRoleDropdown();
    showToast('Role tactical berhasil dihapus.');
  }
};

// Bind form submission
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('roleCrudForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const idInput = document.getElementById('rId');
      const labelInput = document.getElementById('rLabel');
      const descInput = document.getElementById('rDesc');

      const rId = ((idInput && idInput.value) || '').trim().toLowerCase().replace(/\s+/g, '_');
      const rLabel = ((labelInput && labelInput.value) || '').trim();
      const rDesc = ((descInput && descInput.value) || '').trim();

      if (!rId || !rLabel) {
        alert('Harap isi Kode Role dan Nama Role.');
        return;
      }

      ensureDefaultRoles();

      if (editingRoleId) {
        const idx = db.roles.findIndex((x) => x.id === editingRoleId);
        if (idx !== -1) {
          db.roles[idx] = { id: editingRoleId, label: rLabel, description: rDesc };
        }
      } else {
        if (db.roles.some((x) => x.id === rId)) {
          alert('Kode Role sudah ada! Harap gunakan kode lain.');
          return;
        }
        db.roles.push({ id: rId, label: rLabel, description: rDesc });
      }

      saveMothraData(db);
      renderRolesTable();
      populateRoleDropdown();
      window.closeRoleModal();
      showToast(editingRoleId ? 'Role tactical berhasil diperbarui!' : 'Role tactical baru berhasil ditambahkan!');
    });
  }
});

/* ============================================================
   03 / THE LINEUP (ROSTER CRUD)
   ============================================================ */
const lineupTableBody = document.getElementById('lineupTableBody');
const playerModal = document.getElementById('playerCrudModal');
const playerForm = document.getElementById('playerCrudForm');
let editingPlayerId = null;

function renderLineupTable() {
  if (!lineupTableBody) return;
  lineupTableBody.innerHTML = '';
  (db.lineup || []).forEach((p) => {
    const catObj = (db.categories || []).find((c) => c.id === p.category);
    const catLabel = catObj ? catObj.badge || catObj.label : (p.category || 'PBNC').toUpperCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.img}" alt="${p.name}" class="table-thumb" onerror="this.src='assets/player-captain.jpg'" /></td>
      <td><strong>${p.name}</strong><br/><small style="color:var(--gray-light)">${p.realname || '-'}</small></td>
      <td><span class="badge-tag badge-tag--gold">${catLabel}</span></td>
      <td><span class="badge-tag badge-tag--green">${p.role}</span></td>
      <td>${p.weapon || '-'}</td>
      <td><span style="color:var(--gold);font-weight:bold">${p.kd || '-'}</span></td>
      <td>${p.hs || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editPlayer('${p.id}')">Edit</button>
          <button class="btn-action-del" onclick="deletePlayer('${p.id}')">Hapus</button>
        </div>
      </td>
    `;
    lineupTableBody.appendChild(tr);
  });
  renderOverviewStats();
}

window.openAddPlayerModal = function() {
  editingPlayerId = null;
  document.getElementById('playerModalTitle').textContent = 'TAMBAH ROSTER / BA BARU';
  playerForm.reset();
  populateCategoryDropdown();
  populateRoleDropdown();
  const pCat = document.getElementById('pCategory');
  if (pCat && pCat.options.length) pCat.selectedIndex = 0;
  const pRole = document.getElementById('pRole');
  if (pRole && pRole.options.length) pRole.selectedIndex = 0;
  document.getElementById('pImg').value = 'assets/player-captain.jpg';
  document.getElementById('pImgPreviewTag').src = 'assets/player-captain.jpg';
  playerModal.classList.add('open');
};

window.editPlayer = function(id) {
  const p = (db.lineup || []).find((x) => x.id === id);
  if (!p) return;
  editingPlayerId = id;
  document.getElementById('playerModalTitle').textContent = `EDIT ROSTER: ${p.name}`;
  document.getElementById('pName').value = p.name;
  document.getElementById('pRealname').value = p.realname || '';

  populateRoleDropdown();
  const pRole = document.getElementById('pRole');
  if (pRole) {
    let exists = Array.from(pRole.options).some(opt => opt.value.toLowerCase() === (p.role || '').toLowerCase());
    if (!exists && p.role) {
      const customOpt = document.createElement('option');
      customOpt.value = p.role;
      customOpt.textContent = p.role;
      pRole.appendChild(customOpt);
    }
    pRole.value = p.role;
  }

  populateCategoryDropdown();
  document.getElementById('pCategory').value = p.category || (db.categories.length ? db.categories[0].id : 'pbnc');
  document.getElementById('pNum').value = p.num || '00';
  document.getElementById('pImg').value = p.img || 'assets/player-captain.jpg';
  document.getElementById('pImgPreviewTag').src = p.img || 'assets/player-captain.jpg';
  document.getElementById('pWeapon').value = p.weapon || '';
  document.getElementById('pKD').value = p.kd || '2.00';
  document.getElementById('pHS').value = p.hs || '60%';
  document.getElementById('pExp').value = p.experience || '3 Tahun';
  document.getElementById('pBio').value = p.bio || '';
  playerModal.classList.add('open');
};

window.deletePlayer = function(id) {
  if (confirm('Yakin ingin menghapus pemain ini dari Lineup?')) {
    db.lineup = (db.lineup || []).filter((x) => x.id !== id);
    saveMothraData(db);
    renderLineupTable();
    renderCategoriesTable();
    showToast('Pemain berhasil dihapus dari Lineup.');
  }
};

playerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pData = {
    id: editingPlayerId || 'p_' + Date.now(),
    name: document.getElementById('pName').value.trim(),
    realname: document.getElementById('pRealname').value.trim(),
    role: document.getElementById('pRole').value.trim(),
    category: document.getElementById('pCategory').value,
    num: document.getElementById('pNum').value.trim() || '00',
    img: document.getElementById('pImg').value.trim() || 'assets/player-captain.jpg',
    weapon: document.getElementById('pWeapon').value.trim(),
    kd: document.getElementById('pKD').value.trim() || '2.00',
    hs: document.getElementById('pHS').value.trim() || '60%',
    experience: document.getElementById('pExp').value.trim() || '3 Tahun',
    bio: document.getElementById('pBio').value.trim(),
    featured: editingPlayerId ? (db.lineup.find((x) => x.id === editingPlayerId)?.featured || false) : false
  };

  if (!Array.isArray(db.lineup)) db.lineup = [];

  if (editingPlayerId) {
    const idx = db.lineup.findIndex((x) => x.id === editingPlayerId);
    if (idx !== -1) db.lineup[idx] = pData;
  } else {
    db.lineup.push(pData);
  }

  saveMothraData(db);
  renderLineupTable();
  renderCategoriesTable();
  playerModal.classList.remove('open');
  showToast(editingPlayerId ? 'Data pemain berhasil diperbarui!' : 'Pemain baru berhasil ditambahkan!');
});

/* ============================================================
   04 / MATCH SCHEDULE CRUD
   ============================================================ */
const scheduleTableBody = document.getElementById('scheduleTableBody');
const scheduleModal = document.getElementById('scheduleCrudModal');
const scheduleForm = document.getElementById('scheduleCrudForm');
const bannerForm = document.getElementById('bannerForm');
let editingMatchId = null;

function renderScheduleTable() {
  const bannerUrl = (db.schedule && db.schedule.bannerImg) ? db.schedule.bannerImg : 'assets/match-schedule.jpg';
  document.getElementById('bannerImgUrl').value = bannerUrl;
  const bannerPrev = document.getElementById('bannerPreviewImg');
  if (bannerPrev) bannerPrev.src = bannerUrl;

  scheduleTableBody.innerHTML = '';

  const matches = (db.schedule && db.schedule.matches) ? db.schedule.matches : [];
  matches.forEach((m) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${m.stage}</strong></td>
      <td><strong style="color:${m.opponentColor || 'var(--gold)'}">${m.opponent}</strong></td>
      <td>${m.tournament}</td>
      <td><span class="badge-tag badge-tag--gold">${m.map}</span></td>
      <td>${m.time}</td>
      <td><span class="badge-tag badge-tag--green">${m.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editMatch('${m.id}')">Edit</button>
          <button class="btn-action-del" onclick="deleteMatch('${m.id}')">Hapus</button>
        </div>
      </td>
    `;
    scheduleTableBody.appendChild(tr);
  });
  renderOverviewStats();
}

bannerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!db.schedule) db.schedule = {};
  db.schedule.bannerImg = document.getElementById('bannerImgUrl').value.trim();
  saveMothraData(db);
  showToast('Banner poster jadwal turnamen berhasil diperbarui!');
});

window.openAddMatchModal = function() {
  editingMatchId = null;
  document.getElementById('scheduleModalTitle').textContent = 'TAMBAH JADWAL PERTANDINGAN';
  scheduleForm.reset();
  scheduleModal.classList.add('open');
};

window.editMatch = function(id) {
  const matches = (db.schedule && db.schedule.matches) ? db.schedule.matches : [];
  const m = matches.find((x) => x.id === id);
  if (!m) return;
  editingMatchId = id;
  document.getElementById('scheduleModalTitle').textContent = `EDIT: ${m.stage}`;
  document.getElementById('mStage').value = m.stage;
  document.getElementById('mOpponent').value = m.opponent;
  document.getElementById('mOpponentShort').value = m.opponentShort || '';
  document.getElementById('mOpponentColor').value = m.opponentColor || '#EF4444';
  document.getElementById('mTournament').value = m.tournament;
  document.getElementById('mMap').value = m.map;
  document.getElementById('mTime').value = m.time;
  document.getElementById('mStatus').value = m.status;
  document.getElementById('mStreamUrl').value = m.streamUrl || 'https://discord.gg/fxfMBWSzW';
  scheduleModal.classList.add('open');
};

window.deleteMatch = function(id) {
  if (confirm('Yakin ingin menghapus jadwal pertandingan ini?')) {
    if (db.schedule && db.schedule.matches) {
      db.schedule.matches = db.schedule.matches.filter((x) => x.id !== id);
      saveMothraData(db);
      renderScheduleTable();
      showToast('Jadwal pertandingan berhasil dihapus.');
    }
  }
};

scheduleForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!db.schedule) db.schedule = { matches: [] };
  if (!Array.isArray(db.schedule.matches)) db.schedule.matches = [];

  const mData = {
    id: editingMatchId || 'm_' + Date.now(),
    stage: document.getElementById('mStage').value.trim(),
    opponent: document.getElementById('mOpponent').value.trim(),
    opponentShort: document.getElementById('mOpponentShort').value.trim() || 'VS',
    opponentColor: document.getElementById('mOpponentColor').value.trim() || '#EF4444',
    tournament: document.getElementById('mTournament').value.trim(),
    map: document.getElementById('mMap').value.trim(),
    time: document.getElementById('mTime').value.trim(),
    status: document.getElementById('mStatus').value.trim(),
    streamUrl: document.getElementById('mStreamUrl').value.trim() || 'https://discord.gg/fxfMBWSzW'
  };

  if (editingMatchId) {
    const idx = db.schedule.matches.findIndex((x) => x.id === editingMatchId);
    if (idx !== -1) db.schedule.matches[idx] = mData;
  } else {
    db.schedule.matches.push(mData);
  }

  saveMothraData(db);
  renderScheduleTable();
  scheduleModal.classList.remove('open');
  showToast(editingMatchId ? 'Jadwal pertandingan berhasil diperbarui!' : 'Jadwal pertandingan baru berhasil ditambahkan!');
});

/* ============================================================
   05 / THE ALLIANCE (PARTNERSHIP CRUD)
   ============================================================ */
const partnershipTableBody = document.getElementById('partnershipTableBody');
const partnershipModal = document.getElementById('partnershipCrudModal');
const partnershipForm = document.getElementById('partnershipCrudForm');
let editingPartnershipId = null;
let currentPartnerFilter = 'all';

function getPartnerTypeBadge(type) {
  switch (type) {
    case 'scrim':
      return '<span class="badge-type badge-type-scrim">⚔️ Scrim</span>';
    case 'sponsor':
      return '<span class="badge-type badge-type-sponsor">🤝 Sponsorship</span>';
    case 'design':
      return '<span class="badge-type badge-type-design">🎨 Design</span>';
    case 'ba':
      return '<span class="badge-type badge-type-ba">👑 Brand Ambassador</span>';
    default:
      return `<span class="badge-type badge-type-scrim">${type}</span>`;
  }
}

function getPartnerStatusBadge(status) {
  const s = (status || 'ACTIVE').toUpperCase();
  switch (s) {
    case 'ACTIVE':
      return '<span class="badge-status-active">✅ ACTIVE</span>';
    case 'PENDING':
      return '<span class="badge-status-pending">⏳ PENDING</span>';
    case 'NEGOTIATION':
      return '<span class="badge-status-negotiation">🔄 NEGOTIATION</span>';
    case 'CLOSED':
      return '<span class="badge-status-closed">❌ CLOSED</span>';
    default:
      return `<span class="badge-status-active">${s}</span>`;
  }
}

function renderPartnershipsTable(filterType = currentPartnerFilter) {
  if (!partnershipTableBody) return;
  if (!Array.isArray(db.partnerships) || db.partnerships.length === 0) {
    db.partnerships = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.partnerships));
  }

  // Update Summary Stats
  const scrimCount = db.partnerships.filter((p) => p.type === 'scrim').length;
  const sponsorCount = db.partnerships.filter((p) => p.type === 'sponsor').length;
  const designCount = db.partnerships.filter((p) => p.type === 'design').length;
  const baCount = db.partnerships.filter((p) => p.type === 'ba').length;
  const totalCount = db.partnerships.length;

  const elScrim = document.getElementById('statScrimCount');
  const elSponsor = document.getElementById('statSponsorCount');
  const elDesign = document.getElementById('statDesignCount');
  const elBa = document.getElementById('statBaCount');
  const elTotal = document.getElementById('statPartnerTotal');

  if (elScrim) elScrim.textContent = scrimCount;
  if (elSponsor) elSponsor.textContent = sponsorCount;
  if (elDesign) elDesign.textContent = designCount;
  if (elBa) elBa.textContent = baCount;
  if (elTotal) elTotal.textContent = totalCount;

  // Filter items
  const items = filterType === 'all'
    ? db.partnerships
    : db.partnerships.filter((p) => p.type === filterType);

  partnershipTableBody.innerHTML = '';

  if (items.length === 0) {
    partnershipTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:2rem;color:var(--gray-light);font-family:var(--font-mono);">
          Belum ada data kerjasama untuk kategori ini. Klik tombol <strong>+ TAMBAH KERJASAMA</strong> untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  items.forEach((p) => {
    const logoSrc = p.logo || 'assets/mothra-logo.png';
    const cleanPhone = (p.contact || '').replace(/[^0-9]/g, '');
    const isPhone = cleanPhone.length >= 9;
    const waLink = isPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${logoSrc}" alt="${p.name}" class="table-thumb" style="width:40px;height:40px;object-fit:contain;" onerror="this.src='assets/mothra-logo.png'" /></td>
      <td>${getPartnerTypeBadge(p.type)}</td>
      <td>
        <strong style="color:var(--white);">${p.name}</strong>
        ${p.typeLabel ? `<div style="font-size:0.75rem;color:var(--gray-light);font-family:var(--font-mono);">${p.typeLabel}</div>` : ''}
      </td>
      <td>
        <span style="font-family:var(--font-mono);font-size:0.85rem;color:var(--gold);">${p.contact || '-'}</span>
        ${p.contactType ? `<br/><small style="color:var(--gray-light);">[${p.contactType}]</small>` : ''}
        ${waLink ? `<br/><a href="${waLink}" target="_blank" style="color:#86EFAC;font-size:0.75rem;text-decoration:underline;">Chat WhatsApp &rarr;</a>` : ''}
      </td>
      <td>${getPartnerStatusBadge(p.status)}</td>
      <td style="font-family:var(--font-mono);font-size:0.8rem;color:var(--gray-light);">${p.date || '-'}</td>
      <td>
        <div class="notes-cell" title="${(p.notes || '').replace(/"/g, '&quot;')}" style="white-space:pre-line;max-height:60px;overflow-y:auto;font-size:0.78rem;">${p.notes || '-'}</div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editPartnership('${p.id}')">Edit</button>
          <button class="btn-action-del" onclick="deletePartnership('${p.id}')">Hapus</button>
        </div>
      </td>
    `;
    partnershipTableBody.appendChild(tr);
  });
}

// Partnership Filter Tabs
document.querySelectorAll('.pa-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pa-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentPartnerFilter = tab.dataset.type || 'all';
    renderPartnershipsTable(currentPartnerFilter);
  });
});

window.openAddPartnershipModal = function() {
  editingPartnershipId = null;
  document.getElementById('partnershipModalTitle').textContent = 'TAMBAH DATA KERJASAMA BARU';
  if (partnershipForm) partnershipForm.reset();
  const paTypeEl = document.getElementById('paType');
  if (paTypeEl) paTypeEl.value = currentPartnerFilter !== 'all' ? currentPartnerFilter : 'scrim';
  const paStatusEl = document.getElementById('paStatus');
  if (paStatusEl) paStatusEl.value = 'ACTIVE';
  const paDateEl = document.getElementById('paDate');
  if (paDateEl) paDateEl.value = new Date().toISOString().slice(0, 10);
  document.getElementById('paLogo').value = 'assets/mothra-logo.png';
  document.getElementById('paLogoPreviewTag').src = 'assets/mothra-logo.png';
  if (partnershipModal) partnershipModal.classList.add('open');
};

window.editPartnership = function(id) {
  if (!Array.isArray(db.partnerships)) return;
  const p = db.partnerships.find((x) => x.id === id);
  if (!p) return;
  editingPartnershipId = id;
  document.getElementById('partnershipModalTitle').textContent = `EDIT KERJASAMA: ${p.name}`;
  document.getElementById('paType').value = p.type || 'scrim';
  document.getElementById('paName').value = p.name || '';
  document.getElementById('paStatus').value = p.status || 'ACTIVE';
  document.getElementById('paLogo').value = p.logo || 'assets/mothra-logo.png';
  document.getElementById('paLogoPreviewTag').src = p.logo || 'assets/mothra-logo.png';
  document.getElementById('paContact').value = p.contact || '';
  document.getElementById('paContactType').value = p.contactType || 'Instagram';
  document.getElementById('paDate').value = p.date || '';
  document.getElementById('paNotes').value = p.notes || '';
  if (partnershipModal) partnershipModal.classList.add('open');
};

window.deletePartnership = function(id) {
  if (confirm('Yakin ingin menghapus data kerjasama ini?')) {
    db.partnerships = (db.partnerships || []).filter((x) => x.id !== id);
    saveMothraData(db);
    renderPartnershipsTable(currentPartnerFilter);
    showToast('Data kerjasama berhasil dihapus.');
  }
};

if (partnershipForm) {
  partnershipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!Array.isArray(db.partnerships)) db.partnerships = [];

    const typeValue = document.getElementById('paType').value;
    const typeLabelMap = {
      scrim: 'Friendly Match / Scrim',
      sponsor: 'Sponsorship / Endorsement',
      design: 'Design Partner',
      ba: 'Brand Ambassador'
    };

    const pData = {
      id: editingPartnershipId || 'pa_' + Date.now(),
      type: typeValue,
      typeLabel: typeLabelMap[typeValue] || typeValue,
      name: document.getElementById('paName').value.trim(),
      status: document.getElementById('paStatus').value,
      logo: document.getElementById('paLogo').value.trim() || 'assets/mothra-logo.png',
      contact: document.getElementById('paContact').value.trim(),
      contactType: document.getElementById('paContactType').value,
      date: document.getElementById('paDate').value,
      notes: document.getElementById('paNotes').value.trim()
    };

    if (editingPartnershipId) {
      const idx = db.partnerships.findIndex((x) => x.id === editingPartnershipId);
      if (idx !== -1) db.partnerships[idx] = pData;
    } else {
      db.partnerships.unshift(pData);
    }

    saveMothraData(db);
    renderPartnershipsTable(currentPartnerFilter);
    if (partnershipModal) partnershipModal.classList.remove('open');
    showToast(editingPartnershipId ? 'Data kerjasama berhasil diperbarui!' : 'Kerjasama baru berhasil ditambahkan!');
  });
}

/* ============================================================
   06 / THE RECORD (ACHIEVEMENTS CRUD)
   ============================================================ */
const recordsTableBody = document.getElementById('recordsTableBody');
const recordModal = document.getElementById('recordCrudModal');
const recordForm = document.getElementById('recordCrudForm');
let editingRecordId = null;

function renderRecordsTable() {
  recordsTableBody.innerHTML = '';
  (db.records || []).forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--red-bright);font-size:1.1rem;">${r.year}</strong></td>
      <td><strong>${r.title}</strong></td>
      <td style="color:var(--gray-light)">${r.subtitle}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editRecord('${r.id}')">Edit</button>
          <button class="btn-action-del" onclick="deleteRecord('${r.id}')">Hapus</button>
        </div>
      </td>
    `;
    recordsTableBody.appendChild(tr);
  });
  renderOverviewStats();
}

window.openAddRecordModal = function() {
  editingRecordId = null;
  document.getElementById('recordModalTitle').textContent = 'TAMBAH PRESTASI TURNAMEN';
  recordForm.reset();
  recordModal.classList.add('open');
};

window.editRecord = function(id) {
  const r = (db.records || []).find((x) => x.id === id);
  if (!r) return;
  editingRecordId = id;
  document.getElementById('recordModalTitle').textContent = `EDIT PRESTASI: ${r.year}`;
  document.getElementById('rYear').value = r.year;
  document.getElementById('rTitle').value = r.title;
  document.getElementById('rSubtitle').value = r.subtitle;
  recordModal.classList.add('open');
};

window.deleteRecord = function(id) {
  if (confirm('Yakin ingin menghapus prestasi ini?')) {
    db.records = (db.records || []).filter((x) => x.id !== id);
    saveMothraData(db);
    renderRecordsTable();
    showToast('Prestasi berhasil dihapus.');
  }
};

recordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const rData = {
    id: editingRecordId || 'r_' + Date.now(),
    year: document.getElementById('rYear').value.trim(),
    title: document.getElementById('rTitle').value.trim(),
    subtitle: document.getElementById('rSubtitle').value.trim()
  };

  if (!Array.isArray(db.records)) db.records = [];

  if (editingRecordId) {
    const idx = db.records.findIndex((x) => x.id === editingRecordId);
    if (idx !== -1) db.records[idx] = rData;
  } else {
    db.records.push(rData);
  }

  saveMothraData(db);
  renderRecordsTable();
  recordModal.classList.remove('open');
  showToast(editingRecordId ? 'Prestasi berhasil diperbarui!' : 'Prestasi baru berhasil ditambahkan!');
});

/* ============================================================
   07 / FIELD NOTES (GALLERY CRUD)
   ============================================================ */
const galleryTableBody = document.getElementById('galleryTableBody');
const galleryModal = document.getElementById('galleryCrudModal');
const galleryForm = document.getElementById('galleryCrudForm');
let editingGalleryId = null;

function renderGalleryTable() {
  galleryTableBody.innerHTML = '';
  (db.gallery || []).forEach((g) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${g.img}" alt="${g.title}" class="table-thumb" style="width:70px;height:45px;" onerror="this.src='assets/pb-bg-squad.jpg'" /></td>
      <td><strong>${g.title}</strong></td>
      <td style="font-family:var(--font-mono);font-size:0.8rem;color:var(--gray-light);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.img}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit" onclick="editGallery('${g.id}')">Edit</button>
          <button class="btn-action-del" onclick="deleteGallery('${g.id}')">Hapus</button>
        </div>
      </td>
    `;
    galleryTableBody.appendChild(tr);
  });
  renderOverviewStats();
}

window.openAddGalleryModal = function() {
  editingGalleryId = null;
  document.getElementById('galleryModalTitle').textContent = 'TAMBAH FOTO GALERI';
  galleryForm.reset();
  document.getElementById('gImg').value = 'assets/pb-bg-squad.jpg';
  document.getElementById('gImgPreviewTag').src = 'assets/pb-bg-squad.jpg';
  galleryModal.classList.add('open');
};

window.editGallery = function(id) {
  const g = (db.gallery || []).find((x) => x.id === id);
  if (!g) return;
  editingGalleryId = id;
  document.getElementById('galleryModalTitle').textContent = `EDIT FOTO: ${g.title}`;
  document.getElementById('gTitle').value = g.title;
  document.getElementById('gImg').value = g.img;
  document.getElementById('gImgPreviewTag').src = g.img;
  galleryModal.classList.add('open');
};

window.deleteGallery = function(id) {
  if (confirm('Yakin ingin menghapus foto ini?')) {
    db.gallery = (db.gallery || []).filter((x) => x.id !== id);
    saveMothraData(db);
    renderGalleryTable();
    showToast('Foto galeri berhasil dihapus.');
  }
};

galleryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const gData = {
    id: editingGalleryId || 'g_' + Date.now(),
    title: document.getElementById('gTitle').value.trim(),
    img: document.getElementById('gImg').value.trim(),
    large: editingGalleryId ? (db.gallery.find((x) => x.id === editingGalleryId)?.large || false) : false
  };

  if (!Array.isArray(db.gallery)) db.gallery = [];

  if (editingGalleryId) {
    const idx = db.gallery.findIndex((x) => x.id === editingGalleryId);
    if (idx !== -1) db.gallery[idx] = gData;
  } else {
    db.gallery.push(gData);
  }

  saveMothraData(db);
  renderGalleryTable();
  galleryModal.classList.remove('open');
  showToast(editingGalleryId ? 'Foto galeri berhasil diperbarui!' : 'Foto baru berhasil ditambahkan!');
});

/* ============================================================
   08 / BACKUP, EXPORT & RESTORE JSON & DATA.JS
   ============================================================ */
window.exportDataJsFile = function() {
  const cloned = JSON.parse(JSON.stringify(db));
  cloned.dataVersion = Date.now();
  cloned.updatedAt = new Date().toISOString();

  const fileContent = `/**
 * MOTHRA CLAN — Central CMS Data Store
 * Auto-synced with automatic version detection across all browsers (Chrome, Edge, Mobile, GitHub Pages)
 */

const DEFAULT_MOTHRA_DATA = ${JSON.stringify(cloned, null, 2)};

// Storage & Database Configuration
const STORAGE_KEY = 'mothra_cms_database';

// ----------------------------------------------------------------------
// ☁️ SUPABASE CLOUD DATABASE CONFIGURATION
// ----------------------------------------------------------------------
const SUPABASE_CONFIG = {
  url: 'https://idkeanqnglmomwkxkbqs.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2VhbnFuZ2xtb213a3hrYnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNDE0NjAsImV4cCI6MjEwMjgxNzQ2MH0.U1Xrg_UdENXBQn-pbzopYhk7ivVu-x_Dyd6VQqeMqJQ',
  tableName: 'mothra_cms',
  docId: 'main'
};

let _mothraMemoryData = null;
let _supabaseClient = null;
let _supabaseRealtimeChannel = null;

function getSupabaseConfig() {
  let customUrl = '';
  let customKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      customUrl = localStorage.getItem('mothra_supabase_url') || '';
      customKey = localStorage.getItem('mothra_supabase_key') || '';
    }
  } catch (e) {}

  const url = (customUrl && customUrl.trim()) || SUPABASE_CONFIG.url;
  const anonKey = (customKey && customKey.trim()) || SUPABASE_CONFIG.anonKey;
  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('YOUR_SUPABASE_PROJECT_ID') &&
    !anonKey.includes('YOUR_SUPABASE_ANON') &&
    url.startsWith('https://')
  );

  return {
    url,
    anonKey,
    tableName: SUPABASE_CONFIG.tableName || 'mothra_cms',
    docId: SUPABASE_CONFIG.docId || 'main',
    isConfigured
  };
}

function initSupabase() {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mothra_supabase_status', {
        detail: { status: 'STANDBY', connected: false }
      }));
    }
    return null;
  }

  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      _supabaseClient = window.supabase.createClient(config.url, config.anonKey);
      window.supabaseClient = _supabaseClient;
      subscribeSupabaseRealtime();
      fetchMothraDataOnline();
      return _supabaseClient;
    } catch (err) {
      console.error('Failed to init Supabase client', err);
    }
  }
  return null;
}

function subscribeSupabaseRealtime() {
  if (!_supabaseClient) return;
  const config = getSupabaseConfig();
  try {
    if (_supabaseRealtimeChannel) {
      try { _supabaseClient.removeChannel(_supabaseRealtimeChannel); } catch (e) {}
    }
    _supabaseRealtimeChannel = _supabaseClient
      .channel('mothra_cms_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.tableName, filter: \`id=eq.\${config.docId}\` },
        (payload) => {
          if (payload.new && payload.new.data) {
            applyIncomingOnlineData(payload.new.data);
          }
        }
      )
      .subscribe((status) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mothra_supabase_status', {
            detail: { status: status, connected: status === 'SUBSCRIBED' }
          }));
        }
      });
  } catch (e) {}
}

async function fetchMothraDataOnline() {
  if (!_supabaseClient) {
    initSupabase();
    if (!_supabaseClient) return getMothraData();
  }
  const config = getSupabaseConfig();
  try {
    const { data, error } = await _supabaseClient
      .from(config.tableName)
      .select('*')
      .eq('id', config.docId)
      .single();

    if (!error && data && data.data) {
      return applyIncomingOnlineData(data.data);
    }
  } catch (err) {}
  return getMothraData();
}

function applyIncomingOnlineData(data) {
  if (!data) return getMothraData();
  sanitizeMothraData(data);
  _mothraMemoryData = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mothra_data_updated', { detail: data }));
  }
  return data;
}

function sanitizeMothraData(data) {
  if (!data) return;
  if (!data.partnerships || !Array.isArray(data.partnerships) || data.partnerships.length === 0) {
    data.partnerships = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.partnerships));
  }
  if (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0) {
    data.categories = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.categories));
  }
  if (!data.lineup || !Array.isArray(data.lineup) || data.lineup.length === 0) {
    data.lineup = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.lineup));
  }
  if (!data.schedule) {
    data.schedule = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.schedule));
  }
  if (!data.records || !Array.isArray(data.records)) {
    data.records = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.records));
  }
  if (!data.gallery || !Array.isArray(data.gallery)) {
    data.gallery = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.gallery));
  }
  if (!data.dossier) {
    data.dossier = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA.dossier));
  }
}

function getMothraData() {
  if (_mothraMemoryData) return _mothraMemoryData;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      _mothraMemoryData = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA));
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(_mothraMemoryData));
      return _mothraMemoryData;
    }
    const data = JSON.parse(raw);
    sanitizeMothraData(data);
    _mothraMemoryData = data;
    return _mothraMemoryData;
  } catch (e) {
    _mothraMemoryData = JSON.parse(JSON.stringify(DEFAULT_MOTHRA_DATA));
    return _mothraMemoryData;
  }
}

function saveMothraData(data) {
  try {
    data.dataVersion = Date.now();
    data.updatedAt = new Date().toISOString();
    _mothraMemoryData = data;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mothra_data_updated', { detail: data }));
      const config = getSupabaseConfig();
      if (_supabaseClient && config.isConfigured) {
        _supabaseClient.from(config.tableName).upsert({
          id: config.docId,
          data: data,
          data_version: data.dataVersion,
          updated_at: data.updatedAt
        }).then(({ error }) => {
          if (!error) console.log('Saved to Supabase');
        }).catch(() => {});
      }
      try {
        fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
      } catch (err) {}
    }
    return true;
  } catch (e) {
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.getMothraData = getMothraData;
  window.saveMothraData = saveMothraData;
  window.fetchMothraDataOnline = fetchMothraDataOnline;
  window.initSupabase = initSupabase;
  window.getSupabaseConfig = getSupabaseConfig;
  window.saveSupabaseConfig = function(url, key) {
    try {
      localStorage.setItem('mothra_supabase_url', (url || '').trim());
      localStorage.setItem('mothra_supabase_key', (key || '').trim());
    } catch (e) {}
    initSupabase();
    return fetchMothraDataOnline();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSupabase());
  } else {
    setTimeout(() => initSupabase(), 50);
  }
}
`;

  const blob = new Blob([fileContent], { type: 'text/javascript;charset=utf-8' });
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = URL.createObjectURL(blob);
  downloadAnchor.download = 'data.js';
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('File data.js berhasil diunduh! Silakan timpa file di folder project.');
};

window.exportBackupJson = function() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `mothra_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('File backup JSON berhasil diunduh!');
};

window.importBackupJson = function() {
  const fileInput = document.getElementById('importFile');
  if (!fileInput.files.length) {
    alert('Pilih file backup JSON terlebih dahulu.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.lineup && parsed.schedule) {
        db = parsed;
        saveMothraData(db);
        initDashboard();
        showToast('Data CMS berhasil dipulihkan dari file backup!');
      } else {
        alert('Format file JSON tidak valid untuk CMS MOTHRA.');
      }
    } catch (err) {
      alert('Gagal membaca file JSON: ' + err.message);
    }
  };
  reader.readAsText(fileInput.files[0]);
};

window.resetToDefault = function() {
  if (confirm('PERINGATAN: Seluruh perubahan kustom akan dikembalikan ke data awal bawaan. Lanjutkan?')) {
    localStorage.removeItem(STORAGE_KEY);
    db = getMothraData();
    initDashboard();
    showToast('CMS telah direset ke data awal pabrik.');
  }
};

/* ============================================================
   09 / SUPABASE ONLINE CLOUD DATABASE CONTROLLER
   ============================================================ */
function renderSupabasePanel() {
  const sbUrlInput = document.getElementById('sbInputUrl');
  const sbKeyInput = document.getElementById('sbInputKey');
  const sbDataVer = document.getElementById('sbDataVersion');
  const sbLastSync = document.getElementById('sbLastSynced');

  if (typeof getSupabaseConfig === 'function') {
    const config = getSupabaseConfig();
    if (sbUrlInput && config.url && !config.url.includes('YOUR_SUPABASE_PROJECT_ID')) {
      sbUrlInput.value = config.url;
    }
    if (sbKeyInput && config.anonKey && !config.anonKey.includes('YOUR_SUPABASE_ANON')) {
      sbKeyInput.value = config.anonKey;
    }
    updateSupabaseStatusUI({
      connected: config.isConfigured && Boolean(window.supabaseClient),
      status: config.isConfigured ? 'CONNECTED' : 'STANDBY'
    });
  }

  if (sbDataVer && db) sbDataVer.textContent = db.dataVersion || '-';
  if (sbLastSync && db) {
    sbLastSync.textContent = db.updatedAt ? new Date(db.updatedAt).toLocaleString('id-ID') : '-';
  }
}

function updateSupabaseStatusUI(detail) {
  const dot = document.getElementById('supabaseStatusDot');
  const text = document.getElementById('supabaseStatusText');
  const badge = document.getElementById('supabaseStatusBadge');
  const rtState = document.getElementById('sbRealtimeState');

  if (!dot || !text || !badge) return;

  const isConnected = detail && (detail.connected || detail.status === 'SUBSCRIBED' || detail.status === 'CONNECTED');
  const config = typeof getSupabaseConfig === 'function' ? getSupabaseConfig() : { isConfigured: false };

  if (isConnected) {
    dot.style.background = '#10B981';
    dot.style.boxShadow = '0 0 10px #10B981';
    text.textContent = 'ONLINE & REALTIME TERHUBUNG (POSTGRESQL)';
    text.style.color = '#10B981';
    badge.style.borderColor = '#10B981';
    badge.style.background = 'rgba(16, 185, 129, 0.1)';
    if (rtState) {
      rtState.textContent = 'postgres_changes (CONNECTED)';
      rtState.style.color = '#10B981';
    }
  } else if (config.isConfigured) {
    dot.style.background = 'var(--gold)';
    dot.style.boxShadow = '0 0 10px var(--gold)';
    text.textContent = 'TERHUBUNG (STANDBY / CONNECTING)';
    text.style.color = 'var(--gold)';
    badge.style.borderColor = 'var(--gold)';
    badge.style.background = 'rgba(212, 175, 55, 0.1)';
    if (rtState) {
      rtState.textContent = 'postgres_changes (CONNECTING)';
      rtState.style.color = 'var(--gold)';
    }
  } else {
    dot.style.background = '#EF4444';
    dot.style.boxShadow = 'none';
    text.textContent = 'OFFLINE (MEMAKAI LOCAL CACHE)';
    text.style.color = '#EF4444';
    badge.style.borderColor = '#EF4444';
    badge.style.background = 'rgba(239, 68, 68, 0.1)';
    if (rtState) {
      rtState.textContent = 'NONAKTIF (Config Kosong)';
      rtState.style.color = 'var(--gray-light)';
    }
  }
}

// Event Listeners for Supabase Realtime updates
window.addEventListener('mothra_supabase_status', (e) => {
  updateSupabaseStatusUI(e.detail);
});

window.addEventListener('mothra_data_updated', (e) => {
  db = getMothraData();
  const sbDataVer = document.getElementById('sbDataVersion');
  const sbLastSync = document.getElementById('sbLastSynced');
  if (sbDataVer && db) sbDataVer.textContent = db.dataVersion || '-';
  if (sbLastSync && db) {
    sbLastSync.textContent = db.updatedAt ? new Date(db.updatedAt).toLocaleString('id-ID') : '-';
  }
});

// Setup Form & Buttons
const sbConfigForm = document.getElementById('supabaseConfigForm');
if (sbConfigForm) {
  sbConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('sbInputUrl').value.trim();
    const key = document.getElementById('sbInputKey').value.trim();

    if (!url.startsWith('https://')) {
      alert('Project URL harus diawali dengan https://');
      return;
    }

    showToast('Menghubungkan ke Supabase...');
    if (typeof saveSupabaseConfig === 'function') {
      await saveSupabaseConfig(url, key);
      setTimeout(() => {
        const config = getSupabaseConfig();
        if (config.isConfigured && window.supabaseClient) {
          showToast('✅ Berhasil terhubung ke database online Supabase!');
          renderSupabasePanel();
        } else {
          showToast('⚠️ Kredensial tersimpan. Silakan periksa URL & Anon Key jika status belum hijau.');
        }
      }, 800);
    }
  });
}

const btnPushToSupabase = document.getElementById('btnPushToSupabase');
if (btnPushToSupabase) {
  btnPushToSupabase.addEventListener('click', async () => {
    const config = typeof getSupabaseConfig === 'function' ? getSupabaseConfig() : null;
    if (!config || !config.isConfigured || !window.supabaseClient) {
      alert('Harap isi dan simpan Project URL serta Anon Key Supabase terlebih dahulu.');
      return;
    }

    btnPushToSupabase.disabled = true;
    btnPushToSupabase.textContent = '⏳ Mengupload ke Supabase...';

    try {
      db = getMothraData();
      db.dataVersion = Date.now();
      db.updatedAt = new Date().toISOString();

      const { error } = await window.supabaseClient
        .from(config.tableName)
        .upsert({
          id: config.docId,
          data: db,
          data_version: db.dataVersion,
          updated_at: db.updatedAt
        });

      if (error) {
        alert('Gagal upload ke Supabase: ' + error.message + '\n\nPastikan script supabase_schema.sql sudah dijalankan di SQL Editor Supabase.');
      } else {
        saveMothraData(db);
        renderSupabasePanel();
        showToast('🚀 Berhasil mengupload dan menyinkronkan semua data ke Supabase!');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    } finally {
      btnPushToSupabase.disabled = false;
      btnPushToSupabase.textContent = '☁️ UPLOAD / SINKRONKAN SEMUA DATA KE SUPABASE';
    }
  });
}

const btnPullFromSupabase = document.getElementById('btnPullFromSupabase');
if (btnPullFromSupabase) {
  btnPullFromSupabase.addEventListener('click', async () => {
    btnPullFromSupabase.disabled = true;
    btnPullFromSupabase.textContent = '⏳ Menarik data...';

    try {
      if (typeof fetchMothraDataOnline === 'function') {
        const onlineData = await fetchMothraDataOnline();
        if (onlineData) {
          db = onlineData;
          initDashboard();
          showToast('📥 Berhasil menarik data terbaru dari Supabase!');
        } else {
          showToast('⚠️ Data di Supabase kosong atau belum dikonfigurasi.');
        }
      }
    } catch (err) {
      alert('Gagal menarik data: ' + err.message);
    } finally {
      btnPullFromSupabase.disabled = false;
      btnPullFromSupabase.textContent = '📥 TARIK DATA DARI SUPABASE';
    }
  });
}

const btnClearSupabaseConfig = document.getElementById('btnClearSupabaseConfig');
if (btnClearSupabaseConfig) {
  btnClearSupabaseConfig.addEventListener('click', () => {
    if (confirm('Hapus konfigurasi Supabase dari browser ini dan kembali ke mode bawaan?')) {
      localStorage.removeItem('mothra_supabase_url');
      localStorage.removeItem('mothra_supabase_key');
      const sbUrlInput = document.getElementById('sbInputUrl');
      const sbKeyInput = document.getElementById('sbInputKey');
      if (sbUrlInput) sbUrlInput.value = '';
      if (sbKeyInput) sbKeyInput.value = '';
      if (typeof initSupabase === 'function') initSupabase();
      renderSupabasePanel();
      showToast('Konfigurasi Supabase telah dihapus.');
    }
  });
}

const btnCopySqlSchema = document.getElementById('btnCopySqlSchema');
if (btnCopySqlSchema) {
  btnCopySqlSchema.addEventListener('click', async () => {
    try {
      const res = await fetch('supabase_schema.sql');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        showToast('📋 Script SQL berhasil disalin ke clipboard!');
      } else {
        showToast('Silakan buka file supabase_schema.sql langsung.');
      }
    } catch (e) {
      showToast('Silakan buka file supabase_schema.sql langsung.');
    }
  });
}

// Global modal close on Escape or backdrop
document.querySelectorAll('.crud-modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});
document.querySelectorAll('.btn-cancel').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.crud-modal').forEach((m) => m.classList.remove('open'));
  });
});

/* ============================================================
   USER MANAGEMENT CRUD
   ============================================================ */
const ROLE_COLORS = {
  'SUPER ADMIN': '#D4AF37',
  'TACTICAL OPERATOR': '#60A5FA',
  'CONTENT WRITER': '#10B981',
  'VIEWER': '#94A3B8'
};

function generateUserId() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function maskPassword(pwd) {
  if (!pwd) return '—';
  return pwd.slice(0, 2) + '•'.repeat(Math.max(4, pwd.length - 2));
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const users = (db && db.users) ? db.users : [];

  // Update stats
  const total = users.length;
  const active = users.filter(u => u.status === 'ACTIVE').length;
  const superAdmins = users.filter(u => u.role === 'SUPER ADMIN').length;
  const inactive = users.filter(u => u.status !== 'ACTIVE').length;

  const elTotal = document.getElementById('statUserTotal');
  const elActive = document.getElementById('statUserActive');
  const elSuper = document.getElementById('statUserSuperAdmin');
  const elInactive = document.getElementById('statUserInactive');
  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elSuper) elSuper.textContent = superAdmins;
  if (elInactive) elInactive.textContent = inactive;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray-light);padding:2rem;">Belum ada data pengguna. Klik <strong>+ TAMBAH ADMIN BARU</strong> untuk memulai.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    const roleColor = ROLE_COLORS[u.role] || '#94A3B8';
    const statusColor = u.status === 'ACTIVE' ? '#10B981' : '#EF4444';
    const statusBg = u.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    return `
      <tr>
        <td style="color:var(--gray-light);font-size:0.8rem;">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem;">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(212,175,55,0.15);border:1px solid var(--gold-dark);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:900;font-size:0.85rem;color:var(--gold);flex-shrink:0;">${(u.name || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:0.9rem;">${u.name || '—'}</div>
              ${u.notes ? `<div style="font-size:0.72rem;color:var(--gray-light);">${u.notes}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="font-family:var(--font-mono);font-size:0.8rem;color:#93C5FD;">${u.email || '—'}</td>
        <td>
          <span style="background:${roleColor}22;color:${roleColor};border:1px solid ${roleColor}55;padding:0.2rem 0.6rem;border-radius:4px;font-family:var(--font-mono);font-size:0.7rem;font-weight:700;white-space:nowrap;">${u.role || 'VIEWER'}</span>
        </td>
        <td>
          <span style="background:${statusBg};color:${statusColor};border:1px solid ${statusColor}55;padding:0.2rem 0.6rem;border-radius:4px;font-family:var(--font-mono);font-size:0.7rem;font-weight:700;">${u.status || 'ACTIVE'}</span>
        </td>
        <td style="color:var(--gray-light);font-size:0.8rem;">${u.createdAt || '—'}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:0.4rem;justify-content:center;">
            <button class="btn-action-edit" onclick="openUserModal('edit','${u.id}')" style="padding:0.3rem 0.7rem;font-size:0.75rem;">✏️ EDIT</button>
            ${u.id !== 'u_1' ? `<button class="btn-action-del" onclick="deleteUser('${u.id}')" style="padding:0.3rem 0.7rem;font-size:0.75rem;">🗑️ HAPUS</button>` : '<span style="color:var(--gray-light);font-size:0.72rem;font-family:var(--font-mono);">PROTECTED</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openUserModal(mode, userId) {
  const modal = document.getElementById('userCrudModal');
  const title = document.getElementById('userModalTitle');
  const formAlert = document.getElementById('userFormAlert');
  if (!modal) return;

  // Reset form
  document.getElementById('userCrudForm').reset();
  document.getElementById('userId').value = '';
  if (formAlert) { formAlert.style.display = 'none'; formAlert.textContent = ''; }

  if (mode === 'edit' && userId) {
    const users = (db && db.users) ? db.users : [];
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (title) title.textContent = 'EDIT OPERATOR: ' + (user.name || '').toUpperCase();
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordConfirm').value = '';
    document.getElementById('userRole').value = user.role || 'TACTICAL OPERATOR';
    document.getElementById('userStatus').value = user.status || 'ACTIVE';
    document.getElementById('userNotes').value = user.notes || '';
    const submitBtn = document.getElementById('userModalSubmitBtn');
    if (submitBtn) submitBtn.textContent = '💾 SIMPAN PERUBAHAN';
  } else {
    if (title) title.textContent = 'TAMBAH ADMIN BARU';
    const submitBtn = document.getElementById('userModalSubmitBtn');
    if (submitBtn) submitBtn.textContent = '💾 TAMBAH SEKARANG';
  }

  modal.classList.add('open');
}

function deleteUser(userId) {
  if (!confirm('Yakin ingin menghapus akun admin ini? Tindakan tidak bisa dibatalkan.')) return;
  if (!db.users) return;
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  db.users.splice(idx, 1);
  saveMothraData(db);
  renderUsersTable();
  showToast('🗑️ Akun admin berhasil dihapus.');
}

// Toggle password visibility
const togglePwd = document.getElementById('toggleUserPwd');
if (togglePwd) {
  togglePwd.addEventListener('click', () => {
    const pwdInput = document.getElementById('userPassword');
    if (!pwdInput) return;
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      togglePwd.textContent = '🙈';
    } else {
      pwdInput.type = 'password';
      togglePwd.textContent = '👁';
    }
  });
}

// Add User Button
const btnAddUser = document.getElementById('btnAddUser');
if (btnAddUser) {
  btnAddUser.addEventListener('click', () => openUserModal('add'));
}

// Refresh Users Button
const btnRefreshUsers = document.getElementById('btnRefreshUsers');
if (btnRefreshUsers) {
  btnRefreshUsers.addEventListener('click', () => {
    if (!db) db = getMothraData();
    renderUsersTable();
    showToast('🔄 Data pengguna berhasil diperbarui.');
  });
}

// Cancel button for user modal specifically
const userModalCancelBtn = document.getElementById('userModalCancelBtn');
if (userModalCancelBtn) {
  userModalCancelBtn.addEventListener('click', () => {
    const modal = document.getElementById('userCrudModal');
    if (modal) modal.classList.remove('open');
  });
}

// User CRUD Form Submit
const userCrudForm = document.getElementById('userCrudForm');
if (userCrudForm) {
  userCrudForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formAlert = document.getElementById('userFormAlert');
    const showFormErr = (msg) => {
      if (formAlert) { formAlert.style.display = 'block'; formAlert.textContent = msg; }
    };

    const id      = (document.getElementById('userId').value || '').trim();
    const name    = (document.getElementById('userName').value || '').trim();
    const email   = (document.getElementById('userEmail').value || '').trim().toLowerCase();
    const pwd     = (document.getElementById('userPassword').value || '').trim();
    const pwdConf = (document.getElementById('userPasswordConfirm').value || '').trim();
    const role    = document.getElementById('userRole').value;
    const status  = document.getElementById('userStatus').value;
    const notes   = (document.getElementById('userNotes').value || '').trim();

    if (!name) return showFormErr('Nama operator wajib diisi.');
    if (!email || !email.includes('@')) return showFormErr('Email login harus valid.');

    if (!db.users) db.users = [];
    const isEdit = !!id;

    // Duplicate email check
    const dupEmail = db.users.find(u => u.email === email && u.id !== id);
    if (dupEmail) return showFormErr('Email ' + email + ' sudah digunakan oleh operator lain.');

    if (isEdit) {
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return showFormErr('User tidak ditemukan.');
      if (pwd) {
        if (pwd.length < 6) return showFormErr('Password minimal 6 karakter.');
        if (pwd !== pwdConf) return showFormErr('Konfirmasi password tidak cocok.');
        db.users[idx].password = pwd;
      }
      db.users[idx].name   = name;
      db.users[idx].email  = email;
      db.users[idx].role   = role;
      db.users[idx].status = status;
      db.users[idx].notes  = notes;
    } else {
      if (!pwd) return showFormErr('Password wajib diisi untuk akun baru.');
      if (pwd.length < 6) return showFormErr('Password minimal 6 karakter.');
      if (pwd !== pwdConf) return showFormErr('Konfirmasi password tidak cocok.');
      db.users.push({
        id:        generateUserId(),
        name:      name,
        email:     email,
        password:  pwd,
        role:      role,
        status:    status,
        notes:     notes,
        avatar:    'assets/mothra-logo.png',
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    saveMothraData(db);
    renderUsersTable();
    const modal = document.getElementById('userCrudModal');
    if (modal) modal.classList.remove('open');
    showToast(isEdit ? '✅ Data operator berhasil diperbarui dan disinkronkan ke Supabase!' : '✅ Akun admin baru berhasil ditambahkan dan disinkronkan ke Supabase!');
  });
}

