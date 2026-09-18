'use strict';

/**
 * 摸鱼阅读器服务
 * - 书库：导入文件 → 统一提取为纯文本，存 userData/library/
 * - 格式：txt（UTF-8/GBK 自动检测）、md、html、epub（zip+spine）、docx（zip+document.xml）
 * - 进度：按书 id 持久化
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { app } = require('electron');
const iconv = require('iconv-lite');

const LIB = () => {
  const d = path.join(app.getPath('userData'), 'library');
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const metaFile = () => path.join(LIB(), 'index.json');

function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(metaFile(), 'utf8'));
  } catch {
    return {};
  }
}
function saveMeta(m) {
  fs.writeFileSync(metaFile(), JSON.stringify(m, null, 1));
}

// ---------- 文本提取 ----------
function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const be = buf.slice(2).swap16();
    return be.toString('utf16le');
  }
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3).toString('utf8');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf); // 严格 UTF-8
  } catch {
    try {
      return iconv.decode(buf, 'gbk');
    } catch {
      return buf.toString('latin1');
    }
  }
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
function htmlToText(html) {
  let s = html
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
  s = s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m]);
  return s
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mdToText(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '· ')
    .trim();
}

// ---------- zip 条目读取（epub / docx 均为 zip） ----------
function* zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP/EPUB/DOCX 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    yield { method, csize, lho, name };
    off += 46 + nameLen + extraLen + cmtLen;
  }
}

function readZipEntry(buf, entry) {
  const lho = entry.lho;
  const nameLen = buf.readUInt16LE(lho + 26);
  const extraLen = buf.readUInt16LE(lho + 28);
  const start = lho + 30 + nameLen + extraLen;
  const raw = buf.slice(start, start + entry.csize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error('不支持的压缩方式: ' + entry.method);
}

function epubToText(buf) {
  const files = {};
  for (const e of zipEntries(buf)) files[e.name] = e;
  // container.xml → OPF 路径
  let opfPath = null;
  if (files['META-INF/container.xml']) {
    const m = decodeText(readZipEntry(buf, files['META-INF/container.xml'])).match(/full-path="([^"]+)"/i);
    if (m) opfPath = m[1];
  }
  // OPF：manifest(id→href) + spine(顺序)
  const order = [];
  if (opfPath && files[opfPath]) {
    const opf = decodeText(readZipEntry(buf, files[opfPath]));
    const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const manifest = new Map();
    for (const m of opf.matchAll(/<item\b[^>]*\/?>/gi)) {
      const id = m[0].match(/id="([^"]+)"/i)?.[1];
      const href = m[0].match(/href="([^"]+)"/i)?.[1];
      if (id && href) manifest.set(id, decodeURIComponent(href));
    }
    for (const m of opf.matchAll(/<itemref\b[^>]*\/?>/gi)) {
      const id = m[0].match(/idref="([^"]+)"/i)?.[1];
      const href = id && manifest.get(id);
      if (href) order.push(base + href);
    }
  }
  // 兜底：无 OPF 时按路径排序的全部 html
  const list = order.length
    ? order.filter((p) => files[p])
    : Object.keys(files).filter((n) => /\.(x?html?)$/i.test(n)).sort();
  const parts = [];
  for (const p of list) {
    const text = htmlToText(decodeText(readZipEntry(buf, files[p])));
    if (text) parts.push(text);
  }
  if (!parts.length) throw new Error('EPUB 中未找到可提取的文本');
  return parts.join('\n\n');
}

function docxToText(buf) {
  const files = {};
  for (const e of zipEntries(buf)) files[e.name] = e;
  if (!files['word/document.xml']) throw new Error('DOCX 结构异常（未找到 document.xml）');
  const xml = decodeText(readZipEntry(buf, files['word/document.xml']));
  const paras = xml
    .split(/<\/w:p>/)
    .map((p) =>
      p
        .replace(/<w:tab[^>]*\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    )
    .filter(Boolean);
  return paras.join('\n');
}

// ---------- 服务入口 ----------
module.exports = {
  id: 'reader',
  run(action, payload, ctx) {
    if (action === 'import') {
      const buf = fs.readFileSync(payload.path);
      const ext = path.extname(payload.path).toLowerCase();
      let text;
      if (ext === '.txt' || ext === '.log') text = decodeText(buf);
      else if (ext === '.md' || ext === '.markdown') text = mdToText(decodeText(buf));
      else if (ext === '.html' || ext === '.htm' || ext === '.xhtml') text = htmlToText(decodeText(buf));
      else if (ext === '.epub') text = epubToText(buf);
      else if (ext === '.docx') text = docxToText(buf);
      else throw new Error('暂不支持该格式：' + ext + '（支持 txt/md/html/epub/docx）');

      const meta = loadMeta();
      const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6);
      const name = payload.name || path.basename(payload.path).replace(/\.[^.]+$/, '');
      fs.writeFileSync(path.join(LIB(), id + '.txt'), text, 'utf8');
      meta[id] = { id, name, chars: text.length, addedAt: Date.now(), pos: 0 };
      saveMeta(meta);
      return meta[id];
    }

    if (action === 'list') {
      const meta = loadMeta();
      return Object.values(meta).sort((a, b) => b.addedAt - a.addedAt);
    }

    if (action === 'content') {
      const f = path.join(LIB(), payload.id + '.txt');
      return fs.readFileSync(f, 'utf8');
    }

    if (action === 'progress') {
      const meta = loadMeta();
      if (meta[payload.id]) {
        meta[payload.id].pos = payload.pos;
        saveMeta(meta);
      }
      return true;
    }

    if (action === 'remove') {
      const meta = loadMeta();
      delete meta[payload.id];
      saveMeta(meta);
      try {
        fs.unlinkSync(path.join(LIB(), payload.id + '.txt'));
      } catch {
        /* ignore */
      }
      return true;
    }

    if (action === 'open') {
      ctx.wm.showReader(payload.id);
      return true;
    }

    if (action === 'close') {
      ctx.wm.hideReader();
      return true;
    }

    throw new Error(`未知操作: ${action}`);
  },
};
