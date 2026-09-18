/**
 * 工具清单（manifest）模板 —— 复制本目录即可新增一个工具
 *
 * 必填：id / name / icon / category / load
 * 可选：desc / keywords / order / accepts（悬浮球拖放智能匹配）
 */
export default {
  id: 'welcome',
  name: '使用指引',
  desc: '兔子工厂的玩法与扩展指南',
  icon: '🐰',
  category: 'work',
  keywords: ['help', '帮助', '指南', 'guide', '关于'],
  order: 999,
  load: () => import('./Panel.jsx'),
};
