// ── Kokusen (黒閃) Effect ──
// Full-screen canvas: dark flash → white/red lightning burst → black debris → 黒閃 kanji

(function () {
  // ── Audio ──
  let _ctx = null;
  let _buf = null;

  function _audioCtx() {
    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return _ctx;
  }

  function _loadAudio() {
    const ctx = _audioCtx();
    if (!ctx || _buf) return;
    fetch('assets/sounds/kokusen-sound.m4a')
      .then(r => r.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab, b => { _buf = b; }))
      .catch(() => {});
  }

  function _play() {
    const ctx = _audioCtx();
    if (!ctx || !_buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = _buf;
      const gain = ctx.createGain();
      gain.gain.value = 0.75;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
  }

  document.addEventListener('touchstart', _loadAudio, { once: true });
  document.addEventListener('click',      _loadAudio, { once: true });

  // ── Recursive jagged bolt ──
  function bolt(c, x1, y1, x2, y2, disp) {
    if (disp < 2) { c.lineTo(x2, y2); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
    bolt(c, x1, y1, mx, my, disp / 2);
    bolt(c, mx, my, x2, y2, disp / 2);
  }

  // ── Main trigger ──
  window.triggerKokusen = function (btn) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    _play();

    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9995;';
    document.body.appendChild(canvas);
    const g = canvas.getContext('2d');

    // ── Pre-generate stable data ──

    // 12 primary lightning bolts
    const NUM_BOLTS = 12;
    const bolts = Array.from({ length: NUM_BOLTS }, (_, i) => {
      const a = (Math.PI * 2 * i / NUM_BOLTS) + (Math.random() - 0.5) * 0.35;
      return {
        angle: a,
        len:   90 + Math.random() * 130,
        hasBranch: Math.random() > 0.3,
        bAngle: a + (Math.random() - 0.5) * 1.1,
        bFrac:  0.35 + Math.random() * 0.3,
        bLen:   35 + Math.random() * 55,
      };
    });

    // Heavy black + dark-red debris chunks (circles and shards)
    const NUM_DEBRIS = 28;
    const debris = Array.from({ length: NUM_DEBRIS }, () => {
      const isChunk = Math.random() > 0.4;
      return {
        angle: Math.random() * Math.PI * 2,
        speed: 70 + Math.random() * 180,
        size:  isChunk ? 5 + Math.random() * 11 : 2 + Math.random() * 5,
        rot:   Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.15,
        // colour: mostly black, some dark-red, rare white fleck
        col: Math.random() < 0.6 ? '#000'
           : Math.random() < 0.7 ? '#3a0000'
           : '#fff',
        shard: !isChunk,  // thin rectangular shard vs circle
        w: 2 + Math.random() * 4,
        h: 8 + Math.random() * 14,
      };
    });

    const t0 = performance.now();
    const DUR = 950;

    function frame(now) {
      const ms = now - t0;
      const t  = Math.min(ms / DUR, 1);
      if (t >= 1) { canvas.remove(); return; }
      g.clearRect(0, 0, W, H);

      // ────────────────────────────────────────────────────────────
      // PHASE 1 — Dark screen slam (0 – 180 ms)
      // Short blackout: ramps to 0.92 opacity then fades
      // ────────────────────────────────────────────────────────────
      if (ms < 220) {
        const a = ms < 60  ? (ms / 60) * 0.92
                : ms < 130 ? 0.92
                :            Math.max(0, 0.92 - (ms - 130) / 90 * 0.92);
        g.fillStyle = `rgba(0,0,0,${a})`;
        g.fillRect(0, 0, W, H);
      }

      // ────────────────────────────────────────────────────────────
      // PHASE 2 — White-hot centre burst (30 – 280 ms)
      // ────────────────────────────────────────────────────────────
      if (ms >= 30 && ms < 280) {
        const ph   = Math.min((ms - 30) / 120, 1);
        const fade = ms < 180 ? 1 : Math.max(0, 1 - (ms - 180) / 100);
        const r    = 6 + ph * 55;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        gr.addColorStop(0,   `rgba(255,255,255,${fade})`);
        gr.addColorStop(0.25,`rgba(255,255,255,${fade * 0.95})`);
        gr.addColorStop(0.55,`rgba(220,0,0,${fade * 0.8})`);
        gr.addColorStop(0.8, `rgba(100,0,0,${fade * 0.4})`);
        gr.addColorStop(1,   'rgba(0,0,0,0)');
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fillStyle = gr;
        g.fill();
      }

      // ────────────────────────────────────────────────────────────
      // PHASE 3 — Black / white / red lightning (40 – 560 ms)
      // Three passes per bolt: red outer glow → white core → black razor edge
      // ────────────────────────────────────────────────────────────
      if (ms >= 40 && ms < 560) {
        const ph       = (ms - 40) / 520;
        const grow     = Math.min((ms - 40) / 170, 1);
        const intensity = ph < 0.22
          ? ph / 0.22
          : Math.pow(1 - (ph - 0.22) / 0.78, 1.4);

        bolts.forEach(bd => {
          const len = bd.len * grow;
          const ex  = cx + Math.cos(bd.angle) * len;
          const ey  = cy + Math.sin(bd.angle) * len;

          // --- Red outer glow ---
          g.beginPath(); g.moveTo(cx, cy);
          bolt(g, cx, cy, ex, ey, len * 0.46);
          g.strokeStyle = `rgba(200,0,0,${intensity * 0.72})`;
          g.lineWidth   = 5.5;
          g.shadowColor = '#dd0000';
          g.shadowBlur  = 16;
          g.globalAlpha = 1;
          g.stroke();

          // --- White core ---
          g.beginPath(); g.moveTo(cx, cy);
          bolt(g, cx, cy, ex, ey, len * 0.32);
          g.strokeStyle = `rgba(255,255,255,${intensity * 0.98})`;
          g.lineWidth   = 1.8;
          g.shadowColor = '#ffffff';
          g.shadowBlur  = 10;
          g.stroke();

          // --- Black razor edge (thin black outline at core) ---
          g.beginPath(); g.moveTo(cx, cy);
          bolt(g, cx, cy, ex, ey, len * 0.3);
          g.strokeStyle = `rgba(0,0,0,${intensity * 0.6})`;
          g.lineWidth   = 0.6;
          g.shadowBlur  = 0;
          g.stroke();

          // --- Branch ---
          if (bd.hasBranch && grow > 0.35) {
            const bpx = cx + Math.cos(bd.angle) * len * bd.bFrac;
            const bpy = cy + Math.sin(bd.angle) * len * bd.bFrac;
            const bex = bpx + Math.cos(bd.bAngle) * bd.bLen * grow;
            const bey = bpy + Math.sin(bd.bAngle) * bd.bLen * grow;
            g.beginPath(); g.moveTo(bpx, bpy);
            bolt(g, bpx, bpy, bex, bey, 14);
            g.strokeStyle = `rgba(255,60,60,${intensity * 0.65})`;
            g.lineWidth   = 1.6;
            g.shadowColor = '#bb0000';
            g.shadowBlur  = 8;
            g.stroke();
          }
        });

        g.shadowBlur  = 0;
        g.globalAlpha = 1;
      }

      // ────────────────────────────────────────────────────────────
      // PHASE 4 — Heavy debris (50 – 780 ms)
      // ────────────────────────────────────────────────────────────
      if (ms >= 50 && ms < 780) {
        const ph   = (ms - 50) / 730;
        const fade = ph < 0.55 ? 1 : Math.max(0, 1 - (ph - 0.55) / 0.45);
        g.globalAlpha = fade;

        debris.forEach(p => {
          const d  = p.speed * ph;
          const px = cx + Math.cos(p.angle) * d;
          const py = cy + Math.sin(p.angle) * d;
          const rot = p.rot + p.rotSpd * ms;

          g.fillStyle = p.col;

          if (p.shard) {
            // Thin rectangular shard, rotated
            g.save();
            g.translate(px, py);
            g.rotate(rot);
            g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (1 - ph * 0.4));
            g.restore();
          } else {
            // Round chunk
            const r = p.size * (1 - ph * 0.25);
            g.beginPath();
            g.arc(px, py, Math.max(r, 1), 0, Math.PI * 2);
            g.fill();
          }
        });

        g.globalAlpha = 1;
      }

      // ────────────────────────────────────────────────────────────
      // PHASE 5 — 黒閃 kanji (60 – 800 ms)
      // White fill + red glow + black stroke, bold
      // ────────────────────────────────────────────────────────────
      if (ms >= 60 && ms < 800) {
        const ph     = (ms - 60) / 740;
        const fadeIn = Math.min((ms - 60) / 90, 1);
        const fadeOut = ph > 0.72 ? Math.max(0, 1 - (ph - 0.72) / 0.28) : 1;
        const alpha  = fadeIn * fadeOut;

        // Slight punch scale
        const scale  = ph < 0.12 ? 1 + (ph / 0.12) * 0.22 : 1.22 - (ph - 0.12) * 0.18;
        const fSize  = Math.round(Math.max(46, 52 * scale));

        // Clamp text X so the kanji never goes off either edge of the screen.
        // Estimated half-width of two CJK chars at this font size ≈ fSize * 1.1
        const pad    = fSize * 1.15;
        const textX  = Math.min(Math.max(cx, pad), W - pad);
        // Position above the tap point, but keep within top of screen
        const textY  = Math.max(cy - 70, fSize * 0.8);

        g.save();
        g.globalAlpha = alpha;
        g.font        = `900 ${fSize}px "Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif`;
        g.textAlign   = 'center';
        g.textBaseline = 'middle';

        // Step 1 — thick white stroke (creates the white border around each letter)
        g.shadowColor = '#ffffff';
        g.shadowBlur  = 24;
        g.strokeStyle = '#ffffff';
        g.lineWidth   = 12;
        g.lineJoin    = 'round';
        g.strokeText('黒閃', textX, textY);

        // Step 2 — solid black fill painted on top (the letter itself is black)
        g.shadowBlur  = 0;
        g.fillStyle   = '#000000';
        g.fillText('黒閃', textX, textY);

        g.restore();
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  };
})();
