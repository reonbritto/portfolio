/* Tab switching (ARIA tabs + hash deep links) */
(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));

  function panelFor(tab) { return document.getElementById(tab.getAttribute("aria-controls")); }
  function keyOf(tab) { return tab.id.replace(/^tab-/, ""); }

  function activate(tab, push) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("site-tabs__item--active", on);
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) { p.hidden = p !== panelFor(tab); });
    if (push) {
      var k = keyOf(tab);
      try {
        history.pushState({ tab: k }, "", k === "about" ? location.pathname : "#" + k);
      } catch (e) {}
    }
    window.scrollTo({ top: 0 });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activate(tab, true); });
    tab.addEventListener("keydown", function (e) {
      var idx = i;
      if (e.key === "ArrowRight") idx = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") idx = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") idx = 0;
      else if (e.key === "End") idx = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[idx].focus();
      activate(tabs[idx], true);
    });
  });

  var brand = document.getElementById("brandHome");
  if (brand) brand.addEventListener("click", function () {
    activate(document.getElementById("tab-about"), true);
  });

  function fromHash() {
    var k = (location.hash || "").replace(/^#/, "");
    return k ? document.getElementById("tab-" + k) : null;
  }
  window.addEventListener("popstate", function () {
    activate(fromHash() || tabs[0], false);
  });

  var initial = fromHash();
  if (initial) activate(initial, false);

  /* ---------- connect hover previews (résumé · LinkedIn · GitHub) ---------- */
  var preview = document.getElementById("connectPreview");
  var triggers = document.querySelectorAll(".about-connect__link[data-preview]");
  if (preview && triggers.length) {
    var frame = document.getElementById("previewFrame");
    var card = document.getElementById("previewCard");
    var loader = document.getElementById("previewLoader");
    var titleEl = document.getElementById("previewTitle");
    var iconEl = document.getElementById("previewIcon");
    var openEl = document.getElementById("previewOpen");
    var closeBtn = document.getElementById("previewClose");
    var backdrop = document.getElementById("previewBackdrop");
    var openTimer = null, closeTimer = null, isOpen = false, currentKind = null;
    var coarse = window.matchMedia && window.matchMedia("(hover: none)").matches;

    var RESUME_URL = "assets/reon-britto-resume.pdf";
    var LINKEDIN_URL = "https://www.linkedin.com/in/reonbritto";
    var GITHUB_URL = "https://github.com/reonbritto";
    var LINKEDIN_EMBED = "https://www.linkedin.com/embed/feed/update/";

    var ICON = {
      resume: '<img src="assets/oggy.gif" alt="" width="22" height="22" style="display:block;border-radius:5px" />',
      linkedin: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45z"/></svg>',
      github: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>'
    };
    var TITLE = { resume: "Reon Britto — Résumé", linkedin: "Reon Britto — LinkedIn", github: "reonbritto — GitHub" };
    var OPEN = { resume: RESUME_URL, linkedin: LINKEDIN_URL, github: GITHUB_URL };

    var GITHUB_CARD =
      '<div class="connect-card__inner">' +
      '<p class="connect-card__name">reonbritto</p>' +
      '<p class="connect-card__meta">DevSecOps &amp; Cloud Security · Belfast, UK</p>' +
      '<p class="connect-card__copy">Pinned repositories</p>' +
      '<ul class="connect-card__repos">' +
      '<li><a href="' + GITHUB_URL + '/sbom-analyzer" target="_blank" rel="noopener noreferrer">sbom-analyzer <span>— SBOM vulnerability analyzer</span></a></li>' +
      '<li><a href="' + GITHUB_URL + '/cwe-explorer" target="_blank" rel="noopener noreferrer">cwe-explorer <span>— PureSecure CWE Explorer</span></a></li>' +
      '<li><a href="' + GITHUB_URL + '/AzureSOC" target="_blank" rel="noopener noreferrer">AzureSOC <span>— Azure SOC &amp; Honeynet</span></a></li>' +
      '</ul>' +
      '<a class="connect-card__cta" href="' + GITHUB_URL + '" target="_blank" rel="noopener noreferrer">View full profile ↗</a>' +
      '</div>';

    function showBody(kind) {
      // reset
      frame.hidden = true; card.hidden = true; loader.hidden = true;
      if (kind === "resume") {
        loader.hidden = false;
        frame.hidden = false;
        frame.addEventListener("load", function () { loader.hidden = true; }, { once: true });
        if (frame.getAttribute("data-kind") !== "resume") {
          frame.setAttribute("src", RESUME_URL + "#toolbar=0&view=FitH");
          frame.setAttribute("data-kind", "resume");
        } else { loader.hidden = true; }
      } else if (kind === "linkedin") {
        // LinkedIn blocks generic profile embeds; show a branded card linking out instead.
        card.innerHTML =
          '<div class="connect-card__inner">' +
          '<p class="connect-card__name">Reon Britto</p>' +
          '<p class="connect-card__meta">DevSecOps Engineer · Belfast, UK</p>' +
          '<p class="connect-card__copy">Two years at Kyndryl building CI/CD pipelines and multi-cloud infrastructure. MSc Applied Cyber Security, Queen’s University Belfast.</p>' +
          '<a class="connect-card__cta" href="' + LINKEDIN_URL + '" target="_blank" rel="noopener noreferrer">Open LinkedIn profile ↗</a>' +
          '</div>';
        card.hidden = false;
      } else if (kind === "github") {
        card.innerHTML = GITHUB_CARD;
        card.hidden = false;
      }
    }

    function openPreview(kind) {
      clearTimeout(closeTimer);
      if (isOpen && currentKind === kind) return;
      currentKind = kind;
      iconEl.innerHTML = ICON[kind] || "";
      titleEl.textContent = TITLE[kind] || "Preview";
      openEl.setAttribute("href", OPEN[kind] || "#");
      showBody(kind);
      preview.hidden = false;
      isOpen = true;
    }
    function closePreview() {
      clearTimeout(openTimer);
      isOpen = false; currentKind = null;
      preview.hidden = true;
    }

    triggers.forEach(function (t) {
      var kind = t.getAttribute("data-preview");
      if (!coarse) {
        t.addEventListener("mouseenter", function () {
          clearTimeout(closeTimer);
          openTimer = setTimeout(function () { openPreview(kind); }, 180);
        });
        t.addEventListener("mouseleave", function () {
          clearTimeout(openTimer);
          closeTimer = setTimeout(closePreview, 260);
        });
        t.addEventListener("focus", function () { openPreview(kind); });
      }
    });
    if (!coarse) {
      preview.addEventListener("mouseenter", function () { clearTimeout(closeTimer); });
      preview.addEventListener("mouseleave", function () { closeTimer = setTimeout(closePreview, 260); });
    }
    if (closeBtn) closeBtn.addEventListener("click", function (e) { e.preventDefault(); closePreview(); });
    if (backdrop) backdrop.addEventListener("click", closePreview);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) closePreview(); });
  }

  /* ---------- easter eggs ---------- */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. photo hover → rotating quips in a speech bubble
  var QUIPS = [
    "It works on my machine — and in prod, because CI said so.",
    "sudo apt-get install job-offer",
    "This photo passed all 8 pipeline stages.",
    "curl -s reon | grep 'red flags' → no matches found",
    "99 little bugs in the code… take one down, patch it around…",
    "My other computer is a Kubernetes cluster.",
    "Have you tried turning the firewall off and— no. Never.",
    "Terraform plan: 1 to add (me, to your team). 0 to destroy.",
    "sudo pet cat — permission granted.",
    "This site is guarded by a cat. His name is Oggy."
  ];
  var media = document.querySelector(".about-hero__media");
  if (media) {
    var bubble = document.createElement("span");
    bubble.className = "photo-quip";
    bubble.setAttribute("aria-hidden", "true");
    media.appendChild(bubble);
    var quipIdx = 0;
    media.addEventListener("mouseenter", function () {
      bubble.textContent = QUIPS[quipIdx++ % QUIPS.length];
      bubble.classList.add("show");
    });
    media.addEventListener("mouseleave", function () {
      bubble.classList.remove("show");
    });
  }

  // 2. bongo cat. An original drawing in the bongo-cat meme style that plays five
  //    short generated tunes, synthesised with the Web Audio API. Nothing is
  //    downloaded, so there is no audio file to license. The paws land on the notes.
  var bongo = document.getElementById("bongo");
  var bongoBtn = document.getElementById("bongoBtn");
  var bongoNext = document.getElementById("bongoNext");
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (bongo && bongoBtn && bongoNext && AudioCtx) {
    var pawL = bongo.querySelector(".bongo__paw--l");
    var pawR = bongo.querySelector(".bongo__paw--r");
    var keysL = bongo.querySelectorAll('.bongo__key[data-side="l"]');
    var keysR = bongo.querySelectorAll('.bongo__key[data-side="r"]');
    var playIcon = bongoBtn.querySelector(".bongo__btn-play");
    var pauseIcon = bongoBtn.querySelector(".bongo__btn-pause");
    var trackName = document.getElementById("bongoTrack");
    var trackIdx = document.getElementById("bongoIdx");
    var ctx = null, bus = null, tone = null, master = null, pad = null, padOscs = [];
    var timer = null, playing = false, switching = false;

    // Every scale here is pentatonic, so a random walk cannot land on a sour note.
    var TUNES = [
      { name: "Morning Pune", bpm: 64, style: "walk", cutoff: 2400, rest: 0.22, decay: 1.9, o1: "triangle", shimmer: 0.18, padGain: 0.03,
        scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99], pad: [130.81, 196.0] },          // C major
      { name: "Udupi Rain", bpm: 54, style: "walk", cutoff: 1700, rest: 0.32, decay: 2.5, o1: "sine", shimmer: 0.1, padGain: 0.035,
        scale: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25], pad: [110.0, 164.81] },          // A minor
      { name: "Monsoon Lo-fi", bpm: 72, style: "swing", cutoff: 1500, rest: 0.16, decay: 1.4, o1: "triangle", shimmer: 0.12, padGain: 0.03,
        scale: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25], pad: [87.31, 130.81] },           // F major
      { name: "Night Ferry", bpm: 58, style: "walk", cutoff: 2000, rest: 0.26, decay: 2.2, o1: "triangle", shimmer: 0.14, padGain: 0.05,
        scale: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88], pad: [82.41, 123.47] },           // E minor
      { name: "Filter Coffee", bpm: 88, style: "arp", cutoff: 3200, rest: 0.1, decay: 1.2, o1: "triangle", shimmer: 0.28, padGain: 0.02,
        scale: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33], pad: [98.0, 146.83] }             // G major
    ];
    var TUNE_SECONDS = 48;
    var tuneIdx = 0, tune = TUNES[0], tuneStart = 0, nextTime = 0, step = 4, dir = 1, run = 0;

    function beat() { return 60 / tune.bpm; }

    function showTune() {
      trackName.textContent = tune.name;
      trackIdx.textContent = (tuneIdx + 1) + " / " + TUNES.length;
    }

    function impulse(seconds) {
      var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
      var buf = ctx.createBuffer(2, len, rate);
      for (var c = 0; c < 2; c++) {
        var d = buf.getChannelData(c);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      return buf;
    }

    function setup() {
      ctx = new AudioCtx();
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(ctx.destination);
      // bus -> lowpass -> dry + convolver reverb -> master
      bus = ctx.createGain();
      tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = tune.cutoff; tone.Q.value = 0.4;
      var dry = ctx.createGain(); dry.gain.value = 0.85;
      var verb = ctx.createConvolver(); verb.buffer = impulse(2.6);
      var wet = ctx.createGain(); wet.gain.value = 0.38;
      bus.connect(tone); tone.connect(dry); dry.connect(master);
      tone.connect(verb); verb.connect(wet); wet.connect(master);
      // a barely-there two-note pad under everything, breathing on a slow LFO
      pad = ctx.createGain(); pad.gain.value = tune.padGain; pad.connect(bus);
      tune.pad.forEach(function (f) {
        var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.connect(pad); o.start();
        padOscs.push(o);
      });
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
      var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.012;
      lfo.connect(lfoAmt); lfoAmt.connect(pad.gain); lfo.start();
    }

    function note(freq, t, vel) {
      var env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(vel, t + 0.025);
      env.gain.exponentialRampToValueAtTime(0.0001, t + tune.decay);
      var o1 = ctx.createOscillator(); o1.type = tune.o1; o1.frequency.value = freq;
      var o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
      var shimmer = ctx.createGain(); shimmer.gain.value = tune.shimmer;
      o1.connect(env); o2.connect(shimmer); shimmer.connect(env); env.connect(bus);
      o1.start(t); o2.start(t); o1.stop(t + tune.decay + 0.1); o2.stop(t + tune.decay + 0.1);
    }

    // One paw slam + one lit key. The tune picks a random key on that side; a
    // visitor's own key press lights the key they hit.
    function slam(side, key) {
      var paw = side === "l" ? pawL : pawR;
      if (!key) { var pool = side === "l" ? keysL : keysR; key = pool[Math.floor(Math.random() * pool.length)]; }
      paw.classList.add("is-down"); key.classList.add("is-lit");
      setTimeout(function () { paw.classList.remove("is-down"); key.classList.remove("is-lit"); }, 120);
    }
    function tap(side, when) {
      setTimeout(function () { slam(side); }, Math.max(0, (when - ctx.currentTime) * 1000));
    }

    function hit(i, t, vel) {
      note(tune.scale[i], t, vel);
      tap(i < tune.scale.length / 2 ? "l" : "r", t);
    }

    function clamp(i) { return Math.max(0, Math.min(tune.scale.length - 1, i)); }

    // Look-ahead scheduler: keep ~300ms of notes queued on the audio clock.
    function schedule() {
      if (!switching && ctx.currentTime - tuneStart > TUNE_SECONDS) nextTune();
      var B = beat();
      while (nextTime < ctx.currentTime + 0.3) {
        var vel = 0.16 + Math.random() * 0.08;
        if (tune.style === "arp") {
          // short runs up or down at eighth-note spacing, then a breath
          if (run === 0) {
            if (Math.random() < 0.5) dir = -dir;
            step = clamp(step + (Math.random() < 0.5 ? -2 : 2));
            run = 3 + Math.floor(Math.random() * 3);
            if (Math.random() < tune.rest) { nextTime += B; continue; }
          }
          hit(step, nextTime, vel);
          step = clamp(step + dir); run--;
          nextTime += run === 0 ? B : B / 2;
        } else if (tune.style === "swing") {
          // a note on the beat, often a swung one after it, sometimes a third on top
          step = clamp(step + [-2, -1, 0, 1, 1, 2][Math.floor(Math.random() * 6)]);
          if (Math.random() >= tune.rest) {
            hit(step, nextTime, vel);
            if (Math.random() < 0.25 && step + 2 < tune.scale.length) note(tune.scale[step + 2], nextTime, vel * 0.5);
            if (Math.random() < 0.55) { step = clamp(step + (Math.random() < 0.5 ? -1 : 1)); hit(step, nextTime + B * 0.62, vel * 0.75); }
          }
          nextTime += B;
        } else {
          // walk: a random walk biased to small steps, with a soft note underneath now and then
          step = clamp(step + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]);
          if (Math.random() >= tune.rest) {
            hit(step, nextTime, vel);
            if (step >= 3 && Math.random() < 0.3) hit(step - 3, nextTime + B * 0.5, vel * 0.5);
          }
          nextTime += B * (Math.random() < 0.18 ? 1.5 : 1);
        }
      }
    }

    function selectTune(i) {
      tuneIdx = (i + TUNES.length) % TUNES.length;
      tune = TUNES[tuneIdx];
      step = Math.floor(tune.scale.length / 2); dir = 1; run = 0;
      showTune();
      if (ctx) {
        var now = ctx.currentTime;
        tone.frequency.setTargetAtTime(tune.cutoff, now, 0.25);
        pad.gain.setTargetAtTime(tune.padGain, now, 0.4);
        padOscs.forEach(function (o, k) { o.frequency.setTargetAtTime(tune.pad[k], now, 0.4); });
        tuneStart = now;
      }
    }

    function nextTune() {
      if (!playing) { selectTune(tuneIdx + 1); return; }
      switching = true;
      tuneStart = ctx.currentTime;
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.06, now + 0.5);
      master.gain.linearRampToValueAtTime(0.55, now + 1.7);
      setTimeout(function () {
        if (playing) { selectTune(tuneIdx + 1); nextTime = Math.max(nextTime, ctx.currentTime + 0.4); }
        switching = false;
      }, 500);
    }

    function setPlaying(on) {
      playing = on;
      bongo.classList.toggle("is-playing", on);
      bongoBtn.setAttribute("aria-pressed", on ? "true" : "false");
      bongoBtn.setAttribute("aria-label", on ? "Pause" : "Play");
      // SVG elements have no .hidden property; toggle the attribute the CSS keys off
      playIcon.toggleAttribute("hidden", on); pauseIcon.toggleAttribute("hidden", !on);
    }

    function start() {
      if (!ctx) { setup(); tuneStart = ctx.currentTime; }
      if (ctx.state === "suspended") ctx.resume();
      setPlaying(true);
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.55, now + 1.2);
      nextTime = now + 0.15;
      schedule();
      timer = setInterval(schedule, 100);
    }

    function stop() {
      setPlaying(false);
      clearInterval(timer); timer = null;
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.7);
    }

    /* --- the keyboard is playable ---
       Keys form one ladder, bottom row left to right then top row, mapped onto the
       current tune's pentatonic scale across two octaves - so nothing a visitor
       plays can clash, with or without the tune running. Click/tap a key, or type:
       z x c v b n m , . / for the bottom row, a s d f g h j k l ; for the top. */
    var svgEl = bongo.querySelector(".bongo__svg");
    var aboutPanel = document.getElementById("panel-about");
    var ladder = Array.prototype.slice.call(bongo.querySelectorAll(".bongo__key")).sort(function (a, b) {
      var ya = +a.getAttribute("y"), yb = +b.getAttribute("y");
      return ya !== yb ? yb - ya : (+a.getAttribute("x")) - (+b.getAttribute("x"));
    });
    var KEYMAP = "zxcvbnm,./asdfghjkl;";

    function freqForStep(i) {
      var n = tune.scale.length;
      return tune.scale[i % n] * Math.pow(2, Math.floor(i / n));
    }
    function ensureAudio() {
      if (!ctx) { setup(); tuneStart = ctx.currentTime; }
      if (ctx.state === "suspended") ctx.resume();
      if (!playing) { // stop() fades the master out; a key press brings it straight back
        var now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0.55, now, 0.04);
      }
    }
    function playKey(i) {
      if (i < 0 || i >= ladder.length) return;
      ensureAudio();
      var key = ladder[i];
      note(freqForStep(i), ctx.currentTime, 0.24);
      slam(key.getAttribute("data-side"), key);
    }
    ladder.forEach(function (key, i) {
      key.addEventListener("pointerdown", function (e) { e.preventDefault(); playKey(i); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || aboutPanel.hidden) return;
      var i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i !== -1) playKey(i);
    });

    /* --- the eyes follow the cursor, and blink --- */
    var eyes = bongo.querySelectorAll(".bongo__eye");
    var look = { tx: 0, ty: 0, x: 0, y: 0, raf: null }, blinkY = 1;
    function applyEyes() {
      var t = "translate(" + look.x.toFixed(2) + "px," + look.y.toFixed(2) + "px) scaleY(" + blinkY + ")";
      for (var k = 0; k < eyes.length; k++) eyes[k].style.transform = t;
    }
    function stepLook() {
      look.x += (look.tx - look.x) * 0.2; look.y += (look.ty - look.y) * 0.2;
      applyEyes();
      look.raf = (Math.abs(look.tx - look.x) > 0.05 || Math.abs(look.ty - look.y) > 0.05) ? requestAnimationFrame(stepLook) : null;
    }
    document.addEventListener("mousemove", function (e) {
      if (aboutPanel.hidden) return;
      var r = svgEl.getBoundingClientRect();
      if (!r.width) return;
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height * 0.45)) / r.height;
      var m = Math.hypot(dx, dy) || 1, k = Math.min(1, m) / m; // clamp to a unit circle
      look.tx = dx * k * 5; look.ty = dy * k * 4;               // at most 5 / 4 units of travel
      if (!look.raf) look.raf = requestAnimationFrame(stepLook);
    });
    if (!reducedMotion) (function blink() {
      setTimeout(function () {
        blinkY = 0.12; applyEyes();
        setTimeout(function () { blinkY = 1; applyEyes(); blink(); }, 110);
      }, 2800 + Math.random() * 3200);
    })();

    showTune();
    // Play/pause is the visitor's call: switching tabs does not stop the tune, same
    // as any other player. Clicking the cat toggles it too - but not a key press.
    bongoBtn.addEventListener("click", function () { playing ? stop() : start(); });
    svgEl.addEventListener("click", function (e) {
      if (e.target.classList && e.target.classList.contains("bongo__key")) return;
      playing ? stop() : start();
    });
    bongoNext.addEventListener("click", nextTune);
  }

  // 2b. header route toggle: Pune <> Udupi
  var roleLine = document.querySelector(".site-header__role");
  if (roleLine) {
    roleLine.addEventListener("click", function (e) {
      e.stopPropagation(); // don't trigger the brand's tab switch
      var parts = roleLine.textContent.split(" <> ");
      if (parts.length === 2) roleLine.textContent = parts[1] + " <> " + parts[0];
    });
  }

  // 5. "What your browser just told me" — the visitor's own request reflected back.
  //    Edge facts come from GET /api/hello (worker/index.js reading request.cf);
  //    device facts come from this browser; the signals engine cross-checks the
  //    two the way bot detection does. Everything is rendered with textContent.
  var reflect = document.getElementById("reflect");
  if (reflect && window.fetch && window.Promise) {
    var R = function (id) { return document.getElementById(id); };
    var statusEl = R("reflectStatus"), gridEl = R("reflectGrid"), signalsEl = R("reflectSignals");
    var scoreEl = R("reflectScore"), scoreArc = R("reflectArc"), scoreWord = R("reflectScoreWord");
    var humanBar = R("reflectHumanBar"), humanNum = R("reflectHumanNum");
    var fpEl = R("reflectFp"), fpParts = R("reflectFpParts"), fpBtn = R("reflectFpToggle");
    var curlBtn = R("reflectCopy");
    var started = false, edge = null, device = {}, signals = [], rowIndex = 0;

    var COLO = { LHR: "London", MAN: "Manchester", EDI: "Edinburgh", DUB: "Dublin", AMS: "Amsterdam", FRA: "Frankfurt", DUS: "Düsseldorf", MUC: "Munich", HAM: "Hamburg", BER: "Berlin", CDG: "Paris", MRS: "Marseille", MAD: "Madrid", BCN: "Barcelona", LIS: "Lisbon", MXP: "Milan", FCO: "Rome", ZRH: "Zurich", GVA: "Geneva", VIE: "Vienna", PRG: "Prague", WAW: "Warsaw", BUD: "Budapest", CPH: "Copenhagen", ARN: "Stockholm", OSL: "Oslo", HEL: "Helsinki", BRU: "Brussels", ATH: "Athens", IST: "Istanbul", KBP: "Kyiv", TLV: "Tel Aviv", DXB: "Dubai", DOH: "Doha", BAH: "Manama", KWI: "Kuwait City", RUH: "Riyadh", JED: "Jeddah", MCT: "Muscat", BOM: "Mumbai", DEL: "Delhi", MAA: "Chennai", BLR: "Bengaluru", HYD: "Hyderabad", CCU: "Kolkata", COK: "Kochi", NAG: "Nagpur", AMD: "Ahmedabad", CMB: "Colombo", KHI: "Karachi", LHE: "Lahore", ISB: "Islamabad", DAC: "Dhaka", KTM: "Kathmandu", SIN: "Singapore", KUL: "Kuala Lumpur", BKK: "Bangkok", CGK: "Jakarta", MNL: "Manila", HAN: "Hanoi", SGN: "Ho Chi Minh City", PNH: "Phnom Penh", HKG: "Hong Kong", TPE: "Taipei", ICN: "Seoul", NRT: "Tokyo", KIX: "Osaka", SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", PER: "Perth", ADL: "Adelaide", AKL: "Auckland", JNB: "Johannesburg", CPT: "Cape Town", DUR: "Durban", NBO: "Nairobi", LOS: "Lagos", ACC: "Accra", CAI: "Cairo", CMN: "Casablanca", TUN: "Tunis", GRU: "São Paulo", GIG: "Rio de Janeiro", EZE: "Buenos Aires", SCL: "Santiago", LIM: "Lima", BOG: "Bogotá", UIO: "Quito", MEX: "Mexico City", QRO: "Querétaro", PTY: "Panama City", MIA: "Miami", ATL: "Atlanta", IAD: "Ashburn", EWR: "Newark", JFK: "New York", BOS: "Boston", YYZ: "Toronto", YUL: "Montréal", YVR: "Vancouver", YYC: "Calgary", ORD: "Chicago", DFW: "Dallas", IAH: "Houston", DEN: "Denver", PHX: "Phoenix", LAX: "Los Angeles", SJC: "San Jose", SFO: "San Francisco", SEA: "Seattle", PDX: "Portland", LAS: "Las Vegas", SLC: "Salt Lake City", MSP: "Minneapolis", DTW: "Detroit", MCI: "Kansas City", STL: "St. Louis", CLT: "Charlotte", RDU: "Raleigh", PHL: "Philadelphia", PIT: "Pittsburgh", BUF: "Buffalo", TPA: "Tampa", MCO: "Orlando", BNA: "Nashville", HNL: "Honolulu" };

    function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = "reflect__status" + (cls ? " reflect__status--" + cls : ""); }

    function row(group, label, value, note, tone) {
      var g = gridEl.querySelector('[data-group="' + group + '"] .reflect__rows');
      if (!g || value == null || value === "") return;
      var div = document.createElement("div");
      div.className = "reflect__row" + (tone ? " reflect__row--" + tone : "");
      div.style.setProperty("--i", rowIndex++);
      div.tabIndex = 0;
      var dt = document.createElement("dt"); dt.textContent = label;
      var dd = document.createElement("dd"); dd.textContent = String(value);
      div.appendChild(dt); div.appendChild(dd);
      if (note) {
        var p = document.createElement("dd"); p.className = "reflect__note"; p.textContent = note;
        div.appendChild(p);
        div.setAttribute("aria-expanded", "false");
        var toggle = function () { var open = div.classList.toggle("is-open"); div.setAttribute("aria-expanded", open ? "true" : "false"); };
        div.addEventListener("click", toggle);
        div.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      }
      g.appendChild(div);
      requestAnimationFrame(function () { div.classList.add("is-in"); });
    }

    function signal(tone, text, key) {
      var li = document.createElement("li");
      li.className = "reflect__signal reflect__signal--" + tone;
      li.textContent = text;
      signals.push({ tone: tone, text: text, key: key, el: li });
      signalsEl.appendChild(li);
      score();
    }
    function clearSignal(key) {
      signals = signals.filter(function (x) { if (x.key === key) { x.el.remove(); return false; } return true; });
      score();
    }

    function score() {
      var s = 100, anomalies = 0, notices = 0;
      signals.forEach(function (x) { if (x.tone === "warn") { s -= 35; anomalies++; } else if (x.tone === "notice") { s -= 10; notices++; } });
      s = Math.max(0, Math.min(100, s));
      scoreEl.textContent = String(s);
      scoreArc.style.strokeDashoffset = String(163.4 * (1 - s / 100));
      scoreArc.setAttribute("class", "reflect__arc " + (s >= 80 ? "reflect__arc--ok" : s >= 50 ? "reflect__arc--notice" : "reflect__arc--warn"));
      scoreWord.textContent = s >= 80 ? "human" : s >= 50 ? "probably human" : "suspicious";
      setStatus("● " + rowIndex + " facts · " + anomalies + " anomal" + (anomalies === 1 ? "y" : "ies") + " · " + notices + " notice" + (notices === 1 ? "" : "s"), anomalies ? "warn" : "ok");
    }

    /* ---- pointer entropy: bots don't fidget ---- */
    var moves = 0, turns = 0, lastX = null, lastY = null, lastAng = null, humanScore = 0, motionSignalled = false;
    function onMove(e) {
      var t = e.touches ? e.touches[0] : e;
      if (!t) return;
      if (lastX !== null) {
        var dx = t.clientX - lastX, dy = t.clientY - lastY;
        if (dx || dy) {
          moves++;
          var ang = Math.atan2(dy, dx);
          if (lastAng !== null && Math.abs(ang - lastAng) > 0.6) turns++;
          lastAng = ang;
        }
      }
      lastX = t.clientX; lastY = t.clientY;
      humanScore = Math.min(100, Math.round(moves * 0.6 + turns * 3));
      humanBar.style.width = humanScore + "%";
      humanNum.textContent = humanScore + "%";
      if (!motionSignalled && humanScore >= 40) { motionSignalled = true; clearSignal("still"); signal("ok", "Pointer movement has the jitter of a hand, not a script."); }
    }
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });

    /* ---- client-side facts ---- */
    function uaSummary() {
      var ua = navigator.userAgent || "", d = navigator.userAgentData, brand = null, ver = null;
      if (d && d.brands) d.brands.forEach(function (b) { if (!/Not|Chromium/.test(b.brand)) { brand = b.brand; ver = b.version; } });
      if (!brand) {
        var m = ua.match(/(Firefox|Edg|OPR|Chrome|Safari|Version)\/(\d+)/g) || [];
        var pick = m.find(function (x) { return /Firefox|Edg|OPR/.test(x); }) || m.find(function (x) { return /Chrome/.test(x); }) || m.find(function (x) { return /Version/.test(x); });
        if (pick) { var p = pick.split("/"); brand = { Edg: "Edge", OPR: "Opera", Version: "Safari" }[p[0]] || p[0]; ver = p[1]; }
      }
      var os = (d && d.platform) || (/Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "unknown OS");
      return { text: (brand || "Unknown browser") + (ver ? " " + ver : "") + " on " + os, os: os, uaOs: /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : null, chPlatform: d && d.platform };
    }
    function gpu() {
      try {
        var c = document.createElement("canvas"), gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (!gl) return null;
        var ext = gl.getExtension("WEBGL_debug_renderer_info");
        var raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        if (!raw) return null;
        // "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)" -> "Intel Iris Xe Graphics"
        var mm = raw.match(/^ANGLE \(([^,]+), (.+?)(?: \(0x[0-9A-Fa-f]+\))?(?: Direct3D.*| OpenGL.*| Vulkan.*| Metal.*)?\)$/);
        var name = (mm ? mm[2] : raw).replace(/\((R|TM|C)\)/g, "").replace(/\s+/g, " ").trim();
        return name.length > 56 ? name.slice(0, 55) + "\u2026" : name;
      } catch (e) { return null; }
    }
    function canvasHash() {
      try {
        var c = document.createElement("canvas"); c.width = 220; c.height = 40;
        var x = c.getContext("2d");
        x.textBaseline = "top"; x.font = "15px 'Source Serif 4', Georgia, serif"; x.fillStyle = "#e07a5f"; x.fillRect(0, 0, 220, 40);
        x.fillStyle = "#1a1a1a"; x.fillText("reondev.top ☕ 🐈 " + String.fromCharCode(0x2603), 4, 8);
        x.strokeStyle = "#3d9b8d"; x.beginPath(); x.arc(180, 20, 12, 0, Math.PI * 1.5); x.stroke();
        return c.toDataURL();
      } catch (e) { return "blocked"; }
    }
    function audioHash() {
      return new Promise(function (resolve) {
        try {
          var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          if (!OAC) return resolve("n/a");
          var ac = new OAC(1, 5000, 44100), osc = ac.createOscillator(), comp = ac.createDynamicsCompressor();
          osc.type = "triangle"; osc.frequency.value = 10000;
          osc.connect(comp); comp.connect(ac.destination); osc.start(0);
          ac.startRendering().then(function (buf) {
            var d = buf.getChannelData(0), sum = 0;
            for (var i = 4500; i < 5000; i++) sum += Math.abs(d[i]);
            resolve(sum.toFixed(6));
          }).catch(function () { resolve("blocked"); });
        } catch (e) { resolve("blocked"); }
      });
    }
    function fontsMask() {
      try {
        var c = document.createElement("canvas").getContext("2d"), probe = "mmmmmmmmmmlli", base;
        c.font = "32px monospace"; base = c.measureText(probe).width;
        return ["Segoe UI", "Helvetica Neue", "Roboto", "Ubuntu", "Noto Sans", "Fira Code", "Consolas", "Menlo"].map(function (f) {
          c.font = "32px '" + f + "', monospace"; return c.measureText(probe).width !== base ? 1 : 0;
        }).join("");
      } catch (e) { return "n/a"; }
    }
    function sha256(str) {
      if (!(window.crypto && crypto.subtle)) return Promise.resolve("n/a");
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      });
    }

    /* ---- the trace drawing ---- */
    function setText(id, v) { var el = R(id); if (el) el.textContent = v == null ? "" : String(v); }

    function run() {
      if (started) return; started = true;
      setStatus("● reaching the edge…");
      var t0 = performance.now();
      fetch("/api/hello", { cache: "no-store", credentials: "omit" }).then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      }).then(function (data) {
        edge = data;
        device.fetchMs = Math.round(performance.now() - t0);
        render();
      }).catch(function () {
        setStatus("● couldn't reach the edge — showing what this browser knows", "warn");
        edge = null;
        render();
      });
    }

    function render() {
      var e = edge || {}, ed = e.edge || {}, net = e.network || {}, geo = e.geo || {}, hd = e.headers || {};
      var ua = uaSummary(), clockTz = null;
      // Over HTTP/3 there is no TCP handshake, so the edge reports the QUIC RTT instead.
      var rtt = ed.clientTcpRtt > 0 ? { v: ed.clientTcpRtt, kind: "tcp" } : ed.clientQuicRtt > 0 ? { v: ed.clientQuicRtt, kind: "quic" } : null;
      try { clockTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (x) {}

      /* trace */
      setText("traceYou", geo.city ? geo.city : "you");
      setText("traceIsp", net.asOrganization ? net.asOrganization.replace(/\s+(container|limited|ltd\.?|inc\.?|llc)$/i, "").slice(0, 26) : "your ISP");
      setText("traceIspSub", net.asn ? "AS" + net.asn : "");
      setText("traceEdge", ed.colo ? "edge " + ed.colo : "edge");
      setText("traceEdgeSub", ed.colo ? (COLO[ed.colo] || "Cloudflare") : "Cloudflare");
      setText("traceRtt", rtt ? rtt.v + " ms " + rtt.kind : "");
      setText("traceTotal", device.fetchMs != null ? "round trip " + device.fetchMs + " ms" : "");
      reflect.classList.add("is-traced");

      /* connection */
      row("edge", "Protocol", ed.httpProtocol, ed.httpProtocol === "HTTP/3" ? "HTTP/3 rides on QUIC over UDP: the handshake and encryption are folded into one round trip." : ed.httpProtocol === "HTTP/2" ? "One TCP connection, many streams. Cloudflare offered HTTP/3 too; your browser chose this." : "Modern browsers negotiate HTTP/2 or 3. HTTP/1.1 usually means a proxy, a tool, or a corporate middlebox.");
      row("edge", "TLS", ed.tlsVersion, "The version negotiated between your browser and Cloudflare's edge. 1.3 removes every known-weak option and finishes in one round trip.");
      row("edge", "Cipher", ed.tlsCipher, "AEAD means encryption and integrity in one operation. The edge chose this from the list your browser offered.");
      row("edge", "ClientHello", ed.tlsClientHelloLength ? ed.tlsClientHelloLength + " bytes" : null, "The very first thing you sent: the TLS handshake opener. Its size and shape identify a browser family before any cookie or JavaScript exists.");
      row("edge", "Cipher hash", ed.tlsClientCiphersSha1, "SHA-1 of the cipher suites you offered, in order. This is the heart of a JA3 fingerprint: Chrome, Firefox, Safari and curl each produce a different one.");
      row("edge", "Extension hash", ed.tlsClientExtensionsSha1, "SHA-1 of the TLS extensions you sent. Combined with the cipher hash, bot detection can tell a real browser from a library claiming to be one.");
      row("edge", "Edge RTT", rtt ? rtt.v + " ms (" + rtt.kind + ")" : null, "Round-trip time the edge measured from your transport handshake — TCP for HTTP/1.1 and 2, QUIC for HTTP/3. Light-speed distance plus your last mile.");
      row("edge", "Round trip here", device.fetchMs != null ? device.fetchMs + " ms" : null, "Measured in this page: from sending the request to reading the answer. The gap above the edge RTT is TLS, the Worker, and your browser.");
      row("edge", "Cloudflare colo", ed.colo ? ed.colo + (COLO[ed.colo] ? " · " + COLO[ed.colo] : "") : null, "The data centre that terminated your TLS. Anycast routing sends you to the nearest one, so this is roughly where you are on the internet.");
      row("edge", "Ray", e.ray, "Cloudflare's per-request id. If you ever open a support ticket, this is the number they ask for.");

      /* network & place */
      row("net", "Address", e.ip, /:/.test(e.ip || "") ? "IPv6. Your ISP hands out a block; the second half is your device or router." : "IPv4. Probably shared with other customers behind carrier NAT.");
      row("net", "Network", net.asOrganization ? net.asOrganization + (net.asn ? " · AS" + net.asn : "") : null, "The autonomous system announcing your address. This is who bot detection means by 'residential' or 'data centre'.");
      row("net", "Location", [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || null, "City-level IP geolocation from Cloudflare's database — a guess about your ISP's routing, not GPS." + (geo.isEUCountry ? " Flagged as EU for GDPR purposes." : ""));
      row("net", "Coordinates", geo.latitude != null ? geo.latitude + ", " + geo.longitude + " (approx)" : null, "Rounded to one decimal, which is about 10 km. That is all IP geolocation is good for.");
      row("net", "Timezone (IP)", geo.timezone, "What your location implies your clock should say. Compared below with what your browser actually reports.");

      /* device */
      row("dev", "Browser", ua.text, navigator.userAgentData ? "From Client Hints: the modern, honest channel. The classic User-Agent string is frozen and lies about the OS version on purpose." : "Parsed from the User-Agent string, which browsers now freeze and partly fake to reduce fingerprinting.");
      row("dev", "Screen", screen.width + "×" + screen.height + " @" + (window.devicePixelRatio || 1) + "x · " + screen.colorDepth + "-bit", "Physical screen, pixel density and colour depth. Together with the viewport, one of the strongest passive identifiers.");
      row("dev", "Viewport", innerWidth + "×" + innerHeight, "The bit of the screen this page actually gets.");
      row("dev", "CPU · memory", (navigator.hardwareConcurrency || "?") + " cores" + (navigator.deviceMemory ? " · ≥" + navigator.deviceMemory + " GB" : ""), "hardwareConcurrency and deviceMemory. Chromium rounds memory down to a power of two so it says less than it knows.");
      row("dev", "GPU", gpu(), "WebGL's unmasked renderer string: your graphics driver introduces itself to every website that asks.");
      row("dev", "Languages", (navigator.languages || [navigator.language]).join(", "), "Accept-Language, as the browser sees it. Region tags like en-GB are a soft locator.");
      row("dev", "Timezone (clock)", clockTz, "From your operating system clock via Intl. Bot detection compares this with the IP's timezone.");
      row("dev", "Touch", (navigator.maxTouchPoints || 0) + " points", "Zero on a desktop, five or ten on a phone or tablet.");
      if (navigator.connection && navigator.connection.effectiveType) row("dev", "Network hint", navigator.connection.effectiveType + (navigator.connection.downlink ? " · ~" + navigator.connection.downlink + " Mb/s" : "") + (navigator.connection.rtt ? " · rtt " + navigator.connection.rtt + " ms" : ""), "The browser's own estimate of your connection, from recent transfers.");
      var privacy = [];
      if (navigator.doNotTrack === "1" || hd.dnt === "1") privacy.push("DNT");
      if (navigator.globalPrivacyControl || hd.secGpc === "1") privacy.push("GPC");
      row("dev", "Privacy signals", privacy.length ? privacy.join(" · ") + " on" : "none sent", "Do Not Track is mostly ignored; Global Privacy Control is legally meaningful in California and gaining ground.");
      row("dev", "Automation", navigator.webdriver ? "WebDriver flag set" : "none detected", "navigator.webdriver is set by Selenium, Playwright and Puppeteer. Its absence proves little; its presence proves a lot.", navigator.webdriver ? "warn" : null);
      var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
      row("dev", "Preferences", (mq("(prefers-color-scheme: dark)") ? "dark theme" : "light theme") + (mq("(prefers-reduced-motion: reduce)") ? " · reduced motion" : ""), "System preferences leak through CSS media queries.");

      /* signals: the cross-checks */
      if (geo.timezone && clockTz) {
        if (geo.timezone === clockTz) signal("ok", "Your clock agrees with your IP (" + clockTz + ").");
        else signal("notice", "IP says " + geo.timezone + " but your clock says " + clockTz + " — VPN, proxy, or travelling?");
      }
      var langRegion = (navigator.language || "").split("-")[1];
      if (langRegion && geo.country) {
        if (langRegion.toUpperCase() === geo.country) signal("ok", "Language region " + navigator.language + " matches the IP country.");
        else signal("notice", "Language region " + navigator.language + ", IP country " + geo.country + " — common for expats, VPNs and default installs.");
      }
      // Hosting-provider ASN: the single strongest tell bot management has for VPNs and proxies.
      var org = (net.asOrganization || "").trim();
      if (/\b(host|hosting|vps|servers?|datacent(er|re)|data cent(er|re)|colo|dedicated|digitalocean|hetzner|ovh|linode|vultr|leaseweb|m247|choopa|contabo|scaleway|upcloud|ionos|amazon|aws|azure|microsoft corp|google (cloud|llc)|oracle|alibaba|tencent)\b/i.test(org)) signal("notice", "Your address belongs to a hosting provider (" + org + "), not a home ISP — VPN or proxy.");
      // RTT asymmetry: a box next to Cloudflare answering fast, with you far behind it.
      if (rtt && device.fetchMs != null && device.fetchMs > rtt.v * 8 + 300) signal("notice", "Edge RTT " + rtt.v + " ms but your round trip is " + device.fetchMs + " ms — something next to Cloudflare is relaying for you.");
      if (ed.httpProtocol === "HTTP/3") signal("ok", "HTTP/3 over QUIC — the modern path.");
      else if (ed.httpProtocol === "HTTP/1.1") signal("notice", "HTTP/1.1 from something claiming to be a modern browser.");
      if (ed.tlsVersion === "TLSv1.3") signal("ok", "TLS 1.3 — nothing weak on the table.");
      else if (ed.tlsVersion) signal("notice", ed.tlsVersion + " — a real browser would have offered 1.3.");
      if (hd.acceptEncoding) {
        if (/\bbr\b/.test(hd.acceptEncoding)) signal("ok", "Offers Brotli — tools like curl and Python requests don't by default.");
        else signal("notice", "No Brotli in Accept-Encoding: that is how a script usually looks.");
      }
      if (ua.chPlatform && ua.uaOs && ua.chPlatform.toLowerCase().indexOf(ua.uaOs.toLowerCase().slice(0, 3)) === -1) signal("warn", "Client Hints say " + ua.chPlatform + " but the User-Agent claims " + ua.uaOs + " — a spoofed UA.");
      if (navigator.webdriver) signal("warn", "WebDriver flag set — Selenium, Playwright or Puppeteer is driving this browser.");
      if (!(navigator.languages && navigator.languages.length)) signal("warn", "No languages at all — headless browsers forget to set them.");
      if (rtt && device.fetchMs != null && device.fetchMs < rtt.v * 0.5) signal("notice", "Your fetch came back in half the edge's own RTT measurement — something nearer than Cloudflare is answering.");
      setTimeout(function () { if (!motionSignalled) signal("notice", "No pointer movement in eight seconds — bots don't fidget. Move the mouse to clear this.", "still"); }, 8000);
      score();

      /* fingerprint */
      var parts = {
        canvas: canvasHash(), gpu: gpu() || "n/a", fonts: fontsMask(),
        screen: screen.width + "x" + screen.height + "x" + (window.devicePixelRatio || 1) + "x" + screen.colorDepth,
        locale: (navigator.languages || []).join(",") + "|" + clockTz,
        hw: (navigator.hardwareConcurrency || 0) + "|" + (navigator.deviceMemory || 0) + "|" + (navigator.maxTouchPoints || 0) + "|" + (navigator.platform || "")
      };
      audioHash().then(function (a) {
        parts.audio = a;
        return sha256(Object.keys(parts).sort().map(function (k) { return k + "=" + parts[k]; }).join("\n"));
      }).then(function (hex) {
        fpEl.textContent = hex === "n/a" ? "unavailable" : hex.slice(0, 32);
        var list = Object.keys(parts).map(function (k) {
          var v = String(parts[k]); if (k === "canvas") v = v === "blocked" ? "blocked by your browser (good)" : "image → " + v.length + " chars";
          return k + ": " + v.slice(0, 60);
        });
        fpParts.textContent = list.join("\n");
        if (parts.canvas === "blocked" || parts.audio === "blocked") signal("ok", "Your browser blocks canvas or audio fingerprinting. Nice.");
      });
    }

    /* fingerprint components toggle, curl copy */
    if (fpBtn) fpBtn.addEventListener("click", function () {
      var open = reflect.classList.toggle("is-fp-open");
      fpBtn.setAttribute("aria-expanded", open ? "true" : "false");
      fpBtn.textContent = open ? "hide the ingredients" : "what's it made of?";
    });
    if (curlBtn) curlBtn.addEventListener("click", function () {
      var cmd = "curl -s https://reondev.top/api/hello";
      var done = function () { curlBtn.textContent = "copied"; setTimeout(function () { curlBtn.textContent = "copy"; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cmd).then(done, done); else done();
    });

    /* start when it scrolls into view on the About tab, or straight away if it's already there */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        if (entries.some(function (x) { return x.isIntersecting; })) { obs.disconnect(); run(); }
      }, { rootMargin: "120px" }).observe(reflect);
    } else run();
  }

  // 3. console note for fellow inspectors
  try {
    console.log(
      "%c reon.britto %c devsecops ",
      "background:#e07a5f;color:#fff;padding:3px 6px;border-radius:4px 0 0 4px;font-weight:600",
      "background:#3d9b8d;color:#fff;padding:3px 6px;border-radius:0 4px 4px 0;font-weight:600"
    );
    console.log("Opening the console on a portfolio site? Very DevSecOps of you.");
    console.log("Say hi: rbritto01@qub.ac.uk — and if you spot a cat on this site, it's friendly. Try clicking the skyline.");
  } catch (err) {}

  // 4. click the skyline -> a cat strolls across the rooftops
  var skyline = document.querySelector(".site-footer__skyline");
  if (skyline) {
    var catWalking = false;
    skyline.addEventListener("click", function () {
      if (catWalking || reducedMotion) return;
      catWalking = true;
      // Wrapper carries the horizontal travel (a composited transform); the img keeps its
      // own internal leg animation. Separating them onto their own layers stops the flicker.
      var track = document.createElement("span");
      track.className = "skyline-cat";
      track.setAttribute("aria-hidden", "true");
      var cat = document.createElement("img");
      cat.alt = "";
      cat.src = "assets/walking-cat.svg";
      cat.draggable = false;
      cat.style.transform = "scaleX(-1)"; // face direction of travel (right)
      track.appendChild(cat);
      skyline.appendChild(track);
      // walk flat along the skyline line, left -> right, stopping at the line's end.
      var run = function () {
        var catW = track.offsetWidth || 42;
        var dist = Math.max(skyline.offsetWidth - catW, 0);
        var anim = track.animate(
          [
            { transform: "translate3d(0,0,0)" },
            { transform: "translate3d(" + dist + "px,0,0)" }
          ],
          { duration: 5500, easing: "linear", fill: "forwards" }
        );
        anim.onfinish = function () { track.remove(); catWalking = false; };
      };
      if (cat.complete) run(); else cat.addEventListener("load", run, { once: true });
    });
  }
})();
