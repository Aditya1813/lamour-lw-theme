# L'Amour × LearnWorlds theme layer

One stylesheet and one script that put the redesigned site's design system
(`~/dev/lamour-website`) onto the LearnWorlds white-label school at
`lamour.learnworlds.com` — without rebuilding a single page by hand.

**Read `LEARNWORLDS-SETUP.html` first.** It has the exact code to paste into
each LearnWorlds slot, in order.

## Why it is built this way

LearnWorlds' custom-code editor is a text box in a web app. Pasting a
37 kB stylesheet into it and re-pasting on every tweak is how these projects
die. So the stylesheet lives here, in git, and LearnWorlds holds **four lines
of `<link>`/`<script>`** pointing at a hosted copy. After the one-time setup,
every design change is `./build.sh` + `git push` — you never open the
LearnWorlds code editor again.

## Layout

```
src/00-tokens.css        design tokens, ported from lamour-website/globals.css
src/10-base.css          typography scale, press feedback, reveal, motion
src/20-learnworlds.css   re-skin of LearnWorlds' own widget classes  ← the workhorse
src/30-blocks.css        styles for the paste-in block library
src/40-builtin.css       social/profile/account/workpad + course player
src/50-dynamic-slot.css  pasted by hand into the Dynamic CSS slot (forms)
src/lamour.js            reveal on scroll, stat counters, press states

blocks/*.html            8 paste-in section blocks
preview/index.html       local harness — generated, do not edit (edit _shell.html)
dist/                    build output — never edit, never commit a hand change
```

## Working on it

```bash
./build.sh                        # rebuild dist/ + preview/
python3 -m http.server 8791       # then open http://localhost:8791/preview/index.html
```

The preview harness reproduces the DOM LearnWorlds actually emits (verified
against the rendered HTML of the live school, builder v4.162.x), so a selector
that works there works on the live site. Check it before pushing.

## Two rules

1. **Build with LearnWorlds' native widgets wherever possible.** They come out
   on-brand automatically because `20-learnworlds.css` targets LearnWorlds'
   own classes. A page built from native widgets stays editable by someone who
   doesn't write code. Reach for `blocks/` only for the layouts the builder
   genuinely can't make.
2. **Tokens are the single source of truth.** If a colour or spacing value
   changes in `lamour-website/src/app/globals.css`, change it in
   `src/00-tokens.css` and nowhere else.
