/**
 * cronCurrent.js — Cron Job Monitor for OpenClaw Canvas
 *
 * Tracks which cron job is currently active and classifies it into
 * a visual category so activity.js can animate accordingly.
 *
 * Data sources (priority order):
 *   1. WebSocket gateway events (real-time, HTTP only)
 *   2. Polling ../cron/jobs.json (HTTP only)
 *   3. Bridge custom events (works on file:// and HTTP)
 *   4. postMessage from parent/TUI
 *   5. Public API: window.cronCurrent.push(id, skill, status)
 */
(() => {
  'use strict';

  const IS_SERVED = location.protocol === 'http:' || location.protocol === 'https:';
  const POLL_MS = 4000;
  const IDLE_AFTER_MS = 10000;

  /* ── Category Definitions ──
   * Each cron job's `meta.skill` or `id` is mapped to a category.
   * Categories drive the color palette & animation style in activity.js.
   */
  const CATEGORY_MAP = {
    'motivation':    'motivation',
    'newsletter':    'intelligence',
    'income-radar':  'finance',
    'operator-node': 'operator',
    'gmail':         'communication',
    'health':        'health',
    'legal':         'legal',
    'sonoscli':      'ambient',
  };

  const CATEGORY_THEMES = {
    motivation:    { hue: 280, color: '#c77dff', label: 'Motivation',    icon: '\u2728' },
    intelligence:  { hue: 200, color: '#50d0ff', label: 'Intelligence',  icon: '\u26A1' },
    finance:       { hue: 45,  color: '#ffd93d', label: 'Finance',       icon: '\uD83D\uDCB0' },
    operator:      { hue: 160, color: '#30e090', label: 'Operator',      icon: '\u2699\uFE0F' },
    communication: { hue: 220, color: '#6b8aff', label: 'Communication', icon: '\uD83D\uDCE8' },
    health:        { hue: 120, color: '#6bcb77', label: 'Health',        icon: '\uD83C\uDF3F' },
    legal:         { hue: 30,  color: '#ff9e7d', label: 'Legal',         icon: '\u2696\uFE0F' },
    ambient:       { hue: 190, color: '#7dd3fc', label: 'Ambient',       icon: '\uD83C\uDFB5' },
    system:        { hue: 210, color: '#60b0ff', label: 'System',        icon: '\uD83E\uDD1E' },
  };

  /* ── State ── */
  let current = null;
  let idleTimer = null;
  const knownJobs = new Map();
  const listeners = [];

  /* ── Helpers ── */
  const resolveCategory = (job) => {
    const skill = (job.meta && job.meta.skill) || '';
    const id = job.id || '';
    const cmd = job.command || '';

    for (const [pattern, cat] of Object.entries(CATEGORY_MAP)) {
      if (skill.includes(pattern) || id.includes(pattern) || cmd.includes(pattern)) {
        return cat;
      }
    }
    return 'system';
  };

  const buildEvent = (job, status) => {
    const category = resolveCategory(job);
    const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.system;

    return {
      jobId: job.id,
      skill: (job.meta && job.meta.skill) || job.id,
      description: job.description || '',
      category,
      theme,
      status,
      timestamp: Date.now(),
      job,
    };
  };

  const emit = (evt) => {
    current = evt;
    for (const fn of listeners) {
      try { fn(evt); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('openclaw:cron-current', { detail: evt }));

    clearTimeout(idleTimer);
    if (evt.status === 'success' || evt.status === 'error') {
      idleTimer = setTimeout(() => {
        current = null;
        const idle = { jobId: null, skill: null, category: null, theme: null, status: 'idle', timestamp: Date.now(), job: null };
        for (const fn of listeners) { try { fn(idle); } catch (_) {} }
        window.dispatchEvent(new CustomEvent('openclaw:cron-current', { detail: idle }));
      }, IDLE_AFTER_MS);
    }
  };

  /* ── Polling (HTTP only) ── */
  const poll = async () => {
    if (!IS_SERVED) return;
    try {
      const res = await fetch('../cron/jobs.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      for (const job of (data.jobs || [])) {
        const prev = knownJobs.get(job.id);
        const st = job.state || {};
        const pst = (prev && prev.state) || {};

        const newError = (st.scheduleErrorCount || 0) > (pst.scheduleErrorCount || 0);
        const newRun = st.lastRunAt && st.lastRunAt !== pst.lastRunAt;

        if (newError) emit(buildEvent(job, 'error'));
        else if (newRun) emit(buildEvent(job, st.lastExitCode === 0 || st.lastExitCode === undefined ? 'success' : 'error'));

        knownJobs.set(job.id, JSON.parse(JSON.stringify(job)));
      }
    } catch (_) {}
  };

  /* ── WebSocket (HTTP only) ── */
  const connectWs = () => {
    if (!IS_SERVED) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let delay = 2000;
    const tryConnect = () => {
      let ws;
      try { ws = new WebSocket(proto + '//' + location.host + '/ws/canvas'); } catch (_) { return; }
      ws.onopen = () => { delay = 2000; };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const type = msg.type || msg.event || '';
          if (type === 'cron:run:start' || type === 'job:start') {
            const job = msg.job || { id: msg.jobId || 'unknown', meta: { skill: msg.skill } };
            emit(buildEvent(job, 'running'));
          } else if (type === 'cron:run:complete' || type === 'job:complete') {
            const job = msg.job || { id: msg.jobId || 'unknown', meta: { skill: msg.skill } };
            emit(buildEvent(job, (msg.exitCode === 0 || msg.success) ? 'success' : 'error'));
          }
        } catch (_) {}
      };
      ws.onclose = () => { delay = Math.min(delay * 1.5, 30000); setTimeout(tryConnect, delay); };
      ws.onerror = () => {};
    };
    tryConnect();
  };

  /* ── Bridge / postMessage (always active) ── */
  window.addEventListener('openclaw:agent-status', (ev) => {
    const d = ev && ev.detail;
    if (!d || (!d.cronJob && !d.jobId)) return;
    const job = d.cronJob || { id: d.jobId, meta: { skill: d.skill || d.jobId } };
    const status = d.state === 'celebrate' ? 'success' : d.state === 'error' ? 'error' : d.state === 'using_tool' ? 'running' : 'running';
    emit(buildEvent(job, status));
  });

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'openclaw:cron-event' || d.type === 'openclaw:activity') {
      const job = d.job || { id: d.jobId || 'bridge', meta: { skill: d.skill || 'agent' } };
      emit(buildEvent(job, d.status || 'running'));
    }
  });

  /* ── Public API ── */
  window.cronCurrent = {
    get current() { return current; },
    get categories() { return CATEGORY_THEMES; },
    get categoryMap() { return CATEGORY_MAP; },

    push(jobId, skill, status) {
      const job = { id: jobId, meta: { skill: skill || jobId }, description: '' };
      emit(buildEvent(job, status || 'running'));
    },

    onActivity(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },

    resolveCategory(job) { return resolveCategory(job); },
    getTheme(category) { return CATEGORY_THEMES[category] || CATEGORY_THEMES.system; },
  };

  /* ── Init ── */
  if (IS_SERVED) {
    poll().then(() => setInterval(poll, POLL_MS));
    connectWs();
  }
})();
