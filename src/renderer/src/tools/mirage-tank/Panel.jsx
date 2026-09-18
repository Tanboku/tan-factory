import React, { useEffect, useRef, useState } from 'react';
import { loadImage, canvasOf, saveCanvas, outPathOf, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const lum = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

/**
 * 合成幻影坦克
 * @param inner 里图（黑底显示） @param surface 表图（白底显示）
 * @param variant classic 双灰 / color-in 里图彩色 / color-out 表图彩色(光影)
 */
function compose(inner, surface, variant, width, height) {
  const a = canvasOf(inner, width, height).getContext('2d');
  a.drawImage(inner, 0, 0, width, height);
  const da = a.getImageData(0, 0, width, height).data;

  const b = canvasOf(surface, width, height).getContext('2d');
  b.drawImage(surface, 0, 0, width, height);
  const db = b.getImageData(0, 0, width, height).data;

  const out = document.createElement('canvas').getContext('2d').createImageData(width, height);
  const d = out.data;
  const grayIn = variant !== 'color-in';
  const grayOut = variant !== 'color-out';

  for (let i = 0; i < d.length; i += 4) {
    const la = lum(da[i], da[i + 1], da[i + 2]);
    const lb = lum(db[i], db[i + 1], db[i + 2]);
    // α = 255 - L表 + L里（表图越亮、里图越暗 → 黑白底区分度越大）
    const alpha = Math.max(0, Math.min(255, Math.round(255 - lb + la)));
    d[i + 3] = alpha;
    if (alpha === 0) {
      d[i] = d[i + 1] = d[i + 2] = 0;
    } else {
      // 输出 RGB = 里图 × 255 / α（保留彩色通道按模式）
      const mix = (v, g) => (grayIn ? g : v);
      for (let c = 0; c < 3; c++) {
        const v = mix(da[i + c], la);
        // 表图彩色（光影）：让白底复合结果偏向表图色相
        const bias = grayOut ? 0 : (db[i + c] - lb) * (1 - alpha / 255) * 0.5;
        d[i + c] = Math.max(0, Math.min(255, (v * 255) / alpha + bias));
      }
    }
  }
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  cv.getContext('2d').putImageData(out, 0, 0);
  return cv;
}

/** 解码：还原黑底/白底观感 */
function decompose(srcCanvas, width, height) {
  const ctx = srcCanvas.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0, width, height);
  const d = ctx.getImageData(0, 0, width, height).data;
  const mk = (fillWhite) => {
    const img = ctx.createImageData(width, height);
    const o = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      for (let c = 0; c < 3; c++) {
        o[i + c] = d[i + c] * (a / 255) + (fillWhite ? 255 * (1 - a / 255) : 0);
      }
      o[i + 3] = 255;
    }
    const cv = document.createElement('canvas');
    cv.width = width;
    cv.height = height;
    cv.getContext('2d').putImageData(img, 0, 0);
    return cv;
  };
  return { onBlack: mk(false), onWhite: mk(true) };
}

const VARIANTS = [
  ['classic', '经典幻影', '双灰度，效果最稳'],
  ['color-in', '彩色幻影', '里图保留彩色'],
  ['color-out', '光影坦克', '表图保留彩色'],
];

function Slot({ label, hint, img, onPick, onDrop, onClear }) {
  return (
    <div
      className="mt-slot"
      onClick={!img ? onPick : undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const p = [...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).filter(Boolean)[0];
        if (p) onDrop(p);
      }}
    >
      {img ? (
        <>
          <img src={img.el.src} alt={label} />
          <button
            className="mt-slot-x"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            ✕
          </button>
          <span className="mt-slot-tag">{label}</span>
        </>
      ) : (
        <div className="mt-slot-empty">
          <span className="mt-plus">＋</span>
          <span>{label}</span>
          <span className="mt-hint">{hint}</span>
        </div>
      )}
    </div>
  );
}

export default function MirageTankPanel({ files }) {
  const [tab, setTab] = useState('gen'); // gen | dec
  const [inner, setInner] = useState(null); // 里图
  const [surface, setSurface] = useState(null); // 表图
  const [decImg, setDecImg] = useState(null); // 待解码
  const [variant, setVariant] = useState('classic');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const blackRef = useRef(null);
  const whiteRef = useRef(null);
  const tankRef = useRef(null);

  const slotsRef = useRef({}); // 槽位镜像：批量注入时避免闭包读到过期 state

  useEffect(() => {
    if (!files?.length) return;
    (async () => {
      for (const f of files.filter((x) => IMG_EXTS.includes(extOf(x)))) {
        await loadInto(f);
      }
    })();
  }, [files]);

  const loadInto = async (p) => {
    try {
      const el = await loadImage(p);
      const s = slotsRef.current;
      if (tab === 'dec' || (s.inner && s.surface)) {
        setDecImg({ path: p, el });
      } else if (!s.inner) {
        s.inner = { path: p, el };
        setInner(s.inner);
      } else if (!s.surface) {
        s.surface = { path: p, el };
        setSurface(s.surface);
      }
      setOut('');
    } catch {
      /* ignore */
    }
  };

  const pickFile = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!r.canceled) loadInto(r.filePaths[0]);
  };

  // 生成预览（黑底/白底观感）
  useEffect(() => {
    if (tab !== 'gen' || !inner || !surface) return;
    const w = Math.min(inner.el.naturalWidth, 520);
    const h = Math.round((inner.el.naturalHeight * w) / inner.el.naturalWidth);
    const tank = compose(inner.el, surface.el, variant, w, h);
    if (tankRef.current) {
      tankRef.current.width = w;
      tankRef.current.height = h;
      tankRef.current.getContext('2d').drawImage(tank, 0, 0);
    }
    for (const [ref, white] of [[blackRef, false], [whiteRef, true]]) {
      const cv = ref.current;
      if (!cv) continue;
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = white ? '#fff' : '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(tank, 0, 0);
    }
  }, [tab, inner, surface, variant]);

  // 解码预览
  const [dec, setDec] = useState(null);
  useEffect(() => {
    if (tab !== 'dec' || !decImg) return setDec(null);
    const w = Math.min(decImg.el.naturalWidth, 520);
    const h = Math.round((decImg.el.naturalHeight * w) / decImg.el.naturalWidth);
    const cv = canvasOf(decImg.el, w, h);
    const r = decompose(cv, w, h);
    setDec(r);
    for (const [ref, key] of [[blackRef, 'onBlack'], [whiteRef, 'onWhite']]) {
      const c = ref.current;
      if (!c) continue;
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = key === 'onWhite' ? '#fff' : '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(r[key], 0, 0);
    }
  }, [tab, decImg]);

  const save = async (canvas, suffix) => {
    const src = tab === 'gen' ? inner.path : decImg.path;
    const { dir, name } = outPathOf(src, suffix, 'png');
    setOut(await saveCanvas(canvas, dir, name, 'png'));
  };

  const generate = async () => {
    if (!inner || !surface || busy) return;
    setBusy(true);
    try {
      const w = inner.el.naturalWidth;
      const h = inner.el.naturalHeight;
      const tank = compose(inner.el, surface.el, variant, w, h);
      await save(tank, '-tank');
    } catch (e) {
      setOut('失败：' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="mt-panel">
      <div className="seg mt-tabs">
        <button className={`seg-btn ${tab === 'gen' ? 'on' : ''}`} onClick={() => setTab('gen')}>
          🪄 生成坦克
        </button>
        <button className={`seg-btn ${tab === 'dec' ? 'on' : ''}`} onClick={() => setTab('dec')}>
          🔍 解码坦克
        </button>
      </div>

      {tab === 'gen' ? (
        <>
          <div className="mt-slots">
            <Slot label="里图（黑底显示）" hint="点选/拖入" img={inner} onPick={pickFile} onDrop={loadInto} onClear={() => { slotsRef.current.inner = null; setInner(null); }} />
            <Slot label="表图（白底显示）" hint="点选/拖入" img={surface} onPick={pickFile} onDrop={loadInto} onClear={() => { slotsRef.current.surface = null; setSurface(null); }} />
          </div>

          <div className="scan-modes">
            {VARIANTS.map(([v, name, desc]) => (
              <button key={v} className={`scan-mode ${variant === v ? 'on' : ''}`} onClick={() => setVariant(v)}>
                <span className="sm-name">{name}</span>
                <span className="sm-desc">{desc}</span>
              </button>
            ))}
          </div>

          {inner && surface && (
            <div className="mt-preview">
              <div className="mt-pv black">
                <span className="mt-pv-tag">黑底效果（里图）</span>
                <canvas ref={blackRef} />
              </div>
              <div className="mt-pv white">
                <span className="mt-pv-tag">白底效果（表图）</span>
                <canvas ref={whiteRef} />
              </div>
            </div>
          )}

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => { slotsRef.current = {}; setInner(null); setSurface(null); setOut(''); }} disabled={busy}>
              清空
            </button>
            <button className="btn primary" onClick={generate} disabled={busy || !inner || !surface}>
              {busy ? '生成中…' : '输出坦克 PNG'}
            </button>
          </div>
        </>
      ) : (
        <>
          <Slot label="拖入一张幻影坦克 PNG" hint="自动还原黑/白底观感" img={decImg} onPick={pickFile} onDrop={loadInto} onClear={() => setDecImg(null)} />
          {dec && (
            <>
              <div className="mt-preview">
                <div className="mt-pv black">
                  <span className="mt-pv-tag">还原·黑底（里图）</span>
                  <canvas ref={blackRef} />
                </div>
                <div className="mt-pv white">
                  <span className="mt-pv-tag">还原·白底（表图）</span>
                  <canvas ref={whiteRef} />
                </div>
              </div>
              <div className="ic-actions">
                <button className="btn ghost" onClick={() => save(dec.onBlack, '-黑底还原')} disabled={busy}>
                  保存黑底图
                </button>
                <button className="btn primary" onClick={() => save(dec.onWhite, '-白底还原')} disabled={busy}>
                  保存白底图
                </button>
              </div>
            </>
          )}
        </>
      )}

      {out && (
        <div className={`mt-out ${out.startsWith('失败') ? 'err' : 'ok'}`} onClick={() => !out.startsWith('失败') && window.api.shell.showItem(out)}>
          {out.startsWith('失败') ? out : '✓ 已输出 ' + nameOf(out) + '（点击定位）'}
        </div>
      )}
      <div className="ic-note warn">
        ⚠️ 发送到 QQ/微信必须勾选「原图」或以文件形式发送——普通发送会被压缩去掉透明通道，坦克即失效
      </div>
      <div className="ic-note">坦克图需 PNG 才有透明通道 · 聊天深色/浅色模式下效果不同</div>
    </div>
  );
}
