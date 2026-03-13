# Email-to-Life Tasks Cron

This automation creates daily Google Tasks using recent Gmail signals plus strategic life-progress tasks.

## Script

- `scripts/email_life_task_cron.js`

## What It Does

1. Reads recent Gmail messages (default: last 1 day).
2. Detects actionable signals (finance, opportunity, scheduling, legal, health, operations).
3. Generates a small task set from those emails.
4. Adds strategic progression tasks.
5. De-duplicates against open tasks in your target list (default: `Zyndrel Daily`).

## Run Manually

Dry run:

```bash
npm run email-life-tasks:dry
```

Normal run:

```bash
node scripts/email_life_task_cron.js
```

## Flags

- `--dry-run`
- `--days <N>` (default `1`)
- `--max-messages <N>` (default `30`)
- `--max-email-tasks <N>` (default `4`)
- `--max-tasks <N>` (default `6`)
- `--task-list "<name>"` (default `Zyndrel Daily`)

## Credentials

Defaults:

- OAuth client: `~/.openclaw/credentials/gmail-client.json`
- OAuth token: `~/.openclaw/credentials/gmail-token.json`

Overrides:

- `OPENCLAW_STATE_DIR`
- `GMAIL_CREDS`
- `GMAIL_TOKEN`
