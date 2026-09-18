/**
 * 渲染端工具注册中心（插件系统核心）
 *
 * 新增工具三步走，零注册代码：
 *   1. 在 src/renderer/src/tools/ 下新建目录 `<tool-id>/`
 *   2. 目录内写 manifest.js（元数据 + 懒加载组件）
 *   3. 如需系统能力（读写文件/转码等），在 src/main/services/ 下
 *      新建同名 `<tool-id>.js` 导出 { id, run(action, payload) }
 *
 * import.meta.glob 自动发现所有工具目录。
 */
const modules = import.meta.glob('../tools/*/manifest.js', { eager: true });

export { CATEGORIES, categoryOf } from './categories';

export const TOOLS = Object.entries(modules)
  .map(([file, mod]) => {
    const m = mod.default;
    return {
      id: m.id,
      name: m.name,
      desc: m.desc || '',
      icon: m.icon || '🔧',
      category: m.category || 'work',
      keywords: m.keywords || [],
      accepts: m.accepts || null, // { files: ['.png', ...] } 悬浮球拖放智能匹配
      order: m.order ?? 500,
      load: m.load,
      file,
    };
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh'));

export const getTool = (id) => TOOLS.find((t) => t.id === id);

const norm = (s) => String(s || '').toLowerCase();

export function searchTools(query, category = 'all') {
  const q = norm(query).trim();
  return TOOLS.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (!q) return true;
    return (
      norm(t.name).includes(q) ||
      norm(t.desc).includes(q) ||
      t.keywords.some((k) => norm(k).includes(q)) ||
      norm(t.id).includes(q)
    );
  });
}

const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
};

/** 悬浮球拖放文件 → 匹配可处理这些文件的工具 */
export function matchToolsForFiles(paths) {
  const exts = paths.map(extOf);
  return TOOLS.filter((t) => {
    const accept = t.accepts && t.accepts.files;
    if (!accept) return false;
    const set = new Set(accept.map((a) => norm(a)));
    return exts.some((e) => set.has(e));
  });
}
