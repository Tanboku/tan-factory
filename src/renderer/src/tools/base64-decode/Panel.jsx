import React, { useMemo, useState } from 'react';

const LINK_RE = /(https?:\/\/[^\s"'<>）】]+|magnet:\?[^\s"'<>]+|ed2k:\/\/[^\s"'<>]+|thunder:\/\/[^\s"'<>]+|ftp:\/\/[^\s"'<>]+)/gi;

function tryDecode(input) {
  let s = input.trim().replace(/\s+/g, '');
  if (!s) return { text: '', error: '' };
  // URL-safe 变体归一
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  // 补齐 padding
  while (t.length % 4) t += '=';
  try {
    const bin = atob(t);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    // 有效性粗检：可打印率过低视为乱解码
    const printable = [...text].filter((c) => c === '\n' || c === '\t' || (c >= ' ' && c !== '\u007f')).length;
    if (text && printable / text.length < 0.85) {
      return { text, error: '解码结果疑似乱码（可能不是 UTF-8 文本）', raw: true };
    }
    return { text, error: '' };
  } catch {
    return { text: '', error: '不是合法的 Base64 字符串' };
  }
}

export default function Base64DecodePanel() {
  const [mode, setMode] = useState('dec'); // dec | enc
  const [input, setInput] = useState('');

  const decoded = useMemo(() => (mode === 'dec' ? tryDecode(input) : null), [input, mode]);
  const encoded = useMemo(() => {
    if (mode !== 'enc' || !input.trim()) return '';
    try {
      return btoa(String.fromCharCode(...new TextEncoder().encode(input)));
    } catch {
      return '';
    }
  }, [input, mode]);

  const links = useMemo(() => (decoded?.text ? decoded.text.match(LINK_RE) || [] : []), [decoded]);
  const restText = useMemo(() => {
    if (!decoded?.text || !links.length) return decoded?.text || '';
    let t = decoded.text;
    for (const l of links) t = t.split(l).join('\n');
    return t.split(/\n{2,}/).join('\n').trim();
  }, [decoded, links]);

  return (
    <div className="b64-panel">
      <div className="seg b64-tabs">
        <button className={`seg-btn ${mode === 'dec' ? 'on' : ''}`} onClick={() => setMode('dec')}>
          🔓 解码
        </button>
        <button className={`seg-btn ${mode === 'enc' ? 'on' : ''}`} onClick={() => setMode('enc')}>
          🔒 编码
        </button>
      </div>

      <textarea
        className="qr-input b64-input"
        value={input}
        placeholder={mode === 'dec' ? '粘贴 Base64 字符串（网盘分享码、游戏口令等）…' : '输入要编码的文本…'}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        spellCheck={false}
      />

      {mode === 'dec' ? (
        <>
          {decoded?.error && <div className="b64-err">⚠️ {decoded.error}</div>}
          {links.length > 0 && (
            <div className="b64-links">
              <div className="ts-title">识别到 {links.length} 个链接</div>
              {links.map((l, i) => (
                <div key={i} className="b64-link">
                  <span className="b64-link-url" title={l}>
                    {l.length > 56 ? l.slice(0, 56) + '…' : l}
                  </span>
                  <span className="b64-link-acts">
                    <button onClick={() => navigator.clipboard.writeText(l)}>复制</button>
                    <button className="b64-open" onClick={() => window.api.shell.openExternal(l)}>
                      打开
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          {restText && (
            <div className="b64-text">
              <div className="ts-title">
                解码文本
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText(decoded.text)}>
                  复制全部
                </button>
              </div>
              <pre>{restText}</pre>
            </div>
          )}
        </>
      ) : (
        encoded && (
          <div className="b64-text">
            <div className="ts-title">
              编码结果
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText(encoded)}>
                复制
              </button>
            </div>
            <pre className="b64-pre">{encoded}</pre>
          </div>
        )
      )}

      <div className="ic-note">支持 URL-safe 变体与自动补位 · 链接识别：http(s) / magnet / ed2k / thunder / ftp</div>
    </div>
  );
}
