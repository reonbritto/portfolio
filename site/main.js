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
