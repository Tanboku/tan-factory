export default {
  id: 'timestamp',
  name: '时间戳转换',
  desc: 'Unix 时间戳与日期时间互转，实时时钟',
  icon: '⏱️',
  category: 'dev',
  keywords: ['timestamp', '时间戳', 'unix', '时间', 'date', '毫秒', '秒'],
  order: 41,
  load: () => import('./Panel.jsx'),
};
