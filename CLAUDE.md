# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, 3D scroll-driven portfolio site for **Harshavardhan Shet** (Generative AI / ML Engineer). It is a real person's portfolio built to a written brief — not a template. Three hand-authored files, no framework, no build step.

- `index.html` — all content and DOM structure
- `css/style.css` — all styling
- `js/main.js` — all interactivity (ES module)
- `assets/` — media plus `portfolio_build_prompt.md`, the source brief

## Running & verifying

There is no build, lint, or test setup. It's static files.

**Serve it** (required — the `type="module"` script will not load from `file://`):
```
python3 -m http.server 8000    # then open http://localhost:8000
```

**Verify changes visually.** The site is almost entirely animation and layout, so "does it look right" is the real test. Drive it in headless Chrome (`/usr/bin/google-chrome`) with `puppeteer-core` and screenshot each section — scroll the full page first so GSAP ScrollTrigger animations fire and lazy content reveals, then `scrollIntoView()` each `<section>` and capture. Check the console for `pageerror` while you're there. Give the page ~5s after load for the boot loader to clear before the first shot.

**Compressing textures.** The `assets/texture-*.png` files are 5–6 MB source art; the CSS references ~110 KB `*.web.jpg` downscaled copies made with Python PIL (`thumbnail((1600,1600))`, JPEG quality ~72). Regenerate those variants if the source art changes; keep the originals.

## Content is verbatim, and factual

`assets/portfolio_build_prompt.md` is the source of truth for every fact, metric, employer, award, and project on the page. **Do not invent or alter numbers, names, or achievements** — copy them exactly. This is someone's professional record; treat unverified claims as off-limits. When asked to reference real external events (e.g. the TCS/NVIDIA lab launch on the Team of the Month card), confirm details against a real source rather than filling them in from memory.

## Architecture & invariants

**Dependencies are CDN-only** (no `package.json`, no `node_modules`). Loaded in `index.html`: GSAP + ScrollTrigger + Lenis as classic scripts, and Three.js as an ES module via an `importmap`. `js/main.js` is the only module and imports `three`.

**Graceful degradation is the central design rule.** The page must stay fully readable if the CDN fails or the visitor prefers reduced motion. `main.js` enforces this with three gates you must respect when adding behavior:
- Two feature flags at the top: `reducedMotion` (`prefers-reduced-motion`) and `isMobile` (`max-width: 900px`).
- A `hasGsap` check that detects a failed GSAP load and force-applies the static end states.
- Fallback hooks in CSS: `.no-motion` on `<html>`, `.revealed` on `[data-reveal]` elements, `.active` on project `.scene`s. Any animated element needs a resting state reachable through these classes, or it will be invisible/broken when animations don't run.

Each visual feature is an independent IIFE in `main.js` (`neuralHero`, `typewriter`, `skillsConstellation`, `contactTerminal`, plus the loader and the GSAP block) that early-returns based on the flags above. Follow that pattern rather than adding cross-cutting state.

**"3D" is mostly not Three.js.** Only the hero particle network is a real Three.js scene. The skills constellation is a hand-rolled 2D-canvas projection, the project-scene centerpieces are inline animated SVGs, and the About chip is CSS 3D transforms. Reach for Three.js only when you actually need WebGL.

**Section background textures use `.tex-circuit` / `.tex-gpu` / `.tex-hud` classes, not CSS custom properties.** This is deliberate: Chrome resolves `url()` inside a CSS variable relative to the *stylesheet's* path, which broke the asset paths. Keep texture URLs in real class rules in `style.css`. On mobile, pinned scroll scenes are replaced with simple reveals and hero particle counts drop — preserve both when touching layout or the hero.
