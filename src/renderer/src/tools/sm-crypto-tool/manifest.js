export default {
  id: 'sm-crypto-tool',
  name: 'SM4/SM3 加密',
  desc: '国密 SM4 加解密（ECB/CBC）与 SM3 哈希',
  icon: '🔐',
  category: 'sec',
  keywords: ['sm4', 'sm3', '国密', '加密', '解密', '哈希', 'hash', '密码'],
  order: 45,
  load: () => import('./Panel.jsx'),
};
