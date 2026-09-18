import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCodePanel() {
  const [text, setText] = useState('https://example.com');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const t = useRef(null);

  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(async () => {
      if (!text.trim()) return setUrl('');
      try {
        setUrl(await QRCode.toDataURL(text, { width: 480, margin: 2, color: { dark: '#2E2A27', light: '#FFFFFF' } }));
        setErr('');
      } catch (e) {
        setUrl('');
        setErr(e.message);
      }
    }, 300);
    return () => clearTimeout(t.current);
  }, [text]);

  const save = async () => {
    if (!url) return;
    const r = await window.api.dialog.saveFile({
      defaultPath: 'qrcode.png',
      filters: [{ name: 'PNG 图片', extensions: ['png'] }],
    });
    if (r.canceled) return;
    const res = await window.api.tool.run('image-convert', 'writeFile', {
      dir: r.filePath.slice(0, r.filePath.lastIndexOf('\\') > 0 ? r.filePath.lastIndexOf('\\') : r.filePath.lastIndexOf('/')),
      name: r.filePath.split(/[\\/]/).pop(),
      base64: url.split(',')[1],
    });
    if (res.ok) window.api.shell.showItem(res.data);
  };

  return (
    <div className="qr-panel">
      <textarea
        className="qr-input"
        value={text}
        placeholder="输入文本或链接…"
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <div className="qr-stage">
        {url ? (
          <img src={url} alt="二维码" />
        ) : (
          <div className="qr-placeholder">{err ? '⚠️ ' + err : '输入内容后自动生成'}</div>
        )}
      </div>
      <div className="ic-actions">
        <button className="btn primary" onClick={save} disabled={!url}>
          保存为 PNG
        </button>
      </div>
      <div className="ic-note">实时预览 · 支持中文、链接、Wi-Fi 等任意文本</div>
    </div>
  );
}
