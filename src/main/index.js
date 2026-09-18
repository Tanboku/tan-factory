'use strict';

console.log('[main] starting, pid=', process.pid, 'argv=', process.argv.slice(1).join(','));

const { app, globalShortcut } = require('electron');
const WindowManager = require('./window-manager');
const registerIPC = require('./ipc');

// 单实例：重复启动时唤起面板
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (global.__wm) global.__wm.togglePanel();
  });

  app.whenReady().then(() => {
    const wm = new WindowManager();
    global.__wm = wm;
    wm.createAll();
    registerIPC(wm);

    // uTools 式全局快捷键
    globalShortcut.register('Alt+Space', () => wm.togglePanel());

    if (process.env.VERIFY) wm.runVerify();

    app.on('window-all-closed', () => app.quit());
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
}
