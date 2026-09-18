'use strict';

/**
 * ZIP 密码恢复服务（仅用于恢复自己拥有权限的压缩包）
 * 支持：ZipCrypto 与 WinZip AES 两种加密；字典 / 内置常见密码 / 掩码暴力三种模式
 * 进度经 'tool:progress' 事件推送，误报候选最终用完整解压 + CRC 校验剔除
 */
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

const runs = new Map(); // runId → { cancel }

// ---------- ZIP 结构解析 ----------
function parseZip(buf) {
  let eocd = -1;
  const stop = Math.max(0, buf.length - 22 - 65536);
  for (let i = buf.length - 22; i >= stop; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
    const flags = buf.readUInt16LE(off + 8);
    const method = buf.readUInt16LE(off + 10);
    const mtime = buf.readUInt16LE(off + 12);
    const crc = buf.readUInt32LE(off + 16);
    const csize = buf.readUInt32LE(off + 20);
    const lho = buf.readUInt32LE(off + 42);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    // AES 加密信息藏在 central directory 扩展字段 0x9901
    let aes = null;
    let eo = off + 46 + nameLen;
    const extraEnd = eo + extraLen;
    while (eo + 4 <= extraEnd) {
      const id = buf.readUInt16LE(eo);
      const sz = buf.readUInt16LE(eo + 2);
      if (id === 0x9901 && sz >= 7) {
        aes = { strength: buf.readUInt8(eo + 8), method: buf.readUInt16LE(eo + 9) };
      }
      eo += 4 + sz;
    }
    entries.push({ flags, method, mtime, crc, csize, lho, name, aes });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return entries;
}

function dataOffsetOf(buf, e) {
  if (buf.readUInt32LE(e.lho) !== 0x04034b50) throw new Error('本地文件头损坏');
  return e.lho + 30 + buf.readUInt16LE(e.lho + 26) + buf.readUInt16LE(e.lho + 28);
}

// ---------- ZipCrypto ----------
const CRCT = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function tryZipCrypto(header12, pwdBytes, checkHigh, timeHigh) {
  let k0 = 0x12345678 | 0;
  let k1 = 0x23456789 | 0;
  let k2 = 0x34567890 | 0;
  for (let i = 0; i < pwdBytes.length; i++) {
    const c = pwdBytes[i];
    k0 = CRCT[(k0 ^ c) & 0xff] ^ (k0 >>> 8);
    k1 = (Math.imul(k1 + (k0 & 0xff), 134775813) + 1) | 0;
    k2 = CRCT[(k2 ^ ((k1 >>> 24) & 0xff)) & 0xff] ^ (k2 >>> 8);
  }
  let c = 0;
  for (let i = 0; i < 12; i++) {
    const temp = (k2 & 0xffff) | 2;
    c = header12[i] ^ (((temp * (temp ^ 1)) >>> 8) & 0xff);
    k0 = CRCT[(k0 ^ c) & 0xff] ^ (k0 >>> 8);
    k1 = (Math.imul(k1 + (k0 & 0xff), 134775813) + 1) | 0;
    k2 = CRCT[(k2 ^ ((k1 >>> 24) & 0xff)) & 0xff] ^ (k2 >>> 8);
  }
  return c === checkHigh || c === timeHigh;
}

function zipCryptoDecrypt(buf, start, end, pwd) {
  let k0 = 0x12345678 | 0;
  let k1 = 0x23456789 | 0;
  let k2 = 0x34567890 | 0;
  for (let i = 0; i < pwd.length; i++) {
    const c = pwd[i];
    k0 = CRCT[(k0 ^ c) & 0xff] ^ (k0 >>> 8);
    k1 = (Math.imul(k1 + (k0 & 0xff), 134775813) + 1) | 0;
    k2 = CRCT[(k2 ^ ((k1 >>> 24) & 0xff)) & 0xff] ^ (k2 >>> 8);
  }
  const out = Buffer.allocUnsafe(end - start - 12);
  for (let i = start; i < end; i++) {
    const temp = (k2 & 0xffff) | 2;
    const p = buf[i] ^ (((temp * (temp ^ 1)) >>> 8) & 0xff);
    k0 = CRCT[(k0 ^ p) & 0xff] ^ (k0 >>> 8);
    k1 = (Math.imul(k1 + (k0 & 0xff), 134775813) + 1) | 0;
    k2 = CRCT[(k2 ^ ((k1 >>> 24) & 0xff)) & 0xff] ^ (k2 >>> 8);
    out[i - start - 12] = p;
  }
  return out; // 前 12 字节为加密头，已丢弃
}

function verifyZipCrypto(buf, e, pwd) {
  const start = dataOffsetOf(buf, e);
  const end = Math.min(buf.length, start + e.csize); // csize 已含 12 字节加密头
  const raw = zipCryptoDecrypt(buf, start, end, pwd);
  const data = e.method === 0 ? raw : zlib.inflateRawSync(raw);
  const crc = crc32Buf(data);
  return crc === e.crc;
}

function crc32Buf(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRCT[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- WinZip AES ----------
const AES_STRENGTH = { 1: { keyLen: 16, saltLen: 8, name: 'AES-128' }, 2: { keyLen: 24, saltLen: 12, name: 'AES-192' }, 3: { keyLen: 32, saltLen: 16, name: 'AES-256' } };

function tryAes(buf, start, st, pwdStr) {
  const { keyLen, saltLen } = st;
  const salt = buf.slice(start, start + saltLen);
  const pv = buf.slice(start + saltLen, start + saltLen + 2);
  const derived = crypto.pbkdf2Sync(pwdStr, salt, 1000, keyLen * 2 + 2, 'sha1');
  return derived[keyLen * 2] === pv[0] && derived[keyLen * 2 + 1] === pv[1];
}

// ---------- 掩码迭代（单字节字符集；多字节走调用方 dfs） ----------
function* maskIterator(charset, minLen, maxLen) {
  const n = charset.length;
  const arr = new Uint8Array(maxLen);
  const idx = new Uint32Array(maxLen);
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i < len; i++) idx[i] = 0;
    let pos = len - 1;
    while (true) {
      for (let i = 0; i < len; i++) arr[i] = charset.charCodeAt(idx[i]);
      yield arr.subarray(0, len);
      while (pos >= 0 && ++idx[pos] >= n) {
        idx[pos] = 0;
        pos--;
      }
      if (pos < 0) break;
      pos = len - 1;
    }
  }
}

// ---------- 服务入口 ----------
module.exports = {
  id: 'zip-pass',
  async run(action, payload, ctx) {
    const progress = (p) => {
      try {
        ctx.wm.panel && ctx.wm.panel.webContents.send('tool:progress', { toolId: 'zip-pass', ...p });
      } catch {
        /* ignore */
      }
    };

    if (action === 'info') {
      const buf = fs.readFileSync(payload.path);
      const entries = parseZip(buf);
      const enc = entries.find((e) => e.flags & 0x1);
      if (!enc) return { encrypted: false, entries: entries.length };
      return {
        encrypted: true,
        entries: entries.length,
        entry: enc.name,
        type: enc.aes ? AES_STRENGTH[enc.aes.strength].name : 'ZipCrypto',
      };
    }

    if (action === 'cancel') {
      const r = runs.get(payload.runId);
      if (r) r.cancel = true;
      return true;
    }

    if (action === 'crack') {
      const runId = payload.runId || String(Date.now());
      const state = { cancel: false };
      runs.set(runId, state);
      const buf = fs.readFileSync(payload.path);
      const entries = parseZip(buf);
      const target = entries.find((e) => e.flags & 0x1);
      if (!target) throw new Error('该压缩包未加密');
      const start = dataOffsetOf(buf, target);
      const t0 = Date.now();

      let found = null;
      let tried = 0;
      const reportEvery = 100000;

      const test = (pwdStr, pwdBytes) => {
        tried++;
        if (tried % reportEvery === 0) {
          progress({ runId, tried, elapsed: Date.now() - t0 });
          if (state.cancel) throw new Error('__CANCEL__');
        }
        if (target.aes) {
          return tryAes(buf, start, AES_STRENGTH[target.aes.strength], pwdStr);
        }
        // ZipCrypto 表头校验有 ~1/256 误报率：命中即完整解密 + CRC 内联验证
        const header = buf.slice(start, start + 12);
        if (!tryZipCrypto(header, pwdBytes, (target.crc >>> 24) & 0xff, (target.mtime >>> 8) & 0xff)) return false;
        return verifyZipCrypto(buf, target, Buffer.from(pwdBytes));
      };

      try {
        // 模式一：内置常见密码
        if (payload.mode === 'common') {
          for (const p of COMMON) {
            if (test(p, Buffer.from(p, 'latin1'))) {
              found = p;
              break;
            }
          }
        }
        // 模式二：字典文件
        else if (payload.mode === 'dict') {
          const lines = fs.readFileSync(payload.dict).toString('utf8').split(/\r?\n/);
          for (const line of lines) {
            const p = line.trim();
            if (!p) continue;
            if (test(p, Buffer.from(p, 'latin1'))) {
              found = p;
              break;
            }
          }
        }
        // 模式三：掩码暴力
        else if (payload.mode === 'mask') {
          const charset = payload.charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
          const minLen = Math.max(1, payload.minLen | 0);
          const maxLen = Math.min(8, payload.maxLen | 0 || 4);
          const ascii = /^[\x20-\x7e]+$/.test(charset);
          if (ascii) {
            const iter = maskIterator(charset, minLen, maxLen);
            for (const b of iter) {
              if (test(Buffer.from(b).toString('latin1'), b)) {
                found = Buffer.from(b).toString('latin1');
                break;
              }
            }
          } else {
            const chars = [...charset];
            // 多字节字符集：递归组合（限制长度避免爆炸）
            const dfs = (prefix) => {
              if (found) return;
              if (prefix.length >= minLen) {
                if (test(prefix, Buffer.from(prefix, 'utf8'))) {
                  found = prefix;
                  return;
                }
              }
              if (prefix.length >= maxLen) return;
              for (const ch of chars) {
                dfs(prefix + ch);
                if (found) return;
              }
            };
            dfs('');
          }
        }

        // AES：2 字节 PV 校验误报率 ~1/65536，接受
        if (found && !target.aes) {
          // 已内联验证，直接采用
        }
      } catch (e) {
        if (e.message === '__CANCEL__') {
          runs.delete(runId);
          return { canceled: true, tried, elapsed: Date.now() - t0 };
        }
        runs.delete(runId);
        throw e;
      }
      runs.delete(runId);
      return { found, tried, elapsed: Date.now() - t0 };
    }

    throw new Error(`未知操作: ${action}`);
  },
};

const COMMON = [
  '123456', '123456789', '12345678', '1234567890', 'password', '111111', '123123', 'abc123', '1234', '12345',
  '0', '1', '000000', '654321', '666666', '888888', 'abcdef', 'a123456', '123abc', 'qazwsx',
  'password1', 'iloveyou', 'admin', 'admin123', 'root', 'test', 'guest', 'user', 'pass', 'pass123',
  '520520', '1314520', 'woaini', 'woaini1314', '147258369', '987654321', '112233', '123321', '121212', '777777',
  '100200', '1505423', '19900101', '20000101', '11111111', '22222222', '33333333', '66668888', '88886666', '00000000',
];
