import React, { useEffect, useRef, useState } from 'react';
import RabbitFace from '../components/RabbitFace';

const MOVE_THRESHOLD = 4; // px，超过视为拖拽而非点击

export default function BallApp() {
  const [pose, setPose] = useState(null); // null | 'hover' | 'press' | 'excited'
  const drag = useRef({ down: false, moved: false, sx: 0, sy: 0 }).current;

  // 视觉验证钩子（主进程 VERIFY_POSE 调用）
  useEffect(() => {
    window.__setPose = (p) => setPose(p);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    drag.down = true;
    drag.moved = false;
    drag.sx = e.screenX;
    drag.sy = e.screenY;
    setPose('press');
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    window.api.ball.dragStart();
  };

  const onPointerMove = (e) => {
    if (!drag.down) return;
    if (!drag.moved && Math.hypot(e.screenX - drag.sx, e.screenY - drag.sy) > MOVE_THRESHOLD) {
      drag.moved = true;
      setPose('drag');
    }
    if (drag.moved) window.api.ball.dragMove();
  };

  const onPointerUp = (e) => {
    if (e.button !== 0 || !drag.down) return;
    drag.down = false;
    if (drag.moved) {
      window.api.ball.dragEnd();
      setPose(null);
    } else {
      setPose(null);
      window.api.ball.click(); // 单击 → 开关面板
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setPose(null);
    const paths = [...e.dataTransfer.files]
      .map((f) => window.api.ball.getPathForFile(f))
      .filter(Boolean);
    if (paths.length) {
      // 智能匹配：能接住这些文件的工具随 payload 一起传给面板
      window.api.ball.dropFiles(paths);
    }
  };

  return (
    <div
      className="ball-stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        window.api.ball.menu();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setPose('excited');
      }}
      onDragLeave={() => setPose(null)}
      onDrop={onDrop}
    >
      <div className="ball-glow" />
      <RabbitFace pose={pose} />
      <div className="ball-hint">点击 · 拖拽 · 投喂文件</div>
    </div>
  );
}
