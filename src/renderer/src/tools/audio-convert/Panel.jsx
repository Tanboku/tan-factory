import React, { useEffect, useState } from 'react';

const FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'opus'];
const BITRATES = ['128k', '192k', '256k', '320k'];
const LOSSLESS = new Set(['wav', 'flac']);

const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i + 1).toLowerCase() : '';
};
const baseOf = (p) => p.replace(/\.[^.]+$/, '');
const nameOf = (p) => p.split(/[\\/]/).pop();

export default function AudioConvertPanel({ files }) {
  const [list, setList] = useState([]);
  const [fmt, setFmt] = useState('mp3');
  const [bitrate, setBitrate] = useState('192k');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (files?.length) addFiles(files.filter((p) => /\.(mp3|wav|flac|ogg|aac|m4a|opus|wma|aiff)$/i.test(p)));
  }, [files]);

  const addFiles = (paths) => {
    setList((l) => [
      ...l,
      ...paths.map((p) => ({ path: p, status: 'ready' })),
    ]);
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '音频', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'opus', 'wma', 'aiff'] }],
    });
    if (!r.canceled) addFiles(r.filePaths);
  };

  const convertAll = async () => {
    if (!list.length || busy) return;
    setBusy(true);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      setList((l) => l.map((x, j) => (j === i ? { ...x, status: 'running' } : x)));
      let out = `${baseOf(it.path)}.${fmt}`;
      if (out === it.path) out = `${baseOf(it.path)}-converted.${fmt}`;
      const res = await window.api.tool.run('audio-convert', 'convert', { in: it.path, out, fmt, bitrate });
      setList((l) =>
        l.map((x, j) =>
          j === i ? { ...x, status: res.ok ? 'done' : 'error', out: res.ok ? res.data : res.error } : x
        )
      );
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
        <div className="ic-drop-icon">🎵</div>
        <div className="ic-drop-text">点击选择音频，或把音频拖到这里</div>
        <div className="ic-drop-sub">支持 MP3 / WAV / FLAC / OGG / AAC / M4A / OPUS / WMA</div>
      </div>

      {list.length > 0 && (
        <>
          <div className="ic-controls">
            <div className="ic-ctrl">
              <label>输出格式</label>
              <div className="seg wrap">
                {FORMATS.map((f) => (
                  <button key={f} className={`seg-btn ${fmt === f ? 'on' : ''}`} onClick={() => setFmt(f)}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="ic-ctrl">
              <label>码率 {LOSSLESS.has(fmt) ? '（无损格式不需要）' : ''}</label>
              <div className="seg">
                {BITRATES.map((b) => (
                  <button
                    key={b}
                    className={`seg-btn ${bitrate === b && !LOSSLESS.has(fmt) ? 'on' : ''}`}
                    disabled={LOSSLESS.has(fmt)}
                    onClick={() => setBitrate(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ic-list">
            {list.map((it, i) => (
              <div
                className={`ic-item ${it.status === 'error' ? 'err' : it.status === 'done' ? 'ok' : ''} ${
                  it.status === 'running' ? 'running' : ''
                }`}
                key={i}
              >
                <span className="ic-thumb audio">🎧</span>
                <span className="ic-meta">
                  <span
                    className="ic-name"
                    title={it.status === 'done' ? '点击定位输出文件' : it.path}
                    onClick={() => it.status === 'done' && window.api.shell.showItem(it.out)}
                  >
                    {nameOf(it.path)}
                  </span>
                  <span className="ic-info">
                    {it.status === 'ready' && '.' + extOf(it.path) + ' 待转换'}
                    {it.status === 'running' && '⏳ 转换中…'}
                    {it.status === 'done' && '✓ 已输出 ' + nameOf(it.out)}
                    {it.status === 'error' && '✕ ' + it.out}
                  </span>
                </span>
                <button className="ic-del" onClick={() => setList((l) => l.filter((_, j) => j !== i))} title="移除">
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
          <div className="ic-note">输出到原音频所在目录 · 完成后点击文件名可在资源管理器中定位</div>
        </>
      )}
    </div>
  );
}
