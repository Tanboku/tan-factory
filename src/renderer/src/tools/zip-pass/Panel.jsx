import React, { useEffect, useRef, useState } from 'react';

const CHARSETS = [
  ['lower', '小写字母'],
  ['digits', '数字'],
  ['lowerdigits', '小写+数字'],
  ['mixed', '大小写+数字'],
  ['full', '可打印字符'],
];
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  lowerdigits: 'abcdefghijklmnopqrstuvwxyz0123456789',
  mixed: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  full: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
};
const fmtSpeed = (n, ms) => (ms > 0 ? (n / (ms / 1000) / 1000).toFixed(0) + 'k/s' : '…');

export default function ZipPassPanel({ files }) {
  const [path, setPath] = useState('');
  const [info, setInfo] = useState(null); // {encrypted, entries, entry, type}
  const [mode, setMode] = useState('common');
  const [dict, setDict] = useState('');
  const [charset, setCharset] = useState('lowerdigits');
  const [minLen, setMinLen] = useState(1);
  const [maxLen, setMaxLen] = useState(4);
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState(null); // {tried, elapsed}
  const [result, setResult] = useState(null); // {found, tried, elapsed, canceled}
  const runId = useRef(String(Date.now()));

  useEffect(() => {
    window.api.tool.onProgress((p) => {
      if (p.toolId === 'zip-pass') setProg(p);
    });
  }, []);

  useEffect(() => {
    if (files?.length) loadFile(files.find((f) => f.toLowerCase().endsWith('.zip')));
  }, [files]);

  const loadFile = async (p) => {
    if (!p) return;
    setPath(p);
    setInfo(null);
    setResult(null);
    const r = await window.api.tool.run('zip-pass', 'info', { path: p });
    setInfo(r.ok ? r.data : { error: r.error });
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }],
    });
    if (!r.canceled) loadFile(r.filePaths[0]);
  };

  const pickDict = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: '字典文件', extensions: ['txt', 'dic', 'lst'] }],
    });
    if (!r.canceled) setDict(r.filePaths[0]);
  };

  const start = async () => {
    if (!path || running) return;
    setRunning(true);
    setResult(null);
    setProg(null);
    const r = await window.api.tool.run('zip-pass', 'crack', {
      path,
      runId: runId.current,
      mode,
      dict,
      charset: SETS[charset],
      minLen,
      maxLen,
    });
    setResult(r.ok ? r.data : { error: r.error });
    setRunning(false);
  };

  const cancel = () => window.api.tool.run('zip-pass', 'cancel', { runId: runId.current });

  return (
    <div className="zp-panel">
      <div
        className="ic-drop"
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const p = [...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).find((f) => f.toLowerCase().endsWith('.zip'));
          if (p) loadFile(p);
        }}
      >
        <div className="ic-drop-icon">🔓</div>
        <div className="ic-drop-text">{path ? path.split(/[\\/]/).pop() : '选择或拖入加密的 ZIP'}</div>
        <div className="ic-drop-sub">仅支持恢复你拥有权限的文件 · ZipCrypto / WinZip AES</div>
      </div>

      {info?.error && <div className="b64-err">⚠️ {info.error}</div>}

      {info && !info.error && (
        <div className={`zp-info ${info.encrypted ? '' : 'ok'}`}>
          {info.encrypted ? (
            <>
              <div>
                🔐 加密条目 <b>{info.entry}</b> · 算法 <b>{info.type}</b>
              </div>
              <div className="zp-sub">
                共 {info.entries} 个条目
                {info.type !== 'ZipCrypto' ? ' · AES 校验较慢，建议优先用字典' : ' · ZipCrypto 速度极快，可放心掩码暴力'}
              </div>
            </>
          ) : (
            <div>✅ 这个压缩包没有加密（{info.entries} 个条目）</div>
          )}
        </div>
      )}

      {info?.encrypted && (
        <>
          <div className="scan-modes zp-modes">
            {[
              ['common', '常见密码', '内置 50 个高频密码'],
              ['dict', '字典文件', '每行一个密码'],
              ['mask', '掩码暴力', '按字符集穷举'],
            ].map(([v, n, d]) => (
              <button key={v} className={`scan-mode ${mode === v ? 'on' : ''}`} onClick={() => setMode(v)}>
                <span className="sm-name">{n}</span>
                <span className="sm-desc">{d}</span>
              </button>
            ))}
          </div>

          {mode === 'dict' && (
            <div className="zp-dict">
              <input value={dict} readOnly placeholder="选择字典 txt…" />
              <button className="btn ghost sm-btn" onClick={pickDict}>
                选择
              </button>
            </div>
          )}

          {mode === 'mask' && (
            <div className="ic-controls">
              <div className="ic-ctrl">
                <label>字符集</label>
                <div className="seg wrap">
                  {CHARSETS.map(([v, l]) => (
                    <button key={v} className={`seg-btn ${charset === v ? 'on' : ''}`} onClick={() => setCharset(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="wm-row2">
                <div className="ic-ctrl">
                  <label>最短长度</label>
                  <input type="number" min={1} max={8} value={minLen} onChange={(e) => setMinLen(Math.max(1, Math.min(8, +e.target.value || 1)))} />
                </div>
                <div className="ic-ctrl">
                  <label>最长长度（≤8）</label>
                  <input type="number" min={1} max={8} value={maxLen} onChange={(e) => setMaxLen(Math.max(minLen, Math.min(8, +e.target.value || 4)))} />
                </div>
              </div>
            </div>
          )}

          {running && prog && (
            <div className="zp-progress">
              已尝试 <b>{prog.tried.toLocaleString()}</b> 个 · {fmtSpeed(prog.tried, prog.elapsed)}
            </div>
          )}

          <div className="ic-actions">
            {running ? (
              <button className="btn ghost" onClick={cancel}>
                停止
              </button>
            ) : (
              <button className="btn primary" onClick={start} disabled={!path}>
                开始恢复
              </button>
            )}
          </div>

          {result && (
            <div className={`zp-result ${result.found && !result.found.includes('误报') ? 'found' : 'notfound'}`}>
              {result.error ? (
                <span>⚠️ {result.error}</span>
              ) : result.canceled ? (
                <span>已停止：尝试了 {result.tried.toLocaleString()} 个（{fmtSpeed(result.tried, result.elapsed)}）</span>
              ) : result.found ? (
                <span>
                  🔑 密码：<code>{result.found}</code>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(result.found)}>
                    复制
                  </button>
                </span>
              ) : (
                <span>😢 未找到（尝试 {result.tried.toLocaleString()} 个，{fmtSpeed(result.tried, result.elapsed)}）——换字典或扩大掩码范围试试</span>
              )}
            </div>
          )}
        </>
      )}
      <div className="ic-note">纯本地计算，密码不会上传 · 请勿用于他人文件</div>
    </div>
  );
}
