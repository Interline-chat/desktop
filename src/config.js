const { app } = require('electron');

const PROD_URL = 'https://app.interline.chat';

// The dev/staging URL is never committed; pass it via INTERLINE_URL when running unpackaged.
const APP_URL = !app.isPackaged && process.env.INTERLINE_URL ? process.env.INTERLINE_URL : PROD_URL;
const APP_ORIGIN = new URL(APP_URL).origin;

// Client contract: the client detects the shell with userAgent.includes('InterlineDesktop/').
function buildUserAgent(defaultUA) {
  const stripped = defaultUA
    .replace(/\s*Electron\/\S+/, '')
    .replace(new RegExp(`\\s*${app.getName()}\\/\\S+`), '');
  return `${stripped} InterlineDesktop/${app.getVersion()}`;
}

function isAppOrigin(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

module.exports = { APP_URL, APP_ORIGIN, buildUserAgent, isAppOrigin };
