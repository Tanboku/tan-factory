'use strict';

const { spawn } = require('child_process');
// ffmpeg-static 5.x 不再自动处理 asar 路径，打包后二进制位于 app.asar.unpacked
let ffmpegPath = require('ffmpeg-static');
if (ffmpegPath && ffmpegPath.includes('app.asar')) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

// ffmpeg-static 已处理 asar.unpacked 路径替换，打包后依然可用
const CODEC_ARGS = {
  mp3: (br) => ['-codec:a', 'libmp3lame', '-b:a', br],
  wav: () => ['-codec:a', 'pcm_s16le'],
  flac: () => ['-codec:a', 'flac'],
  ogg: (br) => ['-codec:a', 'libvorbis', '-b:a', br],
  aac: (br) => ['-codec:a', 'aac', '-b:a', br],
  m4a: (br) => ['-codec:a', 'aac', '-b:a', br, '-f', 'ipod'],
  opus: (br) => ['-codec:a', 'libopus', '-b:a', br],
};

function convert({ in: inFile, out, fmt, bitrate }) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', inFile, ...CODEC_ARGS[fmt](bitrate || '192k'), out];
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let err = '';
    proc.stderr.on('data', (d) => (err += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error('ffmpeg 退出码 ' + code + '：' + err.slice(-400)));
    });
  });
}

module.exports = {
  id: 'audio-convert',
  async run(action, payload) {
    if (action === 'convert') return convert(payload);
    if (action === 'probe') return { ffmpeg: ffmpegPath };
    throw new Error(`未知操作: ${action}`);
  },
};
