import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = 3033;
const HOST = "localhost";
const BASE_URL = `http://${HOST}:${PORT}`;
const WORKSPACE_URL = `${BASE_URL}/workspace`;
const VIEWPORT = { width: 1440, height: 1024 };
const RECORD_SECONDS = 10;

const outputDir = path.join(process.cwd(), "docs", "demo");
const heroPath = path.join(outputDir, "workspace-hero.png");
const controlChatPath = path.join(outputDir, "workspace-control-chat.png");
const filesPanelPath = path.join(outputDir, "workspace-files-panel.png");
const gifPath = path.join(outputDir, "workspace-demo.gif");

function log(message) {
  process.stdout.write(`[demo:capture] ${message}\n`);
}

function readStream(stream, label) {
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) log(`${label}: ${line}`);
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) log(`${label}: ${buffer}`);
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${command} ${args.join(" ")} failed with ${reason}\n${stderr || stdout}`.trim()));
    });
  });
}

function waitForExit(child, name) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal, name });
    });
  });
}

async function waitForServer(server) {
  const timeoutAt = Date.now() + 60_000;

  while (Date.now() < timeoutAt) {
    if (server.exitCode !== null) {
      throw new Error(`next dev exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(WORKSPACE_URL, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Retry until the server responds.
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for the Next.js dev server.");
}

async function waitForWorkspaceUi(page) {
  await page.goto(WORKSPACE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForSelector('textarea[placeholder="Message Zyndrel…"]', { state: "visible" });
  await page.waitForSelector(".inference-display", { state: "visible" });
  await hideDevArtifacts(page);
  await delay(1200);
}

async function hideDevArtifacts(page) {
  await page.evaluate(() => {
    const selectors = [
      'button[aria-label="Open Next.js Dev Tools"]',
      "nextjs-portal",
      '[data-next-badge-root]',
      '[data-nextjs-toast]',
    ];

    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.remove();
      }
    }
  });
}

async function resetWorkspace(page) {
  await page.goto(WORKSPACE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem("zyndrel_raw_score", "0");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForSelector('textarea[placeholder="Message Zyndrel…"]', { state: "visible" });
  await page.waitForSelector(".inference-display", { state: "visible" });
  await hideDevArtifacts(page);
  await delay(1200);
}

async function getInferenceScore(page) {
  const raw = (await page.locator(".inference-display").innerText()).trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function findCreatureHitPoint(page) {
  const canvasBox = await page.locator("canvas").boundingBox();
  if (!canvasBox) {
    throw new Error("Unable to measure the workspace canvas.");
  }

  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;
  const offsets = [
    [0, 0],
    [0, 60],
    [0, -60],
    [-60, 0],
    [60, 0],
    [-120, 0],
    [120, 0],
    [-60, 60],
    [60, 60],
    [0, 120],
    [0, -120],
  ];

  const startingScore = await getInferenceScore(page);
  for (const [xOffset, yOffset] of offsets) {
    const point = { x: centerX + xOffset, y: centerY + yOffset };
    await page.mouse.click(point.x, point.y);
    await delay(250);

    const currentScore = await getInferenceScore(page);
    if (currentScore > startingScore) {
      return point;
    }
  }

  throw new Error("Unable to locate a working creature hit point near the canvas center.");
}

async function petCreature(page, point, count = 2) {
  for (let index = 0; index < count; index += 1) {
    await page.mouse.click(point.x, point.y);
    await delay(350);
  }
}

async function swipeCreature(page, point) {
  const leftX = point.x - 110;
  const rightX = point.x + 110;

  await page.mouse.move(leftX, point.y);
  await page.mouse.down();
  await page.mouse.move(rightX, point.y, { steps: 10 });
  await page.mouse.move(leftX, point.y, { steps: 10 });
  await page.mouse.move(rightX, point.y, { steps: 10 });
  await page.mouse.up();
  await delay(600);
}

async function domClick(page, selector) {
  await page.locator(selector).evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

async function openControlCenter(page) {
  await domClick(page, 'button[aria-label="Open Zyndrel control center"]');
  await page.waitForSelector("#zyndrel-control-center-panel", { state: "visible" });
  await delay(400);
}

async function typeChatMessage(page, { slow = false } = {}) {
  const selector = 'textarea[placeholder="Message Zyndrel…"]';
  await page.click(selector);
  await page.fill(selector, "");
  if (slow) {
    await page.type(selector, "Hello Zyndrel", { delay: 90 });
  } else {
    await page.fill(selector, "Hello Zyndrel");
  }
  await delay(300);
}

async function openFilesPanel(page) {
  await domClick(page, 'button[aria-label="Files Received"]');
  await page.waitForSelector(".module-board-card", { state: "visible", timeout: 15_000 });
  await delay(500);
}

async function startPeekabooRecording(tempDir) {
  const videoPath = path.join(tempDir, "workspace-demo.mp4");

  const launch = (modeArgs) => {
    const child = spawn(
      "peekaboo",
      [
        "capture",
        "live",
        "--app",
        "Google Chrome",
        ...modeArgs,
        "--duration",
        String(RECORD_SECONDS),
        "--active-fps",
        "12",
        "--idle-fps",
        "4",
        "--resolution-cap",
        "1440",
        "--quiet-ms",
        "600",
        "--path",
        tempDir,
        "--video-out",
        videoPath,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    readStream(child.stdout, "peekaboo");
    readStream(child.stderr, "peekaboo");
    return child;
  };

  let child = launch(["--mode", "window", "--window-title", "Zyndrel World"]);
  let exitPromise = waitForExit(child, "peekaboo");
  const earlyResult = await Promise.race([exitPromise, delay(1_000).then(() => null)]);

  if (earlyResult && earlyResult.code !== 0) {
    log("Peekaboo window-title capture failed quickly, retrying with frontmost mode.");
    child = launch(["--mode", "frontmost"]);
    exitPromise = waitForExit(child, "peekaboo");
    await delay(1_000);
  }

  return { videoPath, exitPromise };
}

async function convertVideoToGif(videoPath) {
  const palettePath = path.join(path.dirname(videoPath), "workspace-demo-palette.png");
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-vf",
    "fps=8,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff",
    palettePath,
  ]);
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-i",
    palettePath,
    "-lavfi",
    "fps=8,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a",
    gifPath,
  ]);
}

async function captureScreenshots(page, hitPoint) {
  await page.screenshot({ path: heroPath });
  await petCreature(page, hitPoint, 2);
  await swipeCreature(page, hitPoint);
  await openControlCenter(page);
  await typeChatMessage(page);
  await page.screenshot({ path: controlChatPath });
  await openFilesPanel(page);
  await page.screenshot({ path: filesPanelPath });
}

async function recordMotionSequence(page, hitPoint) {
  await petCreature(page, hitPoint, 2);
  await swipeCreature(page, hitPoint);
  await openControlCenter(page);
  await typeChatMessage(page, { slow: true });
  await delay(400);
  await openFilesPanel(page);
  await delay(1_800);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zyndrel-demo-"));
  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BROWSER: "none",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  readStream(server.stdout, "next");
  readStream(server.stderr, "next");

  let browser;
  let context;
  try {
    await waitForServer(server);

    browser = await chromium.launch({
      channel: "chrome",
      headless: false,
      args: [`--window-size=${VIEWPORT.width},${VIEWPORT.height}`],
    });

    context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: {
        dir: tempDir,
        size: VIEWPORT,
      },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await page.bringToFront();

    await resetWorkspace(page);
    const hitPoint = await findCreatureHitPoint(page);

    await resetWorkspace(page);
    await captureScreenshots(page, hitPoint);
    await page.close();

    const motionPage = await context.newPage();
    motionPage.setDefaultTimeout(15_000);
    const motionVideo = motionPage.video();
    await resetWorkspace(motionPage);
    await motionPage.bringToFront();
    const recording = await startPeekabooRecording(tempDir);
    await delay(800);
    await recordMotionSequence(motionPage, hitPoint);

    const recordingResult = await recording.exitPromise;
    const usePeekabooVideo = recordingResult.code === 0;
    await motionPage.close();
    await context.close();
    context = null;

    const videoSource = usePeekabooVideo
      ? recording.videoPath
      : await motionVideo.path();

    if (!usePeekabooVideo) {
      log("Peekaboo capture failed; using Playwright video fallback for GIF generation.");
    }

    await convertVideoToGif(videoSource);
    log(`Wrote ${path.relative(process.cwd(), heroPath)}`);
    log(`Wrote ${path.relative(process.cwd(), controlChatPath)}`);
    log(`Wrote ${path.relative(process.cwd(), filesPanelPath)}`);
    log(`Wrote ${path.relative(process.cwd(), gifPath)}`);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }

    if (browser) {
      await browser.close().catch(() => {});
    }

    if (server.exitCode === null) {
      server.kill("SIGINT");
      const exitResult = await Promise.race([waitForExit(server, "next dev"), delay(5_000).then(() => null)]);
      if (!exitResult && server.exitCode === null) {
        server.kill("SIGKILL");
      }
    }

    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
