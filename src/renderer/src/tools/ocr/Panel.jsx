import React, { useEffect, useRef, useState } from 'react';
import { loadImage, nameOf, IMG_EXTS, extOf } from '../../core/image-io';

const CDN_LIST = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
  'https://unpkg.com/tesseract.js@4.1.4/dist/tesseract.min.js',
  'https://npm.elemecdn.com/tesseract.js@4.1.4/dist/tesseract.min.js',
];

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error('加载失败: ' + url));
    document.head.appendChild(s);
  });
}

let enginePromise = null;
function getTesseract() {
  if (!enginePromise) {
    enginePromise = (async () => {
      if (window.Tesseract) return window.Tesseract;
      let lastErr;
      for (const url of CDN_LIST) {
        try {
          await loadScript(url);
          if (window.Tesseract) return window.Tesseract;
        } catch (e) {
          lastErr = e;
        }
      }
      enginePromise = null;
      throw new Error('OCR 引擎下载失败，请检查网络后重试');
    })();
  }
  return enginePromise;
}

export default function OcrPanel({ files }) {
  const [img, setImg] = useState(null); // {path, el}
  const [langs, setLangs] = useState('chi_sim+eng');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const workerRef = useRef(null);

  useEffect(() => {
    if (files?.length) addFile(files.find((f) => IMG_EXTS.includes(extOf(f))));
  }, [files]);

  useEffect(
    () => () => {
      workerRef.current?.terminate?.();
    },
    []
  );

  const addFile = async (p) => {
    if (!p) return;
    try {
      setImg({ path: p, el: await loadImage(p) });
      setText('');
      setErr('');
    } catch (e) {
      setErr('读图失败：' + e.message);
    }
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (!r.canceled) addFile(r.filePaths[0]);
  };

  const recognize = async () => {
    if (!img || busy) return;
    setBusy(true);
    setErr('');
    setText('');
    setStatus('正在准备引擎…');
    try {
      const T = await getTesseract();
      if (!workerRef.current || workerRef.current.__langs !== langs) {
        workerRef.current?.terminate?.();
        setStatus('初始化识别器（首次使用需下载语言包，约 2-5MB）…');
        // tesseract.js v4 API：createWorker(options) → loadLanguage → initialize
        const worker = await T.createWorker({
          langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
          logger: (m) => {
            if (m.status === 'recognizing text') setStatus(`识别中 ${(m.progress * 100) | 0}%`);
            else if (m.status?.includes('loading') || m.status?.includes('initializing')) setStatus(`${m.status} ${(m.progress * 100) | 0}%`);
          },
        });
        await worker.loadLanguage(langs);
        await worker.initialize(langs);
        worker.__langs = langs;
        workerRef.current = worker;
      }
      setStatus('识别中…');
      const { data } = await workerRef.current.recognize(img.el);
      setText(data.text.replace(/\n{3,}/g, '\n\n').trim());
      setStatus(`完成 · 置信度 ${(data.confidence || 0) | 0}%`);
    } catch (e) {
      setErr(e.message || String(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
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
          <div className="ic-drop-icon">🔍</div>
          <div className="ic-drop-text">选择或拖入要识别的图片</div>
          <div className="ic-drop-sub">支持印刷体中英文 · 截图、扫描件、照片均可</div>
        </div>
      ) : (
        <>
          <div className="wm-preview-wrap ocr-preview">
            <img src={img.el.src} alt={nameOf(img.path)} />
          </div>

          <div className="seg">
            {[
              ['chi_sim+eng', '中英混合'],
              ['chi_sim', '仅中文'],
              ['eng', '仅英文'],
            ].map(([v, l]) => (
              <button key={v} className={`seg-btn ${langs === v ? 'on' : ''}`} onClick={() => setLangs(v)}>
                {l}
              </button>
            ))}
          </div>

          <div className="ic-actions">
            <button className="btn ghost" onClick={() => setImg(null)} disabled={busy}>
              换图
            </button>
            <button className="btn primary" onClick={recognize} disabled={busy}>
              {busy ? '识别中…' : '开始识别'}
            </button>
            {text && (
              <button className="btn ghost" onClick={() => navigator.clipboard.writeText(text)}>
                复制全文
              </button>
            )}
          </div>

          {status && <div className="zp-progress">{status}</div>}
          {err && <div className="b64-err">⚠️ {err}</div>}

          {text && (
            <div className="ocr-result">
              <div className="ts-title">识别结果（可直接编辑）</div>
              <textarea className="ocr-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false} />
            </div>
          )}
          <div className="ic-note">本地 WASM 识别引擎 · 语言包从 CDN 下载后缓存复用</div>
        </>
      )}
    </div>
  );
}
