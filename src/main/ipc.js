'use strict';

const { ipcMain, dialog, shell } = require('electron');
const services = require('./services');
const { storeGet, storeSet } = require('./services/store');

/**
 * 统一 IPC 层。工具后端统一走 `tool:run(toolId, action, payload)`，
 * 新增工具后端只需在 src/main/services/ 下加一个文件（导出 { id, run }）。
 */
function registerIPC(wm) {
  // ---------- 悬浮球 ----------
  ipcMain.on('ball:dragStart', () => wm.dragStart());
  ipcMain.on('ball:dragMove', () => wm.dragMove());
  ipcMain.on('ball:dragEnd', () => wm.dragEnd());
  ipcMain.on('ball:click', () => wm.togglePanel());
  ipcMain.on('ball:menu', () => wm.popupBallMenu());

  // 悬浮球拖放文件 → 携带 payload 打开面板
  ipcMain.on('panel:openWith', (_e, payload) => wm.showPanel(payload));

  // ---------- 面板 ----------
  ipcMain.on('panel:hide', () => wm.hidePanel());
  ipcMain.handle('panel:getPayload', () => wm.consumePayload());

  // ---------- 摸鱼阅读器 ----------
  ipcMain.on('reader:hide', () => wm.hideReader());
  ipcMain.handle('reader:getBook', () => wm.consumeReaderBook());
  ipcMain.on('reader:resize', (_e, w, h) => wm.resizeReader(w, h));

  // ---------- 工具统一入口 ----------
  ipcMain.handle('tool:run', (_e, toolId, action, payload) => {
    return services.run(toolId, action, payload, { wm });
  });

  // ---------- 持久化 ----------
  ipcMain.handle('store:get', (_e, key, def) => storeGet(key, def));
  ipcMain.handle('store:set', (_e, key, val) => storeSet(key, val));

  // ---------- 系统对话框（抑制 blur 隐藏） ----------
  const busy = async (fn) => {
    wm._panelBusy = true;
    try {
      return await fn();
    } finally {
      setTimeout(() => (wm._panelBusy = false), 400);
    }
  };
  ipcMain.handle('dialog:openFile', (_e, opts) =>
    busy(() => dialog.showOpenDialog(wm.panel, opts || {}))
  );
  ipcMain.handle('dialog:saveFile', (_e, opts) =>
    busy(() => dialog.showSaveDialog(wm.panel, opts || {}))
  );
  ipcMain.handle('shell:showItem', (_e, p) => shell.showItemInFolder(p));
  ipcMain.handle('shell:openExternal', (_e, u) => {
    if (typeof u === 'string' && /^(https?|magnet|ed2k|thunder|ftp):/i.test(u)) {
      return shell.openExternal(u);
    }
  });

  ipcMain.handle('app:quit', () => {
    const { app } = require('electron');
    app.quit();
  });
}

module.exports = registerIPC;
