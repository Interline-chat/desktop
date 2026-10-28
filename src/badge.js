const { app, nativeImage } = require('electron');
const path = require('path');

// Client contract: the unread count is a leading "(n)" in document.title, e.g. "(3) Interline".
function parseUnread(title) {
  const match = /^\((\d+)\)/.exec(title);
  return match ? Number(match[1]) : 0;
}

const overlay = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'badge-overlay.png'));

function setUnread(win, count) {
  if (process.platform === 'win32') {
    // setBadgeCount is a no-op on Windows; use a taskbar overlay instead.
    win.setOverlayIcon(count > 0 ? overlay : null, count > 0 ? `${count} unread` : '');
  } else {
    app.setBadgeCount(count);
  }
}

module.exports = { parseUnread, setUnread };
