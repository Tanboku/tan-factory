import React, { useEffect, useState } from 'react';

const EXTS = ['.txt', '.md', '.markdown', '.html', '.htm', '.xhtml', '.epub', '.docx'];
const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
};
const fmtChars = (n) => (n > 10000 ? (n / 10000).toFixed(1) + ' 万字' : n + ' 字');

export default function ReaderPanel({ files }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = async () => {
    const r = await window.api.tool.run('reader', 'list');
    setList(r.ok ? r.data : []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const importFiles = async (paths) => {
    const ok = paths.filter((p) => EXTS.includes(extOf(p)));
    if (!ok.length || busy) return;
    setBusy(true);
    setMsg('');
    for (const p of ok) {
      const r = await window.api.tool.run('reader', 'import', { path: p });
      if (!r.ok) setMsg((m) => (m ? m + '\n' : '') + r.error);
    }
    await refresh();
    setBusy(false);
  };

  useEffect(() => {
    if (files?.length) importFiles(files);
  }, [files]);

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '电子书', extensions: ['txt', 'md', 'html', 'htm', 'xhtml', 'epub', 'docx'] }],
    });
    if (!r.canceled) importFiles(r.filePaths);
  };

  const open = async (id) => {
    await window.api.tool.run('reader', 'open', { id });
  };

  const remove = async (id) => {
    await window.api.tool.run('reader', 'remove', { id });
    refresh();
  };

  return (
    <div className="ic-panel">
      <div
        className={`ic-drop ${busy ? 'busy' : ''}`}
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          importFiles([...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).filter(Boolean));
        }}
      >
        <div className="ic-drop-icon">📖</div>
        <div className="ic-drop-text">导入图书：txt / md / html / epub / docx</div>
        <div className="ic-drop-sub">自动识别 GBK/UTF-8 · 导入后本地保存，重启不丢</div>
      </div>

      {msg && <div className="b64-err">⚠️ {msg}</div>}

      {list && list.length > 0 && (
        <div className="ic-list">
          {list.map((b) => (
            <div className="ic-item" key={b.id}>
              <span className="ic-thumb">📕</span>
              <span className="ic-meta">
                <span className="ic-name">{b.name}</span>
                <span className="ic-info">
                  {fmtChars(b.chars)}
                  {b.pos > 0 ? ` · 已读 ${(b.pos * 100).toFixed(1)}%` : ' · 未开始'}
                </span>
              </span>
              <button className="rd-read" onClick={() => open(b.id)} title="开始阅读">
                阅读
              </button>
              <button className="ic-del" onClick={() => remove(b.id)} title="删除">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {list && !list.length && !busy && (
        <div className="empty-state small">
          <span className="empty-face">📚</span>
          <p>书架还是空的，导入一本试试</p>
        </div>
      )}

      <div className="pe-tip">
        🐟 摸鱼四模式：<b>M</b> 循环 多行 → 透明 → 单行 → 透明单行 · <b>F9</b> Boss 键一键隐身（进度不丢）·
        标题栏 <b>A＋/A－</b> 调字号 · <b>←→</b> 翻页 <b>[]</b> 行距 <b>C</b> 透明配色
      </div>
    </div>
  );
}
