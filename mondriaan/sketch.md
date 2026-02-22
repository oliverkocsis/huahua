# Mondrian Sketch

## What Is Drawn
This sketch creates a Mondrian-like partition inside an inset composition area, then fills each rectangle one-by-one with dense pastel color strokes.
Each fill stroke is revealed progressively so it looks hand-drawn instead of appearing instantly.
Split lines are animated immediately while the partition is being built (no separate precompute-then-outline pass).
Each sketch picks exactly 3 strong pastel colors: one red shade, one yellow shade, and one blue shade.
Some rectangles are randomly left white (unfilled).
The fill is built from many clipped strokes at a random angle between `-60°` and `-30°` to approximate a hand-drawn solid block.
Fill lines are ordered from the top-left region first, but line direction alternates back-and-forth (serpentine) to mimic hand movement while filling.
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
- Consecutive fill lines alternate direction to create back-and-forth filling motion.
- Split-line borders are animated as each valid split is chosen.
- Fill spacing bounds are controlled by constants, so density can be tuned centrally.
- Fill strokes are intentionally thicker than before for stronger color coverage.
- When a section cannot be split further, it is kept as-is and the process continues with other oversized sections.

## Description And Code Pairs

### 1) Split And Draw Immediately
Builds an inset composition first, then repeatedly picks the largest splittable oversized section. The chosen split line is drawn immediately, and only then are child sections inserted.

```js
if (!activeSplit) {
  const largestIndex = findLargestSplittableIndex(splitSections, splitMaxArea);
  const split = splitSection(splitSections[largestIndex], splitMinArea);
  activeSplit = { sectionIndex: largestIndex, first: split.first, second: split.second, splitLine: split.splitLine };
}

drawSegmentPortion(activeSplit.splitLine, activeSplitProgress, nextProgress);

if (activeSplitProgress >= activeSplit.splitLine.length) {
  splitSections.splice(activeSplit.sectionIndex, 1, activeSplit.first, activeSplit.second);
  activeSplit = null;
  activeSplitProgress = 0;
}
```

### 2) Constrain Split Geometry And Ratios
When splitting, the cut position keeps each child above minimum area and inside aspect-ratio limits.

```js
const left = { x: section.x, y: section.y, w: cutX, h: section.h };
const right = { x: section.x + cutX, y: section.y, w: section.w - cutX, h: section.h };
if (isSectionShapeValid(left) && isSectionShapeValid(right)) {
  return { first: left, second: right, splitLine: createSegment(...) };
}
```

### 3) Build Animated Solid Fill Strokes
After splitting is complete, each final section gets one spacing value, one random angle in `[-60°, -30°]`, and one fill style from `{white, black, active sketch colors}`.

```js
const fillStyle = pickRectangleFillStyle();
const spacingBounds = getFillSpacingBounds();
const lineSpacing = random(spacingBounds.min, spacingBounds.max);
const fillAngleDegrees = random(FILL_ANGLE_MIN_DEGREES, FILL_ANGLE_MAX_DEGREES);
const lines = fillStyle.skipFill ? [] : createSolidFillStrokes(section, lineSpacing, inset, fillAngleDegrees);
// createSolidFillStrokes flips every second line direction for serpentine drawing
```

### 4) Draw Color Strokes Progressively
Every fill stroke is revealed in small distance chunks. Stroke color and weight are jittered slightly so the rectangle reads as hand-colored.

```js
const step = min(remainingOnLine, distanceBudget, PIXEL_STEP_DISTANCE);
const nextProgress = section.currentLineProgress + step;
drawSegmentPortion(segment, section.currentLineProgress, nextProgress);
```

### 5) Speed Control
The sketch uses the shared app speed profile and then applies a pixel-step cap so drawing remains incremental.

```js
let remainingDistance = getDrawDistancePerFrame();
if (isHumanSpeed) remainingDistance = min(remainingDistance, PIXEL_STEP_DISTANCE * HUMAN_PIXEL_STEPS_PER_FRAME);
const step = min(remainingOnLine, distanceBudget, PIXEL_STEP_DISTANCE);
```

### 6) Fill Phase Starts After Split Phase
When no more valid oversized splits exist, split animation ends and interior fill rendering begins.

```js
if (drawPhase === "splits" && drawNextSplitDistance(...) === 0) {
  finalizeSplitPhase();
  drawPhase = "fills";
}
```
