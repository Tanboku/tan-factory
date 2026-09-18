export default {
  id: 'gif-maker',
  name: 'GIF 制作',
  desc: '多张图片合成动图，可调帧延迟/循环/尺寸',
  icon: '🎞️',
  category: 'media',
  keywords: ['gif', '动图', '动画', '帧', '表情包', '循环'],
  order: 16,
  accepts: { files: ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  load: () => import('./Panel.jsx'),
};
