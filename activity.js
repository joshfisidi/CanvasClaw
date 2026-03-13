/**
 * activity.js — Visual Activity Layer for OpenClaw Canvas
 *
 * Consumes events from cronCurrent.js and drives category-aware
 * animations on the avatar, background, and activity feed.
 * Pure display — no controls, no user interaction.
 */
(() => {
  'use strict';

  const MAX_FEED = 16;
  const feedItems = [];
  let currentCategory = null;

  /* ── DOM refs (set after DOMContentLoaded) ── */
  let scene, stateLabel, logEl, avatarStage, particlesEl;

  /* ── Helpers ── */
  const ts = () => new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const log = (msg) => { if (logEl) logEl.textContent = String(msg); };

  /* ── Category → Avatar State Map ── */
  const STATUS_TO_AVATAR = {
    running: 'using_tool',
    success: 'celebrate',
    error:   'error',
    idle:    'idle',
  };

  /* ═══════════════════════════════════════════
   *  ADVANCED ANIMATIONS
   * ═══════════════════════════════════════════ */

  /* ── Orbital Rings: colored rings orbit the avatar ── */
  const spawnOrbitalRing = (theme) => {
    if (!avatarStage) return;
    const ring = document.createElement('div');
    ring.className = 'orbital-ring';
    ring.style.borderColor = theme.color;
    ring.style.filter = 'drop-shadow(0 0 6px ' + theme.color + ')';
    ring.style.animationDuration = (2 + Math.random() * 2) + 's';
    ring.style.width = (160 + Math.random() * 60) + 'px';
    ring.style.height = ring.style.width;
    avatarStage.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  };

  /* ── Pulse Wave: expanding ring from center ── */
  const spawnPulseWave = (theme) => {
    if (!avatarStage) return;
    const wave = document.createElement('div');
    wave.className = 'pulse-wave';
    wave.style.borderColor = theme.color;
    wave.style.boxShadow = '0 0 20px ' + theme.color + '40';
    avatarStage.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  };

  /* ── Data Stream: vertical lines flowing through the avatar ── */
  const spawnDataStream = (theme) => {
    if (!avatarStage) return;
    for (let i = 0; i < 6; i++) {
      const line = document.createElement('div');
      line.className = 'data-stream-line';
      line.style.background = 'linear-gradient(180deg, transparent, ' + theme.color + ', transparent)';
      line.style.left = (30 + Math.random() * 40) + '%';
      line.style.animationDelay = (Math.random() * 0.8) + 's';
      line.style.animationDuration = (0.6 + Math.random() * 0.4) + 's';
      avatarStage.appendChild(line);
      line.addEventListener('animationend', () => line.remove());
    }
  };

  /* ── Burst Particles: radial explosion ── */
  const spawnBurst = (theme, count) => {
    if (!avatarStage) return;
    const burst = document.createElement('div');
    burst.className = 'burst-container';
    avatarStage.appendChild(burst);

    for (let i = 0; i < (count || 12); i++) {
      const angle = (360 / (count || 12)) * i + (Math.random() * 15 - 7.5);
      const dist = 50 + Math.random() * 40;
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * dist;
      const y = Math.sin(rad) * dist;
      const size = 3 + Math.random() * 4;

      const p = document.createElement('div');
      p.className = 'burst-particle';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = theme.color;
      p.style.boxShadow = '0 0 8px ' + theme.color;
      p.style.setProperty('--bx', x + 'px');
      p.style.setProperty('--by', y + 'px');
      burst.appendChild(p);
    }

    setTimeout(() => burst.remove(), 1200);
  };

  /* ── Glyph Flash: shows category icon briefly ── */
  const spawnGlyph = (theme) => {
    if (!avatarStage) return;
    const glyph = document.createElement('div');
    glyph.className = 'glyph-flash';
    glyph.textContent = theme.icon;
    glyph.style.color = theme.color;
    glyph.style.textShadow = '0 0 20px ' + theme.color;
    avatarStage.appendChild(glyph);
    glyph.addEventListener('animationend', () => glyph.remove());
  };

  /* ── Background Hue Shift ── */
  const shiftBackground = (theme) => {
    if (!scene) return;
    scene.style.setProperty('--cat-hue', theme.hue);
    scene.style.setProperty('--cat-color', theme.color);
    scene.classList.add('category-active');
  };

  const resetBackground = () => {
    if (!scene) return;
    scene.classList.remove('category-active');
  };

  /* ── Ambient Particle Recolor ── */
  const recolorParticles = (theme) => {
    if (!particlesEl) return;
    particlesEl.querySelectorAll('.particle').forEach((p) => {
      p.style.background = theme.color.replace(')', ', 0.3)').replace('rgb', 'rgba');
    });
  };

  const resetParticles = () => {
    if (!particlesEl) return;
    particlesEl.querySelectorAll('.particle').forEach((p) => {
      p.style.background = 'rgba(100, 180, 255, 0.25)';
    });
  };

  /* ═══════════════════════════════════════════
   *  ACTIVITY FEED
   * ═══════════════════════════════════════════ */

  const addFeedItem = (evt) => {
    const theme = evt.theme || { color: '#60b0ff', icon: '\u2022', label: 'System' };
    feedItems.unshift({
      time: ts(),
      skill: evt.skill || evt.jobId || 'agent',
      category: evt.category || 'system',
      status: evt.status,
      detail: evt.description || '',
      color: theme.color,
      icon: theme.icon,
    });
    if (feedItems.length > MAX_FEED) feedItems.length = MAX_FEED;
    renderFeed();
  };

  const statusGlyph = (status) => {
    switch (status) {
      case 'running': return '\u25B6';
      case 'success': return '\u2713';
      case 'error':   return '\u2717';
      default:        return '\u25CB';
    }
  };

  const renderFeed = () => {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    feed.innerHTML = feedItems.map((item) => {
      return '<div class="activity-item" style="--item-color:' + item.color + '">'
        + '<span class="activity-icon">' + item.icon + '</span>'
        + '<span class="activity-status-glyph">' + statusGlyph(item.status) + '</span>'
        + '<span class="activity-time">' + item.time + '</span>'
        + '<span class="activity-skill">' + item.skill + '</span>'
        + (item.detail ? '<span class="activity-detail">\u2014 ' + item.detail + '</span>' : '')
        + '</div>';
    }).join('');
  };

  /* ═══════════════════════════════════════════
   *  EVENT HANDLER — driven by cronCurrent.js
   * ═══════════════════════════════════════════ */

  const handleCronEvent = (evt) => {
    if (!evt) return;

    if (evt.status === 'idle') {
      currentCategory = null;
      if (typeof window.setAgentState === 'function') window.setAgentState('idle');
      resetBackground();
      resetParticles();
      log('Idle');
      return;
    }

    const theme = evt.theme || { hue: 210, color: '#60b0ff', icon: '\u2022', label: 'System' };
    currentCategory = evt.category;

    // Avatar state
    const avatarState = STATUS_TO_AVATAR[evt.status] || 'using_tool';
    if (typeof window.setAgentState === 'function') window.setAgentState(avatarState);

    // Background + particles
    shiftBackground(theme);
    recolorParticles(theme);

    // Category-specific animation combos
    if (evt.status === 'running') {
      spawnOrbitalRing(theme);
      spawnDataStream(theme);
      spawnGlyph(theme);
      log(theme.label + ': ' + (evt.skill || 'executing') + '\u2026');
    } else if (evt.status === 'success') {
      spawnPulseWave(theme);
      spawnBurst(theme, 16);
      spawnGlyph(theme);
      log(theme.label + ': complete');
    } else if (evt.status === 'error') {
      spawnBurst({ ...theme, color: '#ff5050' }, 8);
      log(theme.label + ': error');
    }

    addFeedItem(evt);

    // Activate feed dot
    const dot = document.getElementById('activityDot');
    if (dot) {
      dot.style.background = theme.color;
      dot.style.boxShadow = '0 0 8px ' + theme.color;
      clearTimeout(dot._timer);
      dot._timer = setTimeout(() => {
        dot.style.background = '';
        dot.style.boxShadow = '';
      }, 12000);
    }
  };

  /* ═══════════════════════════════════════════
   *  STYLES INJECTION
   * ═══════════════════════════════════════════ */

  const injectStyles = () => {
    const s = document.createElement('style');
    s.textContent = `
/* ── Category Background Shift ── */
.scene.category-active {
  background:
    radial-gradient(ellipse at 50% 80%, hsla(var(--cat-hue,210), 60%, 30%, 0.12) 0%, transparent 60%),
    linear-gradient(180deg, #0a0a12 0%, #0d0f1a 100%);
  transition: background 1.2s ease;
}
.scene.category-active .glow-ring {
  border-color: var(--cat-color, rgba(80,160,255,0.15));
  box-shadow: 0 0 50px color-mix(in srgb, var(--cat-color) 20%, transparent),
              inset 0 0 30px color-mix(in srgb, var(--cat-color) 8%, transparent);
}

/* ── Orbital Ring ── */
.orbital-ring {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1.5px solid;
  pointer-events: none;
  animation: orbitalSpin 2s linear forwards;
  opacity: 0;
}
@keyframes orbitalSpin {
  0%   { transform: translate(-50%,-50%) rotateX(60deg) rotateZ(0deg) scale(0.6); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.4; }
  100% { transform: translate(-50%,-50%) rotateX(60deg) rotateZ(360deg) scale(1.3); opacity: 0; }
}

/* ── Pulse Wave ── */
.pulse-wave {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 2px solid;
  pointer-events: none;
  animation: pulseExpand 1.4s ease-out forwards;
}
@keyframes pulseExpand {
  0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.9; }
  100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
}

/* ── Data Stream Lines ── */
.data-stream-line {
  position: absolute;
  width: 1.5px; height: 40px;
  pointer-events: none;
  animation: dataStreamFlow 0.8s ease-out forwards;
  opacity: 0;
}
@keyframes dataStreamFlow {
  0%   { top: 70%; opacity: 0; }
  20%  { opacity: 0.8; }
  100% { top: -10%; opacity: 0; }
}

/* ── Burst Container + Particles ── */
.burst-container {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 0; height: 0;
  pointer-events: none;
}
.burst-particle {
  position: absolute;
  border-radius: 50%;
  animation: burstFlyOut 1s ease-out forwards;
}
@keyframes burstFlyOut {
  0%   { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--bx,0), var(--by,0)) scale(0); opacity: 0; }
}

/* ── Glyph Flash ── */
.glyph-flash {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  pointer-events: none;
  animation: glyphAppear 1.6s ease-out forwards;
  z-index: 10;
}
@keyframes glyphAppear {
  0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0; }
  20%  { transform: translate(-50%,-50%) scale(1.2); opacity: 1; }
  50%  { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
  100% { transform: translate(-50%,-80%) scale(0.6); opacity: 0; }
}

/* ── Activity Panel ── */
.activity-panel {
  position: fixed; top: 16px; right: 16px;
  width: 300px; max-height: 420px;
  overflow-y: auto; overflow-x: hidden;
  background: rgba(10, 10, 18, 0.8);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px 16px;
  z-index: 100;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}
.activity-panel::-webkit-scrollbar { width: 4px; }
.activity-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

.activity-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
  font: 600 11px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.activity-header-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #304060;
  transition: all 0.4s ease;
}
.activity-empty {
  color: rgba(255,255,255,0.2);
  text-align: center;
  padding: 20px 0;
  font-style: italic;
}

.activity-item {
  display: flex; align-items: baseline; gap: 5px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  animation: feedSlideIn 0.35s ease-out;
  color: var(--item-color, #6090c0);
}
.activity-item:last-child { border-bottom: none; }
@keyframes feedSlideIn {
  0% { opacity: 0; transform: translateX(16px); }
  100% { opacity: 1; transform: translateX(0); }
}

.activity-icon { flex-shrink: 0; width: 18px; text-align: center; font-size: 12px; }
.activity-status-glyph { flex-shrink: 0; width: 14px; text-align: center; font-size: 10px; opacity: 0.6; }
.activity-time { flex-shrink: 0; color: rgba(255,255,255,0.2); font-size: 10px; }
.activity-skill { font-weight: 600; white-space: nowrap; }
.activity-detail { color: rgba(255,255,255,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Status Bar (bottom) ── */
.status-bar-bottom {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: rgba(10, 10, 18, 0.7);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,255,255,0.04);
  padding: 10px 20px;
  display: flex; align-items: center; justify-content: center; gap: 16px;
  font: 11px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: rgba(255,255,255,0.3);
  z-index: 100;
}
.status-bar-bottom .status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #304060; transition: all 0.3s;
}
.status-bar-bottom .status-dot.ok {
  background: #30c070; box-shadow: 0 0 6px rgba(40,200,100,0.4);
}
`;
    document.head.appendChild(s);
  };

  /* ═══════════════════════════════════════════
   *  ACTIVITY PANEL DOM
   * ═══════════════════════════════════════════ */

  const createActivityPanel = () => {
    const panel = document.createElement('div');
    panel.className = 'activity-panel';
    panel.setAttribute('role', 'log');
    panel.setAttribute('aria-label', 'Cron activity feed');
    panel.innerHTML = '<div class="activity-header">'
      + '<div class="activity-header-dot" id="activityDot"></div>'
      + '<span>Activity</span>'
      + '</div>'
      + '<div id="activityFeed"><div class="activity-empty">Monitoring cron jobs\u2026</div></div>';
    document.body.appendChild(panel);
  };

  /* ═══════════════════════════════════════════
   *  INIT
   * ═══════════════════════════════════════════ */

  const init = () => {
    scene = document.getElementById('scene');
    stateLabel = document.getElementById('stateLabel');
    logEl = document.getElementById('log');
    avatarStage = document.querySelector('.avatar-stage');
    particlesEl = document.getElementById('particles');

    injectStyles();
    createActivityPanel();

    // Subscribe to cronCurrent.js events
    if (window.cronCurrent && typeof window.cronCurrent.onActivity === 'function') {
      window.cronCurrent.onActivity(handleCronEvent);
    }

    // Also listen for custom event (redundancy / late-load safety)
    window.addEventListener('openclaw:cron-current', (ev) => {
      handleCronEvent(ev.detail);
    });

    log('Canvas: display mode');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
