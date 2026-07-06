/* ===== BizCore v2 — Motion engine (GSAP) — bulletproof visibility ===== */
(function(){
  const g = window.gsap;
  const fmtVi = n => Math.round(n).toLocaleString('vi-VN');

  // Failsafe: nếu vì lý do gì element kẹt opacity:0 → ép hiển thị lại.
  function unstick(els){
    setTimeout(() => els.forEach(el => {
      if (el && getComputedStyle(el).opacity === '0') { el.style.opacity = ''; el.style.transform = ''; }
    }), 1500);
  }

  function countUp(el){
    if (el.dataset.counted) return;
    const raw = (el.textContent || '').trim();
    const target = parseInt(raw.replace(/[^\d]/g,''), 10);
    el.dataset.counted = '1';
    if (!isFinite(target) || target <= 0) return;
    const isPct = raw.includes('%');
    const suffix = isPct ? '%' : (raw.includes('₫') ? ' ₫' : '');
    const dur = 900, start = performance.now();
    (function tick(now){
      const p = Math.min(1, (now - start) / dur);
      const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = (isPct ? v : fmtVi(v)) + suffix;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = raw;
    })(start);
  }

  function reveal(el, i){
    if (!g) return;
    g.fromTo(el, { opacity:0, y:16 },
      { opacity:1, y:0, duration:.5, delay: Math.min(i,10) * 0.055, ease:'power2.out', overwrite:'auto', clearProps:'opacity,transform' });
  }

  function entrance(scope){
    scope = scope || document;
    const cards = [...scope.querySelectorAll(
      '.stat-card, .dashboard-grid > .card, .report-grid > .card, .dept-card, .page-header, .table-container, .kanban-board, .attendance-clock-section, .tabs-header, .filter-bar'
    )].filter(el => !el.dataset.fx);
    cards.forEach((el, i) => { el.dataset.fx = '1'; reveal(el, i); });
    if (cards.length) unstick(cards);
    scope.querySelectorAll('.stat-card-value, [data-countup]').forEach(countUp);
  }

  function animateLogin(){
    const ov = document.getElementById('loginOverlay');
    if (!ov || ov.classList.contains('hidden') || ov.dataset.animated) return;
    ov.dataset.animated = '1';
    const card = ov.querySelector('.login-card');
    if (g && card){
      g.fromTo(card, { opacity:0, y:22, scale:.98 },
        { opacity:1, y:0, scale:1, duration:.6, ease:'power3.out', overwrite:'auto', clearProps:'opacity,transform' });
      const items = [...card.querySelectorAll('.login-brandrow, .login-kick, h2, .login-sub, .form-group, .login-row, .btn-block, .login-hint')];
      g.fromTo(items, { opacity:0, y:10 },
        { opacity:1, y:0, duration:.45, stagger:0.05, delay:.12, ease:'power2.out', overwrite:'auto', clearProps:'opacity,transform' });
      ov.querySelectorAll('.login-bg span').forEach((s,k) =>
        g.to(s, { x:(k%2?70:-70), y:(k%2?-50:60), duration:9+k*2, repeat:-1, yoyo:true, ease:'sine.inOut' }));
      unstick([card, ...items]);
    }
  }

  function init(){
    const ca = document.getElementById('contentArea');
    if (ca){
      let last = 0;
      new MutationObserver(() => {
        const n = Date.now(); if (n - last < 100) return; last = n;
        setTimeout(() => { try { entrance(ca); } catch(e){} }, 70);
      }).observe(ca, { childList:true, subtree:true });
    }
    const ov = document.getElementById('loginOverlay');
    if (ov){
      new MutationObserver(() => { ov.classList.contains('hidden') ? (ov.dataset.animated='') : animateLogin(); })
        .observe(ov, { attributes:true, attributeFilter:['class'] });
      if (!ov.classList.contains('hidden')) animateLogin();
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  window.Fx = { entrance, animateLogin, countUp };
})();
