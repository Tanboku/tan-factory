export default {
  id: 'image-compress',
  name: '图片压缩',
  desc: '调质量/限尺寸，批量瘦身并显示压缩率',
  icon: '🗜️',
  category: 'file',
  keywords: ['compress', '压缩', '瘦身', '减小', 'webp', '质量', '批量'],
  order: 12,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.avif'] },
  load: () => import('./Panel.jsx'),
};
