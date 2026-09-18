'use strict';

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// 轻量 JSON 持久化（待办、悬浮球位置等）
const FILE = () => path.join(app.getPath('userData'), 'store.json');
let cache = null;

function load() {
  if (cache === null) {
    try {
      cache = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    } catch {
      cache = {};
    }
  }
  return cache;
}

function storeGet(key, def) {
  const d = load();
  return key in d ? d[key] : def;
}

function storeSet(key, val) {
  const d = load();
  d[key] = val;
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(d, null, 2));
}

module.exports = { storeGet, storeSet };
