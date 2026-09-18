// 工具分类定义：新增分类只需在此追加一项
export const CATEGORIES = [
  { id: 'file', name: '文件', hue: '#4E9CFF', soft: '#EAF3FF' },
  { id: 'media', name: '媒体', hue: '#F0699B', soft: '#FDEBF3' },
  { id: 'work', name: '效率', hue: '#3FB56E', soft: '#E8F7EE' },
  { id: 'dev', name: '开发', hue: '#8E7CF5', soft: '#F0EDFE' },
  { id: 'fun', name: '趣味', hue: '#FFA928', soft: '#FFF3DC' },
  { id: 'sec', name: '安全', hue: '#E5484D', soft: '#FDEBEC' },
];

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
