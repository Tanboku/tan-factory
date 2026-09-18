import React, { useEffect, useState } from 'react';

// 以日期为种子的确定性随机：同一天结果固定
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FORTUNES = [
  ['大吉', '万事皆宜，放手去做', 4],
  ['中吉', '稳中向好，贵人相助', 8],
  ['小吉', '小有收获，保持节奏', 12],
  ['平', '平平淡淡也是福', 10],
  ['小凶', '谨慎行事，避免冲动', 5],
  ['大凶', '宜躺平，明日再战', 3],
];
const YI = ['写代码', '摸鱼', '早睡', '喝水', '重构', '删库跑路', '点奶茶', '整理桌面', '运动', '读书', '表白', '买想要的东西', '复盘', '发呆'];
const RARITIES = [
  ['SSR', 0.02, '#ff9500', '天选之兔'],
  ['SR', 0.1, '#a06bff', '欧气满满'],
  ['R', 0.28, '#4e9cff', '稳扎稳打'],
  ['N', 0.6, '#8a8a8a', '普通但可靠'],
];
const CARDS = ['专注', '灵感', '勇气', '耐心', '好运', '财富', '健康', '人缘', '智慧', '治愈', '暴富', '_offer', '不加班', '无bug', '满分方案'];

const pickWeighted = (rnd, items, wKey) => {
  const total = items.reduce((s, x) => s + x[wKey], 0);
  let r = rnd() * total;
  for (const it of items) {
    r -= it[wKey];
    if (r <= 0) return it;
  }
  return items[items.length - 1];
};

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyDrawPanel() {
  const [state, setState] = useState(null); // {date, fortune, card, rarity, yi}
  const [flipped, setFlipped] = useState({ fortune: false, card: false });
  const [now, setNow] = useState(today());

  useEffect(() => {
    window.api.store.get('dailyDraw', null).then((v) => {
      // 兼容旧格式（fortune 为数组的 v1 数据）与损坏数据
      const ok =
        v && v.date === today() && v.fortune?.luck && Array.isArray(v.fortune.yi) && v.card?.rarity && v.card.name;
      if (ok) {
        setState(v);
        setFlipped({ fortune: true, card: true });
      } else if (v) {
        window.api.store.set('dailyDraw', null);
      }
    });
    const t = setInterval(() => setNow(today()), 30000);
    return () => clearInterval(t);
  }, []);

  // 每张牌用独立日期种子：先点哪张、点几张，结果都一致
  const roll = (mode) => {
    const fr =
      state?.date === now
        ? state.fortune
        : (() => {
            const rnd = mulberry32(hashStr(now + ':fortune'));
            return {
              luck: pickWeighted(rnd, FORTUNES, 2),
              yi: [0, 1, 2].map(() => YI[Math.floor(rnd() * YI.length)]),
            };
          })();
    const cd =
      state?.date === now
        ? state.card
        : (() => {
            const rnd = mulberry32(hashStr(now + ':card'));
            let acc = 0;
            const rp = rnd();
            const rarity = RARITIES.find(([n, p]) => (acc += p) >= rp) || RARITIES[3];
            return { rarity, name: CARDS[Math.floor(rnd() * CARDS.length)] };
          })();
    const next = { date: now, fortune: fr, card: cd };
    setState(next);
    setFlipped((f) => ({ ...f, [mode]: true }));
    window.api.store.set('dailyDraw', next);
  };

  const resetFlips = () => {
    setFlipped({ fortune: false, card: false });
    setState(null);
    window.api.store.set('dailyDraw', null);
  };

  const Card3D = ({ mode, front, back, done, onBackClick }) => (
    <div className={`dd-card ${done ? 'flipped' : ''}`} onClick={done ? undefined : onBackClick}>
      <div className="dd-inner">
        <div className="dd-face dd-back">
          <span className="dd-q">🥠</span>
          <span>点击翻牌</span>
        </div>
        <div className="dd-face dd-front">{front}</div>
      </div>
    </div>
  );

  return (
    <div className="dd-panel">
      <div className="dd-date">📅 {now} · 结果当天固定，抽前可反悔</div>

      <div className="dd-cards">
        <Card3D
          mode="fortune"
          done={flipped.fortune}
          onBackClick={() => roll('fortune')}
          front={
            state?.fortune ? (
              <div className="dd-content">
                <span className="dd-luck" style={{ color: '#f2664f' }}>
                  {state.fortune.luck[0]}
                </span>
                <span className="dd-sub">{state.fortune.luck[1]}</span>
                <span className="dd-yi">今日宜：{state.fortune.yi.filter((v, i, a) => a.indexOf(v) === i).join('、')}</span>
              </div>
            ) : null
          }
        />
        <Card3D
          mode="card"
          done={flipped.card}
          onBackClick={() => roll('card')}
          front={
            state?.card ? (
              <div className="dd-content">
                <span className="dd-rarity" style={{ color: state.card.rarity[2], textShadow: `0 0 12px ${state.card.rarity[2]}55` }}>
                  {state.card.rarity[0]}
                </span>
                <span className="dd-cardname">{state.card.name}</span>
                <span className="dd-sub">{state.card.rarity[3]}</span>
              </div>
            ) : null
          }
        />
      </div>

      {(flipped.fortune || flipped.card) && (
        <button className="dd-reset" onClick={resetFlips}>
          🔄 重抽（会覆盖今日记录）
        </button>
      )}
      <div className="ic-note">抽签与抽卡同一天结果一致 · 数据保存在本机</div>
    </div>
  );
}
