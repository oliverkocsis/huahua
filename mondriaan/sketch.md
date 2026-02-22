# Mondrian Sketch

## Original Drawing Objective (Artist-Facing)
Create a Mondrian-inspired composition that feels constructed by hand instead of generated instantly.
The image should read as a bold rectilinear layout with thick structural dividers, then gradually fill with textured color hatching.
Color should stay in a Mondrian family: one red mood, one yellow mood, one blue mood, plus occasional black accents and intentional white gaps.
Movement should feel human: split lines appear as they are decided, and fill strokes sweep back-and-forth as if a hand is changing direction between passes.

## Parameter Guide (Value-Agnostic)
Exact active values live in constants at the top of `mondriaan/sketch.js`. Tune there; keep this guide behavior-focused.

- Composition framing:
  `COMPOSITION_MARGIN_RATIO`, `COMPOSITION_MARGIN_MIN`, `COMPOSITION_MARGIN_MAX` control how inset the drawing sits from the canvas edges.
- Split constraints:
  `AREA_MIN_RATIO`, `AREA_MAX_RATIO`, `RECT_RATIO_MIN`, `RECT_RATIO_MAX` control target rectangle size band and allowed shape proportions.
- Split search and resilience:
  `SPLIT_CUT_ATTEMPTS`, `MAX_SPLIT_ATTEMPTS`, and `getSplitSearchStepsPerFrame()` control how aggressively split candidates are searched each frame and how many full restarts are allowed before fallback.
- Fill orientation and density:
  `FILL_ANGLE_MIN_DEGREES`, `FILL_ANGLE_MAX_DEGREES`, `FILL_SPACING_MIN_PX`, `FILL_SPACING_MAX_PX`, `FILL_SPACING_MIN_SCALE`, `FILL_SPACING_MAX_SCALE` control hatch direction and spacing density.
- Fill weight and texture:
  `FILL_STROKE_WEIGHT_MULTIPLIER`, `PIXEL_STEP_DISTANCE`, `HUMAN_PIXEL_STEPS_PER_FRAME`, `GEOMETRY_EPSILON`, `CLIP_EPSILON` control stroke thickness and progressive reveal granularity.
- Color system:
  `RED_PASTEL_SHADES`, `YELLOW_PASTEL_SHADES`, `BLUE_PASTEL_SHADES`, `WHITE_RECTANGLE_PROBABILITY`, `BLACK_FILL_PROBABILITY`, `WHITE_FILL_COLOR`, `BLACK_FILL_COLOR` control palette behavior.
- Line and background appearance:
  `GRID_COLOR`, `BG_COLOR` control the base paper tone and structural line tone.

## Overall Drawing Strategy (Developer-Facing)
1. Initialize composition bounds and split state.
2. Animate recursive splitting immediately, drawing each chosen split line segment as it progresses.
3. Keep split state geometry-only until partitioning is done.
4. Convert final sections into drawable fill plans (line list + per-rectangle drawing state).
5. Animate fill lines progressively with fixed per-segment step distance and serpentine direction.
6. Stop rendering when all rectangles are complete; restart on click or resize.

## Detailed Steps + Reusable Snippets (Developer-Facing)
### 1) Build Clean Split State
Start from one inset root section and store only geometry in split data.

```js
function buildMondrianComposition() {
  const composition = getCompositionBounds();
  splitComposition = toSplitSection(composition);
  splitSections = [toSplitSection(splitComposition)];
  activeSplit = null;
  activeSplitProgress = 0;
  splitPhaseComplete = false;
  splitAttemptCount = 0;
  drawPhase = "splits";
}
```

### 2) Animate Splits While Deciding Them
Pick the largest oversized section, find a valid cut, and draw that cut progressively before committing children.

```js
if (!activeSplit) {
  const splitState = prepareNextSplit();
  if (splitState === "complete") splitPhaseComplete = true;
}

const step = min(remainingOnSegment, distanceBudget, PIXEL_STEP_DISTANCE);
drawSegmentPortion(segment, activeSplitProgress, activeSplitProgress + step);
```

### 3) Enforce Strict Split Rules With Recovery
If a candidate cannot be split, restart from root; after bounded retries, fall back to a valid grid.

```js
const split = splitSection(splitSections[largestIndex], splitMinArea);
if (!split) {
  if (!restartSplitAttempt()) {
    splitSections = createFallbackGrid(splitComposition, splitMinArea, splitMaxArea);
    return "complete";
  }
  return "pending";
}
```

### 4) Convert Geometry To Drawable Plans
Only after splitting finishes, attach fill metadata and progress state.

```js
function finalizeSplitPhase() {
  if (!splitSections.every((s) => isSectionFinalValid(s, splitMinArea, splitMaxArea))) {
    splitSections = createFallbackGrid(splitComposition, splitMinArea, splitMaxArea);
  }
  mondrianRectangles = buildDrawableRectanglesFromSections(splitSections);
  drawPhase = "fills";
}
```

### 5) Build Hand-Style Fill Strokes
Generate clipped hatch lines at a per-rectangle angle; reverse every second line for back-and-forth movement.

```js
const lines = createSolidFillStrokes(section, lineSpacing, inset, fillAngleDegrees);
for (let i = 1; i < lines.length; i += 2) {
  lines[i] = reverseSegmentDirection(lines[i]);
}
```

### 6) Keep 1x Mode Progressively Drawn
Use distance budgets and fixed step distance so lines reveal over time instead of appearing at once.

```js
let remainingDistance = getDrawDistancePerFrame();
if (isHumanSpeed) {
  remainingDistance = min(remainingDistance, PIXEL_STEP_DISTANCE * HUMAN_PIXEL_STEPS_PER_FRAME);
}
const step = min(remainingOnLine, distanceBudget, PIXEL_STEP_DISTANCE);
drawSegmentPortion(segment, section.currentLineProgress, section.currentLineProgress + step);
```
