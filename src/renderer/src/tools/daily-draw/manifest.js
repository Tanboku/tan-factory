export default {
  id: 'daily-draw',
  name: '每日抽签',
  desc: '每天一次运势抽签 + SSR 抽卡，结果当天固定',
  icon: '🥠',
  category: 'fun',
  keywords: ['draw', '抽签', '运势', '抽卡', 'ssr', '占卜', '每日', '幸运'],
  order: 60,
  load: () => import('./Panel.jsx'),
};
