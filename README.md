# 🐰 兔子工厂 · Rabbit Factory

一只能在桌面上「养着」的办公工具箱：启动后是一只兔子脸悬浮球，单击展开工具面板，拖拽移动、投喂文件智能匹配工具，`Alt+Space` 全局唤起。

## 📥 下载渠道

| 渠道 | 说明 |
| --- | --- |
| **GitHub Releases**（推荐） | 推送 `v*` 标签后由 Actions 自动构建并发布安装版/便携版 exe：[Releases 页面](https://github.com/Tanboku/tan-factory/releases) |
| **手动触发构建** | 仓库 Actions → `Build & Release Windows EXE` → Run workflow（产物同时上传为 Artifact） |
| **本地自行打包** | 见下方命令（`.npmrc` 已配置 npmmirror 镜像，国内网络可直连安装依赖与 Electron 二进制） |

## 常用命令

```bash
npm install        # 安装依赖（.npmrc 已配置国内镜像）
npm start          # 构建渲染层并启动应用
npm run verify     # 自动化视觉/DOM/功能自检（截图输出到 .verify/）
npm run dist       # 打包 Windows exe（release/ 目录）
```

## 内置工具（24 个）

| 工具 | 分类 | 说明 |
| --- | --- | --- |
| 🖼️ 图片格式转换 | 文件 | PNG/JPG/WEBP/BMP 互转，质量与缩放 |
| 🏷️ 图片打水印 | 文件 | 文字水印：平铺/九宫格、角度、透明度、实时预览 |
| 🗜️ 图片压缩 | 文件 | 批量瘦身，WebP/JPG/智能格式，显示压缩率 |
| 🧩 图片拼接 | 文件 | 横排/竖排长图，对齐、间距、顺序调整 |
| 📄 照片转扫描件 | 文件 | 黑白文档/灰度增强/彩色增强，自动色阶 |
| 🔍 图片识图 OCR | 文件 | 中英混合识别（tesseract WASM，首次联网下语言包） |
| 🎵 音频格式转换 | 媒体 | MP3/WAV/FLAC/OGG/AAC/M4A/OPUS（ffmpeg） |
| 🎞️ GIF 制作 | 媒体 | 多图合成动图，帧延迟/循环/尺寸，实时预览 |
| ✅ 待办事项 | 效率 | 自动保存，跨会话持久化 |
| 🍅 番茄钟 | 效率 | 25+5 分钟循环，系统通知 |
| 🧹 内存清理 | 效率 | PCL 同款原理：挤出各进程工作集，一键释放物理内存 |
| 📖 摸鱼阅读器 | 效率 | 透明悬浮看书（txt/md/html/epub/docx），F9 一键隐身 |
| 🌐 文本翻译 | 效率 | 中英日韩法德俄西互译，长文自动分段 |
| 🎨 颜色转换 | 开发 | HEX/RGB/HSL 互转，一键复制 |
| ⏱️ 时间戳转换 | 开发 | 秒/毫秒与日期时间互转 |
| 📱 二维码生成 | 开发 | 文本/链接实时生成，导出 PNG |
| 🔗 Base64 解码 | 开发 | 解码并自动识别网盘/磁力链接，一键打开 |
| 🪄 幻影坦克 | 趣味 | 经典/彩色/光影坦克生成 + 解码还原 |
| 🥠 每日抽签 | 趣味 | 运势抽签 + SSR 抽卡，当日结果固定 |
| 🎲 随机数生成器 | 趣味 | 整数/小数/列表抽取/骰子/硬币，含历史 |
| 🔐 SM4/SM3 加密 | 安全 | 国密 SM4 加解密（ECB/CBC）与 SM3 哈希 |
| 🔓 ZIP 密码恢复 | 安全 | 字典/常见密码/掩码暴力（ZipCrypto + AES，仅限自有文件） |
| 🛡️ PE 壳检测 | 安全 | 区段熵 + 壳签名识别（UPX/VMProtect 等，脱壳辅助） |
| 🐰 使用指引 | 效率 | 玩法与扩展指南 |

## 交互

- **单击兔子**：打开/收起工具面板
- **拖拽兔子**：移动位置（自动记忆）
- **投喂文件**：把文件拖到兔子身上 → 自动匹配能处理它的工具
- **右键兔子**：快捷菜单 / 隐藏兔子（托盘常驻）
- **系统托盘**：兔子隐藏后在右下角托盘区（可能收进隐藏图标），左键开面板，右键菜单恢复兔子/退出
- **📌 固定面板**：面板标题栏图钉，固定后失焦不自动收起（去资源管理器选文件再拖入时必备）
- **Alt + Space**：全局唤起
- **F9**：摸鱼阅读器 Boss 键（一键隐身/恢复，进度不丢）
- **Esc**：返回 / 关闭面板

## 🧩 新增一个工具（零注册代码）

> 📋 完整开发规范见 **[docs/工具开发规范.md](docs/工具开发规范.md)** —— 字段定义、API 一览、样式约定、自动化验证协议与提交检查清单。

1. 新建 `src/renderer/src/tools/<工具id>/manifest.js`：

```js
export default {
  id: 'my-tool',
  name: '我的工具',
  desc: '一句话描述',
  icon: '🔧',
  category: 'work',            // file | media | work | dev
  keywords: ['关键词'],
  // accepts: { files: ['.png'] },  // 可选：声明后悬浮球投喂会智能匹配
  load: () => import('./Panel.jsx'),
};
```

2. 同目录写 `Panel.jsx`（默认导出 React 组件，可接收 `files` 属性）。

3. 需要系统能力（读写文件、转码…）时，在 `src/main/services/<工具id>.js` 导出：

```js
module.exports = {
  id: 'my-tool',
  async run(action, payload) {
    // 渲染端调用：window.api.tool.run('my-tool', action, payload)
  },
};
```

完成——面板自动发现新工具，每个工具独立代码分包。

## 架构

```
src/
  main/            # Electron 主进程
    index.js       # 入口：单实例、全局快捷键
    window-manager # 悬浮球窗 + 面板窗生命周期、拖拽、投喂、验证
    ipc.js         # 统一 IPC（tool:run / store / dialog…）
    services/      # 主进程服务，按文件自动扫描注册
  preload/index.js # contextBridge 安全桥
  renderer/
    src/
      core/registry.js    # 渲染端工具注册中心（import.meta.glob 自动发现）
      windows/            # BallApp（悬浮球）/ PanelApp（工具面板）
      components/         # RabbitFace（SVG 兔子 + CSS 动画）
      tools/              # ★ 每个工具一个目录（manifest + Panel）
```

## 技术栈

Electron 37 · Vite 6 · React 18 · ffmpeg-static · electron-builder
