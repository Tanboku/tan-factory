export default {
  id: 'image-stitch',
  name: '图片拼接',
  desc: '多图横排/竖排长图拼接，可调间距与对齐',
  icon: '🧩',
  category: 'file',
  keywords: ['stitch', '拼接', '长图', '合并', '拼图', '横向', '纵向'],
  order: 13,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
