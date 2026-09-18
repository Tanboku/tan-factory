import React, { useEffect, useRef, useState } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { loadImage, canvasOf, dirOf, baseName, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const bytesToBase64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  }
  return btoa(s);
};

export default function GifMakerPanel({ files }) {
  const [list, setList] = useState([]); // {path, el}
  const [delay, setDelay] = useState(120);
  const [loop, setLoop] = useState(0); // 0=无限
  const [maxW, setMaxW] = useState(480);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const previewRef = useRef(null);
  const playingRef = useRef(true);

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

  // 动画预览
  useEffect(() => {
    playingRef.current = playing;
    if (!list.length) return;
    let idx = 0;
    const timer = setInterval(() => {
      if (!playingRef.current || !previewRef.current || !list.length) return;
      const cv = previewRef.current;
      const el = list[idx % list.length].el;
      const scale = Math.min(1, 400 / el.naturalWidth);
      cv.width = Math.round(el.naturalWidth * scale);
      cv.height = Math.round(el.naturalHeight * scale);
      cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
      setFrameIdx(idx % list.length);
      idx++;
    }, Math.max(20, delay));
    return () => clearInterval(timer);
  }, [list, delay, playing]);

  const generate = async () => {
    if (list.length < 2 || busy) return;
    setBusy(true);
    setOut('');
    try {
      const first = list[0].el;
      const w = Math.min(maxW, first.naturalWidth);
      const h = Math.round((first.naturalHeight * w) / first.naturalWidth);

      const gif = GIFEncoder();
      for (let i = 0; i < list.length; i++) {
        const cv = canvasOf(null, w, h);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(list[i].el, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const palette = quantize(data, 256, { format: 'rgb565' });
        const index = applyPalette(data, palette, 'rgb565');
        gif.writeFrame(index, w, h, { palette, delay, loop: i === 0 ? loop : undefined });
        await new Promise((r) => setTimeout(r, 0)); // 让 UI 呼吸
      }
      gif.finish();

      const b64 = bytesToBase64(gif.bytes());
      const dir = dirOf(list[0].path);
      const name = `${baseName(list[0].path)}.gif`;
      const res = await window.api.tool.run('image-convert', 'writeFile', { dir, name, base64: b64 });
      if (!res.ok) throw new Error(res.error);
      setOut(res.data);
    } catch (e) {
      setOut('失败：' + e.message);
    }
    setBusy(false);
  };

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
        <div className="ic-drop-icon">🎞️</div>
        <div className="ic-drop-text">选择多张图片作为帧（按顺序播放）</div>
        <div className="ic-drop-sub">至少 2 张，↑↓ 调整顺序，输出到第一张所在目录</div>
      </div>

      {list.length > 0 && (
        <>
          <div className="gif-preview-wrap">
            <canvas ref={previewRef} className="gif-preview" />
            <div className="gif-ctrl">
              <button className="gif-play" onClick={() => setPlaying((p) => !p)}>
                {playing ? '⏸ 暂停' : '▶ 播放'}
              </button>
              <span className="gif-idx">
                帧 {frameIdx + 1}/{list.length}
              </span>
            </div>
          </div>

          <div className="ic-list gif-frames">
            {list.map((it, i) => (
              <div className={`ic-item ${i === frameIdx ? 'running' : ''}`} key={i}>
                <span className="ic-thumb">{it.el && <img src={it.el.src} alt="" />}</span>
                <span className="ic-meta">
                  <span className="ic-name">{nameOf(it.path)}</span>
                  <span className="ic-info">
                    {it.el ? `${it.el.naturalWidth}×${it.el.naturalHeight}` : ''} · 第 {i + 1} 帧
                  </span>
                </span>
                <button className="ic-del" onClick={() => move(i, -1)} title="前移">
                  ↑
                </button>
                <button className="ic-del" onClick={() => move(i, 1)} title="后移">
                  ↓
                </button>
                <button className="ic-del" onClick={() => setList((l) => l.filter((_, j) => j !== i))} title="移除">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>
                帧延迟 <em>{delay}ms</em>
              </label>
              <input type="range" min={40} max={1000} step={20} value={delay} onChange={(e) => setDelay(+e.target.value)} />
            </div>
            <div className="wm-row2">
              <div className="ic-ctrl">
                <label>
                  循环 <em>{loop === 0 ? '无限' : loop + ' 次'}</em>
                </label>
                <input type="range" min={0} max={10} value={loop} onChange={(e) => setLoop(+e.target.value)} />
              </div>
              <div className="ic-ctrl">
                <label>
                  宽度上限 <em>{maxW}px</em>
                </label>
                <input type="range" min={160} max={800} step={40} value={maxW} onChange={(e) => setMaxW(+e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setList([])} disabled={busy}>
              清空
            </button>
            <button className="btn primary" onClick={generate} disabled={busy || list.length < 2}>
              {busy ? '编码中…' : `生成 GIF（${list.length} 帧）`}
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
