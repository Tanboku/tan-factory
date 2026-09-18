export default {
  id: 'mirage-tank',
  name: '幻影坦克',
  desc: '生成黑白底显示不同图的幻影/光影坦克，可解码还原',
  icon: '🪄',
  category: 'fun',
  keywords: ['mirage', '幻影坦克', '光影坦克', '坦克', '隐藏图', '表图', '里图', '透明'],
  order: 50,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
