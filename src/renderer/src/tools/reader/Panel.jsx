import React, { useEffect, useState } from 'react';

const EXTS = ['.txt', '.md', '.markdown', '.html', '.htm', '.xhtml', '.epub', '.docx'];
const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
};
const fmtChars = (n) => (n > 10000 ? (n / 10000).toFixed(1) + ' 万字' : n + ' 字');

const MODES = [
  ['multi', '多行'],
  ['ghost', '透明'],
  ['line', '单行'],
  ['ghost-line', '透明单行'],
];

export default function ReaderPanel({ files }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [st, setSt] = useState(null); // 显示设置
  const [cfgOpen, setCfgOpen] = useState(false); // 设置卡默认收起

  const refresh = async () => {
    const r = await window.api.tool.run('reader', 'list');
    setList(r.ok ? r.data : []);
  };

  useEffect(() => {
    refresh();
    window.api.tool.run('reader', 'getSettings').then((r) => r.ok && setSt(r.data));
  }, []);

  /** 显示设置：本地立即生效 + 服务持久化并实时推送到阅读窗 */
  const set = (patchObj) => {
    setSt((s) => ({ ...s, ...patchObj }));
    window.api.tool.run('reader', 'settings', patchObj);
  };

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
        <div className="ic-list rd-books">
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

      {st && (
        <div className="ic-controls">
          <div className="ts-title rd-set-toggle" onClick={() => setCfgOpen((v) => !v)}>
            🎨 显示设置（实时生效到阅读窗）{cfgOpen ? '▾' : '▸ 默认收起，点击展开'}
          </div>
          {cfgOpen && (
            <>
          <div className="ic-ctrl">
            <label>模式</label>
            <div className="seg">
              {MODES.map(([v, l]) => (
                <button key={v} className={`seg-btn ${st.mode === v ? 'on' : ''}`} onClick={() => set({ mode: v })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="wm-row2">
            <div className="ic-ctrl">
              <label>
                字号 <em>{st.font}px</em>
              </label>
              <input type="range" min={11} max={28} value={st.font} onChange={(e) => set({ font: +e.target.value })} />
            </div>
            <div className="ic-ctrl">
              <label>
                行距 <em>{st.lineH}</em>
              </label>
              <input type="range" min={1.2} max={3} step={0.1} value={st.lineH} onChange={(e) => set({ lineH: +e.target.value })} />
            </div>
          </div>
          <div className="wm-row2">
            <div className="ic-ctrl">
              <label>
                字体颜色 <em>{st.color || '跟随模式'}</em>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" className="wm-color" value={st.color || '#2e2a27'} onChange={(e) => set({ color: e.target.value })} />
                <button className="seg-btn" onClick={() => set({ color: '' })} title="恢复模式默认配色">
                  默认
                </button>
              </div>
            </div>
            <div className="ic-ctrl">
              <label>透明模式文字</label>
              <div className="seg">
                <button className={`seg-btn ${!st.ghostLight ? 'on' : ''}`} onClick={() => set({ ghostLight: false })}>
                  黑字白晕
                </button>
                <button className={`seg-btn ${st.ghostLight ? 'on' : ''}`} onClick={() => set({ ghostLight: true })}>
                  白字黑晕
                </button>
              </div>
            </div>
          </div>
          <div className="ic-ctrl">
            <label>导航栏（阅读窗标题条，H 键循环切换）</label>
            <div className="seg">
              {[
                ['auto', '自动（透明模式隐藏，悬停浮现）'],
                ['show', '常显'],
                ['hide', '隐藏'],
              ].map(([v, l]) => (
                <button key={v} className={`seg-btn ${st.bar === v ? 'on' : ''}`} onClick={() => set({ bar: v })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      <div className="pe-tip">
        🐟 摸鱼四模式 · <b>F9</b> Boss 键一键隐身（进度不丢）· 快捷键仍可在阅读窗直接用：
        <b>←→</b> 翻页 <b>+−</b> 字号 <b>[]</b> 行距 <b>M</b> 模式 <b>C</b> 配色 <b>H</b> 导航栏
      </div>
    </div>
  );
}
