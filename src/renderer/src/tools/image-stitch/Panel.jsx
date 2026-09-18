import React, { useEffect, useState } from 'react';
import { loadImage, canvasOf, saveCanvas, nameOf, dirOf, baseName, IMG_EXTS, extOf } from '../../core/image-io';

export default function ImageStitchPanel({ files }) {
  const [list, setList] = useState([]); // {path, el}
  const [dir, setDir] = useState('h'); // h 横排 / v 竖排
  const [align, setAlign] = useState('m'); // s/m/e
  const [gap, setGap] = useState(8);
  const [even, setEven] = useState(true); // 统一高/宽
  const [bg, setBg] = useState('#FFFFFF');
  const [fmt, setFmt] = useState('png');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');

  useEffect(() => {
    if (files?.length) addFiles(files.filter((f) => IMG_EXTS.includes(extOf(f))));
  }, [files]);

  const addFiles = async (paths) => {
    if (!paths.length) return;
    setBusy(true);
    const next = [];
    for (const p of paths) {
      try {
        next.push({ path: p, el: await loadImage(p) });
      } catch {
        /* skip */
      }
    }
    setList((l) => [...l, ...next]);
    setBusy(false);
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!r.canceled) addFiles(r.filePaths);
  };

  const move = (i, d) => {
    setList((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };

  const stitch = async () => {
    if (list.length < 2 || busy) return;
    setBusy(true);
    setOut('');
    try {
      const els = list.map((x) => x.el);
      let dims;
      if (dir === 'h') {
        const h = even ? Math.min(...els.map((e) => e.naturalHeight)) : Math.max(...els.map((e) => e.naturalHeight));
        dims = els.map((e) => ({ w: Math.round((e.naturalWidth * h) / e.naturalHeight), h }));
      } else {
        const w = even ? Math.min(...els.map((e) => e.naturalWidth)) : Math.max(...els.map((e) => e.naturalWidth));
        dims = els.map((e) => ({ w, h: Math.round((e.naturalHeight * w) / e.naturalWidth) }));
      }
      const total = dir === 'h'
        ? { w: dims.reduce((s, d) => s + d.w, 0) + gap * (dims.length - 1), h: Math.max(...dims.map((d) => d.h)) }
        : { w: Math.max(...dims.map((d) => d.w)), h: dims.reduce((s, d) => s + d.h, 0) + gap * (dims.length - 1) };

      const canvas = canvasOf(null, total.w, total.h);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, total.w, total.h);

      let pos = 0;
      for (let i = 0; i < els.length; i++) {
        const d = dims[i];
        let x, y;
        if (dir === 'h') {
          x = pos;
          y = align === 's' ? 0 : align === 'e' ? total.h - d.h : (total.h - d.h) / 2;
        } else {
          x = align === 's' ? 0 : align === 'e' ? total.w - d.w : (total.w - d.w) / 2;
          y = pos;
        }
        ctx.drawImage(els[i], Math.round(x), Math.round(y), d.w, d.h);
        pos += (dir === 'h' ? d.w : d.h) + gap;
      }

      const first = list[0].path;
      const saved = await saveCanvas(canvas, dirOf(first), `${baseName(first)}-拼接.${fmt}`, fmt);
      setOut(saved);
    } catch (e) {
      setOut('失败：' + e.message);
    }
    setBusy(false);
  };

  const alignOptions =
    dir === 'h'
      ? [
          ['s', '顶对齐'],
          ['m', '垂直居中'],
          ['e', '底对齐'],
        ]
      : [
          ['s', '左对齐'],
          ['m', '水平居中'],
          ['e', '右对齐'],
        ];

  return (
    <div className="ic-panel">
      <div
        className="ic-drop"
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addFiles([...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).filter(Boolean));
        }}
      >
        <div className="ic-drop-icon">🧩</div>
        <div className="ic-drop-text">选择多张图片（按加入顺序拼接）</div>
        <div className="ic-drop-sub">至少 2 张，可用 ↑↓ 调整顺序</div>
      </div>

      {list.length > 0 && (
        <>
          <div className="ic-list">
            {list.map((it, i) => (
              <div className="ic-item" key={i}>
                <span className="ic-thumb">{it.el && <img src={it.el.src} alt="" />}</span>
                <span className="ic-meta">
                  <span className="ic-name">{nameOf(it.path)}</span>
                  <span className="ic-info">{it.el ? `${it.el.naturalWidth}×${it.el.naturalHeight}` : ''}</span>
                </span>
                <span className="st-order">
                  {i + 1}/{list.length}
                </span>
                <button className="ic-del" onClick={() => move(i, -1)} title="上移">
                  ↑
                </button>
                <button className="ic-del" onClick={() => move(i, 1)} title="下移">
                  ↓
                </button>
                <button className="ic-del" onClick={() => setList((l) => l.filter((_, j) => j !== i))} title="移除">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="ic-controls">
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>方向</label>
                <div className="seg">
                  <button className={`seg-btn ${dir === 'h' ? 'on' : ''}`} onClick={() => setDir('h')}>
                    → 横排
                  </button>
                  <button className={`seg-btn ${dir === 'v' ? 'on' : ''}`} onClick={() => setDir('v')}>
                    ↓ 竖排
                  </button>
                </div>
              </div>
              <div className="ic-ctrl">
                <label>对齐</label>
                <div className="seg">
                  {alignOptions.map(([v, l]) => (
                    <button key={v} className={`seg-btn ${align === v ? 'on' : ''}`} onClick={() => setAlign(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>
                  间距 <em>{gap}px</em>
                </label>
                <input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(+e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>统一{dir === 'h' ? '高' : '宽'}（不拉伸留白）</label>
                <div className="seg">
                  <button className={`seg-btn ${even ? 'on' : ''}`} onClick={() => setEven(true)}>
                    开
                  </button>
                  <button className={`seg-btn ${!even ? 'on' : ''}`} onClick={() => setEven(false)}>
                    关
                  </button>
                </div>
              </div>
            </div>
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>背景色</label>
                <input type="color" className="wm-color" value={bg} onChange={(e) => setBg(e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>输出格式</label>
                <div className="seg">
                  {['png', 'jpg'].map((f) => (
                    <button key={f} className={`seg-btn ${fmt === f ? 'on' : ''}`} onClick={() => setFmt(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setList([])} disabled={busy}>
              清空
            </button>
            <button className="btn primary" onClick={stitch} disabled={busy || list.length < 2}>
              {busy ? '拼接中…' : `生成${dir === 'h' ? '横排' : '竖排'}长图`}
            </button>
          </div>
          {out && (
            <div className={`wm-out ${out.startsWith('失败') ? 'err' : 'ok'}`} onClick={() => !out.startsWith('失败') && window.api.shell.showItem(out)}>
              {out.startsWith('失败') ? out : '✓ 已输出 ' + nameOf(out) + '（点击定位）'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
