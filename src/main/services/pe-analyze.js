'use strict';

/**
 * PE 分析（脱壳辅助）：区段表 + 熵 + 导入表 + 壳特征识别
 * 静态检测仅作参考；真实脱壳需动态环境。
 */
const fs = require('fs');

const PACKER_SIGS = [
  [/^UPX[0-9!]$/, 'UPX'],
  [/^\.?THEMIDA/, 'Themida / WinLicense'],
  [/^\.?VMP[0-9]/, 'VMProtect'],
  [/^\.?ASPACK|^\.ADATA/, 'ASPack'],
  [/^\.?ENIGMA/, 'Enigma Protector'],
  [/^\.?NSPACK|^\.?NCH/, 'NSPack'],
  [/^\.?PETITE/, 'Petite'],
  [/^\.?PEBUNDLE/, 'PEBundle'],
  [/^\.?SHRINK[0-9]/, 'Shrinker'],
  [/^\.?MEW$/, 'MEW'],
  [/^\.?UPX$/, 'UPX'],
  [/^\.?MAX$/i, 'MaxtoCode'],
  [/^\.?BYAIWANG/i, '未知中文壳'],
  [/\.packed|^\.?PACK/, '通用加壳标识'],
];

function entropy(buf) {
  if (!buf.length) return 0;
  const step = buf.length > 2 * 1024 * 1024 ? Math.ceil(buf.length / (2 * 1024 * 1024)) : 1;
  const freq = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < buf.length; i += step) {
    freq[buf[i]]++;
    n++;
  }
  let h = 0;
  for (let i = 0; i < 256; i++) {
    if (!freq[i]) continue;
    const p = freq[i] / n;
    h -= p * Math.log2(p);
  }
  return h;
}

function rvaToOff(sections, rva) {
  for (const s of sections) {
    const span = Math.max(s.vsize, s.rawsize);
    if (rva >= s.vaddr && rva < s.vaddr + span) {
      return s.rawsize > 0 ? s.ptr + (rva - s.vaddr) : -1;
    }
  }
  return -1;
}

module.exports = {
  id: 'pe-analyze',
  run(action, payload) {
    if (action !== 'analyze') throw new Error(`未知操作: ${action}`);
    const buf = fs.readFileSync(payload.path);
    if (buf.length < 0x40 || buf.readUInt16LE(0) !== 0x5a4d) throw new Error('不是有效的 PE 文件（缺 DOS 头）');
    const peOff = buf.readInt32LE(0x3c);
    if (peOff <= 0 || buf.readUInt32LE(peOff) !== 0x4550) throw new Error('不是有效的 PE 文件（缺 PE 签名）');

    const machine = buf.readUInt16LE(peOff + 4);
    const nsec = buf.readUInt16LE(peOff + 6);
    const optSize = buf.readUInt16LE(peOff + 20);
    const chars = buf.readUInt16LE(peOff + 22);
    const optStart = peOff + 24;
    const magic = buf.readUInt16LE(optStart);
    const plus = magic === 0x20b;
    const entryRva = buf.readUInt32LE(optStart + 16);
    const subsystem = buf.readUInt16LE(optStart + (plus ? 68 : 68));
    const dirsOff = optStart + (plus ? 112 : 96);
    const importRva = buf.readUInt32LE(dirsOff + 8);

    // 区段表
    const secOff = optStart + optSize;
    const sections = [];
    for (let i = 0; i < nsec && i < 96; i++) {
      const o = secOff + i * 40;
      const name = buf.slice(o, o + 8).toString('latin1').replace(/\0+$/, '');
      const vsize = buf.readUInt32LE(o + 8);
      const vaddr = buf.readUInt32LE(o + 12);
      const rawsize = buf.readUInt32LE(o + 16);
      const ptr = buf.readUInt32LE(o + 20);
      const schars = buf.readUInt32LE(o + 36);
      let h = 0;
      if (rawsize > 0 && ptr > 0 && ptr + Math.min(rawsize, 0x400000) <= buf.length) {
        h = entropy(buf.slice(ptr, ptr + Math.min(rawsize, 0x400000)));
      }
      sections.push({
        name,
        vsize,
        vaddr,
        rawsize,
        ptr,
        entropy: +h.toFixed(2),
        exec: !!(schars & 0x20000000),
        write: !!(schars & 0x80000000),
      });
    }

    // 入口所在区段
    let entrySection = sections.find((s) => entryRva >= s.vaddr && entryRva < s.vaddr + Math.max(s.vsize, s.rawsize));

    // 导入表
    const imports = [];
    let totalFuncs = 0;
    if (importRva) {
      let io = rvaToOff(sections, importRva);
      if (io > 0) {
        for (let i = 0; i < 64; i++) {
          // 描述符终止条件：Name RVA 为 0（OriginalFirstThunk 允许为 0）
          if (io + 20 > buf.length || buf.readUInt32LE(io + 12) === 0) break;
          const nameRva = buf.readUInt32LE(io + 12);
          const thunkRva = buf.readUInt32LE(io) || buf.readUInt32LE(io + 16);
          const no = rvaToOff(sections, nameRva);
          const to = rvaToOff(sections, thunkRva);
          if (no > 0) {
            let end = no;
            while (end < buf.length && buf[end]) end++;
            const dll = buf.slice(no, end).toString('latin1');
            let cnt = 0;
            if (to > 0) {
              for (let j = 0; j < 4096; j++) {
                const v = plus ? Number(buf.readBigUInt64LE(to + j * 8)) : buf.readUInt32LE(to + j * 4);
                if (!v) break;
                cnt++;
              }
            }
            totalFuncs += cnt;
            imports.push({ dll, funcs: cnt });
          }
          io += 20;
        }
      }
    }

    // 壳检测
    const packers = new Set();
    for (const s of sections) {
      for (const [re, name] of PACKER_SIGS) {
        if (re.test(s.name)) packers.add(name);
      }
    }
    const entryEnt = entrySection ? entrySection.entropy : 0;
    const suspects = [];
    if (entryEnt > 7 && entrySection && entrySection.exec) {
      suspects.push(`入口区段「${entrySection.name}」熵 ${entryEnt}（>7 为加密/压缩特征）`);
    }
    if (totalFuncs > 0 && totalFuncs < 25 && sections.some((s) => s.exec && s.entropy > 6.5)) {
      suspects.push(`导入函数仅 ${totalFuncs} 个（加壳程序常只导入少量 API）`);
    }
    if (!imports.length) suspects.push('导入表不可读（被壳隐藏或损坏）');

    let verdict;
    if (packers.size) {
      verdict = { level: 'packed', text: `检测到壳：${[...packers].join('、')}` };
    } else if (suspects.length >= 2) {
      verdict = { level: 'suspect', text: '疑似加壳（满足多项启发特征），可能是未知壳或 SFX' };
    } else {
      verdict = { level: 'clean', text: '未发现明显加壳特征' };
    }

    const ts = buf.readUInt32LE(peOff + 8);
    const compiled = ts > 0 && ts < 4102444800 ? new Date(ts * 1000).toISOString().slice(0, 19).replace('T', ' ') : '未知';

    return {
      machine: { 0x14c: 'x86', 0x8664: 'x64', 0xaa64: 'ARM64', 0x1c0: 'ARM' }[machine] || '0x' + machine.toString(16),
      bits: plus ? 64 : 32,
      compiled,
      subsystem: ['-', '-', 'GUI 程序', '控制台程序'][subsystem] || '子系统 ' + subsystem,
      sections,
      entrySection: entrySection ? entrySection.name : '未知',
      entryEnt: +entryEnt.toFixed(2),
      imports,
      totalFuncs,
      suspects,
      verdict,
      dllChars: chars,
    };
  },
};
