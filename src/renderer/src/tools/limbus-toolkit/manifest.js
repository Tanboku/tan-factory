export default {
  id: 'limbus-toolkit',
  name: '边狱巴士工具箱',
  desc: 'Limbus Company 常用工具与 Wiki 导航合集',
  icon: '🚌',
  category: 'game',
  keywords: ['limbus', '边狱巴士', '巴士', 'lc', 'butler', '月 World', '脑叶', 'wiki', '攻略', '游戏'],
  order: 70,
  load: () => import('./Panel.jsx'),
};
