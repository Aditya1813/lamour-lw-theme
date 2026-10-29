/* =========================================================================
   lamour.js — progressive enhancement for the L'Amour LearnWorlds theme.

   Rules this file follows:
   • Nothing here is required for the page to be readable. If it never runs,
     every section is visible and every link works — the hidden-before-reveal
     state is applied BY this script (via the .la-js class), never by CSS.
   • No dependencies, no build step, no globals beyond window.LAmourTheme.
   • Safe to run twice. LearnWorlds re-renders parts of the DOM on some
     navigations, so init() is idempotent and re-runnable.
   ========================================================================= */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SUPPORTED = "IntersectionObserver" in window;

  /* Only opt into the hidden-then-reveal state if we can actually reveal. */
  if (SUPPORTED && !REDUCED) document.documentElement.classList.add("la-js");

  /* ---- Reveal on scroll ------------------------------------------------ */
  var revealObserver = null;

  function initReveal(root) {
    if (!SUPPORTED || REDUCED) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);   /* reveal once, never re-hide */
        });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    }
    root.querySelectorAll("[data-la-reveal]:not(.is-revealed)").forEach(function (el) {
      revealObserver.observe(el);
    });
    /* Stagger index for grouped children, set once so CSS can read it. */
    root.querySelectorAll("[data-la-reveal-group]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty("--la-i", i);
      });
    });
  }

  /* ---- Entrance motion on LearnWorlds' own widgets ----------------------
     Builder widgets don't carry data-la-reveal, so nothing moved. Tag them
     here with the site's vocabulary: headings rise, kickers kick, pictures
     settle, copy and buttons come up. Order within a section sets --la-i.
     Top bar, footer and anything already on screen at load stay put — a
     page that animates its own header reads as slow, not alive. */
  var AUTO = [
    ["[class*='learnworlds-heading']", "rise"],
    [".learnworlds-overline-text", "kick"],
    [".learnworlds-screen-wrapper, .learnworlds-image-wrapper", "settle"],
    [".learnworlds-main-text, .learnworlds-button-wrapper", ""]
  ];
  function initAutoReveal(root) {
    if (!SUPPORTED || REDUCED || !document.body.classList.contains("lw-page")) return;
    var fold = window.innerHeight * 0.85;
    root.querySelectorAll(".learnworlds-section:not(.lw-topbar):not([data-la-auto])").forEach(function (sec) {
      if (sec.closest(".lw-topbar, .lw-footer")) return;
      sec.setAttribute("data-la-auto", "1");
      var i = 0;
      sec.querySelectorAll(AUTO.map(function (a) { return a[0]; }).join(",")).forEach(function (el) {
        if (el.hasAttribute("data-la-reveal") || el.closest("[data-la-reveal]")) return;
        if (el.getBoundingClientRect().top < fold && window.scrollY < 10) return;
        var kind = "";
        for (var k = 0; k < AUTO.length; k++) { if (el.matches(AUTO[k][0])) { kind = AUTO[k][1]; break; } }
        el.setAttribute("data-la-reveal", kind);
        el.style.setProperty("--la-i", Math.min(i++, 6));
      });
    });
  }

  /* A kicker that introduces a heading gets the site's hairline rule. */
  function initKickers(root) {
    root.querySelectorAll(".learnworlds-overline-text:not(.la-kicker)").forEach(function (el) {
      var next = el.nextElementSibling;
      if (next && /learnworlds-heading/.test(next.className)) el.classList.add("la-kicker");
    });
  }

  /* ---- Footer: the site's closing band ----------------------------------
     The site ends every page with the KHDA line and a large Sentient
     wordmark. Added once, after LearnWorlds' own footer content. The KHDA
     sentence is KHDA's prescribed wording, verbatim — never paraphrase it. */
  function initFooterBand() {
    var footer = document.querySelector(".lw-footer");
    if (!footer || footer.querySelector(".la-footer-band")) return;
    var band = document.createElement("div");
    band.className = "la-footer-band";
    band.innerHTML =
      '<p class="la-footer-khda">This institution is approved and permitted by KHDA.</p>' +
      '<p class="la-footer-wordmark" aria-hidden="true">L’Amour Institute</p>';
    /* Inside the footer's content column so it lines up with the links. */
    (footer.querySelector(".learnworlds-section-content") || footer).appendChild(band);
  }

  /* ---- Stat counters ---------------------------------------------------
     <span data-la-count="159" data-la-suffix="h">159h</span>
     Counts once on entry. The element keeps its literal text as the final
     value, so a failed script still shows the real number. */
  function initCounters(root) {
    var nodes = root.querySelectorAll("[data-la-count]:not([data-la-counted])");
    if (!nodes.length) return;
    if (!SUPPORTED || REDUCED) {
      nodes.forEach(function (el) { el.setAttribute("data-la-counted", "1"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        obs.unobserve(el);
        el.setAttribute("data-la-counted", "1");
        countUp(el);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { obs.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-la-count"));
    if (isNaN(target)) return;
    var prefix = el.getAttribute("data-la-prefix") || "";
    var suffix = el.getAttribute("data-la-suffix") || "";
    var dur = 1100;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / dur, 1);
      /* Same editorial curve as the CSS easing — fast out, long settle. */
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- Press feedback on LearnWorlds' native widgets --------------------
     The builder's own buttons and cards don't carry our .la-pressable class,
     so tag them here rather than asking editors to remember a class name. */
  function initPressable(root) {
    root.querySelectorAll(
      ".learnworlds-button:not([data-la-press]), .lw-topbar-option-link:not([data-la-press])"
    ).forEach(function (el) {
      el.setAttribute("data-la-press", "1");
      el.classList.add(el.classList.contains("learnworlds-button") ? "la-pressable" : "la-pressable-text");
    });
  }

  /* ---- Current-page marking in the top bar ------------------------------ */
  function initNavState() {
    var here = window.location.pathname.replace(/\/$/, "");
    document.querySelectorAll(".lw-topbar-option-link").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;
      var path = href.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
      if (path && path === here) a.setAttribute("aria-current", "page");
    });
  }

  function init(root) {
    root = root || document;
    initKickers(root);
    initAutoReveal(root);
    initReveal(root);
    initCounters(root);
    initPressable(root);
  }

  function boot() {
    init(document);
    initNavState();
    initFooterBand();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* LearnWorlds swaps page content on some in-app navigations without a full
     load. Re-run init on added subtrees; the :not() guards keep it cheap. */
  if ("MutationObserver" in window) {
    var pending = null;
    new MutationObserver(function () {
      if (pending) return;
      pending = requestAnimationFrame(function () { pending = null; init(document); });
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  window.LAmourTheme = { init: init, version: "1.1.0" };
})();
