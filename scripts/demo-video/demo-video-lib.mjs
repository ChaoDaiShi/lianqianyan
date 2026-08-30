const SECRET_KEY_PATTERN = /(api[_-]?key|authorization|cookie|password|secret|token)/i;
const BEARER_PATTERN = /Bearer\s+[^\s,;"']+/gi;

export function parseClock(text) {
  const value = String(text).trim();
  const parts = value.split(':');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid clock value: ${value}`);
  }
  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length === 1 ? Number(parts[0]) : 0;
  if (![seconds, minutes, hours].every(Number.isFinite) || seconds < 0 || minutes < 0 || hours < 0) {
    throw new Error(`Invalid clock value: ${value}`);
  }
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatSrtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('SRT time must be a non-negative number');
  }
  const totalMilliseconds = Math.round(seconds * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const wholeSeconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function buildSrt(entries) {
  return entries
    .flatMap((entry, index) => [
      String(index + 1),
      `${formatSrtTime(entry.start)} --> ${formatSrtTime(entry.end)}`,
      String(entry.text).trim(),
      '',
    ])
    .join('\n');
}

export function assertCompetitionMetrics(metrics) {
  if (!(metrics.durationSeconds < 180)) {
    throw new Error('Competition video must be shorter than 180 seconds');
  }
  if (!(metrics.fileBytes < 200 * 1024 * 1024)) {
    throw new Error('Competition video must be smaller than 200 MiB');
  }
  if (metrics.width !== 1920 || metrics.height !== 1080) {
    throw new Error('Competition video must be 1920x1080');
  }
  if (!metrics.hasVideo) {
    throw new Error('Competition video must contain a video stream');
  }
  if (!metrics.hasAudio) {
    throw new Error('Competition video must contain an audio stream');
  }
}

export function redactSecrets(value, key = '') {
  if (SECRET_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactSecrets(childValue, childKey),
      ]),
    );
  }
  if (typeof value === 'string') {
    return value.replace(BEARER_PATTERN, 'Bearer [REDACTED]');
  }
  return value;
}

export function timelineDuration(timeline) {
  return timeline.reduce((total, scene) => total + Number(scene.targetSeconds || 0), 0);
}

export function timelineToSrtEntries(timeline) {
  let cursor = 0;
  return timeline.map((scene) => {
    const start = cursor;
    cursor += Number(scene.targetSeconds);
    return { start, end: cursor, text: scene.caption };
  });
}
