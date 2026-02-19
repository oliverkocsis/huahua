# Huahua Software Architecture (MVP)

## 1. Architecture Summary
Huahua should start as a static web app with almost no infrastructure.  
The browser does the main work: generating and drawing random doodles on a canvas in a loop with `p5.js`.  
For MVP, no real backend or database is required, which keeps setup and costs near zero.  
If needed later, a tiny backend can be added only for save/share features.  
Deploy on GitHub Pages for the simplest possible hobby workflow.

## 2. Core Components
- Frontend: Single-page `p5.js` sketch that renders random doodles and controls the draw loop.
- Backend: Not required for MVP; optional small API later for features like saved doodles.
- Storage: None for MVP (ephemeral in browser memory); optional SQLite later for persistence.

## 3. Request/Data Flow
1. User opens the Huahua page.
2. Static HTML/CSS/JS + `p5.js` load in the browser.
3. Doodle engine picks random shape parameters (type, position, size, color, stroke).
4. Canvas renderer draws one doodle step at a timed interval.
5. Loop continues automatically until user refreshes or pauses.
6. If optional controls exist (pause/clear/restart), they only update local app state.

## 4. Suggested Tech Stack
- Frontend: Vanilla HTML/CSS/JavaScript + `p5.js`.
Reason: `p5.js` is simple, drawing-focused, and ideal for fast creative coding.
- Backend (optional, later): Node.js + Express.
Reason: Minimal API server if save/share features are added.
- Storage (optional, later): SQLite.
Reason: Simple file-based database, easy for one developer, no managed DB needed.
- Deployment: GitHub Pages.
Reason: Free static hosting with direct integration from the repo.

## 5. MVP Scope
- Build one page with a canvas.
- Implement the drawing loop in `p5.js` (`setup` + `draw`).
- Implement a random doodle generator module.
- Add minimal controls: pause/resume and clear.
- Keep all state in-browser (no auth, no save, no backend).
- Deploy to GitHub Pages from the main branch.

## 6. Later Improvements
- Add deterministic seeds (`?seed=...`) so doodles can be reproduced.
- Add export to image (`PNG`) from canvas.
- Add simple share links for generated doodles.
- Add lightweight backend endpoints only when persistence is needed.
- Add SQLite storage only after save/history is truly required.
