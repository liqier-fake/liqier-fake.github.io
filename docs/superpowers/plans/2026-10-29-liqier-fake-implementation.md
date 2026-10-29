# liqier-fake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a static personal site whose scroll-controlled Three.js moon world, permanent silver-dragon companion, environmental content entrances, and in-world reading experience present Markdown essays and photography without a conventional menu.

**Architecture:** Astro owns routes, content collections, metadata, and static output; a persistent client-side `WorldRuntime` owns Three.js rendering and maps normalized scroll progress into camera, dragon, lighting, and destination state. Semantic DOM layers remain the source of truth for entrances and article text, while Pretext is isolated behind an adapter that animates only titles and quotations.

**Tech Stack:** Astro, TypeScript, Three.js, GSAP ScrollTrigger, Pretext, Vitest, Playwright, axe-core, GitHub Actions/Pages

**Spec:** `docs/superpowers/specs/2026-10-29-liqier-fake-design.md`

## Global Constraints

- Site name is exactly `liqier-fake`.
- Scrolling controls camera travel; there is no unskippable autoplay opening.
- One original pearl-silver celestial dragon remains present through arrival, hub, reading, photography, and return states.
- Content entrances are world objects/locations, never a persistent card grid or floating menu.
- Entering a destination requires click, tap, or keyboard confirmation after proximity focus; approach alone never opens it.
- Articles remain semantic, selectable DOM text visually anchored to the 3D pavilion; they must not look like app panels.
- Pretext affects titles, quotations, and transitions only; body text remains stable.
- No CMS, database, authentication, comments, film assets, film music, or copied Kage assets.
- Initial content uses original placeholder prose and generated/public-domain/licensed imagery with accurate attribution.
- Build output must be static and deployable to GitHub Pages.
- Mobile, reduced-motion, keyboard, screen-reader, and WebGL-unavailable paths are first-class.

## Review Focus

- WebGL creation failure or context loss must show usable semantic content and the poster fallback instead of a blank page; covered in Task 4.
- Rapid wheel/touch scrolling across multiple proximity zones must not auto-open or leave camera/destination state inconsistent; covered in Tasks 3 and 6.
- Direct article URLs and browser Back must reconstruct the correct pavilion/read state without remounting or losing the world; covered in Task 7.
- Large/portrait/missing photography assets must not overflow, block entry, or break the spatial sequence; covered in Task 8.
- Reduced-motion and keyboard-only users must reach every content type and read/return without relying on 3D picking; covered in Task 9.

---

## Planned file structure

```text
liqier-fake/
├─ astro.config.mjs                 # static build and GitHub Pages base/site config
├─ package.json                     # scripts and pinned dependencies
├─ playwright.config.ts             # browser test targets
├─ vitest.config.ts                 # unit/component test config
├─ src/
│  ├─ content.config.ts             # four content collection schemas
│  ├─ content/{thoughts,articles,photography,collection}/
│  ├─ layouts/SiteLayout.astro      # metadata, persistent world shell, fallback landmarks
│  ├─ pages/index.astro             # arrival/hub route
│  ├─ pages/articles/[...slug].astro
│  ├─ pages/thoughts/[...slug].astro
│  ├─ pages/photography/[...slug].astro
│  ├─ pages/collection/[...slug].astro
│  ├─ components/world/WorldShell.astro
│  ├─ components/world/WorldCanvas.ts
│  ├─ components/world/EntranceLayer.astro
│  ├─ components/reading/ReadingPavilion.astro
│  ├─ components/content/PhotoSequence.astro
│  ├─ components/accessibility/SiteMap.astro
│  ├─ lib/world/WorldRuntime.ts      # lifecycle and subsystem coordination
│  ├─ lib/world/timeline.ts          # pure scroll/camera state mapping
│  ├─ lib/world/scene.ts             # environment construction
│  ├─ lib/world/dragon.ts            # procedural dragon and behavior controller
│  ├─ lib/world/entrances.ts         # proximity/focus/confirm state machine
│  ├─ lib/world/quality.ts           # adaptive rendering profile
│  ├─ lib/typography/pretext.ts      # isolated Pretext adapter
│  ├─ lib/content/navigation.ts      # route-to-destination mapping
│  └─ styles/{tokens,global,reading}.css
├─ public/
│  ├─ images/world-poster.webp
│  ├─ textures/
│  └─ audio/README.md
├─ tests/unit/
└─ tests/e2e/
```

### Task 1: Bootstrap the static Astro shell

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/layouts/SiteLayout.astro`, `src/pages/index.astro`
- Create: `src/components/world/WorldShell.astro`
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Produces: `SiteLayout` with one persistent `#world-root`, one `<main id="content-root">`, skip link, and `<noscript>` fallback; scripts `dev`, `build`, `test`, `test:e2e`, `check`.

- [ ] **Step 1: Write the failing shell browser test**

Create `tests/e2e/shell.spec.ts` asserting `/` has title `liqier-fake`, exactly one `#world-root`, a visible semantic main landmark, a skip link targeting `#content-root`, and no element matching `[data-ui="card-menu"]`.

- [ ] **Step 2: Run the shell test and verify it fails**

Run: `npm run test:e2e -- tests/e2e/shell.spec.ts`

Expected: FAIL because the Astro app and route do not exist.

- [ ] **Step 3: Create the Astro project configuration and shell**

Pin Node `>=22`, add Astro/TypeScript/Three/GSAP/Vitest/Playwright/axe dependencies, configure `output: 'static'`, and implement the exact shell landmarks from Step 1. Use the palette tokens from the spec and no template card components.

- [ ] **Step 4: Run type, build, and shell checks**

Run: `npm install && npm run check && npm run build && npm run test:e2e -- tests/e2e/shell.spec.ts`

Expected: all commands PASS and `dist/index.html` exists.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts src tests/e2e/shell.spec.ts
git commit -m "feat: bootstrap liqier-fake static shell"
```

### Task 2: Define content collections and original placeholders

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/thoughts/first-light.md`
- Create: `src/content/articles/after-the-long-night.md`
- Create: `src/content/photography/moonlit-water.md`
- Create: `src/content/collection/borrowed-light.md`
- Create: `src/lib/content/navigation.ts`
- Test: `tests/unit/content-schema.test.ts`

**Interfaces:**
- Produces: `ContentKind = 'thoughts' | 'articles' | 'photography' | 'collection'`; `SceneDestination`; `destinationFor(kind, slug): SceneDestination`; validated frontmatter fields from the spec.

- [ ] **Step 1: Write failing schema and mapping tests**

Test valid entries for all four collections; reject a collection entry missing `sourceUrl`, `creator`, or `rightsNote`; assert `destinationFor('articles', 'after-the-long-night')` returns the essay pavilion destination.

- [ ] **Step 2: Run the unit test and verify it fails**

Run: `npm test -- tests/unit/content-schema.test.ts`

Expected: FAIL because schemas and mapping are undefined.

- [ ] **Step 3: Implement the schemas, mapping, and placeholders**

Use Astro content collections with title, slug, date, summary, tags, scene destination, media references, and draft state. Add photography metadata optionally and collection attribution mandatorily. Write short original placeholder prose; mark generated imagery as generated rather than inventing creators.

- [ ] **Step 4: Run content and build verification**

Run: `npm test -- tests/unit/content-schema.test.ts && npm run check && npm run build`

Expected: PASS; all four collections are present in generated output.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content src/lib/content/navigation.ts tests/unit/content-schema.test.ts
git commit -m "feat: add typed personal content collections"
```

### Task 3: Implement deterministic scroll and scene state

**Files:**
- Create: `src/lib/world/timeline.ts`
- Test: `tests/unit/timeline.test.ts`

**Interfaces:**
- Produces: `WorldPhase`, `WorldFrame`, `sampleWorldFrame(progress: number, reducedMotion: boolean): WorldFrame`, `clampProgress(value: number): number`.
- `WorldFrame` includes `phase`, `cameraT`, `fogDensity`, `worldLight`, `dragonMode`, `focusedEntranceId`.

- [ ] **Step 1: Write failing timeline boundary tests**

Assert clamping for negative, `NaN`, and values above one; exact phase boundaries for arrival, gate, hub, and destination approach; monotonic `cameraT`; reduced-motion output using fixed viewpoints; and stable output after rapid progress jumps `0.1 → 0.9 → 0.2`.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- tests/unit/timeline.test.ts`

Expected: FAIL because timeline functions are undefined.

- [ ] **Step 3: Implement the pure timeline model**

Implement clamped piecewise interpolation with named constants for phase boundaries. Keep browser, Three.js, and GSAP imports out of this file.

- [ ] **Step 4: Run timeline tests**

Run: `npm test -- tests/unit/timeline.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world/timeline.ts tests/unit/timeline.test.ts
git commit -m "feat: model scroll driven world timeline"
```

### Task 4: Build the adaptive Three.js world foundation

**Files:**
- Create: `src/components/world/WorldCanvas.ts`
- Create: `src/lib/world/WorldRuntime.ts`, `src/lib/world/scene.ts`, `src/lib/world/quality.ts`
- Create: `public/textures/README.md`
- Create: `public/images/world-poster.webp`
- Modify: `src/components/world/WorldShell.astro`
- Test: `tests/unit/quality.test.ts`, `tests/e2e/world-fallback.spec.ts`

**Interfaces:**
- Consumes: `sampleWorldFrame()` from Task 3.
- Produces: `QualityProfile`, `selectQualityProfile(capabilities): QualityProfile`; `WorldRuntime.mount(canvas, options)`, `.setProgress(progress)`, `.dispose()`; `data-world-state="ready|fallback|lost"` on `#world-root`.

- [ ] **Step 1: Write failing adaptive-quality and fallback tests**

Unit-test desktop/mobile/data-saver profiles and pixel-ratio caps. Browser-test a stubbed WebGL failure and dispatched `webglcontextlost`, asserting poster visibility, semantic entrance links, and no uncaught error.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/quality.test.ts && npm run test:e2e -- tests/e2e/world-fallback.spec.ts`

Expected: FAIL because world runtime and fallback state do not exist.

- [ ] **Step 3: Implement scene, lifecycle, and fallback**

Create an original procedural sea, gate, platforms, lantern paths, layered skyline silhouettes, moon, fog, petals, and restrained emissive materials. Copy and optimize the approved generated concept art from `C:\Users\ldd\.codex\generated_images\01a185aa-f7f5-7081-a207-5e551f25f138\exec-54af2e9e-6d18-4e2f-8a24-97cbd2d06ad6.png` into the poster fallback. Handle resize, visibility pause, context loss, and disposal.

- [ ] **Step 4: Verify unit, fallback, type, and build checks**

Run: `npm test -- tests/unit/quality.test.ts && npm run test:e2e -- tests/e2e/world-fallback.spec.ts && npm run check && npm run build`

Expected: PASS; fallback remains readable with WebGL disabled.

- [ ] **Step 5: Commit**

```bash
git add src/components/world src/lib/world public/images public/textures tests/unit/quality.test.ts tests/e2e/world-fallback.spec.ts
git commit -m "feat: add adaptive moon world runtime"
```

### Task 5: Add the permanent procedural silver dragon

**Files:**
- Create: `src/lib/world/dragon.ts`
- Modify: `src/lib/world/WorldRuntime.ts`, `src/lib/world/scene.ts`
- Test: `tests/unit/dragon.test.ts`, `tests/e2e/dragon-presence.spec.ts`

**Interfaces:**
- Produces: `DragonMode = 'lead' | 'circle' | 'rest' | 'indicate' | 'return' | 'idle'`; `DragonController.setMode(mode, frame)`, `.update(delta, frame)`, `.dispose()`; `sampleDragonPose(mode, t)`.

- [ ] **Step 1: Write failing dragon state and presence tests**

Assert every world phase maps to a dragon mode, pose sampling is finite and continuous at loop boundaries, pooled trail count never exceeds its profile cap, and the dragon remains rendered or semantically described during arrival, hub, and reading.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- tests/unit/dragon.test.ts && npm run test:e2e -- tests/e2e/dragon-presence.spec.ts`

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement the original silver dragon**

Construct a lightweight procedural serpentine body on a spline with a distinct head, horns, mane ribbons, pearl-silver material, and pooled ribbon/particle trail. Keep its motion subordinate to reading content and avoid crossing the stable text column.

- [ ] **Step 4: Run dragon and build verification**

Run: `npm test -- tests/unit/dragon.test.ts && npm run test:e2e -- tests/e2e/dragon-presence.spec.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world/dragon.ts src/lib/world/WorldRuntime.ts src/lib/world/scene.ts tests
git commit -m "feat: add persistent silver dragon companion"
```

### Task 6: Make environmental entrances focusable and confirmable

**Files:**
- Create: `src/lib/world/entrances.ts`
- Create: `src/components/world/EntranceLayer.astro`
- Modify: `src/components/world/WorldShell.astro`, `src/lib/world/WorldRuntime.ts`
- Test: `tests/unit/entrances.test.ts`, `tests/e2e/entrance-navigation.spec.ts`

**Interfaces:**
- Consumes: `SceneDestination` from Task 2 and `WorldFrame` from Task 3.
- Produces: `EntranceState = 'distant' | 'near' | 'focused' | 'entering'`; `EntranceController.update(frame)`, `.focus(id)`, `.confirm(id)`, `.cancel()`; DOM events `world:focus`, `world:confirm`, `world:cancel`.

- [ ] **Step 1: Write failing state-machine and interaction tests**

Assert rapid proximity changes never confirm entry, confirmation only succeeds for the focused near entrance, Escape cancels, Enter/Space confirm, touch targets are at least 44 CSS pixels, and the page contains no persistent card/menu overlay.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/entrances.test.ts && npm run test:e2e -- tests/e2e/entrance-navigation.spec.ts`

Expected: FAIL because entrance behavior is undefined.

- [ ] **Step 3: Implement world-native entrances and semantic controls**

Map thoughts to paper slips, essays to pavilions, photography to suspended image planes, collection to the moonlit tree, and About to the central platform. Keep visual labels short and proximity-triggered while mirroring every entrance as a semantic button/link aligned to its projected screen position.

- [ ] **Step 4: Run entrance, accessibility, and build checks**

Run: `npm test -- tests/unit/entrances.test.ts && npm run test:e2e -- tests/e2e/entrance-navigation.spec.ts && npm run check && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world/entrances.ts src/components/world src/lib/world/WorldRuntime.ts tests
git commit -m "feat: integrate content entrances into the world"
```

### Task 7: Implement in-world article reading and Pretext transitions

**Files:**
- Create: `src/components/reading/ReadingPavilion.astro`
- Create: `src/lib/typography/pretext.ts`
- Create: `src/pages/articles/[...slug].astro`, `src/pages/thoughts/[...slug].astro`
- Create: `src/styles/reading.css`
- Modify: `src/layouts/SiteLayout.astro`, `src/lib/world/WorldRuntime.ts`
- Test: `tests/unit/pretext-adapter.test.ts`, `tests/e2e/reading.spec.ts`

**Interfaces:**
- Produces: `animateTextLayout(element, preset, options): TextAnimationHandle`; handle `.settle()` and `.dispose()`; `ReadingPavilion` with `data-reading-state`; route-state methods `WorldRuntime.enterDestination(id)` and `.returnToHub()`.

- [ ] **Step 1: Write failing reading and route restoration tests**

Assert article body remains selectable DOM text, title animation settles to stable layout, reduced motion skips kinetic transformation, direct article URL initializes pavilion state, Back returns to the same hub progress, and article content stays available when WebGL is disabled.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/pretext-adapter.test.ts && npm run test:e2e -- tests/e2e/reading.spec.ts`

Expected: FAIL because reading routes and typography adapter do not exist.

- [ ] **Step 3: Implement the pavilion and isolated Pretext adapter**

Render Markdown as semantic DOM on a CSS perspective plane anchored to the pavilion while keeping line length below 80 characters. Use Pretext only for lunar-arc/ripple title and quotation transitions, then restore stable DOM layout. Synchronize History API state with world destination and scroll position.

- [ ] **Step 4: Run reading, route, type, and build checks**

Run: `npm test -- tests/unit/pretext-adapter.test.ts && npm run test:e2e -- tests/e2e/reading.spec.ts && npm run check && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading src/lib/typography src/pages/articles src/pages/thoughts src/styles/reading.css src/layouts src/lib/world/WorldRuntime.ts tests
git commit -m "feat: read articles inside the moon world"
```

### Task 8: Add spatial photography and attributed collections

**Files:**
- Create: `src/components/content/PhotoSequence.astro`
- Create: `src/pages/photography/[...slug].astro`, `src/pages/collection/[...slug].astro`
- Create: `src/lib/content/images.ts`
- Modify: `src/lib/world/scene.ts`, `src/lib/world/entrances.ts`
- Test: `tests/unit/images.test.ts`, `tests/e2e/media.spec.ts`

**Interfaces:**
- Produces: `normalizeImageMeta(input): ImageMeta`; responsive `srcset`; spatial sequence events `media:focus` and `media:close`.

- [ ] **Step 1: Write failing media resilience tests**

Test landscape, portrait, oversized, and missing images; assert normalized dimensions and fallback captions. Browser-test lazy loading, no layout overflow at 320 px, attribution links for every collection image, and keyboard traversal through the sequence.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/images.test.ts && npm run test:e2e -- tests/e2e/media.spec.ts`

Expected: FAIL because media utilities and routes do not exist.

- [ ] **Step 3: Implement spatial sequences and collection attribution**

Use choreographed DOM/image planes with responsive sources, limited concurrent high-resolution textures, gentle parallax, and restrained focus blur. Distinguish owned photography from collected references through captions and mandatory source/licence presentation.

- [ ] **Step 4: Run media, content, and build verification**

Run: `npm test -- tests/unit/images.test.ts && npm run test:e2e -- tests/e2e/media.spec.ts && npm run check && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/content src/pages/photography src/pages/collection src/lib/content/images.ts src/lib/world tests
git commit -m "feat: add spatial photography and collections"
```

### Task 9: Complete accessibility, reduced motion, and performance budgets

**Files:**
- Create: `src/components/accessibility/SiteMap.astro`
- Create: `src/pages/sitemap.astro`
- Modify: `src/layouts/SiteLayout.astro`, `src/lib/world/quality.ts`, `src/lib/world/WorldRuntime.ts`, `src/styles/global.css`
- Test: `tests/e2e/accessibility.spec.ts`, `tests/e2e/performance.spec.ts`

**Interfaces:**
- Produces: `/sitemap/` semantic fallback; `data-motion="full|reduced"`; runtime counters exposed only in test mode through `window.__LIQIER_DIAGNOSTICS__`.

- [ ] **Step 1: Write failing accessibility and performance tests**

Run axe on hub and reading routes; test keyboard-only access to all four content kinds; emulate reduced motion and assert fixed-view transitions; emulate 320 px mobile; assert no horizontal overflow, no continuous render while hidden, capped pixel ratio/particle count, and successful navigation without WebGL picking.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/performance.spec.ts`

Expected: FAIL until fallbacks and budgets are complete.

- [ ] **Step 3: Implement fallback navigation and adaptive behavior**

Add the discreet site-map route, semantic fallback links, fixed-view reduced-motion behavior, visibility pause, mobile quality profile, and focus management across hub/reading transitions. Keep sound off by default and include only an empty `public/audio/README.md` licensing policy unless original/licensed audio is later supplied.

- [ ] **Step 4: Run the full quality gate**

Run: `npm test && npm run test:e2e && npm run check && npm run build`

Expected: PASS with no serious axe violations and static output for every route.

- [ ] **Step 5: Commit**

```bash
git add src/components/accessibility src/pages/sitemap.astro src/layouts src/lib/world src/styles public/audio tests
git commit -m "feat: add accessible adaptive world modes"
```

### Task 10: Polish, verify, and configure GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `README.md`
- Modify: `astro.config.mjs`, `package.json`
- Test: `tests/e2e/journey.spec.ts`

**Interfaces:**
- Consumes: all prior public interfaces.
- Produces: CI build artifact `dist/`; documented Markdown/media authoring workflow; configurable `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH`.

- [ ] **Step 1: Write the failing complete-journey test**

Test scroll arrival, dragon presence, focus and confirm an essay pavilion, read/select text, return to exact hub progress, enter photography, visit collection attribution, open sitemap, and repeat the core path in mobile/reduced-motion mode.

- [ ] **Step 2: Run the journey test and record failures**

Run: `npm run test:e2e -- tests/e2e/journey.spec.ts`

Expected: FAIL on any unfinished integration or polish issue.

- [ ] **Step 3: Fix integration defects and add deployment configuration**

Configure GitHub Pages base paths, artifact upload/deploy actions, cache headers where Pages permits them, README authoring instructions, asset licensing rules, local commands, and both one-public-repo and private-source/public-deploy options.

- [ ] **Step 4: Run final verification from a clean install**

Run: `npm ci && npm test && npm run test:e2e && npm run check && npm run build`

Expected: every command PASS; `dist/` contains index, all content routes, sitemap, poster fallback, and hashed client assets.

- [ ] **Step 5: Inspect the production build in a real browser**

Serve `dist/` at its configured base path and inspect desktop and 390×844 mobile views. Verify no console errors, readable article typography, stable scroll/camera synchronization, visible dragon continuity, and acceptable first interaction before optional assets finish loading.

- [ ] **Step 6: Commit**

```bash
git add .github README.md astro.config.mjs package.json package-lock.json tests/e2e/journey.spec.ts
git commit -m "feat: prepare liqier-fake for GitHub Pages"
```

## Self-review result

- Spec coverage: arrival, hub, permanent dragon, environmental entrances, in-world reading, Pretext, photography, collections, static authoring, accessibility, mobile, fallback, and Pages deployment each map to a task.
- Step scan: every implementation task has a failing check, minimal implementation step, passing verification, and commit boundary.
- Type consistency: `SceneDestination`, `WorldFrame`, `WorldRuntime`, `DragonMode`, and entrance events are defined once and consumed by named later tasks.
- Review focus: the five highest-risk failures each have an owning automated test.
- Proportion: implementation bodies remain with the executor; the plan fixes interfaces, behavior, tests, and exact verification commands without transcribing the application.
