import React from 'react';

const items = [
  { icon: '👆', title: '单击兔子', desc: '打开 / 收起工具面板' },
  { icon: '✋', title: '拖拽兔子', desc: '移动位置，松手自动记忆' },
  { icon: '📥', title: '投喂文件', desc: '把文件拖到兔子身上，自动匹配能处理的工具' },
  { icon: '⌨️', title: 'Alt + Space', desc: '任何界面一键唤起工具面板' },
  { icon: '🖱️', title: '右键兔子', desc: '快捷菜单与退出' },
];

export default function WelcomePanel() {
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <span className="welcome-face">🐰</span>
        <div>
          <h2>兔子工厂</h2>
          <p>一只能在桌面上养着的办公工具箱</p>
        </div>
      </div>

      <div className="welcome-grid">
        {items.map((it) => (
          <div className="welcome-item" key={it.title}>
            <span className="wi-icon">{it.icon}</span>
            <div>
              <div className="wi-title">{it.title}</div>
              <div className="wi-desc">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="welcome-dev">
        <div className="wd-title">🧩 想加新工具？</div>
        <p>
          每个工具都是 <code>src/renderer/src/tools/&lt;工具id&gt;/</code> 下的一个目录：
          写一个 <code>manifest.js</code>（名称 / 图标 / 分类 / 关键字）加一个
          <code>Panel.jsx</code>（界面），即刻出现在面板里。
          需要文件读写等系统能力时，在 <code>src/main/services/&lt;工具id&gt;.js</code>
          实现后端并通过 <code>window.api.tool.run(id, action, payload)</code> 调用。
        </p>
        <p className="wd-tip">
          复制 <code>tools/welcome/</code> 目录改名即可起步；完整规范见
          <code>docs/工具开发规范.md</code>（字段定义 / API / 样式 / 自动化验证）。
        </p>
      </div>
    </div>
  );
}
