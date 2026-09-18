export default {
  id: 'ocr',
  name: '图片识图 OCR',
  desc: '识别图片中的中英文文字（首次使用下载语言包）',
  icon: '🔍',
  category: 'file',
  keywords: ['ocr', '识图', '文字识别', '图片转文字', '识别', '中英文'],
  order: 15,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
