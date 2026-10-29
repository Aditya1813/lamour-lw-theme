/* =========================================================================
   silk.js — the site's black silk behind dark LearnWorlds sections.

   A port of ~/dev/lamour-website/src/lib/silk/{shader,engine}.ts (itself the
   reception TV's "rich" silk). The shader is copied verbatim; if it changes
   there, copy it here. Differences from the site:
   • LearnWorlds scrolls `.sections-wrapper`, not the window, so scroll is
     read from that box (window.scrollY is always 0 on these pages).
   • Surfaces are found, not mounted: the first dark section of a page (the
     hero), the footer, and any section given the class `la-silk` in the
     builder. Sections with their own photograph are left alone.
   • No "calm" toggle; reduced motion / Save-Data / weak devices get one
     still frame, as on the site.
   Decorative only: aria-hidden, no pointer events, and the section's own
   ink stays underneath wherever WebGL2 isn't there.
   ========================================================================= */
(function () {
  "use strict";

  var VS = "#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";

  var FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 uRes; uniform float uK; uniform vec2 uRect; uniform vec2 uVp; uniform float uScroll;",
    "uniform float uUnit; uniform float uT, uDim, uLight, uMotes;",
    "out vec4 o;",
    "float H(vec2 p) {",
    "  float t = uT;",
    "  vec2 w = p + 0.12 * vec2(sin(p.y * 1.3 + t * 0.11), sin(p.x * 0.9 - t * 0.09 + 1.7));",
    "  vec2 q = vec2(0.94 * w.x + 0.34 * w.y, -0.34 * w.x + 0.94 * w.y);",
    "  float ph = q.x * 4.6 + 1.5 * sin(q.y * 1.9 + 0.8 * sin(q.x * 1.1 + t * 0.13) + t * 0.2);",
    "  float h = 0.55 * sin(ph + t * 0.27);",
    "  h += 0.22 * sin(ph * 2.03 - q.y * 2.2 + 1.2 * sin(q.x * 2.4 - t * 0.17) - t * 0.38);",
    "  h += 0.08 * sin(q.y * 7.5 + q.x * 2.6 + t * 0.47);",
    "  h += 0.03 * sin(ph * 4.1 + q.y * 3.0 - t * 0.6);",
    "  return h;",
    "}",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
    "vec3 hash3(vec2 p) {",
    "  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));",
    "  q += dot(q, q.yxz + 33.33);",
    "  return fract((q.xxy + q.yzz) * q.zyx);",
    "}",
    "vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }",
    "float moteLayer(vec2 c, float cell, float speed, float dens, float rad, float t, float seed) {",
    "  vec2 q = (c - vec2(0.0, speed * t)) / cell;",
    "  vec2 id = floor(q), f = fract(q);",
    "  vec3 h = hash3(id + seed);",
    "  if (h.x > dens) return 0.0;",
    "  vec2 pos = 0.25 + 0.5 * h.yz;",
    "  pos.x += 0.08 * sin(t * (0.3 + 0.4 * h.y) + h.z * 6.283);",
    "  float d = length((f - pos) * cell);",
    "  float life = sin(3.14159 * fract(t * (0.05 + 0.04 * h.y) + h.z));",
    "  float tw = 0.45 + 0.55 * (0.5 + 0.5 * sin(t * (0.6 + 1.6 * h.z) + h.y * 6.283));",
    "  float core = exp(-d * d / (rad * rad)), halo = 0.22 * exp(-d * d / (16.0 * rad * rad));",
    "  return (core + halo) * life * life * tw * (0.55 + 0.45 * h.y);",
    "}",
    "void main() {",
    "  vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uK;",
    "  vec2 v = uRect + css;",
    "  vec2 uv = vec2(v.x / uVp.x, 1.0 - v.y / uVp.y);",
    "  vec2 p = vec2(v.x, uVp.y - v.y - 0.3 * uScroll) / uUnit;",
    "  const float e = 0.0016;",
    "  float h = H(p);",
    "  float gx = (H(p + vec2(e, 0.0)) - h) / e;",
    "  float gy = (H(p + vec2(0.0, e)) - h) / e;",
    "  vec3 n = normalize(vec3(-gx * 0.22, -gy * 0.22, 1.0));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 L1 = normalize(vec3(-0.5, 0.6, 0.62));",
    "  vec3 L2 = normalize(vec3(0.7, -0.25, 0.66));",
    "  float d1 = max(dot(n, L1), 0.0), d2 = max(dot(n, L2), 0.0);",
    "  float s1 = max(dot(n, normalize(L1 + V)), 0.0), s2 = max(dot(n, normalize(L2 + V)), 0.0);",
    "  float halo = pow(s1, 18.0), core = pow(s1, 90.0), liquid = pow(s1, 380.0), fillSpec = pow(s2, 40.0);",
    "  float grazing = pow(1.0 - n.z, 2.2);",
    "  float cavity = mix(0.3, 1.0, smoothstep(-0.8, 0.6, h));",
    "  vec2 A = vec2(0.94, 0.34), g2 = vec2(gx, gy);",
    "  vec3 Tg = normalize(vec3(A, 0.22 * dot(A, g2)));",
    "  vec2 q = vec2(0.94 * p.x + 0.34 * p.y, -0.34 * p.x + 0.94 * p.y);",
    "  float shift = 0.025 * sin(q.x * 6.0 - q.y * 4.0 + uT * 0.15);",
    "  vec3 Hk = normalize(L1 + V);",
    "  float ta = dot(normalize(Tg + n * (0.04 + shift)), Hk), tb = dot(normalize(Tg + n * (-0.14 + shift)), Hk);",
    "  float lobeR = pow(1.0 - ta * ta, 110.0), lobeTRT = pow(1.0 - tb * tb, 22.0);",
    "  vec3 stone = vec3(0.918, 0.898, 0.863);",
    "  vec3 warm = vec3(0.96, 0.9, 0.8);",
    "  vec3 base = mix(vec3(0.010, 0.011, 0.014), vec3(0.020, 0.019, 0.018), d1);",
    "  vec3 col = base * (0.18 + 0.75 * d1 * d1 + 0.16 * d2) * cavity",
    "           + (stone * (0.16 * halo + 0.42 * core + 0.5 * lobeR) + warm * 0.24 * lobeTRT) * cavity",
    "           + vec3(1.0) * 0.7 * liquid * cavity",
    "           + stone * (0.2 * grazing + 0.1 * fillSpec);",
    "  float vig = smoothstep(1.35, 0.1, length((uv - vec2(0.6, 0.56)) * vec2(1.0, 1.25)));",
    "  col *= mix(0.45, 1.0, vig) * uDim * uLight;",
    "  col = film(col * 1.6);",
    "  if (uMotes > 0.0) {",
    "    vec2 c = vec2(v.x, uVp.y - v.y - 0.6 * uScroll);",
    "    float m = moteLayer(c, 120.0, 14.0, 0.32, 1.5, uT, 0.0) + 0.5 * moteLayer(c + 61.0, 190.0, 9.0, 0.22, 1.1, uT, 17.0);",
    "    float b = moteLayer(c + 23.0, 300.0, 22.0, 0.14, 7.0, uT, 41.0);",
    "    col += mix(stone, vec3(1.0), 0.6) * (m * 0.55 + b * 0.07) * uMotes;",
    "  }",
    "  col += (hash(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) / 255.0 * 1.5;",
    "  o = vec4(col, 1.0);",
    "}"
  ].join("\n");

  if (!document.body || !document.body.classList.contains("lw-page")) return;
  if (!("IntersectionObserver" in window) || !("ResizeObserver" in window)) return;
  try { if (!document.createElement("canvas").getContext("webgl2")) return; } catch (e) { return; }

  var UNIFORMS = ["uRes", "uK", "uRect", "uVp", "uScroll", "uUnit", "uT", "uDim", "uLight", "uMotes"];
  var STEPS = [1, 0.8, 0.64, 0.51];
  var coarse = matchMedia("(pointer: coarse)").matches;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = navigator;
  var weak = (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2 || !!(nav.connection && nav.connection.saveData);
  var TIER = { budget: coarse ? 320000 : 1100000, fps: coarse ? 30 : 60, still: reduced || weak };

  var surfaces = [];
  var step = 0, raf = 0, lastDraw = 0, winN = 0, winMs = 0, winT = 0, slow = 0, lastFrame = 0;

  function scroller() { return document.querySelector(".sections-wrapper.ov-y-auto"); }
  function scrollTop() { var s = scroller(); return s ? s.scrollTop : (window.scrollY || 0); }
  function find(el) { for (var i = 0; i < surfaces.length; i++) if (surfaces[i].host === el) return surfaces[i]; return null; }

  var nearIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = find(e.target); if (!s) return;
      s.near = e.isIntersecting;
      if (s.near) build(s); else release(s);
    });
  }, { rootMargin: "100% 0px" });
  var seenIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = find(e.target); if (!s) return;
      s.visible = e.isIntersecting; s.stale = true; kick();
    });
  });
  var sizeRO = new ResizeObserver(function (entries) {
    entries.forEach(function (e) { var s = find(e.target); if (s) { s.stale = true; kick(); } });
  });

  function build(s) {
    if (s.gl) return;
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 900ms cubic-bezier(0.22,1,0.36,1)";
    var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;
    function sh(type, src) {
      var x = gl.createShader(type);
      gl.shaderSource(x, src); gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) || "silk shader");
      return x;
    }
    try {
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog); gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      s.u = {};
      UNIFORMS.forEach(function (k) { s.u[k] = gl.getUniformLocation(prog, k); });
    } catch (err) {
      if (window.console) console.warn("[silk]", err);
      return;
    }
    canvas.addEventListener("webglcontextlost", function () { release(s); });
    s.canvas = canvas; s.gl = gl; s.stale = true;
    s.host.appendChild(canvas);
    kick();
  }

  function release(s) {
    if (!s.gl) return;
    var ext = s.gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
    if (s.canvas) s.canvas.remove();
    s.gl = null; s.canvas = null;
  }

  function fit(s) {
    var r = s.host.getBoundingClientRect();
    if (r.width === s.cssW && r.height === s.cssH && s.canvas.width > 1) return r;
    s.cssW = r.width; s.cssH = r.height;
    var px = Math.max(1, r.width * r.height);
    var k = Math.min(Math.min(window.devicePixelRatio || 1, 1.5), Math.sqrt(TIER.budget / px)) * STEPS[step];
    s.canvas.width = Math.max(1, Math.round(r.width * k));
    s.canvas.height = Math.max(1, Math.round(r.height * k));
    s.gl.viewport(0, 0, s.canvas.width, s.canvas.height);
    return r;
  }

  function draw(s, still) {
    var gl = s.gl, u = s.u, c = s.canvas;
    var r = fit(s);
    var vw = window.innerWidth, vh = Math.max(window.innerHeight, document.documentElement.clientHeight);
    gl.uniform2f(u.uRes, c.width, c.height);
    gl.uniform1f(u.uK, c.width / Math.max(1, r.width));
    gl.uniform2f(u.uRect, r.left, r.top);
    gl.uniform2f(u.uVp, vw, vh);
    gl.uniform1f(u.uScroll, scrollTop());
    gl.uniform1f(u.uUnit, Math.min(1080, Math.max(440, 0.56 * Math.max(vw, vh))));
    gl.uniform1f(u.uT, still ? 1234.5 : (Date.now() / 1000) % 3600);
    gl.uniform1f(u.uDim, s.dim);
    gl.uniform1f(u.uLight, 1);
    gl.uniform1f(u.uMotes, s.motes);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (c.style.opacity !== "1") c.style.opacity = "1";
    s.stale = false;
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame(now) {
    raf = 0;
    var live = surfaces.filter(function (s) { return s.gl && s.visible; });
    if (!live.length) return;
    if (TIER.still) { live.forEach(function (s) { if (s.stale) draw(s, true); }); return; }
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < 1000 / TIER.fps - 3) return;
    var gap = lastFrame ? now - lastFrame : 0;
    lastDraw = now; lastFrame = now;
    live.forEach(function (s) { draw(s, false); });
    if (gap && gap < 250) { winN++; winMs += gap; }
    if (now - winT > 3000) {
      if (winN > 10) {
        slow = winMs / winN > (1000 / TIER.fps) * 1.3 ? slow + 1 : 0;
        if (slow >= 3 && step < STEPS.length - 1) {
          step++; slow = 0;
          surfaces.forEach(function (s) { s.cssW = 0; s.stale = true; });
        }
      }
      winN = 0; winMs = 0; winT = now;
    }
  }

  /* ---- Which sections get silk ------------------------------------------ */
  function isDark(sec) {
    return /\b(lw-dark-bg|lw-brand-bg|la-ink)\b/.test(sec.className);
  }
  /* Every section carries an overlay div, so only a real background
     picture or video counts as "this section has its own photograph". */
  function hasPhoto(sec) {
    var bg = getComputedStyle(sec).backgroundImage;
    if (bg && bg !== "none") return true;
    return !!sec.querySelector(":scope > .js-video-wrapper video, :scope > .js-video-wrapper iframe");
  }

  function attach(sec, dim, motes) {
    if (sec.querySelector(":scope > .la-silk-host")) return;
    var host = document.createElement("div");
    host.className = "la-silk-host";
    host.setAttribute("aria-hidden", "true");
    var inner = document.createElement("div");
    inner.className = "la-silk-sticky";
    host.appendChild(inner);
    /* After the overlay (a veil meant for photos), before the content. */
    sec.insertBefore(host, sec.querySelector(":scope > .learnworlds-section-content") || sec.firstChild);
    sec.classList.add("la-has-silk");
    var s = { host: inner, dim: dim, motes: motes, near: false, visible: false, gl: null, canvas: null, u: {}, cssW: 0, cssH: 0, stale: true };
    surfaces.push(s);
    nearIO.observe(inner); seenIO.observe(inner); sizeRO.observe(inner);
  }

  function scan() {
    var sections = Array.prototype.slice.call(document.querySelectorAll(".learnworlds-section"))
      .filter(function (sec) { return !sec.classList.contains("lw-topbar") && !sec.closest(".lw-topbar"); });
    var hero = sections.filter(function (sec) { return !sec.classList.contains("lw-footer"); })[0];
    if (hero && isDark(hero) && !hasPhoto(hero)) attach(hero, 0.55, 1);
    if (hero && hero.classList.contains("la-has-silk")) {
      var h = hero.querySelector("[class*='learnworlds-heading']");
      if (h) h.classList.add("la-sheen");   /* one sheen per page, on the hero's heading */
    }
    sections.forEach(function (sec) {
      if (sec.classList.contains("la-silk") && !hasPhoto(sec)) attach(sec, 0.55, 1);
      /* Stat boxes (a row of faded-tint tiles): silk shows through the 6% wash. */
      else if (sec !== hero && isDark(sec) && !hasPhoto(sec) &&
               sec.querySelectorAll("[class*='lw-brand-bg-fadeout']").length >= 2) attach(sec, 0.5, 0.8);
      else if (sec.classList.contains("lw-footer")) attach(sec, 0.42, 0.6);   /* quieter: links sit on it */
    });
  }

  function boot() {
    scan();
    var sc = scroller();
    (sc || window).addEventListener("scroll", function () { if (!TIER.still) kick(); }, { passive: true });
    document.addEventListener("visibilitychange", function () { lastFrame = 0; kick(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
