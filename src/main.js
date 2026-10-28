const { app, BrowserWindow, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const { APP_URL, buildUserAgent, isAppOrigin } = require('./config');
const { parseUnread, setUnread } = require('./badge');
const { createTray } = require('./tray');

let win = null;
let tray = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(start);
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function openExternal(url) {
  if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
}

function start() {
  if (process.platform === 'win32') app.setAppUserModelId('chat.interline.desktop');

  const ses = session.defaultSession;
  ses.setUserAgent(buildUserAgent(ses.getUserAgent()));
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(permission === 'notifications' && isAppOrigin(details.requestingUrl));
  });

  const state = windowStateKeeper({ defaultWidth: 1280, defaultHeight: 820 });
  win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 800,
    minHeight: 560,
    title: 'Interline',
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  state.manage(win);

  // Client contract: same-origin opens in-app, anything else goes to the system browser.
  // target="_blank" links to the app origin that should leave the app (WhatsApp signup,
  // email connect) are listed in EXTERNAL_PATHS.
  // Attachments (/api/... and blob: URLs) need the session cookie, so they open in a child window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAttachmentUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    }
    if (isAppOrigin(url) && !isExternalPath(url)) {
      win.loadURL(url);
    } else {
      openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppOrigin(url) && !isAuthUrl(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });

  win.on('page-title-updated', (_event, title) => setUnread(win, parseUnread(title)));
  win.once('ready-to-show', () => win.show());

  // Closing hides to the tray; Quit from the tray or app menu exits.
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win.hide();
    }
  });
  app.on('before-quit', () => {
    quitting = true;
  });
  app.on('activate', showWindow);

  tray = createTray(showWindow);
  win.loadURL(APP_URL);

  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
}

// Paths on the app origin that must finish in the system browser (popup + postMessage flows).
const EXTERNAL_PATHS = ['/settings/channels/'];

function isExternalPath(url) {
  const { pathname } = new URL(url);
  return EXTERNAL_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function isAttachmentUrl(url) {
  if (url.startsWith('blob:')) return isAppOrigin(url.slice('blob:'.length));
  return isAppOrigin(url) && new URL(url).pathname.startsWith('/api/');
}

// Google sign-in may navigate the top frame; let it through so Path A can be verified in the spike.
function isAuthUrl(url) {
  try {
    return new URL(url).hostname === 'accounts.google.com';
  } catch {
    return false;
  }
}
