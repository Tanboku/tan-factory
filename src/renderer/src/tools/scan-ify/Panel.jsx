import React, { useEffect, useRef, useState } from 'react';
import { loadImage, canvasOf, saveCanvas, outPathOf, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const MODES = [
  ['bw', '黑白文档', '白纸黑字，最高对比'],
  ['gray', '灰度增强', '去色提亮，接近复印'],
  ['color', '彩色增强', '去阴影提饱和，鲜艳清晰'],
];

/** 自动色阶：按 2%~98% 分位拉伸 */
function autoLevels(lum, strength) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
  const total = lum.length;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > total * 0.02) { lo = i; break; }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc > total * 0.02) { hi = i; break; }
  }
  if (hi - lo < 10) return null;
  // strength 混合原始与全拉伸
  const lo2 = lo + (128 - lo) * (1 - strength);
  const hi2 = hi + (128 - hi) * (1 - strength);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = ((i - lo2) * 255) / (hi2 - lo2);
  return lut;
}

export default function ScanIfyPanel({ files }) {
  const [img, setImg] = useState(null);
  const [mode, setMode] = useState('bw');
  const [strength, setStrength] = useState(80);
  const [threshold, setThreshold] = useState(140);
  const [fmt, setFmt] = useState('png');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const previewRef = useRef(null);

  useEffect(() => {
    if (files?.length) addFile(files.find((f) => IMG_EXTS.includes(extOf(f))));
  }, [files]);

  const addFile = async (p) => {
    if (!p) return;
    try {
      setImg({ path: p, el: await loadImage(p) });
      setOut('');
    } catch (e) {
      setOut('读图失败：' + e.message);
    }
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!r.canceled) addFile(r.filePaths[0]);
  };

  useEffect(() => {
    const cv = previewRef.current;
    if (!cv || !img) return;
    render(cv, img.el, 430);
  }, [img, mode, strength, threshold]);

  const render = (canvas, image, maxW) => {
    const scale = Math.min(1, maxW / image.naturalWidth);
    const w = Math.round(image.naturalWidth * scale);
    const h = Math.round(image.naturalHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, w, h);

    const src = ctx.getImageData(0, 0, w, h);
    const d = src.data;
    const s = strength / 100;

    if (mode === 'color') {
      // 去阴影（高频近似：对每像素向邻域最大值白平衡）成本高，改用对比+饱和
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
        for (let c = 0; c < 3; c++) {
          let v = d[i + c];
          v = avg + (v - avg) * (1 + 0.35 * s); // 饱和
          v = (v - 128) * (1 + 0.55 * s) + 128; // 对比
          d[i + c] = v;
        }
      }
    } else {
      // 亮度 + 自动色阶
      const lum = new Uint8ClampedArray((d.length / 4) | 0);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        lum[j] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      }
      const lut = autoLevels(lum, s);
      const th = threshold;
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        let v = lum[j];
        if (lut) v = lut[v];
        if (mode === 'bw') v = v > th ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
    ctx.putImageData(src, 0, 0);
  };

  const apply = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const canvas = canvasOf(img.el);
      render(canvas, img.el, Infinity);
      const { dir, name } = outPathOf(img.path, '-scan', fmt);
      setOut(await saveCanvas(canvas, dir, name, fmt));
    } catch (e) {
      setOut('失败：' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="ic-panel">
      {!img ? (
        <div
          className="ic-drop"
          onClick={pick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addFile([...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f))[0]);
          }}
        >
          <div className="ic-drop-icon">📄</div>
          <div className="ic-drop-text">选择或拖入文档照片</div>
          <div className="ic-drop-sub">拍歪的纸也能变成干净的扫描风</div>
        </div>
      ) : (
        <>
          <div className="wm-preview-wrap">
            <canvas ref={previewRef} className="wm-preview" />
          </div>

          <div className="scan-modes">
            {MODES.map(([v, name, desc]) => (
              <button key={v} className={`scan-mode ${mode === v ? 'on' : ''}`} onClick={() => setMode(v)}>
                <span className="sm-name">{name}</span>
                <span className="sm-desc">{desc}</span>
              </button>
            ))}
          </div>

          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>
                增强强度 <em>{strength}</em>
              </label>
              <input type="range" min={20} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} />
            </div>
            {mode === 'bw' && (
              <div className="ic-ctrl">
                <label>
                  黑白阈值 <em>{threshold}</em>
                </label>
                <input type="range" min={80} max={200} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
              </div>
            )}
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

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setImg(null)} disabled={busy}>
              换图
            </button>
            <button className="btn primary" onClick={apply} disabled={busy}>
              {busy ? '处理中…' : '输出扫描件'}
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
