import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  buildSrt,
  formatSrtTime,
  sceneDurationsFromEnds,
} from './demo-video-lib.mjs';

const workspace = resolve(import.meta.dirname, '..', '..');
const outputRoot = join(workspace, 'demo_video_20260830');
const rawRoot = join(outputRoot, 'raw-scenes');
const audioPath = join(outputRoot, 'audio', 'narration.mp3');
const outputPath = join(outputRoot, '涟千言_三分钟功能演示.mp4');
const srtPath = join(outputRoot, '涟千言_三分钟功能演示.srt');
const narrationPath = join(outputRoot, '旁白稿.md');
const planPath = join(outputRoot, 'compose-plan.json');
const timeline = JSON.parse(
  readFileSync(join(workspace, 'scripts', 'demo-video', 'timeline.json'), 'utf8'),
);
const ffmpeg = process.env.DEMO_FFMPEG || join(
  process.env.LOCALAPPDATA || '',
  'ms-playwright',
  'ffmpeg-1011',
  'ffmpeg-win64.exe',
);

function runFfmpeg(args, options = {}) {
  const result = spawnSync(ffmpeg, args, {
    cwd: options.cwd || workspace,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0 && !options.allowProbeFailure) {
    throw new Error(`FFmpeg failed (${result.status}):\n${combined.slice(-8000)}`);
  }
  return combined;
}

function probeDuration(path) {
  const output = runFfmpeg(
    ['-hide_banner', '-i', path, '-f', 'null', 'NUL'],
    { allowProbeFailure: true },
  );
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Unable to read media duration: ${path}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

if (!existsSync(ffmpeg)) throw new Error(`FFmpeg not found: ${ffmpeg}`);
if (!existsSync(audioPath)) throw new Error(`MiniMax narration not found: ${audioPath}`);
if (timeline.length !== 7) throw new Error('Expected the seven-scene competition timeline');

const audioDuration = probeDuration(audioPath);
// Boundaries are the long paragraph pauses measured in the downloaded MiniMax
// narration. The final boundary uses the actual media duration.
const sceneEnds = [7.87559, 24.459, 56.8252, 79.033, 95.8756, 118.063, audioDuration];
const targetDurations = sceneDurationsFromEnds(sceneEnds);
const scenes = timeline.map((scene, index) => {
  const inputPath = join(rawRoot, `${scene.id}.webm`);
  if (!existsSync(inputPath)) throw new Error(`Recorded scene not found: ${inputPath}`);
  const rawDuration = probeDuration(inputPath);
  const targetDuration = targetDurations[index];
  return {
    id: scene.id,
    caption: scene.caption,
    inputPath,
    rawDuration,
    targetDuration,
    stretchRatio: targetDuration / rawDuration,
  };
});

let cursor = 0;
const srtEntries = scenes.map((scene) => {
  const start = cursor;
  cursor += scene.targetDuration;
  return { start, end: cursor, text: scene.caption };
});
writeFileSync(srtPath, buildSrt(srtEntries), 'utf8');
const narrationLines = [
  '# 涟千言三分钟功能演示旁白稿',
  '',
  '> 配音由 MiniMax 异步长文本语音合成生成；以下时间轴对应最终 143.8 秒成片。',
  '',
];
for (let index = 0; index < scenes.length; index += 1) {
  const entry = srtEntries[index];
  const clock = (seconds) => formatSrtTime(seconds).slice(3, 8);
  narrationLines.push(
    `## ${clock(entry.start)}–${clock(entry.end)} ${scenes[index].id}`,
    '',
    timeline[index].narration.trim(),
    '',
  );
}
writeFileSync(narrationPath, narrationLines.join('\n'), 'utf8');

const plan = {
  generatedAt: new Date().toISOString(),
  ffmpeg,
  audioPath,
  audioDuration,
  outputPath,
  durationUnderThreeMinutes: audioDuration < 180,
  scenes: scenes.map(({ inputPath, ...scene }) => ({
    ...scene,
    input: inputPath,
  })),
};
writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ dryRun: true, ...plan }, null, 2));
  process.exit(0);
}

const args = ['-y', '-hide_banner'];
for (const scene of scenes) args.push('-i', scene.inputPath);
args.push('-i', audioPath);

const filters = scenes.map((scene, index) => (
  `[${index}:v]setpts=${scene.stretchRatio.toFixed(9)}*PTS,fps=25,format=yuv420p[v${index}]`
));
filters.push(`${scenes.map((_, index) => `[v${index}]`).join('')}concat=n=${scenes.length}:v=1:a=0[joined]`);
filters.push(
  "[joined]subtitles=filename='涟千言_三分钟功能演示.srt':force_style='FontName=Microsoft YaHei,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00101010,BorderStyle=1,Outline=2,Shadow=0,MarginV=38,Alignment=2'[video]",
);

args.push(
  '-filter_complex', filters.join(';'),
  '-map', '[video]',
  '-map', `${scenes.length}:a:0`,
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '20',
  '-profile:v', 'high',
  '-level', '4.1',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '160k',
  '-ar', '48000',
  '-movflags', '+faststart',
  '-shortest',
  outputPath,
);

console.log(JSON.stringify({ event: 'encoding', outputPath, audioDuration }, null, 2));
runFfmpeg(args, { cwd: outputRoot });
console.log(JSON.stringify({ event: 'encoded', outputPath }, null, 2));
