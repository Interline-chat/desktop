const { app, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

function createTray(showWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'tray.png'));
  if (process.platform === 'darwin') icon.setTemplateImage(true);

  const tray = new Tray(icon);
  tray.setToolTip('Interline');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Interline', click: showWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
  tray.on('click', showWindow);
  return tray;
}

module.exports = { createTray };
