# Huahua

Huahua is a tiny hobby sketch. Open a page and watch pebbles get drawn.

## What It Does
- A cluster of pebble-like shapes grows from the center outward
- Pebbles never overlap and try to touch as much as possible
- Each pebble is traced first (pencil-like outline), then filled
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

Current sketch:
- `pebbles/sketch.js`
- `pebbles/sketch.md`

## Project Layout
- `index.html`: loads `p5.js` and the current sketch
- `app.js`: main app UI and global speed control state
- `styles.css`: full-screen canvas styling
- `pebbles/`: the current sketch folder

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
- Use clear names and straightforward control flow
- Add comments only when the intent is not obvious
- Validate changes quickly (manual check is fine for MVP) and note what you tested

## Adding A New Sketch
- Create a new folder `/<sketch-name>/`.
- Add `sketch.js` and `sketch.md` in that folder.
- Point `index.html` at the new `/<sketch-name>/sketch.js`.
- Define `sketchCredits` in `/<sketch-name>/sketch.js` with the sketch title, author handle, and original source URL.

## Contributing
Small, focused improvements are welcome.
If you change behavior, keep it aligned with the "watch it draw" vibe and keep the stack simple.
Include a short note on what changed and how you validated it.

## License
No license file yet. If you plan to share or accept contributions, add one (MIT is a common default).

## Status
Hobby project. Early and evolving.
