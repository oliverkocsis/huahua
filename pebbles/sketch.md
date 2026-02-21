# Pebbles Sketch

## What Is Drawn
This sketch grows a packed cluster of pebble-like shapes from the center of the screen outward.
Each pebble is an organic polygon, and each new pebble is placed to touch existing pebbles while never overlapping.
Pebbles are drawn with an animated outline first (like a pencil tracing the shape), then filled in once the outline completes.

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
Picks a parent pebble, proposes a new pebble exactly one radius away (touching), and rejects any candidate that overlaps.

```js
const x = parent.x + cos(angle) * (parent.r + radius);
const y = parent.y + sin(angle) * (parent.r + radius);

if (!fitsInViewport(x, y, radius)) continue;
if (overlapsExisting(x, y, radius)) continue;
```

### 3) Prefer Touching More Pebbles
Scores candidates by how many neighbors they touch (plus a small outward bias), choosing the best-scoring placement.

```js
const contacts = countTouchingNeighbors(x, y, radius);
const outward = dist(centerX, centerY, x, y);
const score = contacts * 100 + outward * 0.05;
```

### 4) Animate The Drawing Stroke
Draws only the next segment of the outline each frame, then finalizes the pebble (fill + outline) when complete.

```js
function animatePebbleDrawing(pebble) {
  const from = pebble.drawProgress;
  pebble.drawProgress = min(pebble.perimeter, pebble.drawProgress + pebble.drawSpeed);
  drawPebbleStrokeRange(pebble, from, pebble.drawProgress);

  if (pebble.drawProgress >= pebble.perimeter) {
    finalizePebble(pebble);
    activePebble = null;
  }
}
```

### 5) Stop When The Screen Is Full
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

