# Circles Sketch

## Original Drawing Objective (Artist-Facing)
Create a calm, hand-drawn field of circles that feels intentionally packed rather than randomly scattered.
The composition should read in layers: large anchors first, then progressively smaller circles filling remaining space.
Each circle is only an outline, so the negative space stays visible and the structure feels airy instead of heavy.
Non-seed circles should stay connected by touch, and no circles should overlap.
The drawing should feel like it grows from confident placement choices, then settles into finer detail.

## Parameter Guide (Value-Agnostic)
All active values live as constants at the top of `circles/sketch.js`.
Tune those constants without rewriting this document.

Core controls:
- `TIER_CONFIGS`: Defines the size tiers, density targets, attempt budget, and failure budget per tier.
Effect: Controls visual hierarchy, how aggressively each tier fills space, and how quickly the algorithm moves to smaller tiers.
- `REFERENCE_CANVAS_AREA`, `MIN_AREA_SCALE`, `MAX_AREA_SCALE`, `MIN_GLOBAL_CIRCLE_CAP`: Scale total circle count with canvas size while keeping runtime bounded.
Effect: Keeps output density consistent across small and large screens.
- `TWO_PARENT_PROPOSAL_CHANCE`, `SINGLE_PARENT_PROPOSAL_CHANCE`, `TWO_PARENT_PICK_ATTEMPTS`: Controls how often placement tries tangent-to-two vs tangent-to-one proposals.
Effect: Higher two-parent emphasis increases tight local packing and multi-contact placements.
- `SEED_ATTEMPTS`, `VIEWPORT_MARGIN`: Controls initial placement robustness and boundary safety.
Effect: Prevents edge clipping and failed starts.
- `TOUCH_EPSILON`, `TANGENT_SOLVER_EPSILON`, `TANGENT_COLLAPSE_EPSILON`: Numerical tolerances for tangency detection and circle intersection solving.
Effect: Stabilizes geometry decisions under floating-point noise.
- `DEFAULT_STROKE_DRAW_SPEED_MIN`, `DEFAULT_STROKE_DRAW_SPEED_SCALE` and fallback speed constants: Controls stroke reveal pace.
Effect: Preserves progressive line drawing feel, especially at `1x`.
- `CIRCLE_STROKE_COLOR` and Mondriaan stroke constants: Controls visual line language and stroke thickness behavior.
Effect: Keeps circle outlines visually consistent with the Mondriaan sketch style.

## Overall Drawing Strategy (Developer-Facing)
1. Initialize canvas state and build size tiers from top-level constants.
2. Seed the composition with one random large circle inside safe viewport bounds.
3. For the active tier, generate many candidate circles and keep the best valid candidate.
4. Prefer tangent placement proposals (one-parent or two-parent) so circles naturally touch neighbors.
5. Reject candidates that leave viewport bounds, intersect any existing circle, or (for non-seed circles) touch nobody.
6. Score remaining candidates by number of touching neighbors and smallest tangency gap.
7. Animate each accepted circle as a progressive arc stroke.
8. Advance through tiers from large to tiny; stop when tier budgets or global budget are exhausted.
9. Validate end-state invariants to catch regressions (no intersections, no isolated non-seed circles).

## Detailed Steps + Reusable Snippets (Developer-Facing)

### 1) Build Scaled Tier Plan
```js
for (const tier of TIER_CONFIGS) {
  const minRadius = max(TIER_MIN_RADIUS_PX, scale * tier.minFactor);
  const maxRadius = max(minRadius + TIER_MIN_RADIUS_SPAN_PX, scale * tier.maxFactor);
  const densityCap = floor((area * tier.density) / areaPerCircle);
  const scaledHardCap = max(1, floor(tier.hardCap * areaScale));

  tierSequence.push({
    ...tier,
    minRadius,
    maxRadius,
    maxCount: max(1, min(scaledHardCap, densityCap)),
    placed: 0,
    failures: 0,
  });
}
```

### 2) Seed With One Large Circle
```js
const seed = createRandomSeedCircle(tierSequence[0]);
if (!seed) {
  finishSketch();
  return;
}

circles.push(seed);
tierSequence[0].placed += 1;
activeCircle = seed;
```

### 3) Generate Tangent-Focused Candidate Points
```js
if (circles.length >= 2 && random() < TWO_PARENT_PROPOSAL_CHANCE) {
  const twoParentPoint = buildTwoParentTouchPoint(radius);
  if (twoParentPoint) return twoParentPoint;
}

if (random() < SINGLE_PARENT_PROPOSAL_CHANCE) {
  return buildSingleParentTouchPoint(radius);
}
```

### 4) Enforce Geometric Validity
```js
if (!fitsInViewport(candidate.x, candidate.y, candidate.r)) continue;
if (overlapsExisting(candidate)) continue;

const touchCount = countTouchingNeighbors(candidate);
if (circles.length > 0 && touchCount === 0) continue;
```

### 5) Score And Select Best Candidate
```js
const touchGap = nearestTouchGap(candidate);
const score =
  touchCount * CANDIDATE_SCORE_TOUCH_WEIGHT -
  touchGap * CANDIDATE_SCORE_GAP_WEIGHT +
  random(0, CANDIDATE_SCORE_NOISE_MAX);
if (score > bestScore) {
  bestScore = score;
  bestCandidate = candidate;
}
```

### 6) Animate Outline-Only Circle Drawing
```js
const startAngle = (fromDistance / circle.perimeter) * TWO_PI;
const endAngle = (toDistance / circle.perimeter) * TWO_PI;

noFill();
stroke(...CIRCLE_STROKE_COLOR);
strokeWeight(circle.strokeW);
arc(circle.x, circle.y, circle.r * 2, circle.r * 2, startAngle, endAngle);
```

### 7) Terminate Predictably
```js
if (!next) {
  tier.failures += 1;
  if (tier.failures >= tier.maxFailures) tierIndex += 1;
  return;
}

if (tierIndex >= tierSequence.length || circles.length >= globalMaxCircles) {
  finishSketch();
}
```

### 8) Validate Invariants At Finish
```js
if (d < minimumDistance) {
  console.error("Circle packing invariant failed: intersecting circles");
  return false;
}

if (i > 0 && touchingNeighbors === 0) {
  console.error("Circle packing invariant failed: isolated non-seed circle");
  return false;
}
```
