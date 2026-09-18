'use strict';

/**
 * 内存清理服务（PCL 风格）
 * - stats：系统内存占用
 * - clean：对全部可访问进程调用 Win32 EmptyWorkingSet（与 PCL/360 的"一键加速"同原理，
 *   把各进程工作集页挤出物理内存），返回修剪进程数与释放量
 */
const os = require('os');
const { spawn } = require('child_process');

// PowerShell 内联 C#：OpenProcess(PROCESS_SET_QUOTA) + EmptyWorkingSet
const PS_SCRIPT = `
$sig = 'using System;using System.Runtime.InteropServices;public class M{[DllImport("psapi.dll")]public static extern int EmptyWorkingSet(IntPtr h);[DllImport("kernel32.dll")]public static extern IntPtr OpenProcess(uint a,bool b,int p);[DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);}';
Add-Type -TypeDefinition $sig;
$n = 0;
Get-Process | ForEach-Object {
  $h = [M]::OpenProcess(0x0100, $false, $_.Id);
  if ($h -ne [IntPtr]::Zero) { [void][M]::EmptyWorkingSet($h); [void][M]::CloseHandle($h); $n++ }
};
Write-Output $n;
`;

function psEncoded(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

module.exports = {
  id: 'mem-clean',
  async run(action) {
    if (action === 'stats') {
      const total = os.totalmem();
      const free = os.freemem();
      return { total, free, used: total - free, pct: Math.round(((total - free) / total) * 100) };
    }

    if (action === 'clean') {
      const before = os.freemem();
      const trimmed = await new Promise((resolve) => {
        const p = spawn(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', psEncoded(PS_SCRIPT)],
          { windowsHide: true }
        );
        let out = '';
        p.stdout.on('data', (d) => (out += d.toString()));
        p.on('error', () => resolve(-1));
        p.on('close', () => resolve(parseInt(out.trim(), 10) || 0));
        setTimeout(() => {
          try {
            p.kill();
          } catch {
            /* ignore */
          }
          resolve(parseInt(out.trim(), 10) || 0);
        }, 15000).unref();
      });
      // 工作集被修剪后，standby 页计入可用内存，freemem 会上升
      await new Promise((r) => setTimeout(r, 400));
      const after = os.freemem();
      return {
        trimmed,
        freedBytes: Math.max(0, after - before),
        free: after,
        total: os.totalmem(),
      };
    }

    throw new Error(`未知操作: ${action}`);
  },
};
