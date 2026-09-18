import React, { useEffect, useRef, useState } from 'react';

const MODES = ['multi', 'ghost', 'line', 'ghost-line']; // 多行 / 透明 / 单行 / 透明单行
const MODE_W = { multi: 480, ghost: 480, line: 640, 'ghost-line': 640 };
const MODE_NAME = { multi: '多行', ghost: '透明', line: '单行', 'ghost-line': '透明单行' };
// 单行类模式的窗高 = 标题栏 + 一行文字
const winH = (mode, font, lineH) =>
  mode === 'line' || mode === 'ghost-line' ? 30 + Math.round(font * lineH) : 340;

const DEFAULTS = { mode: 'multi', font: 15, lineH: 1.8, color: '', ghostLight: false, bar: 'auto' };

export default function ReaderApp() {
  const [book, setBook] = useState(null); // {id, name, text, pos}
  const [st, setSt] = useState(DEFAULTS); // 显示设置（由面板页配置，实时推送）
  const [pct, setPct] = useState(0);
  const textRef = useRef(null);
  const saveTimer = useRef(null);

  // 载入设置与书籍；监听面板推送的实时设置
  useEffect(() => {
    (async () => {
      const r = await window.api.tool.run('reader', 'getSettings');
      if (r.ok) setSt({ ...DEFAULTS, ...r.data });
      const id = await window.api.reader.getBook();
      if (id) loadBook(id);
    })();
    window.api.reader.onSettings((s) => setSt({ ...DEFAULTS, ...s }));
    window.api.reader.onBook((id) => id && loadBook(id));
  }, []);

  const loadBook = async (id) => {
    const [content, list] = await Promise.all([
      window.api.tool.run('reader', 'content', { id }),
      window.api.tool.run('reader', 'list'),
    ]);
    if (!content.ok) return;
    const meta = (list.data || []).find((b) => b.id === id);
    setBook({ id, name: meta?.name || '未命名', text: content.data, pos: meta?.pos || 0 });
  };

  // 设置变化 → 同步窗口尺寸（设置持久化由面板侧统一负责）
  useEffect(() => {
    window.api.reader.resize(MODE_W[st.mode], winH(st.mode, st.font, st.lineH));
  }, [st.mode, st.font, st.lineH]);

  // 换书/换模式后恢复进度
  useEffect(() => {
    if (book && textRef.current) {
      const el = textRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = book.pos * (el.scrollHeight - el.clientHeight);
      });
    }
  }, [book, st.mode, st.font, st.lineH]);

  const onScroll = () => {
    const el = textRef.current;
    if (!el) return;
    const p = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    setPct(p);
    clearTimeout(saveTimer.current);
    if (book) {
      saveTimer.current = setTimeout(() => window.api.tool.run('reader', 'progress', { id: book.id, pos: p }), 700);
    }
  };

  const page = (dir) => {
    const el = textRef.current;
    if (!el) return;
    const line = st.mode === 'line' || st.mode === 'ghost-line';
    el.scrollBy({ top: dir * (line ? Math.round(st.font * st.lineH) : el.clientHeight * 0.9), behavior: 'smooth' });
  };

  // 本窗快捷键仍保留：翻页/字号/行距/模式/配色/导航栏/隐藏；全部同步回设置存储
  const patch = (p) => window.api.tool.run('reader', 'settings', p).then((r) => r.ok && setSt({ ...DEFAULTS, ...r.data }));

  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          page(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          page(-1);
          break;
        case ' ':
        case 'ArrowDown':
          e.preventDefault();
          page(1);
          break;
        case 'ArrowUp':
          page(-1);
          break;
        case '+':
        case '=':
          patch({ font: Math.min(28, st.font + 1) });
          break;
        case '-':
          patch({ font: Math.max(11, st.font - 1) });
          break;
        case '[':
          patch({ lineH: Math.max(1.2, +(st.lineH - 0.1).toFixed(1)) });
          break;
        case ']':
          patch({ lineH: Math.min(3, +(st.lineH + 0.1).toFixed(1)) });
          break;
        case 'm':
        case 'M':
          patch({ mode: MODES[(MODES.indexOf(st.mode) + 1) % MODES.length] });
          break;
        case 'c':
        case 'C':
          patch({ ghostLight: !st.ghostLight });
          break;
        case 'h':
        case 'H':
          patch({ bar: st.bar === 'auto' ? 'hide' : st.bar === 'hide' ? 'show' : 'auto' });
          break;
        case 'Escape':
          window.api.reader.hide();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st, book]);

  const ghostish = st.mode === 'ghost' || st.mode === 'ghost-line';
  const cls = `reader mode-${st.mode} ${st.ghostLight ? 'gl' : 'gd'} bar-${st.bar}`;

  return (
    <div className={cls}>
      <div className="reader-bar" onDoubleClick={() => patch({ mode: MODES[(MODES.indexOf(st.mode) + 1) % MODES.length] })}>
        <span className="reader-title" title={`${book ? book.name : ''} · ${MODE_NAME[st.mode]}模式`}>
          {book ? book.name : '兔子阅读器'}
        </span>
        <span className="reader-tip" title="←→ 翻页 · +− 字号 · [] 行距 · M 模式 · C 配色 · H 导航栏 · F9 隐身 · 显示设置在工具面板「摸鱼阅读器」页">
          {MODE_NAME[st.mode]}
        </span>
        <span className="reader-pct">{(pct * 100).toFixed(1)}%</span>
        <button className="reader-x" onClick={() => window.api.reader.hide()} title="隐藏 (Esc/F9 恢复)">
          ✕
        </button>
      </div>
      <div
        className="reader-text"
        ref={textRef}
        onScroll={onScroll}
        style={{
          fontSize: st.font,
          lineHeight: st.lineH,
          color: st.color || undefined, // 自定义字体颜色（空 = 模式默认配色）
        }}
      >
        {book
          ? book.text
          : '在工具面板「摸鱼阅读器」页导入图书并配置显示 · 快捷键：←→ 翻页 · +− 字号 · [] 行距 · M 模式 · C 配色 · H 导航栏 · F9 一键隐身'}
      </div>
    </div>
  );
}
