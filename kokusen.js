// ── Kokusen Effect ──
// 6-phase canvas animation triggered on task check.
// Centered on the checked element, full visual with optional audio.

(function() {
  // ── Audio setup ──
  let _audioCtx = null;
  let _kokusenBuffer = null;

  function _getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
  }

  // Preload via fetch (works on file:// too when served via GitHub Pages)
  function _loadAudio() {
    const ctx = _getAudioCtx();
    if (!ctx || _kokusenBuffer) return;
    fetch('assets/sounds/kokusen.mp3')
      .then(r => r.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab, buf => { _kokusenBuffer = buf; }))
      .catch(() => {}); // audio optional
  }

  function _playKokusenSound() {
    const ctx = _getAudioCtx();
    if (!ctx || !_kokusenBuffer) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = _kokusenBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
    } catch(e) {}
  }

  // Attempt preload on first user interaction
  document.addEventListener('touchstart', _loadAudio, { once: true });
  document.addEventListener('click', _loadAudio, { once: true });

  // ── Helper: jagged bolt path ──
  function boltPath(ctx, x1, y1, x2, y2, disp) {
    if (disp < 2) { ctx.lineTo(x2, y2); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
    boltPath(ctx, x1, y1, mx, my, disp / 2);
    boltPath(ctx, mx, my, x2, y2, disp / 2);
  }

  // ── Main trigger ──
  window.triggerKokusen = function(btn) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    _playKokusenSound();

    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const SIZE = 400;

    // Canvas centered on element
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.style.cssText = [
      'position:fixed',
      `left:${cx - SIZE / 2}px`,
      `top:${cy - SIZE / 2}px`,
      'pointer-events:none',
      'z-index:9995',
    ].join(';');
    document.body.appendChild(canvas);
    const c = canvas.getContext('2d');

    // Local center of canvas
    const ox = SIZE / 2;
    const oy = SIZE / 2;

    // Pre-generate stable random data
    const NUM_BOLTS = 6 + Math.floor(Math.random() * 3); // 6-8
    const bolts = Array.from({ length: NUM_BOLTS }, (_, i) => ({
      angle: (Math.PI * 2 * i / NUM_BOLTS) + (Math.random() - 0.5) * 0.5,
      len: 70 + Math.random() * 60,
      hasBranch: Math.random() > 0.35,
      branchAngleOffset: (Math.random() - 0.5) * 1.2,
      branchFrac: 0.35 + Math.random() * 0.3,
      branchLen: 25 + Math.random() * 35,
    }));

    const NUM_PARTICLES = 12 + Math.floor(Math.random() * 5); // 12-16
    const PARTICLE_COLORS = ['#FF1493', '#FF00FF', '#000000', '#FFFFFF', '#8B008B', '#DC143C'];
    const particles = Array.from({ length: NUM_PARTICLES }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 40 + Math.random() * 80,
      size: 2 + Math.random() * 5,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      alpha: 0.7 + Math.random() * 0.3,
    }));

    const NUM_SPEEDLINES = 6 + Math.floor(Math.random() * 5); // 6-10
    const SPEED_COLORS = ['#FF1493', '#FF00FF', '#8B008B', '#FFD700'];
    const speedLines = Array.from({ length: NUM_SPEEDLINES }, (_, i) => ({
      angle: (Math.PI * 2 * i / NUM_SPEEDLINES) + (Math.random() - 0.5) * 0.3,
      len: 55 + Math.random() * 60,
      startR: 18 + Math.random() * 10,
      width: 1 + Math.random() * 2,
      color: SPEED_COLORS[Math.floor(Math.random() * SPEED_COLORS.length)],
    }));

    const t0 = performance.now();
    const TOTAL_DUR = 800;

    function frame(now) {
      const elapsed = now - t0;
      const t = Math.min(elapsed / TOTAL_DUR, 1);
      if (t >= 1) { canvas.remove(); return; }

      c.clearRect(0, 0, SIZE, SIZE);

      // ── Phase 1 (0-80ms): white-pink impact flash circle ──
      if (elapsed < 180) {
        const ph = Math.min(elapsed / 80, 1);
        const fade = elapsed < 80 ? 1 : Math.max(0, 1 - (elapsed - 80) / 100);
        const r = 8 + ph * 40;
        const g = c.createRadialGradient(ox, oy, 0, ox, oy, r);
        g.addColorStop(0, `rgba(255,255,255,${fade * 0.95})`);
        g.addColorStop(0.4, `rgba(255,182,193,${fade * 0.8})`);
        g.addColorStop(0.75, `rgba(255,20,147,${fade * 0.5})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.beginPath();
        c.arc(ox, oy, r, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
      }

      // ── Phase 2 (40-150ms): black ring snap ──
      if (elapsed >= 40 && elapsed < 280) {
        const ph = Math.min((elapsed - 40) / 110, 1);
        const fade = elapsed < 150 ? 1 : Math.max(0, 1 - (elapsed - 150) / 130);
        const r = 12 + ph * 50;
        c.beginPath();
        c.arc(ox, oy, r, 0, Math.PI * 2);
        c.strokeStyle = `rgba(0,0,0,${fade * 0.9})`;
        c.lineWidth = 3 - ph * 2;
        c.shadowColor = '#FF00FF';
        c.shadowBlur = 6 * fade;
        c.stroke();
        c.shadowBlur = 0;
      }

      // ── Phase 3 (60-400ms): jagged forking lightning bolts ──
      if (elapsed >= 60 && elapsed < 400) {
        const ph = Math.min((elapsed - 60) / 340, 1);
        const grow = Math.min((elapsed - 60) / 150, 1);
        // intensity: peaks at ~30% through phase, then fades
        const intensity = ph < 0.3 ? ph / 0.3 : Math.pow(1 - (ph - 0.3) / 0.7, 1.5);

        bolts.forEach(bd => {
          const len = bd.len * grow;
          const ex = ox + Math.cos(bd.angle) * len;
          const ey = oy + Math.sin(bd.angle) * len;

          // Magenta glow pass
          c.beginPath();
          c.moveTo(ox, oy);
          boltPath(c, ox, oy, ex, ey, len * 0.4);
          c.strokeStyle = `rgba(255,0,255,${intensity * 0.65})`;
          c.lineWidth = 4;
          c.shadowColor = '#FF1493';
          c.shadowBlur = 10;
          c.globalAlpha = 1;
          c.stroke();

          // Black core pass
          c.beginPath();
          c.moveTo(ox, oy);
          boltPath(c, ox, oy, ex, ey, len * 0.32);
          c.strokeStyle = `rgba(0,0,0,${intensity * 0.95})`;
          c.lineWidth = 1.5;
          c.shadowBlur = 0;
          c.stroke();

          // Branch
          if (bd.hasBranch && grow > 0.3) {
            const bpx = ox + Math.cos(bd.angle) * len * bd.branchFrac;
            const bpy = oy + Math.sin(bd.angle) * len * bd.branchFrac;
            const ba = bd.angle + bd.branchAngleOffset;
            const bex = bpx + Math.cos(ba) * bd.branchLen * grow;
            const bey = bpy + Math.sin(ba) * bd.branchLen * grow;
            c.beginPath();
            c.moveTo(bpx, bpy);
            boltPath(c, bpx, bpy, bex, bey, 10);
            c.strokeStyle = `rgba(139,0,139,${intensity * 0.7})`;
            c.lineWidth = 1;
            c.shadowColor = '#8B008B';
            c.shadowBlur = 5;
            c.stroke();
            c.shadowBlur = 0;
          }
        });
        c.shadowBlur = 0;
        c.globalAlpha = 1;
      }

      // ── Phase 4 (50-500ms): magenta/black/white particles ──
      if (elapsed >= 50 && elapsed < 500) {
        const ph = Math.min((elapsed - 50) / 450, 1);
        const fade = ph < 0.7 ? 1 : Math.max(0, 1 - (ph - 0.7) / 0.3);
        particles.forEach(p => {
          const d = p.speed * ph;
          const px = ox + Math.cos(p.angle) * d;
          const py = oy + Math.sin(p.angle) * d;
          c.beginPath();
          c.arc(px, py, p.size * (1 - ph * 0.4), 0, Math.PI * 2);
          c.fillStyle = p.color;
          c.globalAlpha = p.alpha * fade;
          c.fill();
        });
        c.globalAlpha = 1;
      }

      // ── Phase 5 (60-350ms): speed lines (magenta/purple/gold) ──
      if (elapsed >= 60 && elapsed < 350) {
        const ph = Math.min((elapsed - 60) / 290, 1);
        const fade = ph < 0.5 ? 1 : Math.max(0, 1 - (ph - 0.5) / 0.5);
        speedLines.forEach(sl => {
          const sr = sl.startR;
          const er = sr + sl.len;
          const x1 = ox + Math.cos(sl.angle) * sr;
          const y1 = oy + Math.sin(sl.angle) * sr;
          const x2 = ox + Math.cos(sl.angle) * (sr + (er - sr) * Math.min(ph * 2, 1));
          const y2 = oy + Math.sin(sl.angle) * (sr + (er - sr) * Math.min(ph * 2, 1));
          c.beginPath();
          c.moveTo(x1, y1);
          c.lineTo(x2, y2);
          c.strokeStyle = sl.color;
          c.lineWidth = sl.width;
          c.globalAlpha = fade * 0.75;
          c.shadowColor = sl.color;
          c.shadowBlur = 4;
          c.stroke();
          c.shadowBlur = 0;
        });
        c.globalAlpha = 1;
      }

      // ── Phase 6 (300-800ms): residual magenta afterglow ring ──
      if (elapsed >= 300) {
        const ph = Math.min((elapsed - 300) / 500, 1);
        const fade = Math.pow(1 - ph, 1.8);
        const r = 20 + ph * 25;
        const gw = c.createRadialGradient(ox, oy, r - 6, ox, oy, r + 10);
        gw.addColorStop(0, `rgba(255,0,255,${fade * 0.6})`);
        gw.addColorStop(0.5, `rgba(139,0,139,${fade * 0.35})`);
        gw.addColorStop(1, 'rgba(0,0,0,0)');
        c.beginPath();
        c.arc(ox, oy, r + 10, 0, Math.PI * 2);
        c.fillStyle = gw;
        c.fill();
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  };
})();
