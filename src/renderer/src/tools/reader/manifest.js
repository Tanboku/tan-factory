export default {
  id: 'reader',
  name: '摸鱼阅读器',
  desc: '透明悬浮看书：txt/md/html/epub/docx，F9 一键隐身',
  icon: '📖',
  category: 'work',
  keywords: ['reader', '阅读', '小说', '摸鱼', '看书', 'epub', 'txt', '书架', 'boss'],
  order: 33,
  accepts: { files: ['.txt', '.md', '.markdown', '.html', '.htm', '.xhtml', '.epub', '.docx'] },
  load: () => import('./Panel.jsx'),
};
