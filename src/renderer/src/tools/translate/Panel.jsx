import React, { useState } from 'react';

const LANGS = [
  ['zh', '中文'],
  ['en', '英语'],
  ['ja', '日语'],
  ['ko', '韩语'],
  ['fr', '法语'],
  ['de', '德语'],
  ['ru', '俄语'],
  ['es', '西班牙语'],
];

async function gtx(text, sl, tl) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
    `&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('gtx ' + r.status);
  const j = await r.json();
  return (j[0] || []).map((seg) => seg[0]).join('');
}

async function myMemory(text, sl, tl) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('mymemory ' + r.status);
  const j = await r.json();
  const t = j?.responseData?.translatedText;
  if (!t) throw new Error('mymemory 空结果');
  return t;
}

export default function TranslatePanel() {
  const [sl, setSl] = useState('zh');
  const [tl, setTl] = useState('en');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [engine, setEngine] = useState('');

  const swap = () => {
    setSl(tl);
    setTl(sl);
    setInput(output);
    setOutput('');
  };

  const go = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr('');
    setOutput('');
    try {
      // 长文分段（gtx GET 限制）
      const chunks = [];
      let rest = text;
      while (rest.length > 1200) {
        let cut = rest.lastIndexOf('\n', 1200);
        if (cut < 400) cut = rest.lastIndexOf('。', 1200);
        if (cut < 400) cut = rest.lastIndexOf('. ', 1200);
        if (cut < 400) cut = 1200;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      chunks.push(rest);

      let out = '';
      for (const c of chunks) {
        out += await gtx(c, sl, tl);
        await new Promise((r) => setTimeout(r, 120));
      }
      setOutput(out);
      setEngine('Google');
    } catch {
      try {
        const out = await myMemory(text.slice(0, 4800), sl, tl);
        setOutput(out);
        setEngine('MyMemory');
      } catch (e2) {
        setErr('翻译失败：网络不可用或接口受限（' + e2.message + '）');
      }
    }
    setBusy(false);
  };

  return (
    <div className="tr-panel">
      <div className="tr-langs">
        <select value={sl} onChange={(e) => setSl(e.target.value)}>
          {LANGS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="tr-swap" onClick={swap} title="交换语言">
          ⇄
        </button>
        <select value={tl} onChange={(e) => setTl(e.target.value)}>
          {LANGS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="tr-io">
        <textarea
          className="qr-input"
          value={input}
          placeholder="输入要翻译的文本，Ctrl+Enter 翻译…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go();
          }}
          rows={6}
        />
        <textarea className="qr-input tr-out" value={output} placeholder="译文" readOnly rows={6} />
      </div>

      {err && <div className="b64-err">⚠️ {err}</div>}

      <div className="ic-actions">
        <button
          className="btn ghost"
          onClick={() => {
            setInput('');
            setOutput('');
            setErr('');
          }}
          disabled={busy}
        >
          清空
        </button>
        <button className="btn primary" onClick={go} disabled={busy || !input.trim()}>
          {busy ? '翻译中…' : '翻译'}
        </button>
        {output && (
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(output)}>
            复制译文
          </button>
        )}
      </div>
      {engine && output && <div className="ic-note">引擎：{engine} · 长文本已自动分段</div>}
    </div>
  );
}
