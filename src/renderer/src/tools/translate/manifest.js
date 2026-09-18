export default {
  id: 'translate',
  name: '文本翻译',
  desc: '中英日韩法德俄西互译，自动分段长文',
  icon: '🌐',
  category: 'work',
  keywords: ['translate', '翻译', '中文', '英文', '日语', '韩语', '英语', '语言'],
  order: 31,
  load: () => import('./Panel.jsx'),
};
