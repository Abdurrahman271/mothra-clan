/**
 * MOTHRA CLAN — Local Development Server & Central CMS File Syncer
 * Runs on http://localhost:3000 with Security Headers & Dynamic JSON Sync
 * Zero external dependencies (uses native Node.js http & fs modules)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Security Headers against web vulnerabilities
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Handle /api/data POST (Writes directly to data.js on local disk)
  if (req.url === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        parsed.dataVersion = Date.now();
        parsed.updatedAt = new Date().toISOString();

        const dataJsPath = path.join(PUBLIC_DIR, 'data.js');
        const fileContent = `/**
 * MOTHRA CLAN — Central CMS Data Store
 * Auto-synced with automatic version detection across all browsers (Chrome, Edge, Mobile, GitHub Pages)
 */

const DEFAULT_MOTHRA_DATA = ${JSON.stringify(parsed, null, 2)};

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
        fs.writeFileSync(dataJsPath, fileContent, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Data successfully synced to data.js on disk!' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle /api/data GET
  if (req.url === '/api/data' && req.method === 'GET') {
    const dataJsPath = path.join(PUBLIC_DIR, 'data.js');
    fs.readFile(dataJsPath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read data' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(content);
    });
    return;
  }

  // Clean URL mapping & direct .html extension blocking
  let rawUrl = decodeURIComponent(req.url.split('?')[0]);
  let safePath = path.normalize(rawUrl).replace(/^(\.\.[\/\\])+/, '');

  // Block direct .html access
  if (safePath === '/index.html' || safePath === '\\index.html' ||
      safePath === '/admin.html' || safePath === '\\admin.html' ||
      safePath === '/admin/index.html' || safePath === '\\admin\\index.html') {
    const errorPage = fs.readFileSync(path.join(PUBLIC_DIR, '404.html'), 'utf8');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(errorPage);
    return;
  }

  // Clean URL mapping: '/' -> 'index.html', '/admin' -> 'admin/index.html'
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  } else if (safePath === '/admin' || safePath === '\\admin' || safePath === '/admin/' || safePath === '\\admin\\') {
    safePath = '/admin/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Access Denied');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="id">
          <head><title>404 Not Found — MOTHRA CLAN</title><style>body{background:#080808;color:#D4AF37;font-family:sans-serif;text-align:center;padding-top:100px;}</style></head>
          <body><h1>404 &bull; TACTICAL ASSET NOT FOUND</h1><p>Halaman tidak ditemukan.</p><a href="/" style="color:#FFF;">Kembali ke Markas</a></body>
          </html>
        `);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` 🛡️  MOTHRA TACTICAL WEB SERVER ACTIVE`);
  console.log(` 🌐  Akses Website: http://localhost:${PORT}`);
  console.log(` 🔒  Alamat Folder Terlindungi (Tidak terlihat di browser)`);
  console.log(` ⚡  Auto-Sync CMS to data.js: ENABLED`);
  console.log(`======================================================\n`);
});
