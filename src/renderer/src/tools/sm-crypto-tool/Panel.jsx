import React, { useState } from 'react';
import { sm4, sm3 } from 'sm-crypto';

const HEX32 = /^[0-9a-fA-F]{32}$/;

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
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

export default function SmCryptoPanel() {
  const [tab, setTab] = useState('enc'); // enc | dec | hash
  const [key, setKey] = useState('0123456789abcdeffedcba9876543210');
  const [mode, setMode] = useState('ecb');
  const [iv, setIv] = useState('000102030405060708090a0b0c0d0e0f');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [err, setErr] = useState('');

  const keyOk = HEX32.test(key);
  const ivOk = HEX32.test(iv);

  const run = () => {
    setErr('');
    setOutput('');
    try {
      if (tab === 'hash') {
        setOutput(sm3(input));
        return;
      }
      if (!keyOk) throw new Error('密钥必须是 32 位十六进制（128 位）');
      if (mode === 'cbc' && !ivOk) throw new Error('CBC 模式需要 32 位十六进制 IV');
      const opts = { mode, padding: 'pkcs#7', output: 'string' };
      if (mode === 'cbc') opts.iv = iv;
      if (tab === 'enc') {
        setOutput(sm4.encrypt(input, key, opts));
      } else {
        if (!/^[0-9a-fA-F]+$/.test(input.trim())) throw new Error('请输入十六进制密文');
        const arr = sm4.decrypt(input.trim(), key, { ...opts, output: 'array' });
        // UTF-8 数组 → 文本
        setOutput(new TextDecoder().decode(Uint8Array.from(arr)));
      }
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  return (
    <div className="sm-panel">
      <div className="seg sm-tabs">
        {[
          ['enc', 'SM4 加密'],
          ['dec', 'SM4 解密'],
          ['hash', 'SM3 哈希'],
        ].map(([v, l]) => (
          <button key={v} className={`seg-btn ${tab === v ? 'on' : ''}`} onClick={() => { setTab(v); setOutput(''); setErr(''); }}>
            {l}
          </button>
        ))}
      </div>

      {tab !== 'hash' && (
        <div className="sm-keys">
          <div className="sm-key-row">
            <label>密钥（32 hex / 128 位）</label>
            <div className="sm-key-input">
              <input value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} className={keyOk ? '' : 'bad'} />
              <button className="rnd-mini" title="随机生成" onClick={() => setKey([...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''))}>
                🎲
              </button>
            </div>
          </div>
          <div className="wm-row2">
            <div className="ic-ctrl">
              <label>分组模式</label>
              <div className="seg">
                {['ecb', 'cbc'].map((m) => (
                  <button key={m} className={`seg-btn ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm-key-row">
              <label>IV（CBC 必填）</label>
              <input value={iv} onChange={(e) => setIv(e.target.value)} spellCheck={false} disabled={mode !== 'cbc'} className={mode === 'cbc' && !ivOk ? 'bad' : ''} />
            </div>
          </div>
        </div>
      )}

      <textarea
        className="qr-input sm-io"
        value={input}
        placeholder={tab === 'enc' ? '输入明文文本…' : tab === 'dec' ? '输入十六进制密文…' : '输入要哈希的文本…'}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        spellCheck={false}
      />

      <button className="btn primary" onClick={run} disabled={!input.trim()}>
        {tab === 'hash' ? '计算哈希' : tab === 'enc' ? '加密' : '解密'}
      </button>

      {err && <div className="b64-err">⚠️ {err}</div>}

      {output && (
        <div className="sm-out">
          <div className="ts-title">
            结果
            <Copy text={output} />
          </div>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}
