import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  DEMO_ENDPOINT_PATTERNS,
  redactSecrets,
  selectRecordedVideoFile,
  selectTimelineScenes,
  timelineDuration,
} from './demo-video-lib.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDir, '..', '..');
const outputRoot = path.join(workspace, 'demo_video_20260830');
const rawDir = path.join(outputRoot, 'raw-scenes');
const stillDir = path.join(outputRoot, 'stills');
const runtimeDir = path.join(outputRoot, 'runtime');
const timelinePath = path.join(scriptDir, 'timeline.json');
const evidencePath = path.join(outputRoot, 'recording-evidence.json');
const storageStatePath = path.join(runtimeDir, 'recording-storage-state.json');
const credentialsPath = path.join(runtimeDir, 'demo-credentials.json');
const baseUrl = process.env.DEMO_VIDEO_URL || 'http://127.0.0.1:5180';
const chromePath = process.env.DEMO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dryRun = process.argv.includes('--dry-run');
const requestedSceneIds = process.argv
  .filter((argument) => argument.startsWith('--scene='))
  .map((argument) => argument.slice('--scene='.length))
  .filter(Boolean);

function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    path.join(workspace, 'node_modules', 'playwright'),
    path.join(
      process.env.USERPROFILE || '',
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      'playwright',
    ),
  ];
  for (const candidate of candidates) {
    try {
      return { module: require(candidate), candidate };
    } catch {
      // Continue to the next known runtime location.
    }
  }
  throw new Error(`Playwright was not found in: ${candidates.join(', ')}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function waitForBusinessResponse(page, pattern, action, timeout = 90000) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => pattern.test(new URL(candidate.url()).pathname),
      { timeout },
    ),
    action(),
  ]);
  return response;
}

async function waitForUiSettled(page, milliseconds = 1200) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(milliseconds);
}

async function clickIfVisible(locator) {
  if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
    await locator.first().click();
    return true;
  }
  return false;
}

async function recordScene({ chromium, scene, credentials, useStorageState, action }) {
  const sceneDir = path.join(rawDir, `capture-${scene.id}`);
  await fs.rm(sceneDir, { recursive: true, force: true });
  await fs.mkdir(sceneDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    recordVideo: { dir: sceneDir, size: { width: 1920, height: 1080 } },
    storageState: useStorageState ? storageStatePath : undefined,
  });
  const page = await context.newPage();
  const apiResponses = [];
  const pageErrors = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/')) {
      apiResponses.push({
        method: response.request().method(),
        path: url.pathname,
        status: response.status(),
      });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
  });

  const startedAt = new Date().toISOString();
  let actionError = null;
  try {
    await action(page, credentials);
    await waitForUiSettled(page, 1000);
    await page.screenshot({
      path: path.join(stillDir, `${scene.id}.png`),
      fullPage: false,
    });
    if (useStorageState || scene.id === 'auth-home') {
      await context.storageState({ path: storageStatePath });
    }
  } catch (error) {
    actionError = error instanceof Error ? error.message : String(error);
    await page.screenshot({
      path: path.join(stillDir, `${scene.id}-error.png`),
      fullPage: true,
    });
  }
  await context.close();
  await browser.close();
  const destination = path.join(rawDir, `${scene.id}.webm`);
  const recordedFile = selectRecordedVideoFile(await fs.readdir(sceneDir));
  await fs.copyFile(path.join(sceneDir, recordedFile), destination);
  const stat = await fs.stat(destination);
  const record = redactSecrets({
    id: scene.id,
    route: scene.route,
    startedAt,
    completedAt: new Date().toISOString(),
    file: path.relative(workspace, destination),
    bytes: stat.size,
    featureEvidence: scene.featureEvidence,
    apiResponses,
    pageErrors,
    actionError,
  });
  if (actionError) throw new Error(`${scene.id} recording failed: ${actionError}`);
  return record;
}

const timeline = await readJson(timelinePath);
const selectedTimeline = selectTimelineScenes(timeline, requestedSceneIds);
const { module: playwright, candidate: playwrightPath } = resolvePlaywright();
if (timeline.length !== 7 || timelineDuration(timeline) !== 170) {
  throw new Error('The demo timeline must contain seven scenes totaling 170 seconds');
}
for (const scene of timeline) {
  if (!scene.route || !Array.isArray(scene.featureEvidence) || scene.featureEvidence.length === 0) {
    throw new Error(`Scene ${scene.id} is missing a route or feature evidence`);
  }
}
await fs.access(chromePath);

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        valid: true,
        scenes: selectedTimeline.map((scene) => scene.id),
        targetSeconds: timelineDuration(selectedTimeline),
        browser: chromePath,
        playwright: playwrightPath,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

await fs.mkdir(rawDir, { recursive: true });
await fs.mkdir(stillDir, { recursive: true });
await fs.mkdir(runtimeDir, { recursive: true });
const credentials = await readJson(credentialsPath);
if (!credentials.username || !credentials.password) {
  throw new Error('Demo credentials are incomplete');
}

const byId = Object.fromEntries(timeline.map((scene) => [scene.id, scene]));
const selectedIds = new Set(selectedTimeline.map((scene) => scene.id));
const shouldRecord = (id) => selectedIds.has(id);
const records = [];

if (shouldRecord('opening')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId.opening,
    credentials,
    useStorageState: false,
    action: async (page) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.getByText('把今天的学习，').waitFor({ state: 'visible' });
      await page.locator('input[name=username]').focus();
      await page.waitForTimeout(5000);
    },
  }),
);

if (shouldRecord('auth-home')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId['auth-home'],
    credentials,
    useStorageState: false,
    action: async (page, account) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.locator('input[name=username]').fill(account.username);
      await page.locator('input[name=password]').fill(account.password);
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.login, () =>
        page.getByRole('button', { name: '进入我的学习空间' }).click(),
      );
      await page.getByText('今天的学习路径').waitFor({ state: 'visible' });
      await page.waitForTimeout(2500);
      await page.getByRole('link', { name: '我的学习' }).click();
      await page.getByText('我的成长路线').waitFor({ state: 'visible' });
      await page.waitForTimeout(4500);
    },
  }),
);

if (shouldRecord('learning-loop')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId['learning-loop'],
    credentials,
    useStorageState: true,
    action: async (page) => {
      await page.goto(`${baseUrl}/#/my-learning`, { waitUntil: 'networkidle' });
      await page.getByText('死锁', { exact: true }).first().waitFor({ state: 'visible' });
      await page.waitForTimeout(2500);
      await page.getByRole('button', { name: '开始' }).first().click();
      await page.getByText('小涟学习准备').waitFor({ state: 'visible' });
      await page.waitForTimeout(1800);
      await page.getByRole('button', { name: '准备好了，开始学习' }).click();
      await page.getByText('死锁 · 快速练习').waitFor({ state: 'visible' });
      await page.waitForTimeout(2500);
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.tutor, () =>
        page.getByRole('button', { name: '死锁的四个必要条件怎么记？' }).click(),
        120000,
      );
      await page.waitForTimeout(3500);
      await page.locator('button').filter({ hasText: '可抢占' }).click();
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.practice, () =>
        page.getByRole('button', { name: '提交答案' }).click(),
      );
      await page.waitForTimeout(4500);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(3500);
    },
  }),
);

if (shouldRecord('knowledge')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId.knowledge,
    credentials,
    useStorageState: true,
    action: async (page) => {
      await page.goto(`${baseUrl}/#/knowledge`, { waitUntil: 'networkidle' });
      const svg = page.locator('svg').last();
      await svg.waitFor({ state: 'visible' });
      await page.waitForTimeout(3000);
      const box = await svg.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
        await page.mouse.wheel(0, -550);
        await page.waitForTimeout(1200);
        await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.42);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.52, { steps: 15 });
        await page.mouse.up();
      }
      await page.waitForTimeout(2000);
      await clickIfVisible(page.getByText('银行家算法的推理过程', { exact: true }));
      await page.waitForTimeout(3500);
      await page.getByRole('link', { name: '学习诊断' }).click();
      await page.getByText('学习观察空间').waitFor({ state: 'visible' });
      await page.getByRole('button').filter({ hasText: '死锁' }).last().click();
      await page.waitForTimeout(4500);
    },
  }),
);

if (shouldRecord('exam')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId.exam,
    credentials,
    useStorageState: true,
    action: async (page) => {
      await page.goto(`${baseUrl}/#/exams`, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'AI 智能组卷' }).click();
      await page.getByRole('button', { name: '生成专项练习' }).click();
      await page.getByLabel('标题', { exact: true }).fill('死锁关键条件专项练习');
      for (const label of ['进程基础', '进程调度', '死锁', '进程同步', 'PV 操作']) {
        const checkbox = page.getByLabel(label, { exact: true });
        await checkbox.setChecked(label === '死锁');
      }
      await page.getByLabel('题数').fill('3');
      await page.getByLabel('时长', { exact: true }).fill('10');
      await page.waitForTimeout(2200);
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.examGenerate, () =>
        page.getByRole('button', { name: '生成并发布练习' }).click(),
        120000,
      );
      await page.waitForTimeout(4500);
      await page.getByRole('tab', { name: '当前测评' }).click();
      await page.waitForTimeout(3500);
      await clickIfVisible(page.getByRole('button', { name: /开始|进入/ }));
      await page.waitForTimeout(3500);
    },
  }),
);

if (shouldRecord('resources')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId.resources,
    credentials,
    useStorageState: true,
    action: async (page) => {
      await page.goto(`${baseUrl}/#/resources`, { waitUntil: 'networkidle' });
      await page.getByLabel('选择知识点').selectOption('kp-deadlock');
      await page
        .locator('label')
        .filter({ hasText: '02 · 选择生成模式' })
        .locator('select')
        .selectOption('presentation');
      await page.waitForTimeout(2500);
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.resourceGenerate, () =>
        page.getByRole('button', { name: '03 · 开始生成' }).click(),
        180000,
      );
      await page.waitForTimeout(7000);
      await page.mouse.wheel(0, 750);
      await page.waitForTimeout(4000);
      await clickIfVisible(page.getByRole('button', { name: /下载|导出/ }));
      await page.waitForTimeout(2500);
    },
  }),
);

if (shouldRecord('xiaolian-close')) records.push(
  await recordScene({
    chromium: playwright.chromium,
    scene: byId['xiaolian-close'],
    credentials,
    useStorageState: true,
    action: async (page) => {
      await page.goto(`${baseUrl}/#/xiaolian`, { waitUntil: 'networkidle' });
      await waitForBusinessResponse(page, DEMO_ENDPOINT_PATTERNS.tutor, () =>
        page.getByRole('button', { name: '我现在最应该学什么，为什么？' }).click(),
        120000,
      );
      await page.waitForTimeout(5000);
      await clickIfVisible(page.getByRole('button', { name: /播放|朗读/ }));
      await page.waitForTimeout(3500);
      await page.getByRole('link', { name: '学习档案' }).click();
      await page.getByText('学习成长故事').waitFor({ state: 'visible' });
      await page.waitForTimeout(3500);
      await page.getByRole('link', { name: '设置' }).click();
      await page.getByText('偏好与服务').waitFor({ state: 'visible' });
      await page.waitForTimeout(3500);
    },
  }),
);

let previousEvidence = { scenes: [] };
try {
  previousEvidence = await readJson(evidencePath);
} catch {
  // The first successful scene creates the evidence file.
}
const sceneRecords = new Map(
  [...(previousEvidence.scenes || []), ...records].map((record) => [record.id, record]),
);
const mergedScenes = timeline.map((scene) => sceneRecords.get(scene.id)).filter(Boolean);
const evidence = redactSecrets({
  recordedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 1920, height: 1080 },
  targetSeconds: timelineDuration(timeline),
  complete: mergedScenes.length === timeline.length,
  scenes: mergedScenes,
});
await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      complete: evidence.complete,
      recordedScenes: records.map((record) => record.id),
      totalScenes: mergedScenes.length,
      evidencePath,
    },
    null,
    2,
  ),
);
