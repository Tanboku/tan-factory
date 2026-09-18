import React, { useEffect, useState } from 'react';

const entropyColor = (h) => (h > 7 ? '#e5484d' : h > 6.5 ? '#ffa928' : '#3fb56e');

export default function PeAnalyzePanel({ files }) {
  const [path, setPath] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (files?.length) loadFile(files.find((f) => /\.(exe|dll|sys|scr|ocx)$/i.test(f)));
  }, [files]);

  const loadFile = async (p) => {
    if (!p) return;
    setPath(p);
    setData(null);
    setErr('');
    const r = await window.api.tool.run('pe-analyze', 'analyze', { path: p });
    if (r.ok) setData(r.data);
    else setErr(r.error);
  };

  const pick = async () => {
    const r = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: 'PE 文件', extensions: ['exe', 'dll', 'sys', 'scr', 'ocx'] }],
    });
    if (!r.canceled) loadFile(r.filePaths[0]);
  };

  const v = data?.verdict;

  return (
    <div className="pe-panel">
      <div
        className="ic-drop"
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const p = [...e.dataTransfer.files].map((f) => window.api.ball.getPathForFile(f)).find((f) => /\.(exe|dll|sys|scr|ocx)$/i.test(f));
          if (p) loadFile(p);
        }}
      >
        <div className="ic-drop-icon">🛡️</div>
        <div className="ic-drop-text">{path ? path.split(/[\\/]/).pop() : '选择或拖入 EXE / DLL'}</div>
        <div className="ic-drop-sub">静态检测壳特征 · 静态分析不会执行任何代码</div>
      </div>

      {err && <div className="b64-err">⚠️ {err}</div>}

      {data && (
        <>
          <div className={`pe-verdict ${v.level}`}>
            <span className="pe-v-icon">{v.level === 'packed' ? '🧱' : v.level === 'suspect' ? '❓' : '✅'}</span>
            <span className="pe-v-text">{v.text}</span>
          </div>

          <div className="pe-facts">
            <span>{data.machine} · {data.bits} 位</span>
            <span>{data.subsystem}</span>
            <span>编译时间 {data.compiled}</span>
            <span>入口区段 {data.entrySection}（熵 {data.entryEnt}）</span>
          </div>

          <div className="ts-title">区段表（熵 &gt; 7 通常为加密/压缩数据）</div>
          <div className="pe-sections">
            {data.sections.map((s, i) => (
              <div className="pe-sec" key={i}>
                <span className="pe-sec-name">{s.name || '(无名)'}</span>
                <span className="pe-sec-bar">
                  <i style={{ width: Math.min(100, (s.entropy / 8) * 100) + '%', background: entropyColor(s.entropy) }} />
                </span>
                <span className="pe-sec-h" style={{ color: entropyColor(s.entropy) }}>
                  {s.entropy.toFixed(2)}
                </span>
                <span className="pe-sec-size">{(s.rawsize / 1024).toFixed(0)}K</span>
                <span className="pe-sec-flags">
                  {s.exec ? 'X' : '-'}
                  {s.write ? 'W' : '-'}
                </span>
              </div>
            ))}
          </div>

          <div className="ts-title">导入模块（{data.imports.length} 个 / {data.totalFuncs} 个函数）</div>
          <div className="pe-imports">
            {data.imports.map((m, i) => (
              <span key={i} className="pe-imp">
                {m.dll.split('.').slice(0, -1).join('.')} <em>{m.funcs}</em>
              </span>
            ))}
            {!data.imports.length && <span className="zp-sub">导入表不可读</span>}
          </div>

          {data.suspects.length > 0 && (
            <div className="pe-suspects">
              <div className="ts-title">启发线索</div>
              {data.suspects.map((s, i) => (
                <div key={i}>· {s}</div>
              ))}
            </div>
          )}

          {v.level === 'packed' && data.verdict.text.includes('UPX') && (
            <div className="pe-tip">
              💡 UPX 壳通常可直接 <code>upx -d 文件名</code> 脱壳还原
            </div>
          )}
          {(v.level === 'packed' && !data.verdict.text.includes('UPX')) || v.level === 'suspect' ? (
            <div className="pe-tip">
              💡 商业壳（VMProtect/Themida 等）静态无法还原，需要在隔离虚拟机中动态 dump；本工具仅做识别辅助
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
