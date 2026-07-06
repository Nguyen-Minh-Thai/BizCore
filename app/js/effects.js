/* ===== BizCore v3 — Effects engine (typewriter, etc.) ===== */
(function(){
  function typewriter(el){
    const phrases = (el.dataset.typewriter || '').split('|').map(s => s.trim()).filter(Boolean);
    if (!phrases.length) return;
    const text = document.createElement('span');
    const cursor = document.createElement('span'); cursor.className = 'tw-cursor';
    el.textContent = ''; el.appendChild(text); el.appendChild(cursor);
    let pi = 0, ci = 0, deleting = false;
    (function tick(){
      const full = phrases[pi];
      if (!deleting){
        ci++; text.textContent = full.slice(0, ci);
        if (ci === full.length){ deleting = true; return setTimeout(tick, 1700); }
      } else {
        ci--; text.textContent = full.slice(0, ci);
        if (ci === 0){ deleting = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(tick, deleting ? 42 : 72);
    })();
  }

  function init(scope){
    (scope || document).querySelectorAll('[data-typewriter]').forEach(el => {
      if (el.dataset.twInit) return; el.dataset.twInit = '1'; typewriter(el);
    });
  }

  function boot(){
    init(document);
    const ca = document.getElementById('contentArea');
    if (ca) new MutationObserver(() => setTimeout(() => init(ca), 60)).observe(ca, { childList:true, subtree:true });
    const ov = document.getElementById('loginOverlay');
    if (ov) new MutationObserver(() => init(ov)).observe(ov, { attributes:true, attributeFilter:['class'] });
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
  window.Effects = { typewriter, init };
})();
