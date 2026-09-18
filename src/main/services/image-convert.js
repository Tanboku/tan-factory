'use strict';

const fs = require('fs');
const path = require('path');

/** 图片转换工具后端：读文件 → base64；写 base64 → 文件 */
module.exports = {
  id: 'image-convert',
  async run(action, payload) {
    if (action === 'readFile') {
      const buf = fs.readFileSync(payload.path);
      return buf.toString('base64');
    }
    if (action === 'writeFile') {
      const out = path.join(payload.dir, payload.name);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(payload.base64, 'base64'));
      return out;
    }
    if (action === 'stat') {
      return fs.statSync(payload.path).size;
    }
    throw new Error(`未知操作: ${action}`);
  },
};
