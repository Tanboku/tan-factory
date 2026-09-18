import React, { useState } from 'react';

const cryptoInt = (maxExclusive) => {
  // 均匀分布：拒绝采样
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let v;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % maxExclusive;
};

export default function RandomPanel() {
  const [tab, setTab] = useState('int');
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(1);
  const [unique, setUnique] = useState(false);
  const [decimals, setDecimals] = useState(2);
  const [listText, setListText] = useState('小明\n小红\n小刚\n小兔');
  const [pickN, setPickN] = useState(1);
  const [diceN, setDiceN] = useState(1);
  const [result, setResult] = useState([]);
  const [history, setHistory] = useState([]);

  const push = (label, val) => {
    setResult(val);
    setHistory((h) => [{ t: Date.now(), label, val }, ...h].slice(0, 12));
  };

  const rollInt = () => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const span = hi - lo + 1;
    const n = Math.min(count, unique ? span : 999);
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 100000) {
      const v = lo + cryptoInt(span);
      if (unique && seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    push(`${lo}~${hi} 整数`, out);
  };

  const rollFloat = () => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const p = 10 ** decimals;
    const out = Array.from({ length: Math.min(count, 100) }, () =>
      (lo + (cryptoInt(0x7fffffff) / 0x7fffffff) * (hi - lo)).toFixed(decimals)
    );
    void p;
    push(`${lo}~${hi} 小数`, out);
  };

  const rollList = () => {
    const items = listText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    const n = Math.min(pickN, items.length);
    const pool = [...items];
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool.splice(cryptoInt(pool.length), 1)[0]);
    push(`列表抽取`, out);
  };

  const rollDice = () => {
    const out = Array.from({ length: Math.min(diceN, 20) }, () => cryptoInt(6) + 1);
    const sum = out.reduce((s, v) => s + v, 0);
    push(`🎲 × ${diceN}`, out.map(String).concat(`合计 ${sum}`));
  };

  const rollCoin = () => {
    push('抛硬币', [cryptoInt(2) ? '正面 🪙' : '反面 🥮']);
  };

  return (
    <div className="rnd-panel">
      <div className="seg wrap">
        {[
          ['int', '整数'],
          ['float', '小数'],
          ['list', '列表抽取'],
          ['dice', '骰子'],
          ['coin', '硬币'],
        ].map(([v, l]) => (
          <button key={v} className={`seg-btn ${tab === v ? 'on' : ''}`} onClick={() => setTab(v)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'int' && (
        <div className="rnd-controls">
          <div className="rnd-row">
            <label>最小</label>
            <input type="number" value={min} onChange={(e) => setMin(+e.target.value)} />
            <label>最大</label>
            <input type="number" value={max} onChange={(e) => setMax(+e.target.value)} />
          </div>
          <div className="rnd-row">
            <label>个数</label>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(+e.target.value)} />
            <button className={`chip ${unique ? 'on' : ''}`} onClick={() => setUnique((u) => !u)}>
              {unique ? '✓ 不重复' : '允许重复'}
            </button>
          </div>
          <button className="btn primary" onClick={rollInt}>
            🎲 生成
          </button>
        </div>
      )}

      {tab === 'float' && (
        <div className="rnd-controls">
          <div className="rnd-row">
            <label>最小</label>
            <input type="number" value={min} onChange={(e) => setMin(+e.target.value)} />
            <label>最大</label>
            <input type="number" value={max} onChange={(e) => setMax(+e.target.value)} />
          </div>
          <div className="rnd-row">
            <label>小数位</label>
            <input type="number" min={0} max={6} value={decimals} onChange={(e) => setDecimals(+e.target.value)} />
            <label>个数</label>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(+e.target.value)} />
          </div>
          <button className="btn primary" onClick={rollFloat}>
            🎲 生成
          </button>
        </div>
      )}

      {tab === 'list' && (
        <div className="rnd-controls">
          <textarea className="rnd-textarea" rows={5} value={listText} onChange={(e) => setListText(e.target.value)} placeholder="每行一项" />
          <div className="rnd-row">
            <label>抽几项</label>
            <input type="number" min={1} value={pickN} onChange={(e) => setPickN(+e.target.value)} />
          </div>
          <button className="btn primary" onClick={rollList}>
            🎯 抽取
          </button>
        </div>
      )}

      {tab === 'dice' && (
        <div className="rnd-controls">
          <div className="rnd-row">
            <label>骰子数</label>
            <input type="number" min={1} max={20} value={diceN} onChange={(e) => setDiceN(+e.target.value)} />
          </div>
          <button className="btn primary" onClick={rollDice}>
            🎲 掷骰子
          </button>
        </div>
      )}

      {tab === 'coin' && (
        <div className="rnd-controls">
          <button className="btn primary" onClick={rollCoin}>
            🪙 抛硬币
          </button>
        </div>
      )}

      {result.length > 0 && (
        <div className="rnd-result">
          {result.map((v, i) => (
            <span key={i} className="rnd-ball">
              {v}
            </span>
          ))}
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(result.join(', '))}>
            复制
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="rnd-history">
          <div className="ts-title">历史</div>
          {history.map((h, i) => (
            <div key={i} className="rnd-hist-item" onClick={() => push(h.label, h.val)}>
              <span className="rnd-hist-label">{h.label}</span>
              <span className="rnd-hist-val">{h.val.join('、')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
