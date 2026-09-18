'use strict';

const { BrowserWindow, screen, Menu, app, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { storeGet, storeSet } = require('./services/store');

const ROOT = path.join(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'dist-renderer', 'index.html');

const BALL_W = 110;
const BALL_H = 124;
const PANEL_W = 480;
const PANEL_H = 680;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class WindowManager {
  constructor() {
    this.ball = null;
    this.panel = null;
    this.tray = null;
    this._dragOrigin = null; // { winX, winY, cursorX, cursorY }
    this._panelPayload = null;
    this._panelBusy = false; // 打开系统对话框时不因失焦隐藏面板
    this._report = []; // verify 结果同时落盘（Windows 下 stdout 可能被吞）
  }

  log(...args) {
    console.log(...args);
    this._report.push(args.map(String).join(' '));
  }

  _flushReport() {
    try {
      fs.mkdirSync(path.join(process.cwd(), '.verify'), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), '.verify', 'report.json'), JSON.stringify(this._report, null, 1));
    } catch {
      /* ignore */
    }
  }

  createAll() {
    this.createBall();
    this.createPanel();
    this.createReader();
    this.createTray();
  }

  /** 摸鱼阅读器窗口：透明、置顶、常驻（失焦不隐藏），F9 一键隐身 */
  createReader() {
    this.reader = new BrowserWindow({
      width: 480,
      height: 340,
      show: false,
      transparent: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: this._preload(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    this.reader.setAlwaysOnTop(true, 'screen-saver', 2); // 悬浮球与面板之上
    this.reader.loadFile(INDEX, { search: '?win=reader' });
    this.reader.on('closed', () => (this.reader = null));
  }

  showReader(bookId) {
    if (!this.reader) this.createReader();
    if (bookId) {
      this._readerBookId = bookId;
      if (!this.reader.webContents.isLoading()) {
        this.reader.webContents.send('reader:book', bookId);
      }
    }
    const wa = screen.getPrimaryDisplay().workArea;
    const b = this.reader.getBounds();
    this.reader.setPosition(Math.min(wa.x + 80, wa.x + wa.width - b.width - 40), wa.y + 60, false);
    this.reader.show();
    this.reader.focus();
  }

  hideReader() {
    if (this.reader && this.reader.isVisible()) this.reader.hide();
  }

  toggleReader() {
    if (!this.reader) return;
    if (this.reader.isVisible()) this.hideReader();
    else this.showReader();
  }

  resizeReader(w, h) {
    if (!this.reader) return;
    // 透明无边框窗上 setSize 高度偶发不生效，用 setBounds 显式指定位置尺寸
    const [x, y] = this.reader.getPosition();
    this.reader.setBounds({
      x,
      y,
      width: Math.max(240, Math.min(1000, Math.round(w))),
      height: Math.max(40, Math.min(900, Math.round(h))),
    });
  }

  /** 显示设置实时推送到阅读窗 */
  sendReaderSettings(s) {
    if (this.reader && !this.reader.webContents.isLoading()) {
      this.reader.webContents.send('reader:settings', s);
    }
  }

  consumeReaderBook() {
    const id = this._readerBookId;
    this._readerBookId = null;
    return id;
  }

  /** 系统托盘（右下角隐藏图标区）：隐藏兔子后的入口 */
  createTray() {
    const iconPath = path.join(ROOT, 'build', 'icon.png');
    let image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) image = nativeImage.createEmpty();
    image = image.resize({ width: 16, height: 16 });
    this.tray = new Tray(image);
    this._updateTray();
    this.tray.on('click', () => this.togglePanel());
    this.tray.on('right-click', () => this.tray?.popUpContextMenu());
  }

  _updateTray() {
    if (!this.tray) return;
    const ballHidden = this.ball && !this.ball.isVisible();
    this.tray.setToolTip(
      `兔子工厂 · ${ballHidden ? '兔子已隐藏' : '兔子在桌面上'} · Alt+Space 唤起面板`
    );
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: ballHidden ? '🐰 显示兔子' : '🐰 隐藏兔子（保留托盘）', click: () => this.toggleBall() },
        { label: '🧰 打开工具面板', click: () => this.showPanel() },
        { type: 'separator' },
        { label: '退出兔子工厂', click: () => app.quit() },
      ])
    );
  }

  toggleBall() {
    if (!this.ball) return;
    if (this.ball.isVisible()) this.ball.hide();
    else this.ball.show();
    this._updateTray();
  }

  _preload() {
    return path.join(__dirname, '..', 'preload', 'index.js');
  }

  createBall() {
    const wa = screen.getPrimaryDisplay().workArea;
    const saved = storeGet('ballPos', null);
    const x = saved && this._inWorkArea(saved, wa) ? saved.x : wa.x + wa.width - BALL_W - 48;
    const y = saved && this._inWorkArea(saved, wa) ? saved.y : wa.y + 90;

    this.ball = new BrowserWindow({
      width: BALL_W,
      height: BALL_H,
      x,
      y,
      transparent: true,
      frame: false,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      focusable: false,
      acceptFirstMouse: true,
      webPreferences: {
        preload: this._preload(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    this.ball.setAlwaysOnTop(true, 'screen-saver');
    this.ball.loadFile(INDEX, { search: '?win=ball' });
    this.ball.on('closed', () => (this.ball = null));
  }

  _inWorkArea(pos, wa) {
    return (
      pos.x >= wa.x && pos.y >= wa.y &&
      pos.x + BALL_W <= wa.x + wa.width &&
      pos.y + BALL_H <= wa.y + wa.height
    );
  }

  createPanel() {
    this.panel = new BrowserWindow({
      width: PANEL_W,
      height: PANEL_H,
      show: false,
      transparent: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: this._preload(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    // z 序高于悬浮球（同为 screen-saver 层，优先级 +1），避免球遮挡面板内容抢点击
    this.panel.setAlwaysOnTop(true, 'screen-saver', 1);
    this.panel.loadFile(INDEX, { search: '?win=panel' });
    this.panel.on('blur', () => {
      // 弹系统对话框期间、面板被固定（📌）时不自动隐藏
      const pinned = storeGet('panelPinned', false);
      if (!this._panelBusy && !pinned && !process.env.VERIFY) this.hidePanel();
    });
    this.panel.on('closed', () => (this.panel = null));
    return this.panel;
  }

  // ---------- 面板 ----------
  togglePanel() {
    if (this.panel && this.panel.isVisible()) this.hidePanel();
    else this.showPanel();
  }

  showPanel(payload) {
    if (!this.panel) return;
    if (payload) {
      this._panelPayload = payload;
      // 面板已加载时实时推送（面板开着时再投喂文件的场景）；未加载则挂载时经 getPayload 消费
      if (!this.panel.webContents.isLoading()) {
        this.panel.webContents.send('panel:payload', payload);
      }
    }
    const b = this.ball.getBounds();
    const display = screen.getDisplayMatching(b);
    const wa = display.workArea;

    let x = Math.round(b.x + b.width / 2 - PANEL_W / 2);
    let y = b.y + b.height + 14;
    if (y + PANEL_H > wa.y + wa.height) y = b.y - PANEL_H - 14;
    x = Math.min(Math.max(x, wa.x + 8), wa.x + wa.width - PANEL_W - 8);
    y = Math.min(Math.max(y, wa.y + 8), wa.y + wa.height - PANEL_H - 8);

    this.panel.setPosition(x, y, false);
    this.panel.show();
    this.panel.focus();
  }

  hidePanel() {
    if (this.panel && this.panel.isVisible()) this.panel.hide();
  }

  consumePayload() {
    const p = this._panelPayload;
    this._panelPayload = null;
    return p;
  }

  // ---------- 悬浮球拖拽 ----------
  dragStart() {
    if (!this.ball) return;
    const pos = this.ball.getPosition();
    const cur = screen.getCursorScreenPoint();
    this._dragOrigin = { winX: pos[0], winY: pos[1], cursorX: cur.x, cursorY: cur.y };
  }

  dragMove() {
    if (!this.ball || !this._dragOrigin) return;
    const cur = screen.getCursorScreenPoint();
    let x = this._dragOrigin.winX + (cur.x - this._dragOrigin.cursorX);
    let y = this._dragOrigin.winY + (cur.y - this._dragOrigin.cursorY);
    const wa = screen.getDisplayNearestPoint(cur).workArea;
    x = Math.min(Math.max(x, wa.x + 2), wa.x + wa.width - BALL_W - 2);
    y = Math.min(Math.max(y, wa.y + 2), wa.y + wa.height - BALL_H - 2);
    this.ball.setPosition(Math.round(x), Math.round(y), false);
  }

  dragEnd() {
    if (!this.ball) return;
    const pos = this.ball.getPosition();
    storeSet('ballPos', { x: pos[0], y: pos[1] });
    this._dragOrigin = null;
  }

  popupBallMenu() {
    const menu = Menu.buildFromTemplate([
      { label: '🐰 打开工具面板', click: () => this.showPanel() },
      { label: '⌨️ 快捷键：Alt + Space', enabled: false },
      { type: 'separator' },
      { label: '🙈 隐藏兔子（托盘常驻）', click: () => this.toggleBall() },
      { label: '退出兔子工厂', click: () => app.quit() },
    ]);
    menu.popup({ window: this.ball });
  }

  // ---------- 视觉验证（Loop 自检用） ----------
  waitReady() {
    return new Promise((resolve) => {
      let ballOk = false;
      let panelOk = false;
      const done = () => ballOk && panelOk && resolve();
      const t = setTimeout(resolve, 8000); // 兜底超时
      this.ball.once('did-finish-load', () => { ballOk = true; done(); });
      this.panel.once('did-finish-load', () => { panelOk = true; done(); });
      resolve._t = t;
    });
  }

  async capture(win, name) {
    const dir = path.join(process.cwd(), '.verify');
    fs.mkdirSync(dir, { recursive: true });
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(dir, name), img.toPNG());
  }

  async runVerify() {
    const tool = process.env.VERIFY_TOOL;
    const pose = process.env.VERIFY_POSE;
    try {
      await this.waitReady();
      await sleep(700);
      if (process.env.VERIFY_FUNC) {
        this.panel.webContents.on('console-message', (_e, _l, msg) => console.log('[panel-console]', msg));
      }

      if (pose) {
        await this.ball.webContents.executeJavaScript(
          `window.__setPose && window.__setPose(${JSON.stringify(pose)})`
        );
        await sleep(500);
        await this.capture(this.ball, '01b-ball-pose.png');
        await this.ball.webContents.executeJavaScript(`window.__setPose && window.__setPose(null)`);
        await sleep(200);
      }
      await this.capture(this.ball, '01-ball.png');

      if (process.env.VERIFY_DOM) {
        const { assertions } = require('./verify-dom');
        this.log('[verify:dom:ball]', JSON.stringify(await this._assert(this.ball, assertions.ball)));
      }

      this.showPanel();
      await sleep(1400);
      await this.capture(this.panel, '02-panel-home.png');

      if (process.env.VERIFY_DOM) {
        const { assertions } = require('./verify-dom');
        this.log('[verify:dom:panel]', JSON.stringify(await this._assert(this.panel, assertions.panelHome)));
      }

      // 真实点击测试：模拟系统级鼠标事件点工具卡片（复现"点卡片没反应"类反馈）
      if (process.env.VERIFY_CLICK) {
        const label = process.env.VERIFY_CLICK;
        const pos = await this.panel.webContents.executeJavaScript(`(()=>{
          const c=[...document.querySelectorAll('.tool-card')].find(c=>c.textContent.includes(${JSON.stringify(label)}));
          if(!c) return null; c.scrollIntoView({block:'center'});
          const r=c.getBoundingClientRect();
          return [Math.round(r.x+r.width/2), Math.round(r.y+r.height/2)];
        })()`);
        if (pos) {
          this.panel.webContents.sendInputEvent({ type: 'mouseMove', x: pos[0], y: pos[1] });
          this.panel.webContents.sendInputEvent({ type: 'mouseDown', x: pos[0], y: pos[1], button: 'left', clickCount: 1 });
          this.panel.webContents.sendInputEvent({ type: 'mouseUp', x: pos[0], y: pos[1], button: 'left', clickCount: 1 });
          await sleep(900);
          const opened = await this.panel.webContents.executeJavaScript(
            `document.querySelector('.tool-view .tool-title')?.textContent || 'NOT_OPENED'`
          );
          this.log('[verify:click:' + label + ']', JSON.stringify({ pos, opened }));
        } else {
          this.log('[verify:click:' + label + ']', 'CARD_NOT_FOUND');
        }
      }

      // 投喂场景：面板开着时投喂图片 → 应实时切换到匹配选择视图
      if (process.env.VERIFY_PICK) {
        await this.panel.webContents.executeJavaScript(
          `window.api.ball.dropFiles([${JSON.stringify(process.env.VERIFY_PICK)}])`
        );
        await sleep(700);
        const pick = await this.panel.webContents.executeJavaScript(
          `!!document.querySelector('.pick-view') + '|' + document.querySelectorAll('.pick-view .tool-card').length`
        );
        this.log('[verify:pick]', pick);
        await this.capture(this.panel, '04-panel-pick.png');
      }

      if (tool) {
        const files = process.env.VERIFY_FILES ? process.env.VERIFY_FILES.split('|') : [];
        for (const t of tool.split(',')) {
          await this.panel.webContents.executeJavaScript(
            `window.__openTool && window.__openTool(${JSON.stringify(t)}, ${JSON.stringify(files)})`
          );
          await sleep(1100);
          await this.capture(this.panel, `03-tool-${t}.png`);
          if (process.env.VERIFY_DOM) {
            this.log('[verify:layout:' + t + ']', JSON.stringify(await this._layoutAudit(this.panel)));
          }

          // 端到端功能测试：点主按钮 → 读取状态行
          if (process.env.VERIFY_FUNC) {
            if (process.env.VERIFY_EXPR) {
              await this.panel.webContents.executeJavaScript(process.env.VERIFY_EXPR);
              await sleep(300);
            }
            const dbg = await this.panel.webContents.executeJavaScript(
              `(() => ({ body: document.querySelector('.tool-body')?.innerText?.slice(0,200) || 'NO BODY', btn: !!document.querySelector('.btn.primary'), probe: window.__fetchTest || null }))()`
            );
            this.log('[verify:func:debug]', JSON.stringify(dbg));
            const clicked = await this.panel.webContents.executeJavaScript(
              `(() => { const b = document.querySelector('.btn.primary'); if (b) { b.click(); return true } return false })()`
            );
            await sleep(+process.env.VERIFY_WAIT || 1800);
            const state = await this.panel.webContents.executeJavaScript(
              `(() => [...document.querySelectorAll('.ic-item .ic-info, .wm-out, .gif-out, .mt-out, .zp-progress, .ocr-text, .b64-err, .mc-result')].map(e => e.value !== undefined && e.tagName === 'TEXTAREA' ? e.value : e.textContent.trim()).concat(window.__fetchTest ? ['PROBE:'+window.__fetchTest] : []).concat(window.__ocrDone ? ['OCR:'+window.__ocrDone] : []).concat(window.__ocrLog ? ['LOG:'+window.__ocrLog.join(' / ')] : []))()`
            );
            this.log('[verify:func:clicked]', clicked, JSON.stringify(state));
          }
        }
      }

      // 投喂累积测试：工具已开时再投喂文件 → 断言留在工具内且文件数递增（多图工具场景）
      if (process.env.VERIFY_FEED && tool) {
        const extra = process.env.VERIFY_FEED.split('|');
        const before = await this.panel.webContents.executeJavaScript(
          `document.querySelectorAll('.tool-body .ic-item, .tool-body .mt-slot img').length`
        );
        await this.panel.webContents.executeJavaScript(
          `window.api.ball.dropFiles(${JSON.stringify(extra)})`
        );
        await sleep(1100);
        const after = await this.panel.webContents.executeJavaScript(
          `document.querySelectorAll('.tool-body .ic-item, .tool-body .mt-slot img').length`
        );
        const viewNow = await this.panel.webContents.executeJavaScript(
          `document.querySelector('.tool-title')?.textContent || 'LEFT_TOOL_VIEW'`
        );
        this.log('[verify:feed]', JSON.stringify({ before, after, stillInTool: viewNow }));
      }

      // 摸鱼阅读器：导入 → 打开 → 截图 → 模拟 M 键切模式
      if (process.env.VERIFY_READER) {
        const services = require('./services');
        const imp = await services.run('reader', 'import', { path: process.env.VERIFY_READER });
        this.log('[verify:reader:import]', JSON.stringify(imp.ok ? { name: imp.data.name, chars: imp.data.chars } : imp));
        if (imp.ok) {
          this.showReader(imp.data.id);
          await sleep(1400);
          await this.capture(this.reader, '05-reader.png');
          const dom = await this.reader.webContents.executeJavaScript(
            `((document.querySelector('.reader-text')?.textContent || '').slice(0, 30)) + '|LEN=' + (document.querySelector('.reader-text')?.textContent || '').length`
          );
          this.log('[verify:reader:dom]', JSON.stringify(dom));
          await this.reader.webContents.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'m'})); 'ok'`);
          await sleep(600);
          await this.capture(this.reader, '05-reader-ghost.png');
          const cls = await this.reader.webContents.executeJavaScript(`document.querySelector('.reader')?.className`);
          this.log('[verify:reader:mode]', cls);
          // 模式循环覆盖：逐模式记录 窗口尺寸 + 背景 + 文字容器高度
          const cls2 = [];
          for (let i = 0; i < 2; i++) {
            await this.reader.webContents.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'m'})); 'ok'`);
            await sleep(450);
            const info = await this.reader.webContents.executeJavaScript(`(()=>{
              const r=document.querySelector('.reader');
              const t=document.querySelector('.reader-text');
              return r.className+'|bg='+getComputedStyle(r).backgroundColor+'|textH='+Math.round(t.getBoundingClientRect().height)+'|scrollH='+t.scrollHeight+'|winH='+window.innerHeight;
            })()`);
            const bounds = this.reader.getBounds();
            cls2.push(info + `|win=${bounds.width}x${bounds.height}`);
          }
          this.log('[verify:reader:modes]', JSON.stringify(cls2, null, 0));
          // 单行模式翻页：按 ↓ 后 scrollTop 应增加
          const scrollOk = await this.reader.webContents.executeJavaScript(`(async()=>{
            const el=document.querySelector('.reader-text');
            const t0=el.scrollTop;
            el.scrollBy({top: 40}); await new Promise(r=>setTimeout(r,150));
            return t0+'->'+el.scrollTop+(el.scrollTop>t0?' OK':' FAIL');
          })()`);
          this.log('[verify:reader:line-page]', scrollOk);
          // 设置实时推送：面板改字号/颜色 → 阅读窗应立即生效
          const fontOk = await (async () => {
            const before = await this.reader.webContents.executeJavaScript(
              `getComputedStyle(document.querySelector('.reader-text')).fontSize + '/' + getComputedStyle(document.querySelector('.reader-text')).color`
            );
            const services3 = require('./services');
            await services3.run('reader', 'settings', { font: 20, color: '#3366cc' }, { wm: this });
            await sleep(500);
            const after = await this.reader.webContents.executeJavaScript(
              `getComputedStyle(document.querySelector('.reader-text')).fontSize + '/' + getComputedStyle(document.querySelector('.reader-text')).color`
            );
            return before + ' → ' + after + (after.startsWith('20px') && after.includes('51, 102, 204') ? ' OK' : ' FAIL');
          })();
          this.log('[verify:reader:settings]', fontOk);
          // 回到多行模式并测进度持久化
          await this.reader.webContents.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'m'})); 'ok'`);
          await sleep(400);
          // 进度持久化：滚到底 → 防抖保存 → 断言 pos > 0.5
          await this.reader.webContents.executeJavaScript(
            `(()=>{const el=document.querySelector('.reader-text');el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));return el.scrollTop})()`
          );
          await sleep(1100);
          const services2 = require('./services');
          const lst = await services2.run('reader', 'list');
          const meta = lst.ok ? (lst.data || []).find((b) => b.id === imp.data.id) : null;
          this.log('[verify:reader:progress]', JSON.stringify({ pos: meta ? meta.pos : 'MISSING' }));
          this.hideReader();
        }
      }
    } catch (e) {
      this.log('[verify:error]', e && e.stack ? e.stack : String(e));
    } finally {
      this._flushReport();
      app.quit();
      // 兜底：quit 后 1.5s 仍未退出则强制结束（防止僵尸进程占用单实例锁）
      setTimeout(() => app.exit(0), 1500);
    }
  }

  async _assert(win, exprs) {
    const out = [];
    for (const expr of exprs) {
      try {
        out.push(await win.webContents.executeJavaScript(`String(${expr})`));
      } catch (e) {
        out.push('ERR: ' + e.message);
      }
    }
    return out;
  }

  /** 布局体检：溢出视口的元素 / 被截断的滚动容器 */
  async _layoutAudit(win) {
    return win.webContents.executeJavaScript(`(() => {
      const issues = [];
      const vw = window.innerWidth, vh = window.innerHeight;
      const els = document.querySelectorAll('.panel *');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          issues.push('OUT:' + el.className.toString().slice(0, 40) + '|' + Math.round(r.right) + ',' + Math.round(r.bottom));
        }
      }
      const scrollers = document.querySelectorAll('.tool-body, .tool-grid');
      for (const s of scrollers) {
        if (s.scrollHeight > s.clientHeight + 4 || s.scrollWidth > s.clientWidth + 4) {
          issues.push('SCROLL:' + s.className + '|' + s.scrollHeight + '/' + s.clientHeight);
        }
      }
      return issues.slice(0, 12);
    })()`);
  }
}

module.exports = WindowManager;
