#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

let cachedGoogle = null;
function requireGoogle() {
  if (cachedGoogle) return cachedGoogle;
  try {
    ({ google: cachedGoogle } = require('googleapis'));
    return cachedGoogle;
  } catch (error) {
    throw new Error('Missing dependency: googleapis. Install with: npm install googleapis');
  }
}

const TASKS_SCOPE = ['https://www.googleapis.com/auth/tasks'];

function parseArgs(argv) {
  const command = argv[2] || 'help';
  const options = {};
  const positional = [];

  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    i += 1;
  }

  return { command, options, positional };
}

function usage() {
  console.log(`Google Tasks CLI\n\nUsage:\n  node scripts/tasks.js auth [--force]\n  node scripts/tasks.js lists [--max 100] [--json]\n  node scripts/tasks.js list [--list <tasklistId>] [--max 50] [--show-completed] [--json]\n  node scripts/tasks.js add --title "Task title" [--list <tasklistId>] [--notes "..."] [--due "2026-02-18T14:00:00Z"] [--json]\n  node scripts/tasks.js complete --task <taskId> [--list <tasklistId>] [--json]\n\nCredential paths (defaults):\n  client: ~/.openclaw/credentials/tasks-client.json (fallback: gmail-client.json)\n  token:  ~/.openclaw/credentials/tasks-token.json (fallback read: gmail-token.json)\n\nOverrides:\n  OPENCLAW_CREDENTIALS_DIR\n  GOOGLE_TASKS_CLIENT\n  GOOGLE_TASKS_TOKEN`);
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, data) {
  const payload = JSON.stringify(data, null, 2);
  const dirPath = path.dirname(filePath);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  ensureDir(dirPath);

  try {
    fs.writeFileSync(tempPath, payload);
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function resolveCredentialPaths(options) {
  const credentialsDir = options['credentials-dir']
    || process.env.OPENCLAW_CREDENTIALS_DIR
    || path.join(os.homedir(), '.openclaw', 'credentials');

  const tasksClient = path.join(credentialsDir, 'tasks-client.json');
  const gmailClient = path.join(credentialsDir, 'gmail-client.json');
  const tasksToken = path.join(credentialsDir, 'tasks-token.json');
  const gmailToken = path.join(credentialsDir, 'gmail-token.json');

  const clientPath = options.client
    || process.env.GOOGLE_TASKS_CLIENT
    || (fs.existsSync(tasksClient) ? tasksClient : gmailClient);

  const tokenWritePath = options.token || process.env.GOOGLE_TASKS_TOKEN || tasksToken;
  const tokenReadCandidates = [
    tokenWritePath,
    tasksToken,
    gmailToken,
  ];

  let tokenReadPath = null;
  for (const candidate of tokenReadCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      tokenReadPath = candidate;
      break;
    }
  }

  return {
    credentialsDir,
    clientPath,
    tokenReadPath,
    tokenWritePath,
    tasksToken,
    gmailToken,
  };
}

function createOAuthClient(credentials) {
  const google = requireGoogle();
  const payload = credentials.installed || credentials.web;
  if (!payload) {
    throw new Error('Invalid OAuth client file: expected "installed" or "web" object');
  }

  const { client_id: clientId, client_secret: clientSecret, redirect_uris: redirectUris } = payload;
  if (!clientId || !clientSecret || !Array.isArray(redirectUris) || !redirectUris.length) {
    throw new Error('Invalid OAuth client file: missing client_id, client_secret, or redirect_uris');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUris[0]);
}

async function promptForCode(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });

  return code;
}

async function authorize({ options, forceInteractive }) {
  const paths = resolveCredentialPaths(options);
  if (!fs.existsSync(paths.clientPath)) {
    throw new Error(
      'OAuth client file not found. Checked: ' + paths.clientPath +
      '\nSet GOOGLE_TASKS_CLIENT or place tasks-client.json/gmail-client.json in ' + paths.credentialsDir
    );
  }

  const credentials = readJson(paths.clientPath);
  const auth = createOAuthClient(credentials);

  const shouldUseExistingToken = !forceInteractive && paths.tokenReadPath && fs.existsSync(paths.tokenReadPath);
  if (shouldUseExistingToken) {
    auth.setCredentials(readJson(paths.tokenReadPath));
    return { auth, paths, usedTokenPath: paths.tokenReadPath, generatedToken: false };
  }

  if (!process.stdin.isTTY) {
    throw new Error('No token found and interactive auth is unavailable in non-TTY mode.');
  }

  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: TASKS_SCOPE,
    prompt: 'consent',
  });

  console.log('\nOpen this URL in your browser and authorize Google Tasks access:\n');
  console.log(authUrl);
  console.log('');

  const code = await promptForCode('Paste the authorization code: ');
  if (!code) throw new Error('Authorization code is required.');

  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);

  writeJsonAtomic(paths.tokenWritePath, tokens);

  return { auth, paths, usedTokenPath: paths.tokenWritePath, generatedToken: true };
}

async function getTasksClient(auth) {
  const google = requireGoogle();
  return google.tasks({ version: 'v1', auth });
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function formatTask(task) {
  const done = task.status === 'completed' ? 'x' : ' ';
  const due = task.due ? ` due=${task.due}` : '';
  const notes = task.notes ? ' notes=yes' : '';
  return `[${done}] ${task.title || '(untitled)'} (${task.id})${due}${notes}`;
}

async function resolveListId({ tasksApi, options, positional }) {
  const explicit = options.list || options['list-id'] || positional[0];
  if (explicit) return explicit;

  const response = await tasksApi.tasklists.list({ maxResults: 1 });
  const first = (response.data.items || [])[0];
  if (!first || !first.id) {
    throw new Error('No task lists found. Create a task list first in Google Tasks.');
  }
  return first.id;
}

async function cmdAuth(context) {
  const force = isTruthy(context.options.force);
  const result = await authorize({ options: context.options, forceInteractive: force });
  console.log('Authorized for Google Tasks.');
  console.log('Client: ' + result.paths.clientPath);
  console.log('Token:  ' + result.usedTokenPath);
}

async function cmdLists(context) {
  const authResult = await authorize({ options: context.options, forceInteractive: false });
  const tasksApi = await getTasksClient(authResult.auth);
  const maxResults = asInt(context.options.max, 100);
  const response = await tasksApi.tasklists.list({ maxResults });
  const lists = response.data.items || [];

  if (isTruthy(context.options.json)) {
    printJson(lists);
    return;
  }

  if (!lists.length) {
    console.log('No task lists found.');
    return;
  }

  lists.forEach((list) => {
    console.log(`${list.title || '(untitled)'}\n  id: ${list.id}\n  updated: ${list.updated || 'n/a'}`);
  });
}

async function cmdList(context) {
  const authResult = await authorize({ options: context.options, forceInteractive: false });
  const tasksApi = await getTasksClient(authResult.auth);
  const listId = await resolveListId({ tasksApi, options: context.options, positional: context.positional });

  const showCompleted = isTruthy(context.options['show-completed']);
  const maxResults = asInt(context.options.max, 50);

  const response = await tasksApi.tasks.list({
    tasklist: listId,
    maxResults,
    showCompleted,
    showHidden: showCompleted,
  });

  const tasks = response.data.items || [];

  if (isTruthy(context.options.json)) {
    printJson({ listId, tasks });
    return;
  }

  console.log('List: ' + listId);
  if (!tasks.length) {
    console.log('No tasks found.');
    return;
  }

  tasks.forEach((task) => {
    console.log(formatTask(task));
  });
}

async function cmdAdd(context) {
  const title = context.options.title || context.positional.join(' ').trim();
  if (!title) {
    throw new Error('Missing task title. Use --title "..." or provide positional text.');
  }

  const authResult = await authorize({ options: context.options, forceInteractive: false });
  const tasksApi = await getTasksClient(authResult.auth);
  const listId = await resolveListId({ tasksApi, options: context.options, positional: [] });

  let due;
  if (context.options.due) {
    const parsed = new Date(context.options.due);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid --due value. Use ISO format, e.g. 2026-02-18T14:00:00Z');
    }
    due = parsed.toISOString();
  }

  const response = await tasksApi.tasks.insert({
    tasklist: listId,
    requestBody: {
      title,
      notes: context.options.notes || undefined,
      due,
      status: 'needsAction',
    },
  });

  const created = response.data;
  if (isTruthy(context.options.json)) {
    printJson(created);
    return;
  }

  console.log('Created task:');
  console.log(formatTask(created));
  console.log('list: ' + listId);
}

async function cmdComplete(context) {
  const taskId = context.options.task || context.options['task-id'] || context.positional[0];
  if (!taskId) throw new Error('Missing task id. Use --task <taskId>.');

  const authResult = await authorize({ options: context.options, forceInteractive: false });
  const tasksApi = await getTasksClient(authResult.auth);
  const listId = await resolveListId({ tasksApi, options: context.options, positional: [] });

  const response = await tasksApi.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody: {
      status: 'completed',
      completed: new Date().toISOString(),
    },
  });

  const updated = response.data;
  if (isTruthy(context.options.json)) {
    printJson(updated);
    return;
  }

  console.log('Completed task:');
  console.log(formatTask(updated));
  console.log('list: ' + listId);
}

async function main() {
  const { command, options, positional } = parseArgs(process.argv);
  const context = { command, options, positional };

  if (command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  const commands = {
    auth: cmdAuth,
    lists: cmdLists,
    list: cmdList,
    add: cmdAdd,
    complete: cmdComplete,
  };

  const handler = commands[command];
  if (!handler) {
    usage();
    throw new Error('Unknown command: ' + command);
  }

  await handler(context);
}

main().catch((error) => {
  console.error('\nError: ' + error.message);
  process.exit(1);
});
