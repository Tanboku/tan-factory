import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { TOOLS, searchTools, matchToolsForFiles, getTool, categoryOf, CATEGORIES } from '../core/registry';

const extOf = (p) => {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
};

/* ---------------- 小组件 ---------------- */

function ToolCard({ tool, onClick }) {
  const cat = categoryOf(tool.category);
  return (
    <button className="tool-card" onClick={onClick} title={tool.desc}>
      <span className="tool-icon" style={{ background: cat.soft }}>
        {tool.icon}
      </span>
      <span className="tool-name">{tool.name}</span>
      <span className="tool-desc">{tool.desc}</span>
    </button>
  );
}

function HomeView({ query, setQuery, category, setCategory, onOpen }) {
  const list = useMemo(() => searchTools(query, category), [query, category]);
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <>
      <div className="panel-search">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          value={query}
          placeholder="搜索工具名称或关键字…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && list.length) onOpen(list[0].id);
          }}
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="chip-row">
        <button
          className={`chip ${category === 'all' ? 'on' : ''}`}
          onClick={() => setCategory('all')}
        >
          全部
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`chip ${category === c.id ? 'on' : ''}`}
            style={category === c.id ? { background: c.hue, borderColor: c.hue } : {}}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="tool-grid">
        {list.map((t) => (
          <ToolCard key={t.id} tool={t} onClick={() => onOpen(t.id)} />
        ))}
        {!list.length && (
          <div className="empty-state">
            <span className="empty-face">🐰</span>
            <p>没找到「{query}」相关工具</p>
            <p className="empty-tip">把文件拖到兔子身上试试，或看看下面全部工具</p>
          </div>
        )}
      </div>
    </>
  );
}

function PickView({ files, matched, onOpen }) {
  return (
    <div className="pick-view">
      <div className="pick-files">
        <div className="pick-title">🐰 兔子收到了 {files.length} 个文件：</div>
        <ul>
          {files.slice(0, 6).map((f, i) => (
            <li key={i}>{f.split(/[\\/]/).pop()}</li>
          ))}
          {files.length > 6 && <li className="more">… 共 {files.length} 个</li>}
        </ul>
      </div>
      <div className="pick-title sub">这些工具可以处理它们：</div>
      <div className="tool-grid">
        {matched.map((t) => (
          <ToolCard key={t.id} tool={t} onClick={() => onOpen(t.id)} />
        ))}
        {!matched.length && (
          <div className="empty-state">
            <span className="empty-face">🥕</span>
            <p>暂时没有工具能认出这些文件</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 懒加载组件必须按工具缓存：每次 render 新建 lazy 实例会导致 Suspense 反复重挂载
const lazyCache = new Map();
const lazyOf = (tool) => {
  if (!lazyCache.has(tool.id)) lazyCache.set(tool.id, React.lazy(tool.load));
  return lazyCache.get(tool.id);
};

function ToolView({ id, onBack, files }) {
  const tool = getTool(id);
  if (!tool) return <div className="empty-state">工具不存在</div>;
  const Comp = lazyOf(tool);
  return (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-btn" onClick={onBack} title="返回 (Esc 长按)">
          ← 返回
        </button>
        <span className="tool-icon sm" style={{ background: categoryOf(tool.category).soft }}>
          {tool.icon}
        </span>
        <span className="tool-title">{tool.name}</span>
      </div>
      <div className="tool-body">
        <Suspense fallback={<div className="tool-loading">加载中…</div>}>
          <Comp files={files} />
        </Suspense>
      </div>
    </div>
  );
}

/* ---------------- 面板主组件 ---------------- */

export default function PanelApp() {
  const [view, setView] = useState({ type: 'home' }); // home | pick | tool
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pinned, setPinned] = useState(false);

  // 📌 固定面板：固定后失焦不自动隐藏（如去资源管理器选文件再拖回来）
  useEffect(() => {
    window.api.store.get('panelPinned', false).then(setPinned);
  }, []);
  const togglePin = () => {
    const v = !pinned;
    setPinned(v);
    window.api.store.set('panelPinned', v);
  };

  // 打开时拉取主进程带来的 payload（悬浮球拖放文件等）；已打开时经事件实时接收。
  // 投喂累积策略：当前工具能接住 → 直接追加进工具；匹配视图 → 合并去重；其余 → 新建匹配视图
  useEffect(() => {
    const onPayload = (p) => {
      if (!p || !Array.isArray(p.files) || !p.files.length) return;
      const incoming = p.files;

      setView((v) => {
        if (v.type === 'tool') {
          const tool = getTool(v.id);
          const accepts = tool?.accepts?.files?.map((s) => s.toLowerCase());
          if (accepts && incoming.every((f) => accepts.includes(extOf(f)))) {
            const fed = [...(v.fedFiles || []), ...incoming];
            const fresh = incoming.filter((f) => !(v.fedFiles || []).includes(f));
            // 只把「新增文件」作为 files 传给工具（工具端按追加处理），fedFiles 记录累计已投喂
            return fresh.length ? { ...v, files: fresh, fedFiles: fed } : { ...v, fedFiles: fed };
          }
        }
        if (v.type === 'pick') {
          const merged = [...v.files.filter((f) => !incoming.includes(f)), ...incoming];
          return { ...v, files: merged, matched: matchToolsForFiles(merged) };
        }
        return { type: 'pick', files: incoming, matched: matchToolsForFiles(incoming) };
      });
    };
    window.api.panel.onPayload(onPayload);
    (async () => {
      const p = await window.api.panel.getPayload();
      onPayload(p);
    })();
  }, []);

  // 视觉验证钩子（支持携带文件，如投喂场景）
  useEffect(() => {
    window.__openTool = (id, files) => setView({ type: 'tool', id, files, fedFiles: files || [] });
  }, []);

  // Esc 关闭；返回键
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (view.type === 'tool') setView({ type: 'home' });
        else window.api.panel.hide();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.type]);

  // 面板本身也接受文件拖放
  const onDrop = (e) => {
    e.preventDefault();
    const paths = [...e.dataTransfer.files]
      .map((f) => window.api.ball.getPathForFile(f))
      .filter(Boolean);
    if (paths.length) {
      const matched = matchToolsForFiles(paths);
      setView({ type: 'pick', files: paths, matched });
    }
  };

  const openTool = (id) =>
    setView({
      type: 'tool',
      id,
      files: view.type === 'pick' ? view.files : undefined,
      fedFiles: view.type === 'pick' ? view.files : [],
    });

  return (
    <div className="panel" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="panel-head">
        <span className="logo">🐰</span>
        <span className="brand">兔子工厂</span>
        <span className="head-actions">
          <button
            className={`icon-btn pin ${pinned ? 'on' : ''}`}
            title={pinned ? '已固定：失焦不会自动收起' : '固定面板：失焦不自动收起（去选文件时有用）'}
            onClick={togglePin}
          >
            📌
          </button>
          <button className="icon-btn" title="关闭 (Esc)" onClick={() => window.api.panel.hide()}>
            ✕
          </button>
        </span>
      </div>

      <div className="panel-body">
        {view.type === 'home' && (
          <HomeView query={query} setQuery={setQuery} category={category} setCategory={setCategory} onOpen={openTool} />
        )}
        {view.type === 'pick' && (
          <PickView files={view.files} matched={view.matched} onOpen={openTool} />
        )}
        {view.type === 'tool' && (
          <ToolView id={view.id} files={view.files} onBack={() => setView({ type: 'home' })} />
        )}
      </div>

      <div className="panel-foot">
        <span>共 {TOOLS.length} 个工具</span>
        <span className="foot-kbd">
          <kbd>Alt</kbd>+<kbd>Space</kbd> 快速唤起
        </span>
      </div>
    </div>
  );
}
