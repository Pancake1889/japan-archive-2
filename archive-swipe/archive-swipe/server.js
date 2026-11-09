import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || `http://localhost:${PORT}/auth/pinterest/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'development-only-change-this-secret';
const API = 'https://api.pinterest.com/v5';
const SCOPES = ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write'];

app.disable('x-powered-by');
app.use(helmet({
  // YouTube embeds and Pinterest image CDN need external frames/images.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://i.pinimg.com', 'https://images.unsplash.com'],
      frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      connectSrc: ["'self'", 'https://api.pinterest.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: 'archive.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

function configured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && !CLIENT_ID.startsWith('your_') && !CLIENT_SECRET.startsWith('your_') && SESSION_SECRET && !SESSION_SECRET.startsWith('replace-with') && SESSION_SECRET !== 'development-only-change-this-secret');
}

function requirePinterest(req, res, next) {
  if (!req.session.pinterest?.accessToken) {
    return res.status(401).json({ error: 'Pinterest hesabı bağlı değil.' });
  }
  next();
}

async function pinterestFetch(req, endpoint, options = {}) {
  const auth = req.session.pinterest;
  if (auth.expiresAt && auth.expiresAt < Date.now() + 60_000 && auth.refreshToken) {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const refreshBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken
    });
    const refreshResponse = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: refreshBody
    });
    const refreshed = await refreshResponse.json();
    if (!refreshResponse.ok) {
      delete req.session.pinterest;
      throw new Error('Pinterest oturumu yenilenemedi. Yeniden bağlanman gerekiyor.');
    }
    req.session.pinterest = {
      ...auth,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || auth.refreshToken,
      expiresAt: Date.now() + (refreshed.expires_in || 2_592_000) * 1000
    };
  }

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${req.session.pinterest.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const bodyText = await response.text();
  let data = {};
  try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { data = { message: bodyText }; }
  if (!response.ok) {
    const message = data.message || data.error || `Pinterest API hata kodu: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

app.get('/auth/pinterest', (req, res) => {
  if (!configured()) {
    return res.status(503).send('Pinterest girişi için .env dosyasına App ID, App Secret ve SESSION_SECRET eklenmeli. Kurulum için README.md dosyasına bak.');
  }
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  const url = new URL('https://www.pinterest.com/oauth/');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

app.get('/auth/pinterest/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect('/?auth=cancelled');
    if (!code || !state || state !== req.session.oauthState) {
      return res.status(400).send('Giriş doğrulaması başarısız. Sayfayı yenileyip tekrar dene.');
    }
    delete req.session.oauthState;
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: REDIRECT_URI
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokens.message || 'Pinterest token işlemi başarısız oldu.');
    req.session.pinterest = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in || 2_592_000) * 1000
    };
    res.redirect('/?connected=1');
  } catch (error) {
    console.error('Pinterest OAuth callback:', error.message);
    res.redirect('/?auth=error');
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    connected: Boolean(req.session.pinterest?.accessToken),
    configured: configured(),
    username: req.session.pinterest?.username || null
  });
});

app.get('/api/me', requirePinterest, async (req, res) => {
  try {
    const user = await pinterestFetch(req, '/user_account');
    req.session.pinterest.username = user.username || null;
    res.json(user);
  } catch (error) { res.status(error.status || 502).json({ error: error.message }); }
});

app.get('/api/boards', requirePinterest, async (req, res) => {
  try {
    const data = await pinterestFetch(req, '/boards?page_size=100');
    res.json(data.items || []);
  } catch (error) { res.status(error.status || 502).json({ error: error.message }); }
});

app.get('/api/pins', requirePinterest, async (req, res) => {
  try {
    const data = await pinterestFetch(req, '/pins?page_size=100');
    res.json(data.items || []);
  } catch (error) { res.status(error.status || 502).json({ error: error.message }); }
});

app.post('/api/save/:pinId', requirePinterest, async (req, res) => {
  try {
    const pinId = String(req.params.pinId);
    const boardId = String(req.body?.boardId || '');
    if (!/^\d+$/.test(pinId) || !/^\d+$/.test(boardId)) {
      return res.status(400).json({ error: 'Geçerli bir pin ve pano seçmelisin.' });
    }
    const saved = await pinterestFetch(req, `/pins/${encodeURIComponent(pinId)}/save`, {
      method: 'POST', body: JSON.stringify({ board_id: boardId })
    });
    res.json({ ok: true, pin: saved });
  } catch (error) { res.status(error.status || 502).json({ error: error.message }); }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Archive Swipe running at http://localhost:${PORT}`);
  if (!configured()) console.log('Pinterest OAuth not configured yet. Add credentials to .env to enable account login.');
});
