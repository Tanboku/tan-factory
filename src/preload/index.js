'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  mode: new URLSearchParams(location.search).get('win') || 'panel',

  ball: {
    dragStart: () => ipcRenderer.send('ball:dragStart'),
    dragMove: () => ipcRenderer.send('ball:dragMove'),
    dragEnd: () => ipcRenderer.send('ball:dragEnd'),
    click: () => ipcRenderer.send('ball:click'),
    menu: () => ipcRenderer.send('ball:menu'),
    // 悬浮球上放下文件 → 智能匹配工具
    dropFiles: (paths) => ipcRenderer.send('panel:openWith', { files: paths }),
    getPathForFile: (f) => webUtils.getPathForFile(f),
  },

  panel: {
    hide: () => ipcRenderer.send('panel:hide'),
    getPayload: () => ipcRenderer.invoke('panel:getPayload'),
    onPayload: (cb) => ipcRenderer.on('panel:payload', (_e, p) => cb(p)),
  },

  tool: {
    run: (toolId, action, payload) => ipcRenderer.invoke('tool:run', toolId, action, payload),
    onProgress: (cb) => ipcRenderer.on('tool:progress', (_e, p) => cb(p)),
  },

  store: {
    get: (key, def) => ipcRenderer.invoke('store:get', key, def),
    set: (key, val) => ipcRenderer.invoke('store:set', key, val),
  },

  dialog: {
    openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
    saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  },

  shell: {
    showItem: (p) => ipcRenderer.invoke('shell:showItem', p),
    openExternal: (u) => ipcRenderer.invoke('shell:openExternal', u),
  },

  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
  },
});
