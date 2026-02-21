# Mondrian Sketch

## What Is Drawn
This sketch creates a Mondrian-like partition inside an inset composition area, then fills each rectangle one-by-one with parallel hatch lines.
Each hatch line is revealed progressively so it looks drawn by hand instead of appearing instantly.
Rectangle borders are also progressively drawn first, before hatch filling starts.
The hatch orientation is chosen from 0 to 90 degrees in 15-degree steps.
Each rectangle uses equal spacing for all of its hatch lines, but that spacing is randomized per rectangle within min/max bounds.
The full composition is inset from the canvas edges so no rectangle runs edge-to-edge on the viewport.

## Rules Used
- Rectangle area is constrained to `1%` to `5%` of the composition area.
- Oversized rectangles are recursively split until all sections fit the area bounds.
- Rectangle width/height ratio is constrained by min/max bounds to avoid extreme strips.
- Each rectangle gets one hatch orientation from `{0, 15, 30, 45, 60, 75, 90}` degrees.
- Hatch spacing is fixed inside one rectangle, but differs from rectangle to rectangle.
- Border lines are set to `4x` the filler line width.
- Hatch spacing bounds are controlled by constants, so density can be tuned centrally.
- If a valid split layout cannot be produced after retries, a `5x5` fallback grid is used.
- Rectangle borders are animated progressively before interior hatching.

## Description And Code Pairs

### 1) Split Until Areas Fit Bounds (With Retry + Fallback)
Builds an inset composition area first, then keeps splitting only sections that are too large. It retries multiple times and falls back to a fixed grid if needed.

```js
for (let attempt = 0; attempt < 120; attempt += 1) {
  const sections = [root];
  let failed = false;
  while (true) {
    let largestIndex = -1;
    let largestArea = 0;
    for (let i = 0; i < sections.length; i += 1) {
      const area = getArea(sections[i]);
      if (area > maxArea && area > largestArea) {
        largestArea = area;
        largestIndex = i;
      }
    }
    if (largestIndex === -1) break;
    const split = splitSection(sections[largestIndex], minArea);
    if (!split) {
      failed = true;
      break;
    }
    sections.splice(largestIndex, 1, split[0], split[1]);
  }
  if (failed) continue;
  const valid = sections.every((section) => isSectionFinalValid(section, minArea, maxArea));
  if (valid) return sections;
}
return createFallbackGrid(root);
```

### 2) Constrain Split Geometry And Ratios
When splitting, the cut position keeps each child above minimum area and inside aspect-ratio limits.

```js
const left = { x: section.x, y: section.y, w: cutX, h: section.h };
const right = { x: section.x + cutX, y: section.y, w: section.w - cutX, h: section.h };
if (isSectionShapeValid(left) && isSectionShapeValid(right)) return [left, right];
```

### 3) Build Parallel Hatch Segments
For each rectangle, choose one angle and one spacing value, then generate parallel lines at that constant interval.

```js
const angleDegrees = random(ANGLE_OPTIONS);
const spacingBounds = getSpacingBounds();
const lineSpacing = random(spacingBounds.min, spacingBounds.max);
const lines = createHatchLines(section, radians(angleDegrees), lineSpacing, inset);
```

### 4) Clip Lines To Rectangle Bounds
Each generated long line is clipped against the rectangle interior, so the hatch never leaks over the black borders.

```js
const clipped = clipSegmentToRect(rawX1, rawY1, rawX2, rawY2, x, y, w, h);
if (clipped) lines.push({ ...clipped, length: dist(clipped.x1, clipped.y1, clipped.x2, clipped.y2) });
```

### 5) Animate Borders Before Fills
Uses two phases: first progressively draws rectangle borders, then progressively fills interiors.

```js
if (drawPhase === "outlines") {
  const outlineConsumed = drawNextOutlineDistance(remainingDistance);
  if (outlineConsumed === 0) drawPhase = "fills";
}
```

### 6) Respect Main App Speed Control
The sketch reads `window.HUAHUA_APP.speed` and maps it to drawn distance per frame.

```js
if (speedMode === 1) return max(8, scale * 0.02);
if (speedMode === 2) return max(24, scale * 0.055);
let burst = max(54, scale * 0.12);
if (random() < 0.35) burst += max(28, scale * random(0.08, 0.2));
return burst;
```
