'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 主进程服务注册中心：自动扫描本目录下的 *.js（除 index.js）。
 * 每个服务文件导出 { id, run(action, payload, ctx) }。
 * 新增工具后端 = 新增一个文件，无需改任何注册代码。
 */
const services = {};
for (const file of fs.readdirSync(__dirname)) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;
  const svc = require(path.join(__dirname, file));
  if (svc && svc.id) services[svc.id] = svc;
}

async function run(toolId, action, payload, ctx) {
  const svc = services[toolId];
  if (!svc) {
    return { ok: false, error: `未找到工具服务: ${toolId}` };
  }
  try {
    return { ok: true, data: await svc.run(action, payload, ctx) };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = { run, services, ids: Object.keys(services) };
