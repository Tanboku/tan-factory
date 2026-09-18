export default {
  id: 'audio-convert',
  name: '音频格式转换',
  desc: 'MP3 / WAV / FLAC / OGG / AAC / M4A / OPUS 互转，可调码率',
  icon: '🎵',
  category: 'media',
  keywords: ['audio', '音频', '音乐', 'mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'opus', '转换'],
  order: 20,
  accepts: { files: ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.opus', '.wma', '.aiff'] },
  load: () => import('./Panel.jsx'),
};
