# Huahua

Huahua is a tiny hobby sketch. Open a page and watch circles get drawn.

## What It Does
- A packed composition of circles grows from large to tiny sizes
- Circles never overlap and try to touch as much as possible
- Each circle is traced as an animated outline (no fill)
- Top-left sketch switcher to choose between available sketches
- Main app speed control in the bottom-right (`1x`, `2x`, `4x`)
- The sketch stops when the screen is full
- Click to restart

## Tech Stack
- Frontend: `HTML` + `CSS` + `JavaScript`
- Drawing: `p5.js` (loaded via CDN)
- Hosting: GitHub Pages (static site, no backend)

## How It Works (MVP)
- Everything runs in the browser
- No backend, no database, no accounts
- State is ephemeral (refresh or click to restart)

## Sketches (Code + Docs Pairs)
Each sketch lives in its own folder and comes as a pair:
- `/<sketch-name>/sketch.js`: runnable `p5.js` sketch code
- `/<sketch-name>/sketch.md`: what is drawn, explained as description + code pairs

Available sketches:
- `mondriaan/sketch.js` + `mondriaan/sketch.md`
- `pebbles/sketch.js` + `pebbles/sketch.md`
- `circles/sketch.js` + `circles/sketch.md`

Default sketch:
- `mondriaan` (you can switch from the top-left selector)

## `sketch.md` Writing Standard
Write each `sketch.md` for two audiences: artists (intent and visual language) and developers (reusable implementation patterns).

Required structure:
1. `Original Drawing Objective (Artist-Facing)`  
Describe the drawing goal in human words: mood, composition, movement, texture, and what should feel intentional to a visual artist.
2. `Parameter Guide (Value-Agnostic)`  
Explain what each parameter controls and how changing it affects the output. Do not hardcode exact production values in prose. You may use example ranges or sample values for illustration only.
3. `Overall Drawing Strategy (Developer-Facing)`  
Provide a step-by-step strategy from setup to finish so the algorithm can be reused in other doodles.
4. `Detailed Steps + Reusable Snippets (Developer-Facing)`  
For each step, add concise explanation plus example code that can be copied/adapted.

Parameter rules:
- Keep exact, active parameter values at the top of `/<sketch-name>/sketch.js` as easy-to-scan constants.
- Keep `sketch.md` stable when tuning values change; update the meaning/behavior description only when logic changes.
- Prefer naming parameters by purpose (for example: spacing, density, jitter, speed) instead of repeating current numeric values.

Recommended section template for each `sketch.md`:
- `# <Sketch Name>`
- `## Original Drawing Objective (Artist-Facing)`
- `## Parameter Guide (Value-Agnostic)`
- `## Overall Drawing Strategy (Developer-Facing)`
- `## Detailed Steps + Reusable Snippets`

Prompt template (copy/paste):
```md
Create or revise `/<sketch-name>/sketch.md` for two audiences: artists and developers.

Requirements:
1. Original Drawing Objective (artist-facing): describe the intended visual result in natural, human language.
2. Parameter Guide (value-agnostic): explain each parameter’s role and impact without locking prose to exact values. Include optional example ranges or sample values only.
3. Overall Drawing Strategy (developer-facing): explain the algorithm step by step so it can be reused in other doodles.
4. Detailed Steps + Reusable Snippets (developer-facing): provide per-step explanations with example code snippets.

Rules:
- Keep exact active values in `sketch.js` constants at the top of the file.
- Do not require `sketch.md` updates for routine parameter tuning.
- Focus `sketch.md` on intent, controls, and reusable logic.
```

## Project Layout
- `index.html`: loads `p5.js` and the main UI containers
- `app.js`: main app UI, sketch switcher, and selected sketch loader
- `styles.css`: full-screen canvas styling
- `mondriaan/`: sketch folder
- `pebbles/`: sketch folder
- `circles/`: sketch folder

## Credits Overlay
- Bottom-left title/credit is owned by the main app, not the sketch.
- Credits are required for every sketch.
- Set credits in the active sketch file as `sketchCredits` (`title`, `author`, `url`).
- `index.html` only contains the credit UI container (`.main-credit`).
- The UI shows a shortened URL with `...`, but the full URL remains the clickable link target.

## Run Locally
Option A: open `index.html` in a browser.

Option B: serve the folder and open the local URL.
Example:
```bash
python3 -m http.server 8000
```

## Deploy To GitHub Pages
1. Push to GitHub (default branch `main`).
2. In repo settings: `Settings` -> `Pages`.
3. Set source to deploy from branch `main` and folder `/ (root)`.
4. Visit the published URL.

## Development Guidelines
- Keep the MVP simple and hobby-friendly
- Prefer small, safe, incremental changes over rewrites
- Keep dependencies minimal and frontend-first
- Avoid adding a backend or persistence unless a feature truly requires it
- Preserve the core UX: open the page and watch the sketch draw
- For line-based sketches, `1x` speed must look hand-drawn by progressively revealing lines over time
- Do not instantly render full lines at `1x`
- Do not use fake hand/pencil overlays; only animate the line drawing itself
- Use clear names and straightforward control flow
- Add comments only when the intent is not obvious
- Validate changes quickly (manual check is fine for MVP) and note what you tested

## Adding A New Sketch
- Create a new folder `/<sketch-name>/`.
- Add `sketch.js` and `sketch.md` in that folder.
- Register the sketch in `app.js` (`SKETCHES` list: `id`, `label`, `script`, `pageTitle`).
- Define `sketchCredits` in `/<sketch-name>/sketch.js` with the sketch title, author handle, and original source URL.
- If the sketch draws lines, implement progressive line drawing at `1x` so it feels like a person is drawing.

## Contributing
Small, focused improvements are welcome.
If you change behavior, keep it aligned with the "watch it draw" vibe and keep the stack simple.
Include a short note on what changed and how you validated it.

## License
No license file yet. If you plan to share or accept contributions, add one (MIT is a common default).

## Status
Hobby project. Early and evolving.
