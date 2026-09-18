export default {
  id: 'random',
  name: '随机数生成器',
  desc: '范围随机 / 小数 / 列表抽签 / 骰子硬币，含历史',
  icon: '🎲',
  category: 'fun',
  keywords: ['random', '随机', '骰子', '硬币', '抽奖', '范围', '生成器'],
  order: 61,
  load: () => import('./Panel.jsx'),
};
