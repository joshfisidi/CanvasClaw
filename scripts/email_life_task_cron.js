#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let cachedGoogle = null;
function getGoogle() {
  if (cachedGoogle) return cachedGoogle;
  ({ google: cachedGoogle } = require('googleapis'));
  return cachedGoogle;
}

const DEFAULTS = {
  days: 1,
  maxMessages: 30,
  maxTasks: 6,
  maxEmailTasks: 4,
  taskList: process.env.TASKS_DAILY_LIST || 'Zyndrel Daily',
};
const DEFAULT_LOCK_STALE_MS = Number.parseInt(process.env.EMAIL_LIFE_LOCK_STALE_MS || '1800000', 10);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    ...DEFAULTS,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) continue;

    if (key === 'days') options.days = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.days);
    if (key === 'max-messages') options.maxMessages = Math.max(5, Number.parseInt(next, 10) || DEFAULTS.maxMessages);
    if (key === 'max-tasks') options.maxTasks = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.maxTasks);
    if (key === 'max-email-tasks') options.maxEmailTasks = Math.max(1, Number.parseInt(next, 10) || DEFAULTS.maxEmailTasks);
    if (key === 'task-list') options.taskList = String(next).trim() || DEFAULTS.taskList;

    i += 1;
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  const payload = JSON.stringify(data, null, 2);
  const dirPath = path.dirname(filePath);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  try {
    fs.writeFileSync(tempPath, payload);
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function resolveCredentialPaths() {
  const openclawRoot = process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw');
  const credsPath = process.env.GMAIL_CREDS || path.join(openclawRoot, 'credentials', 'gmail-client.json');
  const tokenPath = process.env.GMAIL_TOKEN || path.join(openclawRoot, 'credentials', 'gmail-token.json');
  return { credsPath, tokenPath };
}

function resolveRunLockPath() {
  const openclawRoot = process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw');
  return process.env.EMAIL_LIFE_LOCK || path.join(openclawRoot, 'locks', 'email-life-task-cron.lock');
}

function readExistingLockMeta(lockPath) {
  try {
    const parsed = readJson(lockPath);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function acquireRunLock(lockPath, staleMs = DEFAULT_LOCK_STALE_MS) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      const lockMeta = {
        pid: process.pid,
        host: os.hostname(),
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(fd, JSON.stringify(lockMeta, null, 2));
      fs.closeSync(fd);

      let released = false;
      return function releaseRunLock() {
        if (released) return;
        released = true;
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Ignore release failures to preserve script outcome.
        }
      };
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      let isStale = false;
      try {
        const stats = fs.statSync(lockPath);
        isStale = Number.isFinite(stats.mtimeMs) && (Date.now() - stats.mtimeMs > staleMs);
      } catch {
        // Another process may have removed/replaced the file; retry acquisition.
      }

      if (isStale) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Ignore and allow second attempt to report a concrete conflict.
        }
        continue;
      }

      const existing = readExistingLockMeta(lockPath);
      const owner = existing && existing.pid ? ` pid=${existing.pid}` : '';
      const createdAt = existing && existing.createdAt ? ` since=${existing.createdAt}` : '';
      throw new Error(`Another email-life cron run is already in progress (${lockPath}${owner}${createdAt})`);
    }
  }

  throw new Error(`Unable to acquire lock: ${lockPath}`);
}

function createOauthClient() {
  const google = getGoogle();
  const { credsPath, tokenPath } = resolveCredentialPaths();
  if (!fs.existsSync(credsPath)) {
    throw new Error('Missing Gmail OAuth client file: ' + credsPath);
  }
  if (!fs.existsSync(tokenPath)) {
    throw new Error('Missing Gmail OAuth token file: ' + tokenPath);
  }

  const credentials = readJson(credsPath);
  const token = readJson(tokenPath);
  const payload = credentials.installed || credentials.web;
  if (!payload) throw new Error('Invalid OAuth client file: expected "installed" or "web".');

  const client = new google.auth.OAuth2(
    payload.client_id,
    payload.client_secret,
    Array.isArray(payload.redirect_uris) ? payload.redirect_uris[0] : undefined
  );
  client.setCredentials(token);

  client.on('tokens', (nextTokens) => {
    if (!nextTokens) return;
    const merged = { ...token, ...nextTokens };
    writeJson(tokenPath, merged);
  });

  return client;
}

function getHeader(headers, name) {
  if (!Array.isArray(headers)) return '';
  const lower = String(name).toLowerCase();
  const found = headers.find((h) => String(h && h.name).toLowerCase() === lower);
  return found && typeof found.value === 'string' ? found.value : '';
}

function normalizeSubject(subject) {
  return String(subject || '')
    .replace(/^(re|fwd?)\s*:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function senderName(fromHeader) {
  const raw = String(fromHeader || '').trim();
  if (!raw) return 'sender';
  const match = raw.match(/^"?([^"<]+)"?\s*</);
  if (match && match[1]) return match[1].trim();
  const atIx = raw.indexOf('@');
  if (atIx > 0) return raw.slice(0, atIx).replace(/[<>"']/g, '').trim();
  return raw.replace(/[<>"']/g, '').trim();
}

function isLikelyNoise(text) {
  return /(unsubscribe|newsletter|digest|marketing|promotion|receipt from no-reply|donotreply|noreply)/i.test(text);
}

function classifyEmail(signal) {
  const text = (signal.subject + ' ' + signal.snippet + ' ' + signal.from).toLowerCase();
  const urgent = /(urgent|asap|action required|deadline|due today|overdue|follow up|follow-up|reminder)/i.test(text);

  const rules = [
    { key: 'finance', regex: /(invoice|payment|bill|receipt|refund|charge|wire|bank|payroll|tax)/i, title: 'Review financial action' },
    { key: 'opportunity', regex: /(opportunity|proposal|contract|client|partnership|intro|lead|application|interview)/i, title: 'Advance opportunity' },
    { key: 'scheduling', regex: /(meeting|calendar|schedule|call|zoom|reschedul|appointment)/i, title: 'Confirm meeting next step' },
    { key: 'legal', regex: /(legal|court|attorney|compliance|policy|license|irs)/i, title: 'Address legal or compliance item' },
    { key: 'health', regex: /(doctor|health|medical|pharmacy|lab|therapy|insurance)/i, title: 'Handle health-related follow-up' },
    { key: 'operations', regex: /(action required|todo|to-do|approval|review request|pending)/i, title: 'Handle requested action' },
  ];

  let matched = null;
  for (const rule of rules) {
    if (rule.regex.test(text)) {
      matched = rule;
      break;
    }
  }
  if (!matched) return null;

  let score = 1;
  if (urgent) score += 2;
  if (/tomorrow|today|eod|end of day|this week/i.test(text)) score += 1;
  if (/no-reply|noreply|donotreply/i.test(text)) score -= 1;
  if (/important|priority|final notice/i.test(text)) score += 1;

  const shortSubject = normalizeSubject(signal.subject).slice(0, 70) || 'untitled email';
  const title = matched.title + ': ' + shortSubject;
  const notes = [
    '[auto][email-signal][' + matched.key + ']',
    'From: ' + signal.from,
    'Date: ' + signal.date,
    'Subject: ' + normalizeSubject(signal.subject),
    '',
    'Snippet:',
    signal.snippet || '(no snippet)',
  ].join('\n');

  return {
    source: 'email',
    score,
    category: matched.key,
    title,
    notes,
    messageId: signal.id,
  };
}

function strategicTasksFromSignals(signals) {
  const categories = new Set(signals.map((s) => s.category));
  const picks = [];

  picks.push({
    source: 'strategic',
    score: 2,
    title: 'Ship one high-leverage deliverable before noon',
    notes: '[life-progress][execution]\nChoose one meaningful output that compounds progress and finish it before context switching.',
  });

  if (categories.has('opportunity') || categories.has('finance')) {
    picks.push({
      source: 'strategic',
      score: 2,
      title: 'Send one proactive follow-up that creates upside',
      notes: '[life-progress][growth]\nMove one opportunity forward without waiting for another reminder email.',
    });
  } else {
    picks.push({
      source: 'strategic',
      score: 1,
      title: 'Create tomorrow plan before shutdown',
      notes: '[life-progress][planning]\nWrite a 3-item plan for tomorrow to reduce startup friction.',
    });
  }

  if (categories.has('health')) {
    picks.push({
      source: 'strategic',
      score: 1,
      title: 'Do a 30-minute body reset',
      notes: '[life-progress][health]\nWalk, workout, or stretch to protect energy and consistency.',
    });
  }

  return picks;
}

function toDueTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function findOrCreateTaskList(tasksApi, title) {
  const lists = [];
  let pageToken;
  do {
    const res = await tasksApi.tasklists.list({
      maxResults: 100,
      pageToken,
    });
    const items = Array.isArray(res.data.items) ? res.data.items : [];
    lists.push(...items);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const existing = lists.find((l) => String(l.title).trim() === title);
  if (existing && existing.id) return existing.id;

  const created = await tasksApi.tasklists.insert({
    requestBody: { title },
  });
  return created.data.id;
}

async function fetchRecentEmailSignals(gmailApi, options) {
  const query = [
    'newer_than:' + options.days + 'd',
    '-category:promotions',
    '-category:social',
  ].join(' ');

  const listRes = await gmailApi.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: options.maxMessages,
  });
  const ids = (listRes.data.messages || []).map((m) => m.id).filter(Boolean);
  if (!ids.length) return [];

  const out = [];
  for (const id of ids) {
    const res = await gmailApi.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });
    const payload = res.data.payload || {};
    const headers = payload.headers || [];
    const subject = getHeader(headers, 'Subject');
    const from = getHeader(headers, 'From');
    const date = getHeader(headers, 'Date');
    const snippet = String(res.data.snippet || '').replace(/\s+/g, ' ').trim();
    const combined = [subject, from, snippet].join(' ');
    if (!subject && !snippet) continue;
    if (isLikelyNoise(combined) && !/(urgent|action required|deadline|overdue|follow up)/i.test(combined)) {
      continue;
    }
    out.push({
      id,
      subject,
      from: from || senderName(from),
      date: date || new Date().toISOString(),
      snippet,
    });
  }
  return out;
}

function dedupeByTitle(tasks) {
  const seen = new Set();
  const out = [];
  for (const task of tasks) {
    const key = String(task.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(task);
  }
  return out;
}

async function existingOpenTitleSet(tasksApi, taskListId) {
  const titles = new Set();
  let pageToken;

  do {
    const res = await tasksApi.tasks.list({
      tasklist: taskListId,
      maxResults: 100,
      showCompleted: false,
      showHidden: false,
      pageToken,
    });
    for (const item of res.data.items || []) {
      const title = String(item.title || '').trim().toLowerCase();
      if (title) titles.add(title);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return titles;
}

async function main() {
  const options = parseArgs(process.argv);
  const lockPath = resolveRunLockPath();
  const releaseRunLock = acquireRunLock(lockPath);

  console.log('[email-life] run start: ' + new Date().toISOString());
  console.log('[email-life] lock acquired: ' + lockPath);
  console.log('[email-life] options: ' + JSON.stringify(options));

  try {
    const google = getGoogle();
    const auth = createOauthClient();
    const gmailApi = google.gmail({ version: 'v1', auth });
    const tasksApi = google.tasks({ version: 'v1', auth });

    const taskListId = await findOrCreateTaskList(tasksApi, options.taskList);
    const signals = await fetchRecentEmailSignals(gmailApi, options);
    console.log('[email-life] fetched emails: ' + signals.length);

    const classified = dedupeByTitle(
      signals
        .map(classifyEmail)
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
    );

    const emailTasks = classified.slice(0, options.maxEmailTasks);
    const strategic = strategicTasksFromSignals(emailTasks);
    const combined = dedupeByTitle([...emailTasks, ...strategic]).slice(0, options.maxTasks);

    if (!combined.length) {
      console.log('[email-life] no tasks generated (no strong email signals)');
      return;
    }

    const existing = await existingOpenTitleSet(tasksApi, taskListId);
    const due = toDueTodayIso();

    const toCreate = combined
      .filter((t) => !existing.has(String(t.title || '').trim().toLowerCase()))
      .map((t) => ({
        ...t,
        due,
      }));

    if (!toCreate.length) {
      console.log('[email-life] all generated tasks already exist in open list');
      return;
    }

    if (options.dryRun) {
      console.log('[email-life] DRY RUN: would create ' + toCreate.length + ' task(s)');
      for (const t of toCreate) {
        console.log('  - ' + t.title);
      }
      return;
    }

    const created = [];
    for (const task of toCreate) {
      const res = await tasksApi.tasks.insert({
        tasklist: taskListId,
        requestBody: {
          title: task.title,
          notes: task.notes,
          due: task.due,
          status: 'needsAction',
        },
      });
      created.push({
        id: res.data.id,
        title: res.data.title,
        source: task.source,
        category: task.category || 'strategic',
      });
    }

    const summary = {
      at: new Date().toISOString(),
      taskList: options.taskList,
      scannedEmails: signals.length,
      classifiedEmails: classified.length,
      createdCount: created.length,
      created,
    };
    console.log('[email-life] SUMMARY: ' + JSON.stringify(summary));
  } finally {
    releaseRunLock();
    console.log('[email-life] lock released');
  }
}

main().catch((error) => {
  console.error('[email-life] ERROR: ' + error.message);
  process.exit(1);
});
