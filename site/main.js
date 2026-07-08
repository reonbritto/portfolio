/* Tab switching (ARIA tabs + hash deep links) */
(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));

  function panelFor(tab) { return document.getElementById(tab.getAttribute("aria-controls")); }
  function keyOf(tab) { return tab.id.replace(/^tab-/, ""); }

  // per-tab footer skyline caption
  var CAPTIONS = {
    about:     "Now based in Belfast — home of Samson & Goliath.",
    work:      "Two years of pipelines built between Bengaluru and Belfast.",
    education: "Reading for an MSc under Belfast's shipyard cranes.",
    skills:    "Every tool sharpened somewhere along this skyline.",
    projects:  "Where the honeynets are set and the botnets get caught."
  };
  var caption = document.querySelector(".site-footer__skyline-caption");
  var skylineHover = document.querySelector(".site-footer__skyline-hover");
  var skylineBuildings = document.querySelector(".site-footer__skyline-buildings");

  // per-tab skyline building sets (drawn inside the translate/scale group; baseline y=80)
  var SKYLINES = {
    about: // Belfast — Samson & Goliath cranes + City Hall dome
      '<polyline points="470,80 470,20 560,20 560,80"></polyline><line x1="470" y1="34" x2="560" y2="34"></line>' +
      '<line x1="515" y1="20" x2="515" y2="34"></line><polyline points="590,80 590,30 660,30 660,80"></polyline>' +
      '<line x1="590" y1="42" x2="660" y2="42"></line><rect x="700" y="55" width="80" height="25"></rect>' +
      '<path d="M 720 55 C 720 38, 760 38, 760 55"></path><line x1="740" y1="30" x2="740" y2="41"></line>' +
      '<rect x="820" y="60" width="24" height="20"></rect><rect x="852" y="52" width="24" height="28"></rect><rect x="884" y="62" width="24" height="18"></rect>',
    work: // Bengaluru — Vidhana Soudha + tech towers
      '<rect x="470" y="46" width="120" height="34"></rect><path d="M 500 46 C 500 30, 560 30, 560 46"></path>' +
      '<line x1="530" y1="24" x2="530" y2="34"></line><rect x="620" y="34" width="30" height="46"></rect>' +
      '<rect x="660" y="24" width="30" height="56"></rect><rect x="700" y="44" width="30" height="36"></rect>' +
      '<rect x="770" y="38" width="26" height="42"></rect><line x1="783" y1="38" x2="783" y2="26"></line>' +
      '<rect x="820" y="52" width="90" height="28"></rect>',
    education: // Belfast — Queen’s Lanyon Building towers
      '<rect x="500" y="40" width="140" height="40"></rect><rect x="520" y="24" width="28" height="16"></rect>' +
      '<rect x="592" y="24" width="28" height="16"></rect><path d="M 520 24 L 534 12 L 548 24"></path>' +
      '<path d="M 592 24 L 606 12 L 620 24"></path><rect x="560" y="30" width="20" height="50"></rect>' +
      '<path d="M 560 30 L 570 18 L 580 30"></path><rect x="700" y="54" width="90" height="26"></rect><rect x="810" y="60" width="70" height="20"></rect>',
    skills: // toolkit — mixed towers + antenna
      '<rect x="480" y="44" width="34" height="36"></rect><rect x="524" y="30" width="34" height="50"></rect>' +
      '<rect x="568" y="52" width="34" height="28"></rect><line x1="640" y1="80" x2="640" y2="18"></line>' +
      '<line x1="640" y1="28" x2="652" y2="36"></line><line x1="640" y1="28" x2="628" y2="36"></line>' +
      '<rect x="700" y="40" width="30" height="40"></rect><rect x="740" y="56" width="30" height="24"></rect>' +
      '<rect x="800" y="48" width="90" height="32"></rect>',
    projects: // labs / servers — stacked racks + radar
      '<rect x="480" y="40" width="60" height="40"></rect><line x1="480" y1="53" x2="540" y2="53"></line>' +
      '<line x1="480" y1="66" x2="540" y2="66"></line><rect x="560" y="48" width="60" height="32"></rect>' +
      '<line x1="560" y1="60" x2="620" y2="60"></line><circle cx="700" cy="58" r="18" fill="none"></circle>' +
      '<circle cx="700" cy="58" r="9" fill="none"></circle><line x1="700" y1="58" x2="716" y2="46"></line>' +
      '<rect x="770" y="50" width="120" height="30"></rect>',
  };

  function setCaption(key) {
    var text = CAPTIONS[key] || CAPTIONS.about;
    if (caption) caption.textContent = text;
    if (skylineHover) skylineHover.setAttribute("aria-label", text);
    if (skylineBuildings && SKYLINES[key]) skylineBuildings.innerHTML = SKYLINES[key];
  }

  function activate(tab, push) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("site-tabs__item--active", on);
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) { p.hidden = p !== panelFor(tab); });
    setCaption(keyOf(tab));
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
  else {
    var active = document.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
    setCaption(keyOf(active));
  }

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

  // 2. header route toggle: Belfast <> Bengaluru
  var roleLine = document.querySelector(".site-header__role");
  if (roleLine) {
    roleLine.addEventListener("click", function (e) {
      e.stopPropagation(); // don't trigger the brand's tab switch
      roleLine.textContent = (roleLine.textContent.indexOf("Belfast") === 0)
        ? "Bengaluru <> Belfast"
        : "Belfast <> Bengaluru";
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
