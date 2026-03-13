# OpenClaw Canvas

Next.js + TypeScript app scaffold for the OpenClaw Canvas UI.

Current app stack:

- Next.js App Router (`app/`) with TypeScript.
- Tailwind CSS v4 via PostCSS (`app/globals.css`, `postcss.config.mjs`).
- shadcn-compatible utility/component primitives:
  - `lib/utils.ts` (`cn`)
  - `components/ui/button.tsx`
  - `components/ui/sheet.tsx`
  - `components/ui/bottom-menu.tsx`

## Quick start

```bash
npm install
npm run dev
```

Default URL:

- `http://localhost:3000`

## Scripts

- `npm run dev` - Start Next.js dev server.
- `npm run build` - Create production build.
- `npm run start` - Run production server after build.
- `npm run demo:capture` - Launch a visible Chrome demo session, capture the Zyndrel interaction flow, and write screenshots plus a GIF to `docs/demo/`.
- `npm run email-life-tasks:dry` - Dry run for the email-to-life cron task script.

## Demo

Generate the demo assets:

```bash
npm run demo:capture
```

Required local tools:

- Google Chrome
- Peekaboo (`peekaboo`)
- FFmpeg (`ffmpeg`)

The capture script tries Peekaboo first and falls back to Playwright video recording when macOS screen recording permissions block Peekaboo.

Generated assets:

- `docs/demo/workspace-demo.gif`
- `docs/demo/workspace-hero.png`
- `docs/demo/workspace-control-chat.png`
- `docs/demo/workspace-files-panel.png`

Embedded preview:

![Zyndrel workspace demo](docs/demo/workspace-demo.gif)

Still captures:

- [Workspace hero](docs/demo/workspace-hero.png)
- [Control center and chat](docs/demo/workspace-control-chat.png)
- [Files panel](docs/demo/workspace-files-panel.png)

## Troubleshooting

- If `next` is missing, run `npm install` to install updated dependencies.
- Use `npm run dev` to run the current game world implementation.
