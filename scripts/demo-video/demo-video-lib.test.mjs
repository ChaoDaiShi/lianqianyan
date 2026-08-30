import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEMO_ENDPOINT_PATTERNS,
  assertCompetitionMetrics,
  buildSrt,
  formatSrtTime,
  parseClock,
  parseFfmpegProbe,
  redactSecrets,
  sceneDurationsFromEnds,
  selectRecordedVideoFile,
  selectTimelineScenes,
} from './demo-video-lib.mjs';

test('parseFfmpegProbe reads duration, codecs, dimensions, and streams', () => {
  const probe = `Duration: 00:02:23.76, start: 0.000000, bitrate: 1400 kb/s
    Stream #0:0: Video: h264 (High), yuv420p, 1920x1080, 25 fps
    Stream #0:1: Audio: aac (LC), 48000 Hz, mono, fltp, 160 kb/s`;
  assert.deepEqual(parseFfmpegProbe(probe), {
    durationSeconds: 143.76,
    width: 1920,
    height: 1080,
    videoCodec: 'h264',
    audioCodec: 'aac',
    hasVideo: true,
    hasAudio: true,
  });
});

test('sceneDurationsFromEnds converts cumulative MiniMax paragraph boundaries', () => {
  assert.deepEqual(
    sceneDurationsFromEnds([7.875, 24.459, 56.825]),
    [7.875, 16.584, 32.366],
  );
  assert.throws(() => sceneDurationsFromEnds([7, 6]), /strictly increasing/);
});

test('demo endpoint patterns match the product API routes used by recorded actions', () => {
  assert.equal(DEMO_ENDPOINT_PATTERNS.tutor.test('/api/agents/chat'), true);
  assert.equal(DEMO_ENDPOINT_PATTERNS.practice.test('/api/practice/evaluate'), true);
  assert.equal(DEMO_ENDPOINT_PATTERNS.tutor.test('/api/agents/tutor'), false);
});

test('parseClock converts minute clock strings to seconds', () => {
  assert.equal(parseClock('02:50.250'), 170.25);
});

test('formatSrtTime emits an SRT timestamp', () => {
  assert.equal(formatSrtTime(65.007), '00:01:05,007');
});

test('buildSrt numbers entries and keeps two-line captions', () => {
  assert.equal(
    buildSrt([
      { start: 0, end: 1.25, text: '涟千言\n陪伴式学习空间' },
      { start: 1.25, end: 2, text: '真实运行' },
    ]),
    [
      '1',
      '00:00:00,000 --> 00:00:01,250',
      '涟千言\n陪伴式学习空间',
      '',
      '2',
      '00:00:01,250 --> 00:00:02,000',
      '真实运行',
      '',
    ].join('\n'),
  );
});

test('competition metrics accept values strictly below the hard limits', () => {
  assert.doesNotThrow(() =>
    assertCompetitionMetrics({
      durationSeconds: 179.99,
      fileBytes: 199 * 1024 * 1024,
      width: 1920,
      height: 1080,
      hasVideo: true,
      hasAudio: true,
    }),
  );
});

test('competition metrics reject a duration of exactly 180 seconds', () => {
  assert.throws(
    () =>
      assertCompetitionMetrics({
        durationSeconds: 180,
        fileBytes: 50 * 1024 * 1024,
        width: 1920,
        height: 1080,
        hasVideo: true,
        hasAudio: true,
      }),
    /shorter than 180 seconds/,
  );
});

test('competition metrics reject a file of exactly 200 MiB', () => {
  assert.throws(
    () =>
      assertCompetitionMetrics({
        durationSeconds: 170,
        fileBytes: 200 * 1024 * 1024,
        width: 1920,
        height: 1080,
        hasVideo: true,
        hasAudio: true,
      }),
    /smaller than 200 MiB/,
  );
});

test('redactSecrets removes secret fields and bearer tokens recursively', () => {
  const value = {
    api_key: 'secret-key',
    headers: {
      Authorization: 'Bearer abc.def.ghi',
      Accept: 'application/json',
    },
    message: 'request used Bearer should-not-leak',
    nested: [{ cookie: 'session=value' }, { safe: 'visible' }],
  };

  assert.deepEqual(redactSecrets(value), {
    api_key: '[REDACTED]',
    headers: {
      Authorization: '[REDACTED]',
      Accept: 'application/json',
    },
    message: 'request used Bearer [REDACTED]',
    nested: [{ cookie: '[REDACTED]' }, { safe: 'visible' }],
  });
});

test('selectRecordedVideoFile returns the single Playwright WebM artifact', () => {
  assert.equal(
    selectRecordedVideoFile(['trace.zip', 'page@abc.webm', 'screenshot.png']),
    'page@abc.webm',
  );
  assert.throws(() => selectRecordedVideoFile([]), /exactly one WebM/);
  assert.throws(
    () => selectRecordedVideoFile(['a.webm', 'b.webm']),
    /exactly one WebM/,
  );
});

test('selectTimelineScenes supports independent scene re-recording', () => {
  const timeline = [{ id: 'opening' }, { id: 'learning-loop' }, { id: 'exam' }];
  assert.deepEqual(selectTimelineScenes(timeline, []), timeline);
  assert.deepEqual(selectTimelineScenes(timeline, ['learning-loop']), [timeline[1]]);
  assert.throws(
    () => selectTimelineScenes(timeline, ['missing']),
    /Unknown scene: missing/,
  );
});
