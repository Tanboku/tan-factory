export default {
  id: 'zip-pass',
  name: 'ZIP 密码恢复',
  desc: '字典/常见密码/掩码暴力找回 ZIP 密码（仅限自己的文件）',
  icon: '🔓',
  category: 'sec',
  keywords: ['zip', '密码', '破解', '暴力', '字典', '忘记密码', '恢复', 'brute'],
  order: 46,
  accepts: { files: ['.zip'] },
  load: () => import('./Panel.jsx'),
};
