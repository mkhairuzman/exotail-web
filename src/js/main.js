import { copy } from '../content/copy.js';

/* ===== i18n: language toggle (ID default) + persistence ===== */
(function(){
  var KEY = 'exotail-language';
  function get(obj, path){ return path.split('.').reduce(function(o,k){ return o && o[k]; }, obj); }
  function apply(lang){
    var dict = copy[lang] || copy.id;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var v = get(dict, el.getAttribute('data-i18n')); if(v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el){
      var v = get(dict, el.getAttribute('data-i18n-html')); if(v != null) el.innerHTML = v;
    });
    document.documentElement.lang = lang;
    if(dict.title) document.title = dict.title;
    document.querySelectorAll('.lang-switch button').forEach(function(b){
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem(KEY, lang); } catch(e){}
  }
  var saved = 'id';
  try { saved = localStorage.getItem(KEY) || 'id'; } catch(e){}
  if(saved !== 'en') saved = 'id';
  apply(saved);
  document.querySelectorAll('.lang-switch button').forEach(function(b){
    b.addEventListener('click', function(){ apply(b.getAttribute('data-lang')); });
  });
})();

/* ===== Axolotl video mascot — start -> idle flow =====
   Hero mount holds two stacked <video> layers (.axo-start, .axo-idle).
   On load: play the start (swim-in) once, then crossfade into the
   looping idle. Idle is preloaded so the swap has no blank/black frame.
   Mounts without video (e.g. CTA) get the static PNG mascot instead.
   prefers-reduced-motion: skip the start, show the idle pose statically.
   Any failure (no codec / autoplay blocked) falls through to idle. */
(function(){
  var PNG = '/assets/mascot/axolotl-mascot.png';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.axo-mount').forEach(function(mount){
    var idleV = mount.querySelector('.axo-idle');
    if(idleV){ initVideoMascot(mount, mount.querySelector('.axo-start'), idleV); }
    else if(!mount.querySelector('video')){ injectPng(mount); } // CTA wave video plays on its own
  });

  function injectPng(mount){
    var img = new Image();
    img.className = 'axo-img';
    img.alt = 'Maskot axolotl Exotail';
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('error', function(){
      var stage = mount.closest('.axo-stage');
      if(stage){ stage.classList.add('axo-failed'); }
      img.remove();
    });
    img.src = PNG;
    mount.appendChild(img);
  }

  function initVideoMascot(mount, startV, idleV){
    var stage = mount.closest('.axo-stage');
    var waveV = mount.querySelector('.axo-wave');
    var switched = false, idleReady = false;

    idleV.muted = true;
    idleV.loop = true;
    try { idleV.load(); } catch(e){}           // preload idle in the background

    var toIdle = function(){
      if(switched) return; switched = true;
      try { idleV.currentTime = 0; } catch(e){} // idle frame 0 (B) == start's last frame
      var p = idleV.play();
      if(p && p.catch){ p.catch(function(){}); }
      // INSTANT switch — no fade. Flip visibility in one frame; start holds
      // its last frame underneath, idle's first frame is identical, so it's seamless.
      stage.classList.add('axo-idle-on');
      try { startV && startV.pause(); } catch(e){}
      idleReady = true;                         // wave interaction allowed from here
      showHintSoon();                           // "Klik aku!" once idle begins
    };

    // ----- "Klik aku!" hint bubble (idle only) -----
    var HINT_DELAY = 1000, HINT_AUTOHIDE = 5500;
    var hintShowT = null, hintHideT = null;
    var hasShownHint = false;                     // in-memory only — resets on page refresh
    function showHintSoon(){
      if(!stage.querySelector('.axo-hint') || hasShownHint) return; // once per page load
      clearTimeout(hintShowT); clearTimeout(hintHideT);
      hintShowT = setTimeout(function(){
        hasShownHint = true;                        // never again until refresh
        stage.classList.add('axo-hint-on');
        hintHideT = setTimeout(hideHint, HINT_AUTOHIDE); // auto-hide so it's not distracting
      }, HINT_DELAY);
    }
    function hideHint(){
      clearTimeout(hintShowT); clearTimeout(hintHideT);
      stage.classList.remove('axo-hint-on');
    }

    // Reduced motion: no swim-in, no wave — just the idle pose.
    if(reduce){
      if(startV){ startV.remove(); }
      if(waveV){ waveV.remove(); }
      stage.classList.add('axo-idle-on');
      return;
    }

    if(startV){
      startV.muted = true;
      startV.addEventListener('ended', toIdle); // switch the instant start finishes (at B)
      startV.addEventListener('error', toIdle); // can't play start -> go straight to idle
      var ps = startV.play();
      if(ps && ps.catch){ ps.catch(toIdle); }   // autoplay blocked -> idle
      setTimeout(toIdle, 12000);                // safety net
    } else {
      toIdle();
    }

    // ----- Wave-hand interaction (overlays the looping idle) -----
    if(waveV){
      var waving = false;
      waveV.muted = true;
      try { waveV.load(); } catch(e){}          // preload so there's no hover/tap delay
      var endWave = function(){
        if(!waving) return;
        // reset idle to frame 0 (B) — matches the wave's final sitting pose —
        // and have it playing BEFORE we reveal it, so the swap is seamless
        idleV.playbackRate = 1;
        try { idleV.currentTime = 0; } catch(e){}
        try { idleV.play(); } catch(e){}
        stage.classList.remove('axo-wave-on');   // instant swap back to idle
        try { waveV.pause(); } catch(e){}         // wave hidden + stopped
        waving = false;
        // note: hint is NOT shown again after waving (once per session only)
      };
      var playWave = function(){
        if(!idleReady || waving) return;        // not before start ends; ignore while waving
        waving = true;
        hideHint();                              // bubble off during wave
        try { idleV.pause(); } catch(e){}        // hide + stop idle (no ghosting behind wave)
        try { waveV.currentTime = 0; } catch(e){}
        waveV.playbackRate = 1.35;               // happier, more energetic wave
        var pw = waveV.play();
        if(pw && pw.catch){ pw.catch(endWave); }
        stage.classList.add('axo-wave-on');     // ONLY the wave video is visible now
      };
      waveV.addEventListener('ended', endWave);  // return to idle
      waveV.addEventListener('error', endWave);
      // desktop = hover; touch = tap. Avoid double-trigger on touch devices.
      var hoverDev = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
      if(hoverDev){ stage.addEventListener('mouseenter', playWave); }
      else { stage.addEventListener('click', playWave); }
      // keyboard accessibility: Enter / Space triggers the wave
      stage.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); playWave(); }
      });
    }
  }
})();

(function(){
  // ---- Bubble generator ----
  function makeBubbles(el, count){
    if(!el) return;
    for(let i=0;i<count;i++){
      const b=document.createElement('span');
      b.className='bubble';
      const size=4+Math.random()*16;
      b.style.width=size+'px';b.style.height=size+'px';
      b.style.left=(8+Math.random()*84)+'%';
      b.style.setProperty('--drift',(Math.random()*40-20)+'px');
      const dur=5+Math.random()*5;
      b.style.animationDuration=dur+'s';
      b.style.animationDelay=(-Math.random()*dur)+'s';
      el.appendChild(b);
    }
  }
  var small = window.innerWidth < 768;
  makeBubbles(document.getElementById('heroBubbles'), small ? 7 : 16);
  makeBubbles(document.getElementById('ctaBubbles'), small ? 5 : 8);

  // ---- Scroll reveal ----
  var revealEls=[].slice.call(document.querySelectorAll('.reveal'));
  function showInView(){
    var vh=window.innerHeight||document.documentElement.clientHeight;
    revealEls=revealEls.filter(function(el){
      var r=el.getBoundingClientRect();
      if(r.top<vh*0.92 && r.bottom>0){ el.classList.add('in'); return false; }
      return true;
    });
  }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    },{threshold:0.12,rootMargin:'0px 0px -6% 0px'});
    revealEls.forEach(function(el){io.observe(el);});
  }
  // Fallback / immediate reveal for above-the-fold content (deferred past first paint
  // so the transform "rise" plays instead of being skipped on initial layout)
  requestAnimationFrame(function(){ requestAnimationFrame(showInView); });
  window.addEventListener('scroll',showInView,{passive:true});
  window.addEventListener('resize',showInView,{passive:true});
  window.addEventListener('load',showInView);
  // Safety net: never leave content permanently hidden if scroll events don't fire
  setTimeout(function(){ revealEls.forEach(function(el){el.classList.add('in');}); revealEls=[]; },3000);

  // ---- Mobile nav (smooth scroll links already work) ----
  const toggle=document.getElementById('navToggle');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const links=document.querySelector('.nav-links');
      const open=links.style.display==='flex';
      links.style.display=open?'':'flex';
      if(!open){
        links.style.position='absolute';links.style.top='78px';links.style.left='0';links.style.right='0';
        links.style.flexDirection='column';links.style.background='var(--white)';links.style.padding='20px 28px';
        links.style.gap='18px';links.style.borderBottom='1px solid rgba(59,0,139,.1)';links.style.boxShadow='0 20px 40px -20px rgba(59,0,139,.3)';
      }
    });
  }

  // ---- Axolotl types carousel ----
  (function(){
    var track = document.getElementById('typesTrack');
    var dotsWrap = document.getElementById('typesDots');
    if(!track) return;
    var prev = document.getElementById('typesPrev');
    var next = document.getElementById('typesNext');
    var cards = [].slice.call(track.children);

    function step(){ // one card width incl. gap
      if(cards.length < 2) return track.clientWidth;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    }
    function perView(){ return Math.max(1, Math.round(track.clientWidth / step())); }
    function pages(){ return Math.max(1, cards.length - perView() + 1); }
    function current(){ return Math.round(track.scrollLeft / step()); }

    function buildDots(){
      if(!dotsWrap) return;
      dotsWrap.innerHTML = '';
      var n = pages();
      for(var i=0;i<n;i++){
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ke kartu ' + (i+1));
        (function(idx){ b.addEventListener('click', function(){ track.scrollTo({left: idx*step(), behavior:'smooth'}); }); })(i);
        dotsWrap.appendChild(b);
      }
      sync();
    }
    function sync(){
      var idx = current();
      if(dotsWrap){
        var ds = dotsWrap.children, max = ds.length - 1;
        var act = Math.min(max, idx);
        for(var i=0;i<ds.length;i++){ ds[i].classList.toggle('active', i===act); }
      }
      var atStart = track.scrollLeft <= 2;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      if(prev) prev.disabled = atStart;
      if(next) next.disabled = atEnd;
    }

    if(prev) prev.addEventListener('click', function(){ track.scrollBy({left:-step(), behavior:'smooth'}); });
    if(next) next.addEventListener('click', function(){ track.scrollBy({left: step(), behavior:'smooth'}); });
    track.addEventListener('scroll', function(){ window.requestAnimationFrame(sync); }, {passive:true});
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(buildDots, 150); });
    buildDots();
  })();
})();

