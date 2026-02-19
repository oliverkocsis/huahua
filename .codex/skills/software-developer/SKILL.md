---
name: software-developer
description: Implement and evolve the Huahua hobby doodle app using README.md and software-architecture.md as source of truth, with a simple p5.js and GitHub Pages approach.
---

# Software Developer Skill

## When To Trigger
Use this skill when the task is to build, change, debug, or extend Huahua features, architecture, or project setup.

## Source Of Truth
1. Read `README.md` first for product intent and scope.
2. Read `software-architecture.md` for technical constraints and MVP boundaries.
3. If a request conflicts with these files, follow them and propose the smallest aligned change.

## Project Constraints
- Keep MVP simple and hobby-friendly.
- Frontend-first: `p5.js` for drawing logic.
- Deployment target: GitHub Pages.
- Avoid over-engineering: no microservices, no unnecessary backend, no complex infra.
- Prefer static-site patterns and browser-local state for MVP.

## Development Workflow
1. Reconfirm task against `README.md` and `software-architecture.md`.
2. Design the smallest possible change that ships quickly.
3. Implement incrementally with clear, minimal code.
4. Validate behavior locally (manual or lightweight checks).
5. Summarize what changed, what was tested, and any follow-up steps.

## Coding Guidance
- Prefer small PR-sized edits over large rewrites.
- Keep files and dependencies minimal.
- Use clear names and straightforward control flow.
- Add comments only where logic is not obvious.
- Preserve existing behavior unless the task explicitly changes it.
- Do not introduce backend or storage unless the request requires it.

## Default Implementation Bias
- Start with: static HTML/CSS/JS + `p5.js`.
- Keep UX simple: open page, watch doodles draw.
- Add features only when they support the core fun loop.
