export default {
  id: 'pomodoro',
  name: '番茄钟',
  desc: '25 分钟专注 + 5 分钟休息，兔子和一起专注',
  icon: '🍅',
  category: 'work',
  keywords: ['pomodoro', '番茄', '专注', '计时', 'timer', '效率'],
  order: 42,
  load: () => import('./Panel.jsx'),
};
