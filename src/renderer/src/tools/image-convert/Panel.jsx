import React, { useRef, useState } from 'react';

const FORMATS = ['png', 'jpg', 'webp', 'bmp'];
const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i + 1).toLowerCase() : '';
};

async function readImage(path) {
  const res = await window.api.tool.run('image-convert', 'readFile', { path });
  if (!res.ok) throw new Error(res.error);
  const url = `data:image/${extOf(path) === 'jpg' ? 'jpeg' : extOf(path)};base64,${res.data}`;
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('图片解码失败'));
    el.src = url;
  });
  return img;
}

function canvasToBuffer(canvas, fmt, quality) {
  const mime = fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`;
  const dataURL = canvas.toDataURL(mime, quality);
  return dataURL.split(',')[1]; // base64
}

export default function ImageConvertPanel({ files }) {
  const [list, setList] = useState([]); // { path, name, img, status, out }
  const [fmt, setFmt] = useState('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(100);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const addFiles = async (paths) => {
    const valid = paths.filter((p) => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.avif'].includes('.' + extOf(p)));
    if (!valid.length) return;
    setBusy(true);
    const next = [];
    for (const p of valid) {
      try {
        const img = await readImage(p);
        next.push({ path: p, name: p.split(/[\\/]/).pop(), img, status: 'ready' });
      } catch (e) {
        next.push({ path: p, name: p.split(/[\\/]/).pop(), img: null, status: 'error:' + e.message });
      }
    }
    setList((l) => [...l, ...next]);
    setBusy(false);
  };

  // 悬浮球投喂 / 面板拖放的文件
  React.useEffect(() => {
    if (files?.length) addFiles(files);
  }, [files]);

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'avif'] }],
    });
    if (!r.canceled) addFiles(r.filePaths);
  };

  const outDir = async () => {
    const first = list[0]?.path || '';
    const i = Math.max(first.lastIndexOf('\\'), first.lastIndexOf('/'));
    return i > 0 ? first.slice(0, i) : '.';
  };

  const convertAll = async () => {
    if (!list.length || busy) return;
    setBusy(true);
    const dir = await outDir();
    const updated = await Promise.all(
      list.map(async (item) => {
        if (!item.img) return item;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(item.img.naturalWidth * (scale / 100)));
          canvas.height = Math.max(1, Math.round(item.img.naturalHeight * (scale / 100)));
          const ctx = canvas.getContext('2d');
          if (fmt === 'jpg') {
            ctx.fillStyle = '#fff'; // JPG 无透明通道，铺白底
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(item.img, 0, 0, canvas.width, canvas.height);
          const b64 = canvasToBuffer(canvas, fmt, quality / 100);
          const base = item.name.replace(/\.[^.]+$/, '');
          const outName = `${base}.${fmt}`;
          const res = await window.api.tool.run('image-convert', 'writeFile', {
            dir,
            name: outName,
            base64: b64,
          });
          return res.ok
            ? { ...item, status: 'done', out: res.data }
            : { ...item, status: 'error:' + res.error };
        } catch (e) {
          return { ...item, status: 'error:' + e.message };
        }
      })
    );
    setList(updated);
    setBusy(false);
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
          const paths = [...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).filter(Boolean);
          addFiles(paths);
        }}
      >
        <div className="ic-drop-icon">🖼️</div>
        <div className="ic-drop-text">点击选择图片，或把图片拖到这里</div>
        <div className="ic-drop-sub">支持 PNG / JPG / WEBP / BMP / GIF（取首帧）/ AVIF</div>
      </div>

      {list.length > 0 && (
        <>
          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>输出格式</label>
              <div className="seg">
                {FORMATS.map((f) => (
                  <button key={f} className={`seg-btn ${fmt === f ? 'on' : ''}`} onClick={() => setFmt(f)}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="ic-ctrl">
              <label>
                质量 <em>{quality}</em>
              </label>
              <input
                type="range"
                min={40}
                max={100}
                value={quality}
                disabled={fmt === 'png' || fmt === 'bmp'}
                onChange={(e) => setQuality(+e.target.value)}
              />
            </div>
            <div className="ic-ctrl">
              <label>
                缩放 <em>{scale}%</em>
              </label>
              <input type="range" min={10} max={200} step={5} value={scale} onChange={(e) => setScale(+e.target.value)} />
            </div>
          </div>

          <div className="ic-list">
            {list.map((it, i) => (
              <div className={`ic-item ${it.status.startsWith('error') ? 'err' : it.status === 'done' ? 'ok' : ''}`} key={i}>
                <span className="ic-thumb">
                  {it.img && <img src={it.img.src} alt="" />}
                </span>
                <span className="ic-meta">
                  <span className="ic-name">{it.name}</span>
                  <span className="ic-info">
                    {it.img
                      ? `${it.img.naturalWidth}×${it.img.naturalHeight}${
                          it.status === 'done' ? ' → 已输出 ' + (it.out || '').split(/[\\/]/).pop() : ''
                        }`
                      : it.status}
                  </span>
                </span>
                <button
                  className="ic-del"
                  onClick={() => setList((l) => l.filter((_, j) => j !== i))}
                  title="移除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setList([])} disabled={busy}>
              清空
            </button>
            <button className="btn primary" onClick={convertAll} disabled={busy}>
              {busy ? '转换中…' : `转换为 ${fmt.toUpperCase()}`}
            </button>
          </div>
          <div className="ic-note">输出到原图片所在目录，同名文件自动覆盖 · 点击文件名可在资源管理器中定位</div>
        </>
      )}
    </div>
  );
}
