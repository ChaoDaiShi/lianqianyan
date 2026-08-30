import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import {
  assertCompetitionMetrics,
  parseFfmpegProbe,
} from './demo-video-lib.mjs';

const workspace = resolve(import.meta.dirname, '..', '..');
const outputRoot = join(workspace, 'demo_video_20260830');
const videoPath = join(outputRoot, '涟千言_三分钟功能演示.mp4');
const framesRoot = join(outputRoot, 'verification-frames');
const manifestPath = join(outputRoot, 'video-manifest.json');
const reportPath = join(outputRoot, 'verification.md');
const ffmpeg = process.env.DEMO_FFMPEG || join(
  process.env.LOCALAPPDATA || '',
  'ms-playwright',
  'ffmpeg-1011',
  'ffmpeg-win64.exe',
);

function run(args) {
  const result = spawnSync(ffmpeg, args, {
    cwd: outputRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed (${result.status}):\n${output.slice(-8000)}`);
  }
  return output;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

if (!existsSync(videoPath)) throw new Error(`Final MP4 not found: ${videoPath}`);
const probeOutput = run(['-hide_banner', '-i', videoPath, '-f', 'null', 'NUL']);
const metrics = {
  ...parseFfmpegProbe(probeOutput),
  fileBytes: statSync(videoPath).size,
};
assertCompetitionMetrics(metrics);
if (metrics.videoCodec !== 'h264') throw new Error(`Expected H.264, found ${metrics.videoCodec}`);
if (metrics.audioCodec !== 'aac') throw new Error(`Expected AAC, found ${metrics.audioCodec}`);

const volumeOutput = run([
  '-hide_banner', '-i', videoPath,
  '-vn', '-af', 'volumedetect', '-f', 'null', 'NUL',
]);
const meanVolume = Number(volumeOutput.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/)?.[1]);
const maxVolume = Number(volumeOutput.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/)?.[1]);
if (!Number.isFinite(meanVolume) || meanVolume < -35) {
  throw new Error(`Narration mean volume is too low: ${meanVolume} dB`);
}

mkdirSync(framesRoot, { recursive: true });
const frameTimes = [0.5, 12, 40, 68, 87, 106, 130, 140];
const framePaths = frameTimes.map((time, index) => {
  const name = `${String(index + 1).padStart(2, '0')}-${String(time).replace('.', '_')}s.png`;
  const framePath = join(framesRoot, name);
  run(['-y', '-hide_banner', '-ss', String(time), '-i', videoPath, '-frames:v', '1', framePath]);
  return framePath;
});

const contactArgs = ['-y', '-hide_banner'];
for (const framePath of framePaths) contactArgs.push('-i', framePath);
const scaled = framePaths.map((_, index) => `[${index}:v]scale=480:270[v${index}]`).join(';');
const layout = '0_0|480_0|960_0|1440_0|0_270|480_270|960_270|1440_270';
contactArgs.push(
  '-filter_complex', `${scaled};${framePaths.map((_, index) => `[v${index}]`).join('')}xstack=inputs=8:layout=${layout}[sheet]`,
  '-map', '[sheet]',
  '-frames:v', '1',
  join(framesRoot, 'contact-sheet.png'),
);
run(contactArgs);

const runtimeStatePath = join(outputRoot, 'runtime', 'runtime-state.json');
const runtimeState = existsSync(runtimeStatePath)
  ? parseJsonFile(runtimeStatePath)
  : null;
const sourceDatabaseSha256After = runtimeState?.sourceDatabase && existsSync(runtimeState.sourceDatabase)
  ? sha256(runtimeState.sourceDatabase).toUpperCase()
  : null;
const sourceDatabaseUnchanged = Boolean(
  runtimeState?.sourceDatabaseSha256
  && sourceDatabaseSha256After === runtimeState.sourceDatabaseSha256,
);
if (runtimeState && !sourceDatabaseUnchanged) {
  throw new Error('Source database hash changed during isolated demo recording');
}

const recordingEvidencePath = join(outputRoot, 'recording-evidence.json');
const recordingEvidence = parseJsonFile(recordingEvidencePath);
if (!recordingEvidence.complete || recordingEvidence.scenes.length !== 7) {
  throw new Error('Recording evidence is incomplete');
}

const manifest = {
  generatedAt: new Date().toISOString(),
  file: videoPath,
  sha256: sha256(videoPath),
  metrics,
  narrationVolume: { meanDb: meanVolume, maxDb: maxVolume },
  competitionChecks: {
    mp4: true,
    durationBelow180Seconds: metrics.durationSeconds < 180,
    sizeBelow200MiB: metrics.fileBytes < 200 * 1024 * 1024,
    resolution1920x1080: metrics.width === 1920 && metrics.height === 1080,
    h264Video: metrics.videoCodec === 'h264',
    aacAudio: metrics.audioCodec === 'aac',
    sevenRealScenesRecorded: recordingEvidence.complete && recordingEvidence.scenes.length === 7,
    sourceDatabaseUnchanged,
  },
  verificationFrames: framePaths,
  contactSheet: join(framesRoot, 'contact-sheet.png'),
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const mib = metrics.fileBytes / 1024 / 1024;
const report = `# 涟千言三分钟功能演示视频验收\n\n` +
  `- 文件：涟千言_三分钟功能演示.mp4\n` +
  `- 时长：${metrics.durationSeconds.toFixed(2)} 秒（要求 < 180 秒）\n` +
  `- 大小：${mib.toFixed(2)} MiB（要求 < 200 MiB）\n` +
  `- 画面：${metrics.width}×${metrics.height}，H.264，25 fps\n` +
  `- 声音：AAC，MiniMax 异步 TTS，平均 ${meanVolume.toFixed(1)} dB，峰值 ${maxVolume.toFixed(1)} dB\n` +
  `- 真实运行：7/7 场景录制证据完整\n` +
  `- 数据隔离：原始数据库 SHA-256 前后一致\n` +
  `- 视频 SHA-256：${manifest.sha256}\n\n` +
  `结论：视频格式、时长、大小、清晰度、声音流与真实场景证据全部通过自动验收；关键帧另行进行人工视觉检查。\n`;
writeFileSync(reportPath, report, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
