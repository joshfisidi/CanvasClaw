# Google Tasks CLI Setup

This project includes `scripts/tasks.js`, a lightweight Google Tasks CLI that follows the same credential pattern as the Gmail tooling.

## Location

- Script: `scripts/tasks.js`
- Docs: `docs/google-tasks.md`

## Requirements

- Node.js 18+
- `googleapis` package installed in the working directory

```bash
npm install googleapis
```

## Default credential paths

By default, the script looks in:

- OAuth client: `~/.openclaw/credentials/tasks-client.json`
- Fallback client: `~/.openclaw/credentials/gmail-client.json`
- OAuth token (write/read): `~/.openclaw/credentials/tasks-token.json`
- Fallback token (read only): `~/.openclaw/credentials/gmail-token.json`

## Environment overrides

- `OPENCLAW_CREDENTIALS_DIR`
- `GOOGLE_TASKS_CLIENT`
- `GOOGLE_TASKS_TOKEN`

Example:

```bash
export OPENCLAW_CREDENTIALS_DIR="$HOME/.openclaw/credentials"
export GOOGLE_TASKS_CLIENT="$HOME/.openclaw/credentials/gmail-client.json"
export GOOGLE_TASKS_TOKEN="$HOME/.openclaw/credentials/tasks-token.json"
```

## First-time auth

Run interactive OAuth flow and store token:

```bash
node scripts/tasks.js auth
```

If you need to refresh/re-consent:

```bash
node scripts/tasks.js auth --force
```

## Commands

List task lists:

```bash
node scripts/tasks.js lists
```

List tasks from default list:

```bash
node scripts/tasks.js list
```

List tasks from a specific list:

```bash
node scripts/tasks.js list --list <tasklistId> --show-completed
```

Add task:

```bash
node scripts/tasks.js add --title "Pay rent" --notes "before 5pm"
```

Add task with due date (ISO timestamp):

```bash
node scripts/tasks.js add --title "Ship build" --due "2026-02-18T14:00:00Z"
```

Complete a task:

```bash
node scripts/tasks.js complete --task <taskId> --list <tasklistId>
```

## JSON output mode

Most commands support `--json` for script automation.

Examples:

```bash
node scripts/tasks.js lists --json
node scripts/tasks.js list --json
node scripts/tasks.js add --title "Draft roadmap" --json
```
