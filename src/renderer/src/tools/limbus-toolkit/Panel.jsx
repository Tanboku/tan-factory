import React, { useState } from 'react';

const GROUPS = [
  {
    title: '📚 Wiki 攻略',
    items: [
      { name: 'HuijiWiki 中文维基（首推中文玩家）', url: 'https://limbuscompany.huijiwiki.com/wiki/%E9%A6%96%E9%A1%B5', desc: '中文资料：人格/EGO/关卡/活动，社区维护' },
      { name: 'Limbus Company Wiki (wiki.gg)', url: 'https://limbuscompany.wiki.gg/', desc: '英文 Wiki：数据最全、更新快' },
      { name: 'Prydwen 攻略站', url: 'https://www.prydwen.gg/limbus-company', desc: '人格强度榜（Tier List）/构筑攻略' },
      { name: 'Fandom Wiki', url: 'https://limbuscompany.fandom.com/wiki/Limbus_Company_Wiki', desc: '老牌英文 Wiki' },
    ],
  },
  {
    title: '🧮 实用工具',
    items: [
      { name: 'Mirror Dungeon 路线速查（Steam 指南）', url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3526253064', desc: '镜牢无限模式速查表' },
      { name: 'E.G.O Gift 融合表（wiki.gg）', url: 'https://limbuscompany.wiki.gg/wiki/List_of_E.G.O_Gifts/Fusion', desc: '镜牢 Gifts 合成公式' },
      { name: 'Mirror Dungeon Bot（挂机刷图）', url: 'https://github.com/AlexWalp/Mirror-Dungeon-Bot', desc: 'GitHub 开源自动刷镜牢（自担风险）' },
      { name: 'Steam 社区指南（新手向）', url: 'https://steamcommunity.com/app/1973530/guides/', desc: '官方创意工坊攻略合集' },
    ],
  },
  {
    title: '🌐 官方渠道',
    items: [
      { name: 'Limbus Company 官网', url: 'https://limbuscompany.com/', desc: '官方信息与下载' },
      { name: 'Project Moon 官方', url: 'https://www.projectmoon.studio/', desc: '开发商官网' },
      { name: '官方 X (Twitter)', url: 'https://twitter.com/LimbusCompany_B', desc: '版本更新/维护公告' },
      { name: '官方 Discord', url: 'https://discord.gg/limbuscompany', desc: '官方社区' },
    ],
  },
];

const TIPS = [
  ['🧭', '每周镜牢（Mirror Dungeon）与定时领奖别忘清'],
  ['⚔️', '人格强度参考 Prydwen Tier List，但阵容联动更重要'],
  ['💎', '碎片换人格优先补队伍短板属性（愤怒/色欲/怠惰…）'],
];

export default function LimbusToolkitPanel() {
  const [q, setQ] = useState('');
  const norm = (s) => (s || '').toLowerCase();
  const match = (it) => !q.trim() || norm(it.name).includes(norm(q)) || norm(it.desc).includes(norm(q));

  return (
    <div className="gm-panel">
      <div className="gm-hero">
        <span className="gm-logo">🚌</span>
        <div>
          <div className="gm-title">边狱巴士 · 工具箱</div>
          <div className="gm-sub">Limbus Company 工具与 Wiki 导航 · 点击在外部浏览器打开</div>
        </div>
        <input className="gm-search" placeholder="筛选…" value={q} onChange={(e) => setQ(e.target.value)} spellCheck={false} />
      </div>

      {GROUPS.map((g) => {
        const items = g.items.filter(match);
        if (!items.length) return null;
        return (
          <div key={g.title} className="gm-group">
            <div className="gm-group-title">{g.title}</div>
            <div className="gm-links">
              {items.map((it) => (
                <button key={it.url} className="gm-link" onClick={() => window.api.shell.openExternal(it.url)} title={it.url}>
                  <span className="gm-link-name">{it.name}</span>
                  <span className="gm-link-desc">{it.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="gm-tips">
        {TIPS.map(([icon, text]) => (
          <div key={text} className="gm-tip">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="ic-note">所有链接均在系统默认浏览器打开 · 想加别的游戏工具箱？复制 tools/limbus-toolkit 目录改造即可</div>
    </div>
  );
}
