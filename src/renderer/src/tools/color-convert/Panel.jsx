import React, { useMemo, useState } from 'react';

function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      {ok ? '已复制 ✓' : '复制'}
    </button>
  );
}

export default function ColorConvertPanel() {
  const [input, setInput] = useState('#FF7E6B');
  const rgb = useMemo(() => hexToRgb(input), [input]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(rgb) : null), [rgb]);
  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '';

  const presets = ['#FF7E6B', '#4E9CFF', '#3FB56E', '#8E7CF5', '#FFC53D', '#212121', '#FFFFFF', '#F0699B'];

  return (
    <div className="color-panel">
      <div className="color-preview" style={{ background: rgb ? input : '#eee' }}>
        <span className="color-big">{rgb ? input.toUpperCase() : '无效颜色'}</span>
      </div>

      <div className="color-input-row">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="#FF7E6B 或 FFFFFF" spellCheck={false} />
      </div>

      {rgb && (
        <div className="color-vals">
          <div className="color-val">
            <span className="cv-label">HEX</span>
            <code>{input.toUpperCase()}</code>
            <Copy text={input.toUpperCase()} />
          </div>
          <div className="color-val">
            <span className="cv-label">RGB</span>
            <code>{rgbStr}</code>
            <Copy text={rgbStr} />
          </div>
          <div className="color-val">
            <span className="cv-label">HSL</span>
            <code>{hslStr}</code>
            <Copy text={hslStr} />
          </div>
        </div>
      )}

      <div className="color-presets">
        {presets.map((c) => (
          <button key={c} className="swatch" style={{ background: c }} onClick={() => setInput(c)} title={c} />
        ))}
      </div>
    </div>
  );
}
