export default {
  id: 'todo',
  name: '待办事项',
  desc: '轻快记录每天要做的事，自动保存',
  icon: '✅',
  category: 'work',
  keywords: ['todo', '待办', '任务', '清单', 'todolist', '提醒'],
  order: 30,
  load: () => import('./Panel.jsx'),
};
