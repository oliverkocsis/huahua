# Pebbles Sketch

## What Is Drawn
This sketch grows a packed cluster of pebble-like shapes from the center of the screen outward.
Each pebble starts from an organic polygon, then its outline is smoothed into curves.
Each new pebble is placed to touch existing pebbles while never overlapping.
Pebbles are drawn with an animated outline first (like a pencil tracing the shape), then filled in once the outline completes.
Drawing speed is controlled by the main app speed controller (`1x`, `2x`, `4x`) in the bottom-right corner.

## How The Growth Works
The sketch starts with one pebble at the center.
Each next pebble attaches to a randomly chosen existing pebble, biased toward pebbles that are farther from the center so the cluster expands outward.
Placement tries many candidate positions, rejects overlaps, and prefers candidates that touch multiple neighbors.
When it can no longer place new pebbles after repeated attempts, it stops.

## Description And Code Pairs

### 1) Start From The Center
Creates a new cluster, seeds the first pebble at the center, and begins animating it.

```js
function startCluster() {
  background(...bgColor);
  pebbles.length = 0;
  centerX = width * 0.5;
  centerY = height * 0.5;

  const seed = createPebble(centerX, centerY, random(34, 56));
  pebbles.push(seed);
  activePebble = seed;
}
```

### 2) Add A Neighbor Without Overlap
Picks a parent pebble, then places the candidate at a distance based on each pebble's smoothed-shape packing radius so they touch with minimal gaps.
Candidates that still overlap are rejected.

```js
const centerDistance = parent.packingRadius + candidate.packingRadius;
candidate.x = parent.x + cos(angle) * centerDistance;
candidate.y = parent.y + sin(angle) * centerDistance;

if (!fitsInViewport(candidate.x, candidate.y, candidate.packingRadius)) continue;
if (overlapsExisting(candidate)) continue;
```

### 3) Prefer Touching More Pebbles
Scores candidates by how many neighbors they touch (plus a small outward bias), choosing the best-scoring placement.

```js
const contacts = countTouchingNeighbors(candidate);
const outward = dist(centerX, centerY, candidate.x, candidate.y);
const score = contacts * 100 + outward * 0.05;
```

### 4) Animate The Drawing Stroke
Draws only the next segment of the outline each frame, then finalizes the pebble (fill + outline) when complete.

```js
function animatePebbleDrawing(pebble) {
  const from = pebble.drawProgress;
  pebble.drawProgress = min(pebble.perimeter, pebble.drawProgress + getSpeedAdjustedIncrement(pebble.drawSpeed));
  drawPebbleStrokeRange(pebble, from, pebble.drawProgress);

  if (pebble.drawProgress >= pebble.perimeter) {
    finalizePebble(pebble);
    activePebble = null;
  }
}
```

### 5) Smooth Polygon Points Into Curves
Applies a closed-loop Chaikin smoothing pass, then uses the smoothed loop for both animation and final rendering.

```js
const smoothPoints = smoothClosedPoints(points, 2);
const perimeter = calculateLoopPerimeter(smoothPoints);

return {
  points: smoothPoints,
  packingRadius: calculatePackingRadius(smoothPoints),
  perimeter,
};
```

### 6) Render Final Pebble As A Curved Shape
Uses `curveVertex` around the full loop so corners are rounded instead of sharp.

```js
beginShape();
for (let i = -2; i < pebble.points.length + 2; i += 1) {
  const point = pebble.points[(i + pebble.points.length) % pebble.points.length];
  curveVertex(point.x, point.y);
}
endShape(CLOSE);
```

### 7) Stop When The Screen Is Full
After repeated failures to place a new pebble, the sketch marks itself full and stops the draw loop.

```js
if (!next) {
  failedPlacements += 1;
  if (failedPlacements >= 40) {
    isFull = true;
    noLoop();
  }
}
```

### 8) Read Main App Speed And Apply It
Speed control belongs to the main app (`app.js`).  
The sketch reads `window.HUAHUA_APP.speed` and maps it like this:
- `1x`: slower human-like pace
- `2x`: faster machine-like pace, still visible
- `4x`: same base as `2x`, but jumps farther and more often

```js
function getSpeedAdjustedIncrement(baseIncrement) {
  const speedMode = getMainSpeedMode();
  if (speedMode === 1) return baseIncrement;
  if (speedMode === 2) return baseIncrement * 2;

  let increment = baseIncrement * 2;
  if (random() < 0.2) {
    increment += baseIncrement * random(4, 10);
  }
  return increment;
}
```
