import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2];

if (!mode || (mode !== "dev" && mode !== "start")) {
  process.stderr.write("Usage: node scripts/run-next-with-access.mjs <dev|start>\n");
  process.exit(1);
}

const port = process.env.PORT || "3000";
const host = process.env.HOST || "0.0.0.0";
const route = "/workspace";

function resolveTailscaleBin() {
  const candidates = [
    process.env.TAILSCALE_BIN,
    "/opt/homebrew/bin/tailscale",
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getTailscaleTarget() {
  const tailscaleBin = resolveTailscaleBin();
  if (!tailscaleBin) return null;

  const result = spawnSync(tailscaleBin, ["status", "--json"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout) return null;

  try {
    const payload = JSON.parse(result.stdout);
    const dnsName = typeof payload?.Self?.DNSName === "string" ? payload.Self.DNSName.replace(/\.$/, "") : "";
    const ip = Array.isArray(payload?.TailscaleIPs) ? payload.TailscaleIPs[0] : "";
    return dnsName || ip || null;
  } catch {
    return null;
  }
}

const localUrl = `http://localhost:${port}${route}`;
const tailscaleTarget = getTailscaleTarget();
const tailscaleUrl = tailscaleTarget ? `http://${tailscaleTarget}:${port}${route}` : null;

function transformLine(line) {
  if (/^\s+- Local:\s+/.test(line)) {
    return `   - Local:        ${localUrl}`;
  }

  if (/^\s+- Network:\s+/.test(line)) {
    return tailscaleUrl ? `   - Tailscale:    ${tailscaleUrl}` : line;
  }

  return line;
}

function pipeStream(stream, writer) {
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      writer.write(`${transformLine(line)}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer) {
      writer.write(transformLine(buffer));
    }
  });
}

const localNextBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);

const nextCommand = existsSync(localNextBin) ? localNextBin : "npx";
const nextArgs = existsSync(localNextBin)
  ? [mode, "-H", host, "-p", port]
  : ["next", mode, "-H", host, "-p", port];

const child = spawn(nextCommand, nextArgs, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

pipeStream(child.stdout, process.stdout);
pipeStream(child.stderr, process.stderr);

const forwardSignal = (signal) => {
  if (child.exitCode === null) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
