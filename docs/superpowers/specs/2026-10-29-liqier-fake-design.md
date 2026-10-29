# liqier-fake — Design specification

## Intent

`liqier-fake` is a personal website for essays, short reflections, original photography, and collected visual references. It should feel like entering a living world rather than opening a conventional portfolio or blog.

The experience takes structural inspiration from Kage's scroll-driven cinematic storytelling and broad atmospheric inspiration from the Japanese-futurist virtual world in *Cosmic Princess Kaguya!*. The implementation and assets must remain original: do not reproduce a film shot, character, logo, copyrighted environment model, or unlicensed artwork.

The emotional center is a moonlit world that remains beautiful despite its speed and cruelty: a place for small light, warmth, memory, and ordinary time. The site name is `liqier-fake`.

## Goals

- Make the first visit feel like an arrival into an explorable 3D moon world.
- Use scrolling to control camera travel. The page must not take control with an unskippable autoplay sequence.
- Keep a single original silver celestial dragon present throughout the experience as companion and guide.
- Turn the environment itself into navigation; content entrances must not appear as a conventional menu, card grid, or floating control panel.
- Let visitors read articles without leaving the 3D world.
- Use Pretext for expressive, momentary kinetic typography while preserving calm, legible long-form reading.
- Let the owner add future content as Markdown files and image folders without a CMS or database.
- Publish as a static GitHub Pages site.
- Remain usable on mobile and for people who request reduced motion.

## Non-goals

- No admin dashboard, authentication, comments system, database, commerce, or social network.
- No free-roaming game controls. The experience follows an authored camera path controlled by scroll.
- No direct reuse of Kage source/artwork or *Cosmic Princess Kaguya!* footage, characters, logos, music, or environment assets.
- No prominent conventional navigation panel over the 3D world.
- No automatic use of the lyrics or prose supplied during brainstorming. The owner may decide later whether and how to publish them.

## Anti-goals

The result fails even if technically functional if it feels like:

- a normal blog with a Three.js animation behind it;
- a landing-page template with glowing cards;
- a film scene replica rather than an original personal world;
- an effects demo whose text is difficult to read;
- a GPU benchmark that performs poorly on ordinary phones;
- an empty visual spectacle with no clear path to the writing and photographs.

## Experience concept

### Arrival

The initial view sits low above a reflective midnight sea. A distant circular wooden platform and tall vermilion gate form the visual destination. Layered original architecture, lanterns, mist, cherry blossoms, a large moon, and a distant luminous city establish foreground, middle distance, and horizon.

Scrolling advances a Three.js camera along a predetermined spline. Lantern reflections and petals pass near the camera. The silver dragon emerges from moonlight and remains nearby for the rest of the visit. It crosses the camera path, slows near meaningful areas, looks back toward the visitor, rests on roofs during pauses, and leaves a restrained silver trail that suggests the next path without drawing a literal arrow.

The world should not show lyrics or a long manifesto during this arrival. `liqier-fake` may appear briefly as particles gather into type near the central gate, then recede into the environment.

### Hub without a menu

Passing through the gate reveals several spatially separated destinations. These are native objects and locations in the world, not UI cards:

- **Short reflections:** luminous paper slips drifting just above the water. Nearness reveals one line; selection opens the full reflection in place.
- **Essays:** illuminated pavilions along a lantern path. Each pavilion represents a topic or series. The dragon settles on the roof when reading begins.
- **Original photography:** a corridor of suspended translucent image planes, like memories held in glass or light. The dragon circles the currently focused image.
- **Collected images and references:** a moonlit tree with hanging plaques, film-like transparencies, and source tags. Every third-party image must show author/source/licence metadata and may use external links instead of local copies when reuse rights are unclear.
- **About:** the central platform reveals the owner indirectly through a small arrangement of objects, dated fragments, and brief statements rather than an About card.

Subtle proximity cues may include brighter lanterns, a shift in ambience, the dragon's gaze, and a very short spatial label. The visitor should be able to discover entrances without a persistent overlay.

Approach alone does not open a destination. Once the camera reaches an entrance's proximity zone, the visitor confirms entry with click, tap, or a keyboard-equivalent action. This prevents accidental entry while scrolling. The focused entrance must expose an accessible semantic control and a generous mobile hit target even though its visible treatment remains part of the environment.

### Reading inside the world

Selecting an essay moves the camera into its pavilion rather than navigating to a visually unrelated page. The wider environment darkens and quiets but stays visible. The dragon rests on the roof, railing, or nearby air path.

The article is real semantic DOM text visually anchored to the pavilion, styled as a moonlit paper or scroll surface that belongs to the architecture. It must not resemble a floating application panel. The 3D world remains visible around and behind the reading surface, and the dragon remains in view. This DOM-first construction preserves text selection, copying, responsive reflow, browser search, and assistive technology support.

Pretext performs the transition into reading: title characters may initially follow a lunar arc, ridge, ripple, or dragon-tail curve, then settle into a stable text column. Key sentences may briefly become a spatial typographic gesture before returning to the document flow. Long-form body copy must remain ordinary DOM text with comfortable line length and selection, copy, search, and screen-reader support.

While reading, scroll advances through the document and only applies small camera drift. At the end, the final characters may disperse into silver light; the dragon departs toward the hub path and provides the return transition. Browser history and direct URLs must still work for each article, even though the visual transition remains in-world.

### Photography and collections

Photography uses spatial focus rather than a thumbnail grid. Images occupy a choreographed sequence of planes, with gentle parallax and depth-of-field restraint. Captions and metadata appear only when a photograph is focused. Images must use responsive sizes and progressive loading.

Collected material is visually distinguished from the owner's photography and always includes attribution. Initial placeholder content must be original generated material, public-domain material, or clearly reusable licensed material with recorded source details.

## Silver dragon

The dragon is a single original East Asian celestial dragon, not a character replica. It has pearl-silver scales, moonlit reflections, and restrained cyan-violet energy around its mane and tail.

It is always present but not always central. A small state system controls behavior:

- `lead`: travels ahead of the camera along the main spline;
- `circle`: orbits a destination during approach;
- `rest`: perches or floats quietly while the visitor reads;
- `indicate`: looks and trails light toward an undiscovered entrance;
- `return`: leaves the reading space and rejoins the hub route;
- `idle`: distant loops that avoid blocking content.

The dragon should be a lightweight glTF asset with animation clips or procedural spline deformation. Its trail should use pooled particles or a ribbon shader rather than unbounded particle creation.

## Visual direction

### Palette

- Moonless indigo — `#071425`
- Deep cobalt — `#12396B`
- Pearl silver — `#DCE9F3`
- Lantern amber — `#F1A65A`
- Vermilion gate — `#C9493A`
- Holographic violet — `#9A7CFF`

Large areas remain indigo/cobalt. Amber is reserved for habitable destinations, vermilion for architectural anchors, and violet for digital energy. Silver belongs primarily to the dragon and typography transition.

### Typography

- Chinese reading face: a high-quality open-source Song/Ming typeface with restrained contrast and broad character coverage.
- Latin reading face: a complementary literary serif.
- Interface labels: a quiet humanist sans serif.
- Pretext affects titles, quotations, and transitions only; body text does not continuously animate.

Final font selection is left to implementation after checking GitHub Pages payload size, CJK coverage, licensing, and legibility.

### Motion

Motion is driven by visitor input. One scroll progress model coordinates camera spline position, dragon state, light, fog, audio intensity, and entrance proximity. Avoid generic repeated fade-and-slide effects. Use a few orchestrated transformations with strong continuity.

## Sound

Sound is optional and off by default. A small world-native affordance may enable it after user interaction. If enabled, use original or properly licensed ambience: water, wind, distant bells, and restrained spatial tones. Do not use music from the referenced film.

## Content model

Content lives in version-controlled files:

```text
src/content/
├─ thoughts/
├─ articles/
├─ photography/
└─ collection/
```

Markdown frontmatter should support title, slug, date, summary, tags, scene destination, cover/media references, draft state, and attribution fields where relevant. Photography entries support camera/location fields optionally. Collection entries require source URL, creator, rights/licence note, and a personal annotation.

The initial version may use clearly labelled placeholder essays and licensed/generated placeholder images. The content and media must be easy to replace without touching scene code.

## Technical direction

The builder may refine libraries when implementation evidence warrants it, but the intended architecture is:

- Astro for static generation, Markdown content collections, routes, metadata, and GitHub Pages output.
- Three.js for the persistent 3D world.
- GSAP ScrollTrigger, or an equivalent tested scroll timeline, for deterministic scroll-to-scene synchronization.
- Pretext for kinetic title and quotation layouts.
- glTF/GLB for environment and dragon assets, with Draco or Meshopt compression as appropriate.
- GitHub Actions for build and deployment to GitHub Pages.

The 3D world should persist across content transitions rather than remount on every route. Direct article URLs still need a deterministic initial scene state and an accessible non-WebGL fallback.

## Performance and accessibility

- Establish desktop, mid-tier mobile, reduced-motion, and WebGL-unavailable modes.
- Use adaptive pixel ratio, texture resolution, particle counts, shadow quality, and post-processing.
- Prefer baked lighting and selective emissive materials over many real-time lights.
- Lazy-load destination assets before approach and free unneeded high-resolution textures.
- Show loading progress as an in-world event, not a generic spinner, and allow entry once the first path is ready.
- Preserve semantic headings, landmark structure, keyboard access, visible focus, selectable text, deep links, and screen-reader content.
- Reduced-motion mode replaces camera travel with gentle crossfades between fixed viewpoints while keeping the same environmental entrances.
- Provide a discreet accessibility/site-map route for visitors who cannot or do not want to use the 3D navigation. It is not the primary visual navigation.
- Avoid forcing sound and respect data-saving conditions where detectable.

## Responsive behavior

Desktop receives the full authored path, reflection, fog, particles, dragon animation, and restrained post-processing. Mobile keeps the same world and companion but reduces draw calls, texture sizes, effects, and path complexity. Touch scrolling remains the only required input. Text reading must never require precise 3D picking; nearby entrances receive generous invisible hit targets.

## Publication and repository model

The final site is static and deploys to GitHub Pages. The builder should support either:

- one public repository containing source and built deployment workflow; or
- a private source repository plus a public deployment repository for GitHub Free accounts.

The specific GitHub account and repository visibility can be connected later and must not block local implementation.

## Initial content and copy

The builder may create neutral placeholder content that demonstrates each content type. Placeholder prose should be original, short, and clearly replaceable. Do not publish the brainstorming lyrics by default. Do not fabricate attribution for collected images.

## Success criteria

A successful first release lets a new visitor:

1. enter quickly enough to understand the world rather than wait through a heavy download;
2. control the arrival entirely by scrolling;
3. recognize the silver dragon as a continuous companion;
4. discover every content type through environmental cues without a card menu;
5. open and read a full article without visually leaving the 3D world;
6. return to the hub without losing context;
7. use the experience on a phone or with reduced motion;
8. open a direct article URL and receive meaningful content even if WebGL is unavailable;
9. add a Markdown entry and deploy it through GitHub without a CMS.

## Builder-owned calls

- Exact original environment geometry and arrangement, provided it follows the visual and interaction constraints.
- Final open-source font families.
- Specific placeholder prose and licensed/generated placeholder imagery.
- Exact asset budgets and LOD thresholds after measurement on representative devices.
- Whether the scroll timeline uses GSAP ScrollTrigger or a smaller equivalent, based on prototype reliability.
- The final authoring schema details that do not change the four content categories.

