import React, { useEffect, useRef, useState } from 'react';

const MODES = ['multi', 'ghost', 'line']; // 多行 / 透明纯文本 / 单行
const MODE_H = { multi: 340, ghost: 340, line: 46 };
const MODE_W = { multi: 480, ghost: 480, line: 640 };

export default function ReaderApp() {
  const [book, setBook] = useState(null); // {id, name, text, pos}
  const [mode, setMode] = useState('multi');
  const [font, setFont] = useState(15);
  const [lineH, setLineH] = useState(1.8);
  const [ghostLight, setGhostLight] = useState(false); // 透明模式文字色：false=黑字白晕 true=白字黑晕
  const [pct, setPct] = useState(0);
  const textRef = useRef(null);
  const saveTimer = useRef(null);

  // 载入设置
  useEffect(() => {
    (async () => {
      setMode((await window.api.store.get('readerMode', 'multi')) || 'multi');
      setFont((await window.api.store.get('readerFont', 15)) || 15);
      setLineH((await window.api.store.get('readerLineH', 1.8)) || 1.8);
      const id = await window.api.reader.getBook();
      if (id) await loadBook(id);
    })();
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

  // 模式/字号变化时同步窗口尺寸
  useEffect(() => {
    window.api.store.set('readerMode', mode);
    window.api.store.set('readerFont', font);
    window.api.store.set('readerLineH', lineH);
    window.api.reader.resize(MODE_W[mode], MODE_H[mode]);
  }, [mode, font, lineH]);

  // 内容就绪后恢复进度
  useEffect(() => {
    if (book && textRef.current) {
      const el = textRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = book.pos * (el.scrollHeight - el.clientHeight);
        setPct(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
      });
    }
  }, [book]);

  // 滚动 → 进度显示 + 防抖保存
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
    el.scrollBy({ top: dir * (mode === 'line' ? font * lineH : el.clientHeight * 0.9), behavior: 'smooth' });
  };

  const cycleMode = () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);

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
          e.preventDefault();
          page(1);
          break;
        case 'ArrowDown':
          page(1);
          break;
        case 'ArrowUp':
          page(-1);
          break;
        case '+':
        case '=':
          setFont((f) => Math.min(28, f + 1));
          break;
        case '-':
          setFont((f) => Math.max(11, f - 1));
          break;
        case '[':
          setLineH((l) => Math.max(1.2, +(l - 0.1).toFixed(1)));
          break;
        case ']':
          setLineH((l) => Math.min(3, +(l + 0.1).toFixed(1)));
          break;
        case 'm':
        case 'M':
          cycleMode();
          break;
        case 'c':
        case 'C':
          setGhostLight((v) => !v);
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
  }, [mode, font, lineH, book]);

  const cls = `reader mode-${mode} ${ghostLight ? 'gl' : 'gd'}`;

  return (
    <div className={cls}>
      <div className="reader-bar" onDoubleClick={cycleMode}>
        <span className="reader-title">{book ? book.name : '兔子阅读器'}</span>
        <span className="reader-tip">M 模式 · F9 隐身</span>
        <span className="reader-pct">{(pct * 100).toFixed(1)}%</span>
        <button className="reader-x" onClick={() => window.api.reader.hide()} title="隐藏 (Esc/F9 恢复)">
          ✕
        </button>
      </div>
      <div
        className="reader-text"
        ref={textRef}
        onScroll={onScroll}
        style={{ fontSize: font, lineHeight: lineH }}
      >
        {book ? book.text : '从工具面板的「摸鱼阅读器」导入一本书开始阅读 · 快捷键：←→ 翻页 · +− 字号 · [] 行距 · M 模式 · C 配色 · F9 一键隐身'}
      </div>
    </div>
  );
}
