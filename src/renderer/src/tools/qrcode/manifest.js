export default {
  id: 'qrcode',
  name: '二维码生成',
  desc: '输入文本或链接，生成可保存的二维码',
  icon: '📱',
  category: 'dev',
  keywords: ['qrcode', '二维码', '扫码', '链接', 'url'],
  order: 43,
  load: () => import('./Panel.jsx'),
};
