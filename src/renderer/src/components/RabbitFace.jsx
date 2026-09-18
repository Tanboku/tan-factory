import React from 'react';

/**
 * 兔子脸：纯 SVG + CSS 动画
 *  - idle：呼吸浮动 + 定时眨眼
 *  - hover：耳朵摆动
 *  - press：挤压
 *  - excited：接收拖放文件时开心表情
 */
export default function RabbitFace({ pose }) {
  const cls = ['rabbit', pose].filter(Boolean).join(' ');
  return (
    <svg className={cls} viewBox="0 0 140 156" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cheekG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB3AA" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFB3AA" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      <g className="rabbit-all">
        {/* 耳朵（画在头后面） */}
        <g className="ear ear-l">
          <rect x="28" y="4" width="27" height="62" rx="13.5" fill="#FEFBF7" stroke="#EADFD2" strokeWidth="2" />
          <rect x="35" y="13" width="13" height="42" rx="6.5" fill="#FFC9C4" />
        </g>
        <g className="ear ear-r">
          <rect x="85" y="4" width="27" height="62" rx="13.5" fill="#FEFBF7" stroke="#EADFD2" strokeWidth="2" />
          <rect x="92" y="13" width="13" height="42" rx="6.5" fill="#FFC9C4" />
        </g>

        {/* 头 */}
        <ellipse cx="70" cy="101" rx="53" ry="47" fill="#FEFBF7" stroke="#EADFD2" strokeWidth="2" />

        {/* 腮红 */}
        <ellipse cx="32" cy="110" rx="11" ry="7.5" fill="url(#cheekG)" />
        <ellipse cx="108" cy="110" rx="11" ry="7.5" fill="url(#cheekG)" />

        {/* 眼睛（眨眼动画作用于此组） */}
        <g className="eyes">
          <g className="eye">
            <ellipse cx="49" cy="97" rx="5.6" ry="7.4" fill="#3B332E" />
            <circle cx="51" cy="94.4" r="1.7" fill="#FFF" opacity="0.9" />
          </g>
          <g className="eye">
            <ellipse cx="91" cy="97" rx="5.6" ry="7.4" fill="#3B332E" />
            <circle cx="93" cy="94.4" r="1.7" fill="#FFF" opacity="0.9" />
          </g>
          {/* excited: 弯弯的开心眼 */}
          <g className="eyes-happy">
            <path d="M42 98 q7 -8 14 0" stroke="#3B332E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M84 98 q7 -8 14 0" stroke="#3B332E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* 鼻子 + 嘴 */}
        <ellipse cx="70" cy="106" rx="5.2" ry="3.6" fill="#FF9E97" />
        <path
          className="mouth"
          d="M70 110 v3.4 M70 113.4 q-4.6 4.6 -9 .8 M70 113.4 q4.6 4.6 9 .8"
          stroke="#3B332E"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
