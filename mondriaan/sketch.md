# Mondrian Sketch

## What Is Drawn
This sketch creates a Mondrian-like partition inside an inset composition area, then fills each rectangle one-by-one with dense pastel color strokes.
Each fill stroke is revealed progressively so it looks hand-drawn instead of appearing instantly.
Rectangle borders are also progressively drawn first, before interior color filling starts.
Each sketch picks exactly 3 strong pastel colors: one red shade, one yellow shade, and one blue shade.
Some rectangles are randomly left white (unfilled).
The fill is built from many clipped strokes at a random angle between `-60°` and `-30°` to approximate a hand-drawn solid block.
Fill lines are ordered to start from the top-left region first and drawn left-to-right to feel right-handed.
Rectangles are also processed from top-left toward bottom-right across the composition.
The full composition is inset from the canvas edges so no rectangle runs edge-to-edge on the viewport.

## Rules Used
- Rectangle area is constrained to `1%` to `5%` of the composition area.
- Oversized rectangles are recursively split until all sections fit the area bounds.
- Rectangle width/height ratio is constrained by min/max bounds to avoid extreme strips.
- Each sketch chooses exactly 3 active colors: red shade + yellow shade + blue shade.
- Rectangle fills are sampled from: those 3 colors + black.
- Some rectangles are randomly left white (no interior fill strokes).
- Fill spacing is fixed inside one rectangle, but differs from rectangle to rectangle.
- Fill stroke direction is randomized per rectangle in the range `[-60°, -30°]`.
- Border lines are set to `4x` the filler line width.
- Fill spacing bounds are controlled by constants, so density can be tuned centrally.
- Fill strokes are intentionally thicker than before for stronger color coverage.
- If a valid split layout cannot be produced after retries, a `5x5` fallback grid is used.
- Rectangle borders are animated progressively before interior fills.

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

### 3) Build Animated Solid Fill Strokes
For each rectangle, choose one spacing value, one random angle in `[-60°, -30°]`, and one fill style from `{white, black, active sketch colors}`, then generate clipped strokes unless the rectangle is white.

```js
sketchFillPalette = buildSketchFillPalette(); // one red, one yellow, one blue
const fillStyle = pickRectangleFillStyle();   // white, black, or one of those 3
const spacingBounds = getFillSpacingBounds();
const lineSpacing = random(spacingBounds.min, spacingBounds.max);
const fillAngleDegrees = random(FILL_ANGLE_MIN_DEGREES, FILL_ANGLE_MAX_DEGREES);
const lines = fillStyle.skipFill ? [] : createSolidFillStrokes(section, lineSpacing, inset, fillAngleDegrees);
```

### 4) Draw Color Strokes Progressively
Every fill stroke is revealed in small distance chunks. Stroke color and weight are jittered slightly so the rectangle reads as hand-colored.

```js
stroke(
  section.fillColor[0] + random(-8, 8),
  section.fillColor[1] + random(-8, 8),
  section.fillColor[2] + random(-8, 8),
  section.fillColor[3] + random(-16, 16)
);
strokeWeight(max(1.8, fillerLineWeight * FILL_STROKE_WEIGHT_MULTIPLIER + random(-0.20, 0.35)));
drawSegmentPortion(segment, section.currentLineProgress, nextProgress);
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
