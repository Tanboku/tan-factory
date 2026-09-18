export default {
  id: 'mem-clean',
  name: '内存清理',
  desc: '一键挤出各进程占用的物理内存（PCL 同款原理）',
  icon: '🧹',
  category: 'work',
  keywords: ['memory', '内存', '清理', '加速', 'ram', '优化', 'clean', '释放'],
  order: 32,
  load: () => import('./Panel.jsx'),
};
