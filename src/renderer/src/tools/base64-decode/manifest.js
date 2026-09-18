export default {
  id: 'base64-decode',
  name: 'Base64 解码',
  desc: '解码文本并自动识别网盘/磁力等链接，一键打开',
  icon: '🔗',
  category: 'dev',
  keywords: ['base64', '解码', '编码', '链接', '磁力', 'magnet', '网盘', 'ed2k', 'thunder'],
  order: 44,
  load: () => import('./Panel.jsx'),
};
