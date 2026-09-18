export default {
  id: 'color-convert',
  name: '颜色转换',
  desc: 'HEX / RGB / HSL 互转，一键复制',
  icon: '🎨',
  category: 'dev',
  keywords: ['color', '颜色', 'hex', 'rgb', 'hsl', '调色', '设计'],
  order: 40,
  load: () => import('./Panel.jsx'),
};
