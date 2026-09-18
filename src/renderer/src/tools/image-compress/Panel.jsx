import React, { useEffect, useState } from 'react';
import { loadImage, canvasOf, saveCanvas, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : (n / 1024).toFixed(1) + ' KB');

export default function ImageCompressPanel({ files }) {
  const [list, setList] = useState([]); // {path, el, size, out?, outSize?, status}
  const [quality, setQuality] = useState(75);
  const [fmt, setFmt] = useState('webp'); // webp / jpg / 保持原格式(有损图)
  const [maxDim, setMaxDim] = useState(0); // 0 = 不限制
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (files?.length) addFiles(files.filter((f) => IMG_EXTS.includes(extOf(f))));
  }, [files]);

  const addFiles = async (paths) => {
    if (!paths.length) return;
    setBusy(true);
    const next = [];
    for (const p of paths) {
      try {
        const [el, size] = await Promise.all([
          loadImage(p),
          window.api.tool.run('image-convert', 'stat', { path: p }),
        ]);
        next.push({ path: p, el, size: size.ok ? size.data : 0, status: 'ready' });
      } catch (e) {
        next.push({ path: p, status: 'error:' + e.message });
      }
    }
    setList((l) => [...l, ...next]);
    setBusy(false);
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'avif'] }],
    });
    if (!r.canceled) addFiles(r.filePaths);
  };

  const compressAll = async () => {
    if (!list.length || busy) return;
    setBusy(true);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it.el) continue;
      setList((l) => l.map((x, j) => (j === i ? { ...x, status: 'running' } : x)));
      try {
        const useFmt = fmt === 'keep' ? (['jpg', 'jpeg', 'webp'].includes(extOf(it.path).slice(1)) ? extOf(it.path).slice(1) : 'jpg') : fmt;
        let w = it.el.naturalWidth;
        let h = it.el.naturalHeight;
        if (maxDim > 0 && Math.max(w, h) > maxDim) {
          const s = maxDim / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const canvas = canvasOf(it.el, w, h);
        const ctx = canvas.getContext('2d');
        if (useFmt === 'jpg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(it.el, 0, 0, w, h);
        const out = `${it.path.replace(/\.[^.]+$/, '')}-min.${useFmt}`;
        const dir = out.slice(0, Math.max(out.lastIndexOf('\\'), out.lastIndexOf('/')));
        const saved = await saveCanvas(canvas, dir, nameOf(out), useFmt, quality / 100);
        const st = await window.api.tool.run('image-convert', 'stat', { path: saved });
        setList((l) =>
          l.map((x, j) =>
            j === i ? { ...x, status: 'done', out: saved, outSize: st.ok ? st.data : 0 } : x
          )
        );
      } catch (e) {
        setList((l) => l.map((x, j) => (j === i ? { ...x, status: 'error:' + e.message } : x)));
      }
    }
    setBusy(false);
  };

  const totalBefore = list.reduce((s, x) => s + (x.size || 0), 0);
  const totalAfter = list.reduce((s, x) => s + (x.outSize || 0), 0);

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
        <div className="ic-drop-icon">🗜️</div>
        <div className="ic-drop-text">点击选择或拖入要压缩的图片（可批量）</div>
        <div className="ic-drop-sub">WebP 通常比 JPG 再小 30%</div>
      </div>

      {list.length > 0 && (
        <>
          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>输出格式</label>
              <div className="seg">
                {[
                  ['webp', 'WEBP'],
                  ['jpg', 'JPG'],
                  ['keep', '智能'],
                ].map(([v, l]) => (
                  <button key={v} className={`seg-btn ${fmt === v ? 'on' : ''}`} onClick={() => setFmt(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="ic-ctrl">
              <label>
                质量 <em>{quality}</em>
              </label>
              <input type="range" min={30} max={95} value={quality} onChange={(e) => setQuality(+e.target.value)} />
            </div>
            <div className="ic-ctrl">
              <label>
                最长边 <em>{maxDim === 0 ? '不限' : maxDim + 'px'}</em>
              </label>
              <input type="range" min={0} max={4096} step={256} value={maxDim} onChange={(e) => setMaxDim(+e.target.value)} />
            </div>
          </div>

          <div className="ic-list">
            {list.map((it, i) => (
              <div className={`ic-item ${it.status.startsWith('error') ? 'err' : it.status === 'done' ? 'ok' : ''} ${it.status === 'running' ? 'running' : ''}`} key={i}>
                <span className="ic-thumb">{it.el && <img src={it.el.src} alt="" />}</span>
                <span className="ic-meta">
                  <span className="ic-name" onClick={() => it.status === 'done' && window.api.shell.showItem(it.out)}>
                    {nameOf(it.path)}
                  </span>
                  <span className="ic-info">
                    {it.el ? `${it.el.naturalWidth}×${it.el.naturalHeight} · ${fmtBytes(it.size)}` : it.status}
                    {it.status === 'done' &&
                      ` → ${fmtBytes(it.outSize)}（省 ${Math.max(0, 100 - Math.round((it.outSize / it.size) * 100))}%）`}
                    {it.status === 'running' && '⏳ 压缩中…'}
                  </span>
                </span>
                <button className="ic-del" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {totalAfter > 0 && (
            <div className="cmp-total">
              总计 {fmtBytes(totalBefore)} → {fmtBytes(totalAfter)}，节省 {fmtBytes(totalBefore - totalAfter)}
            </div>
          )}

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setList([])} disabled={busy}>
              清空
            </button>
            <button className="btn primary" onClick={compressAll} disabled={busy}>
              {busy ? '压缩中…' : '开始压缩'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
