export default {
  id: 'scan-ify',
  name: '照片转扫描件',
  desc: '文档照片一键增强：黑白/灰度/彩色三种扫描风',
  icon: '📄',
  category: 'file',
  keywords: ['scan', '扫描', '文档', '增强', 'camscanner', '黑白', '清晰'],
  order: 14,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
