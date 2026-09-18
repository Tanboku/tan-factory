import React, { useEffect, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;

export default function TimestampPanel() {
  const [now, setNow] = useState(Date.now());
  const [ts, setTs] = useState('');
  const [tsResult, setTsResult] = useState('');
  const [dt, setDt] = useState('');
  const [dtResult, setDtResult] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const doTs = (v) => {
    setTs(v);
    const s = v.trim();
    if (!s) return setTsResult('');
    let n = Number(s);
    if (!/^\d+$/.test(s) || isNaN(n)) return setTsResult('⚠️ 请输入纯数字时间戳');
    if (s.length > 11) n = Number(s.slice(0, 13)); // 毫秒
    const d = new Date(s.length <= 11 ? n * 1000 : n);
    if (isNaN(d.getTime())) return setTsResult('⚠️ 时间戳超出范围');
    setTsResult(fmt(d));
  };

  const doDt = (v) => {
    setDt(v);
    const s = v.trim();
    if (!s) return setDtResult('');
    // 支持 2026-01-01 10:00:00 / 2026-01-01 / 2026/01/01
    const norm = s.replace(/\//g, '-').replace(' ', 'T');
    const d = new Date(norm.length === 10 ? norm + 'T00:00:00' : norm);
    if (isNaN(d.getTime())) return setDtResult('⚠️ 无法识别该时间，试试 2026-01-01 10:00:00');
    setDtResult(`${Math.floor(d.getTime() / 1000)}（秒）\n${d.getTime()}（毫秒）`);
  };

  return (
    <div className="ts-panel">
      <div className="ts-now">
        <div className="ts-clock">{fmt(new Date(now))}</div>
        <div className="ts-nums">
          <span>秒 {Math.floor(now / 1000)}</span>
          <span>毫秒 {now}</span>
        </div>
      </div>

      <div className="ts-card">
        <div className="ts-title">时间戳 → 日期</div>
        <input
          value={ts}
          placeholder="如 1760000000"
          onChange={(e) => doTs(e.target.value)}
          spellCheck={false}
        />
        <div className="ts-result">{tsResult}</div>
        <div className="ts-quick">
          <button onClick={() => doTs(String(Math.floor(Date.now() / 1000)))}>当前秒级</button>
          <button onClick={() => doTs(String(Date.now()))}>当前毫秒级</button>
        </div>
      </div>

      <div className="ts-card">
        <div className="ts-title">日期 → 时间戳</div>
        <input
          value={dt}
          placeholder="如 2026-01-01 10:00:00"
          onChange={(e) => doDt(e.target.value)}
          spellCheck={false}
        />
        <div className="ts-result pre">{dtResult}</div>
        <div className="ts-quick">
          <button onClick={() => doDt(fmt(new Date()))}>当前时间</button>
        </div>
      </div>
    </div>
  );
}
