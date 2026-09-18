import React, { useEffect, useRef, useState } from 'react';

const fmtMB = (b) => (b / 1048576).toFixed(0);
const fmtGB = (b) => (b / 1073741824).toFixed(1);

const CHEERS = ['咕噜咕噜～干净多了！', '兔兔把内存角落都扫了一遍 🧹', '挤一挤，总会有空间的', '神清气爽！', '又省出一顿内存大餐'];

export default function MemCleanPanel() {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {trimmed, freedBytes}
  const statsRef = useRef(null);

  const refresh = async () => {
    const r = await window.api.tool.run('mem-clean', 'stats');
    if (r.ok) {
      setStats(r.data);
      statsRef.current = r.data;
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  const clean = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    const r = await window.api.tool.run('mem-clean', 'clean');
    if (r.ok) {
      setResult(r.data);
      refresh();
    } else {
      setResult({ error: r.error });
    }
    setBusy(false);
  };

  const pct = stats?.pct ?? 0;
  const R = 86;
  const C = 2 * Math.PI * R;
  const color = pct > 85 ? '#e5484d' : pct > 70 ? '#ffa928' : '#3fb56e';

  return (
    <div className="pomo-panel">
      <div className="pomo-ring">
        <svg viewBox="0 0 200 200">
          <circle className="pr-bg" cx="100" cy="100" r={R} />
          <circle
            className="pr-fg"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            style={{ stroke: color, transition: 'stroke-dashoffset .5s linear, stroke .5s' }}
          />
        </svg>
        <div className="pomo-center">
          <div className="mc-pct" style={{ color }}>
            {pct}%
          </div>
          <div className="pomo-mode">
            {stats ? `${fmtGB(stats.total - stats.free)} / ${fmtGB(stats.total)} GB 已用` : '读取中…'}
          </div>
        </div>
      </div>

      <div className="ic-actions">
        <button className="btn ghost" onClick={refresh} disabled={busy}>
          刷新
        </button>
        <button className="btn primary" onClick={clean} disabled={busy}>
          {busy ? '清理中… 🫧' : '🧹 一键清理'}
        </button>
      </div>

      {result?.error && <div className="b64-err">⚠️ {result.error}</div>}
      {result && !result.error && (
        <div className="mc-result">
          ✨ {CHEERS[Math.floor(Date.now() / 60000) % CHEERS.length]}
          <br />
          释放了约 <b>{fmtMB(result.freedBytes)} MB</b> 可用内存
          {result.trimmed > 0 && <span className="mc-sub">（修剪了 {result.trimmed} 个进程的工作集）</span>}
          {result.freedBytes === 0 && <span className="mc-sub">（当前已经很干净啦）</span>}
        </div>
      )}

      <div className="ic-note">
        原理同 PCL/360 加速：调用系统 API 将各进程工作集挤出物理内存 · 每 2 秒自动刷新
      </div>
    </div>
  );
}
