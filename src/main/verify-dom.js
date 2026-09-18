'use strict';

/**
 * VERIFY_DOM 模式：程序化 DOM 断言 + 截图
 * 在 runVerify 基础上对渲染进程执行 DOM 检查，输出 JSON 报告。
 */
const assertions = {
  ball: [
    `!!document.querySelector('.rabbit')`,
    `!!document.querySelector('.ear-l') && !!document.querySelector('.ear-r')`,
    `!!document.querySelector('.eyes')`,
    `!!document.querySelector('.ball-stage')`,
  ],
  panelHome: [
    `document.querySelectorAll('.tool-card').length`,
    `!!document.querySelector('.panel-search input')`,
    `document.querySelectorAll('.chip').length`,
    `document.querySelector('.brand')?.textContent`,
    `document.querySelector('.panel-foot')?.innerText?.replace(/\\n/g,' ')`,
  ],
};

module.exports = { assertions };
