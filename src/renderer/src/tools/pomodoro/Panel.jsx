import React, { useEffect, useRef, useState } from 'react';

const FOCUS = 25 * 60;
const REST = 5 * 60;
const pad = (n) => String(n).padStart(2, '0');

export default function PomodoroPanel() {
  const [mode, setMode] = useState('focus'); // focus | rest
  const [left, setLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const endAt = useRef(0);

  useEffect(() => {
    window.api.store.get('pomodoroCount', 0).then(setCount);
  }, []);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        setRunning(false);
        finish();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const finish = () => {
    try {
      new Notification(mode === 'focus' ? '🍅 番茄完成！' : '🥕 休息结束', {
        body: mode === 'focus' ? '专注 25 分钟，休息 5 分钟吧' : '开始下一个番茄！',
      });
    } catch {
      /* 通知不可用时静默 */
    }
    if (mode === 'focus') {
      const c = count + 1;
      setCount(c);
      window.api.store.set('pomodoroCount', c);
      setMode('rest');
      setLeft(REST);
    } else {
      setMode('focus');
      setLeft(FOCUS);
    }
  };

  const total = mode === 'focus' ? FOCUS : REST;
  const pct = 1 - left / total;
  const R = 86;
  const C = 2 * Math.PI * R;

  return (
    <div className="pomo-panel">
      <div className="pomo-ring">
        <svg viewBox="0 0 200 200">
          <circle className="pr-bg" cx="100" cy="100" r={R} />
          <circle
            className="pr-fg"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset .3s linear' }}
          />
        </svg>
        <div className="pomo-center">
          <div className={`pomo-time ${running ? 'run' : ''}`}>{pad(Math.floor(left / 60))}:{pad(left % 60)}</div>
          <div className="pomo-mode">{mode === 'focus' ? '🍅 专注中' : '🥕 休息中'}</div>
        </div>
      </div>

      <div className="pomo-actions">
        <button className="btn primary" onClick={() => setRunning((r) => !r)}>
          {running ? '暂停' : left === total ? '开始' : '继续'}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setRunning(false);
            setLeft(mode === 'focus' ? FOCUS : REST);
          }}
        >
          重置
        </button>
      </div>
      <div className="pomo-count">今天已完成 🍅 × {count}</div>
    </div>
  );
}
