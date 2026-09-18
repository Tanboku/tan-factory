export default {
  id: 'watermark',
  name: '图片打水印',
  desc: '文字水印，支持平铺与九宫格定位、角度、透明度',
  icon: '🏷️',
  category: 'file',
  keywords: ['watermark', '水印', '文字', '防盗', '标记'],
  order: 11,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
