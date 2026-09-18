export default {
  id: 'image-convert',
  name: '图片格式转换',
  desc: 'PNG / JPG / WEBP / BMP 互转，可调质量与尺寸',
  icon: '🖼️',
  category: 'file',
  keywords: ['image', '图片', 'png', 'jpg', 'jpeg', 'webp', 'bmp', '转换', 'format'],
  order: 10,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.avif'] },
  load: () => import('./Panel.jsx'),
};
