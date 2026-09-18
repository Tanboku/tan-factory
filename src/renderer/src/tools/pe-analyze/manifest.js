export default {
  id: 'pe-analyze',
  name: 'PE 壳检测',
  desc: '识别 EXE/DLL 加壳情况：区段熵 + 壳签名（脱壳辅助）',
  icon: '🛡️',
  category: 'sec',
  keywords: ['pe', '壳', '脱壳', 'upx', 'vmprotect', '逆向', '熵', 'exe', 'dll', '加壳'],
  order: 47,
  accepts: { files: ['.exe', '.dll', '.sys', '.scr', '.ocx'] },
  load: () => import('./Panel.jsx'),
};
