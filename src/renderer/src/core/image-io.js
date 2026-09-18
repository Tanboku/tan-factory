/**
 * 画布类工具共享 IO：读文件→Image、canvas→写文件
 * 底层复用 image-convert 服务的 readFile / writeFile 动作
 */
export const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.avif'];

export const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
};
export const nameOf = (p) => p.split(/[\\/]/).pop();
export const baseName = (p) => nameOf(p).replace(/\.[^.]+$/, '');
export const dirOf = (p) => {
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return i > 0 ? p.slice(0, i) : '.';
};

export async function loadImage(path) {
  const res = await window.api.tool.run('image-convert', 'readFile', { path });
  if (!res.ok) throw new Error(res.error);
  const mime = extOf(path) === '.jpg' ? 'jpeg' : extOf(path).slice(1);
  const url = `data:image/${mime};base64,${res.data}`;
  return await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('图片解码失败'));
    el.src = url;
  });
}

export function canvasOf(img, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w ?? img.naturalWidth));
  canvas.height = Math.max(1, Math.round(h ?? img.naturalHeight));
  return canvas;
}

export async function saveCanvas(canvas, dir, name, fmt = 'png', quality = 0.92) {
  const mime = fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`;
  const dataURL = canvas.toDataURL(mime, quality);
  const res = await window.api.tool.run('image-convert', 'writeFile', {
    dir,
    name,
    base64: dataURL.split(',')[1],
  });
  if (!res.ok) throw new Error(res.error);
  return res.data; // 输出绝对路径
}

/** 输出命名：默认同目录，同名冲突自动加后缀 */
export function outPathOf(srcPath, suffix, ext) {
  const dir = dirOf(srcPath);
  const ext2 = ext || extOf(srcPath).slice(1) || 'png';
  return { dir, name: `${baseName(srcPath)}${suffix}.${ext2}` };
}
