import React, { useEffect, useRef, useState } from 'react';
import { loadImage, canvasOf, saveCanvas, outPathOf, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const POSITIONS = [
  ['左上', 'lt'], ['上中', 'ct'], ['右上', 'rt'],
  ['左中', 'lc'], ['居中', 'cc'], ['右中', 'rc'],
  ['左下', 'lb'], ['下中', 'cb'], ['右下', 'rb'],
];

export default function WatermarkPanel({ files }) {
  const [img, setImg] = useState(null); // { path, el }
  const [text, setText] = useState('兔子工厂');
  const [size, setSize] = useState(5); // 字号 = 尺寸的 size%
  const [opacity, setOpacity] = useState(35);
  const [rotate, setRotate] = useState(-24);
  const [tiled, setTiled] = useState(true);
  const [pos, setPos] = useState('rb');
  const [color, setColor] = useState('#FFFFFF');
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
      const el = await loadImage(p);
      setImg({ path: p, el });
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

  // 预览渲染
  useEffect(() => {
    const cv = previewRef.current;
    if (!cv || !img) return;
    draw(cv, img.el);
  }, [img, text, size, opacity, rotate, tiled, pos, color]);

  const draw = (canvas, image) => {
    const maxW = 430;
    const scale = Math.min(1, maxW / image.naturalWidth);
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (!text.trim()) return;
    const fontSize = Math.max(12, (canvas.width * size) / 100);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity / 100;
    ctx.translate(0, 0);

    const metrics = ctx.measureText(text);
    const tw = metrics.width;

    ctx.save();
    ctx.rotate((rotate * Math.PI) / 180);
    if (tiled) {
      const stepX = tw + fontSize * 2;
      const stepY = fontSize * 3;
      const diag = Math.hypot(canvas.width, canvas.height);
      for (let y = -diag; y < diag; y += stepY) {
        for (let x = -diag; x < diag; x += stepX) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      const pad = fontSize;
      const map = {
        l: pad, c: (canvas.width - tw) / 2, r: canvas.width - tw - pad,
        t: pad + fontSize * 0.8, m: canvas.height / 2, b: canvas.height - pad,
      };
      const x = map[pos[0]] ?? map.c;
      const y = map[pos[1]] ?? map.b;
      ctx.fillText(text, x, y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const apply = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const canvas = canvasOf(img.el);
      draw(canvas, img.el);
      const { dir, name } = outPathOf(img.path, '-watermarked', fmt);
      const p = await saveCanvas(canvas, dir, name, fmt);
      setOut(p);
    } catch (e) {
      setOut('失败：' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="wm-panel">
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
          <div className="ic-drop-icon">🏷️</div>
          <div className="ic-drop-text">选择或拖入一张图片</div>
          <div className="ic-drop-sub">水印实时预览，输出到原目录</div>
        </div>
      ) : (
        <>
          <div className="wm-preview-wrap">
            <canvas ref={previewRef} className="wm-preview" />
          </div>

          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>水印文字</label>
              <input className="wm-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={30} />
            </div>
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>
                  字号 <em>{size}%</em>
                </label>
                <input type="range" min={2} max={20} value={size} onChange={(e) => setSize(+e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>
                  透明度 <em>{opacity}%</em>
                </label>
                <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>
                  角度 <em>{rotate}°</em>
                </label>
                <input type="range" min={-90} max={90} value={rotate} onChange={(e) => setRotate(+e.target.value)} />
              </div>
            </div>
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>布局方式</label>
                <div className="seg">
                  <button className={`seg-btn ${tiled ? 'on' : ''}`} onClick={() => setTiled(true)}>
                    平铺
                  </button>
                  <button className={`seg-btn ${!tiled ? 'on' : ''}`} onClick={() => setTiled(false)}>
                    单处
                  </button>
                </div>
              </div>
              <div className="ic-ctrl">
                <label>颜色</label>
                <input type="color" className="wm-color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>输出格式</label>
                <div className="seg">
                  {['png', 'jpg', 'webp'].map((f) => (
                    <button key={f} className={`seg-btn ${fmt === f ? 'on' : ''}`} onClick={() => setFmt(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!tiled && (
              <div className="ic-ctrl">
                <label>位置（单处模式）</label>
                <div className="wm-pos-grid">
                  {POSITIONS.map(([label, id]) => (
                    <button key={id} className={`wm-pos ${pos === id ? 'on' : ''}`} onClick={() => setPos(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setImg(null)} disabled={busy}>
              换图
            </button>
            <button className="btn primary" onClick={apply} disabled={busy || !text.trim()}>
              {busy ? '处理中…' : '输出水印图'}
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
