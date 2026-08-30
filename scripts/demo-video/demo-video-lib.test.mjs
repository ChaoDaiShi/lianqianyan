import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCompetitionMetrics,
  buildSrt,
  formatSrtTime,
  parseClock,
  redactSecrets,
} from './demo-video-lib.mjs';

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
