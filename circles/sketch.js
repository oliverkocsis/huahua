const sketchCredits = {
  title: "doodle diary circles",
  author: "@camellia_doodle",
  url: "https://www.instagram.com/p/DTQC1gpE-6S/",
};

registerSketchCredits(sketchCredits);

const BG_COLOR = [246, 241, 232];
const CIRCLE_STROKE_COLOR = [44, 35, 28];
const VIEWPORT_MARGIN = 2;

const TOUCH_EPSILON = 1.2;
const TANGENT_SOLVER_EPSILON = 0.000001;
const TANGENT_COLLAPSE_EPSILON = 0.0001;

const REFERENCE_CANVAS_AREA = 1280 * 800;
const MIN_AREA_SCALE = 0.45;
const MAX_AREA_SCALE = 3.5;
const MIN_GLOBAL_CIRCLE_CAP = 24;

const TWO_PARENT_PROPOSAL_CHANCE = 0.35;
const SINGLE_PARENT_PROPOSAL_CHANCE = 0.9;
const TWO_PARENT_PICK_ATTEMPTS = 24;
const SEED_ATTEMPTS = 180;

const DEFAULT_STROKE_DRAW_SPEED_MIN = 2.4;
const DEFAULT_STROKE_DRAW_SPEED_SCALE = 0.18;
const FALLBACK_4X_BURST_CHANCE = 0.5;
const FALLBACK_4X_BURST_MIN = 10;
const FALLBACK_4X_BURST_MAX = 50;

const MONDRIAAN_FILLER_SCALE = 0.0018;
const MONDRIAAN_FILLER_MIN = 0.8;
const MONDRIAAN_FILLER_MAX = 1.4;
const MONDRIAAN_BORDER_MULTIPLIER = 4;
const MONDRIAAN_BORDER_JITTER_MIN = -0.25;
const MONDRIAAN_BORDER_JITTER_MAX = 0.25;
const MONDRIAAN_BORDER_STROKE_MIN = 1.2;
const SKETCH_FRAME_RATE = 60;
const TIER_MIN_RADIUS_PX = 5;
const TIER_MIN_RADIUS_SPAN_PX = 1;
const CANDIDATE_SCORE_TOUCH_WEIGHT = 140;
const CANDIDATE_SCORE_GAP_WEIGHT = 7;
const CANDIDATE_SCORE_NOISE_MAX = 0.35;
const FALLBACK_SPEED_1_MULTIPLIER = 0.5;
const FALLBACK_SPEED_2_MULTIPLIER = 2;
const FALLBACK_SPEED_4_MULTIPLIER = 4;
const FALLBACK_1X_PLACEMENT_FRAME_INTERVAL = 3;

const TIER_CONFIGS = [
  { name: "large", minFactor: 0.11, maxFactor: 0.17, density: 0.42, hardCap: 10, attempts: 360, maxFailures: 80 },
  { name: "medium", minFactor: 0.07, maxFactor: 0.105, density: 0.52, hardCap: 24, attempts: 380, maxFailures: 95 },
  { name: "small", minFactor: 0.045, maxFactor: 0.068, density: 0.6, hardCap: 50, attempts: 420, maxFailures: 120 },
  { name: "smaller", minFactor: 0.03, maxFactor: 0.045, density: 0.68, hardCap: 90, attempts: 480, maxFailures: 135 },
  { name: "tiny", minFactor: 0.02, maxFactor: 0.03, density: 0.76, hardCap: 140, attempts: 540, maxFailures: 155 },
];

const circles = [];
const tierSequence = [];
let activeCircle = null;
let tierIndex = 0;
let isComplete = false;
let globalMaxCircles = 0;
let hasValidatedPacking = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(SKETCH_FRAME_RATE);
  startPacking();
}

function draw() {
  if (activeCircle) {
    animateCircleDrawing(activeCircle);
    return;
  }

  if (isComplete) return;
  if (shouldSkipPlacementFrame(frameCount)) return;

  placeNextCircle();
}

function startPacking() {
  background(...BG_COLOR);
  circles.length = 0;
  tierSequence.length = 0;
  buildTierSequence();
  tierIndex = 0;
  activeCircle = null;
  isComplete = false;
  hasValidatedPacking = false;
  loop();

  if (!tierSequence.length) {
    finishSketch();
    return;
  }

  const seed = createRandomSeedCircle(tierSequence[0]);
  if (!seed) {
    finishSketch();
    return;
  }

  circles.push(seed);
  tierSequence[0].placed += 1;
  activeCircle = seed;
}

function buildTierSequence() {
  const scale = min(width, height);
  const area = width * height;
  const areaScale = constrain(area / REFERENCE_CANVAS_AREA, MIN_AREA_SCALE, MAX_AREA_SCALE);

  for (const tier of TIER_CONFIGS) {
    const minRadius = max(TIER_MIN_RADIUS_PX, scale * tier.minFactor);
    const maxRadius = max(minRadius + TIER_MIN_RADIUS_SPAN_PX, scale * tier.maxFactor);
    const avgRadius = (minRadius + maxRadius) * 0.5;
    const areaPerCircle = PI * avgRadius * avgRadius;
    const densityCap = floor((area * tier.density) / areaPerCircle);
    const scaledHardCap = max(1, floor(tier.hardCap * areaScale));

    tierSequence.push({
      name: tier.name,
      minRadius,
      maxRadius,
      maxCount: max(1, min(scaledHardCap, densityCap)),
      attempts: tier.attempts,
      maxFailures: tier.maxFailures,
      placed: 0,
      failures: 0,
    });
  }

  const totalTierCapacity = tierSequence.reduce((sum, tier) => sum + tier.maxCount, 0);
  globalMaxCircles = max(MIN_GLOBAL_CIRCLE_CAP, totalTierCapacity);
}

function createRandomSeedCircle(tier) {
  for (let i = 0; i < SEED_ATTEMPTS; i += 1) {
    const radius = random(tier.minRadius, tier.maxRadius);
    const x = random(radius + VIEWPORT_MARGIN, width - radius - VIEWPORT_MARGIN);
    const y = random(radius + VIEWPORT_MARGIN, height - radius - VIEWPORT_MARGIN);
    const candidate = createCircle(x, y, radius, tier.name);
    if (!overlapsExisting(candidate)) return candidate;
  }
  return null;
}

function placeNextCircle() {
  while (tierIndex < tierSequence.length && tierSequence[tierIndex].placed >= tierSequence[tierIndex].maxCount) {
    tierIndex += 1;
  }

  if (tierIndex >= tierSequence.length || circles.length >= globalMaxCircles) {
    finishSketch();
    return;
  }

  const tier = tierSequence[tierIndex];
  const next = findNextCircleForTier(tier);

  if (!next) {
    tier.failures += 1;
    if (tier.failures >= tier.maxFailures) {
      tierIndex += 1;
      if (tierIndex >= tierSequence.length) {
        finishSketch();
      }
    }
    return;
  }

  circles.push(next);
  tier.placed += 1;
  tier.failures = 0;
  activeCircle = next;

  if (circles.length >= globalMaxCircles) finishSketch();
}

function findNextCircleForTier(tier) {
  let bestCandidate = null;
  let bestScore = -Infinity;

  for (let i = 0; i < tier.attempts; i += 1) {
    const radius = random(tier.minRadius, tier.maxRadius);
    const point = proposeCandidatePoint(radius);
    if (!point) continue;

    const candidate = createCircle(point.x, point.y, radius, tier.name);
    if (!fitsInViewport(candidate.x, candidate.y, candidate.r)) continue;
    if (overlapsExisting(candidate)) continue;

    const touchCount = countTouchingNeighbors(candidate);
    if (circles.length > 0 && touchCount === 0) continue;
    const touchGap = nearestTouchGap(candidate);
    let score =
      touchCount * CANDIDATE_SCORE_TOUCH_WEIGHT -
      touchGap * CANDIDATE_SCORE_GAP_WEIGHT +
      random(0, CANDIDATE_SCORE_NOISE_MAX);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function proposeCandidatePoint(radius) {
  if (!circles.length) {
    return {
      x: random(radius + VIEWPORT_MARGIN, width - radius - VIEWPORT_MARGIN),
      y: random(radius + VIEWPORT_MARGIN, height - radius - VIEWPORT_MARGIN),
    };
  }

  if (circles.length >= 2 && random() < TWO_PARENT_PROPOSAL_CHANCE) {
    const twoParentPoint = buildTwoParentTouchPoint(radius);
    if (twoParentPoint) return twoParentPoint;
  }

  if (random() < SINGLE_PARENT_PROPOSAL_CHANCE) {
    return buildSingleParentTouchPoint(radius);
  }

  return {
    x: random(radius + VIEWPORT_MARGIN, width - radius - VIEWPORT_MARGIN),
    y: random(radius + VIEWPORT_MARGIN, height - radius - VIEWPORT_MARGIN),
  };
}

function buildSingleParentTouchPoint(radius) {
  const parent = random(circles);
  const angle = random(TWO_PI);
  const distanceFromParent = parent.r + radius;
  return {
    x: parent.x + cos(angle) * distanceFromParent,
    y: parent.y + sin(angle) * distanceFromParent,
  };
}

function buildTwoParentTouchPoint(radius) {
  for (let i = 0; i < TWO_PARENT_PICK_ATTEMPTS; i += 1) {
    const a = random(circles);
    const b = random(circles);
    if (a === b) continue;

    const intersections = getTangentIntersections(a, b, radius);
    if (!intersections.length) continue;

    return random(intersections);
  }

  return null;
}

function getTangentIntersections(a, b, radius) {
  const targetA = a.r + radius;
  const targetB = b.r + radius;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = sqrt(dx * dx + dy * dy);

  if (distance <= 0) return [];
  if (distance > targetA + targetB + TANGENT_SOLVER_EPSILON) return [];
  if (distance < abs(targetA - targetB) - TANGENT_SOLVER_EPSILON) return [];

  const along = (targetA * targetA - targetB * targetB + distance * distance) / (2 * distance);
  const heightSq = targetA * targetA - along * along;
  if (heightSq < -TANGENT_SOLVER_EPSILON) return [];

  const height = sqrt(max(0, heightSq));
  const baseX = a.x + (along * dx) / distance;
  const baseY = a.y + (along * dy) / distance;
  const offsetX = (-dy * height) / distance;
  const offsetY = (dx * height) / distance;

  if (height < TANGENT_COLLAPSE_EPSILON) {
    return [{ x: baseX, y: baseY }];
  }

  return [
    { x: baseX + offsetX, y: baseY + offsetY },
    { x: baseX - offsetX, y: baseY - offsetY },
  ];
}

function overlapsExisting(candidate) {
  for (const circle of circles) {
    const minimumDistance = circle.r + candidate.r;
    if (dist(candidate.x, candidate.y, circle.x, circle.y) < minimumDistance) {
      return true;
    }
  }
  return false;
}

function countTouchingNeighbors(candidate) {
  let touches = 0;
  for (const circle of circles) {
    const d = dist(candidate.x, candidate.y, circle.x, circle.y);
    const target = candidate.r + circle.r;
    if (abs(d - target) <= TOUCH_EPSILON) touches += 1;
  }
  return touches;
}

function nearestTouchGap(candidate) {
  if (!circles.length) return 0;

  let nearest = Infinity;
  for (const circle of circles) {
    const d = dist(candidate.x, candidate.y, circle.x, circle.y);
    const target = candidate.r + circle.r;
    const gap = abs(d - target);
    if (gap < nearest) nearest = gap;
  }

  return nearest;
}

function fitsInViewport(x, y, radius) {
  return (
    x - radius > VIEWPORT_MARGIN &&
    x + radius < width - VIEWPORT_MARGIN &&
    y + radius < height - VIEWPORT_MARGIN &&
    y - radius > VIEWPORT_MARGIN
  );
}

function createCircle(x, y, radius, tierName) {
  return {
    x,
    y,
    r: radius,
    tier: tierName,
    strokeW: getMondriaanRectangleStrokeWeight(),
    perimeter: TWO_PI * radius,
    drawProgress: 0,
    drawSpeed: max(DEFAULT_STROKE_DRAW_SPEED_MIN, radius * DEFAULT_STROKE_DRAW_SPEED_SCALE),
  };
}

function getMondriaanRectangleStrokeWeight() {
  const fillerLineWeight = constrain(min(width, height) * MONDRIAAN_FILLER_SCALE, MONDRIAAN_FILLER_MIN, MONDRIAAN_FILLER_MAX);
  const borderWeight = fillerLineWeight * MONDRIAAN_BORDER_MULTIPLIER;
  return max(MONDRIAAN_BORDER_STROKE_MIN, borderWeight + random(MONDRIAAN_BORDER_JITTER_MIN, MONDRIAAN_BORDER_JITTER_MAX));
}

function animateCircleDrawing(circle) {
  const fromDistance = circle.drawProgress;
  circle.drawProgress = min(circle.perimeter, circle.drawProgress + getSpeedAdjustedIncrement(circle.drawSpeed));
  drawCircleStrokeRange(circle, fromDistance, circle.drawProgress);

  if (circle.drawProgress >= circle.perimeter) {
    activeCircle = null;
    if (isComplete || tierIndex >= tierSequence.length) finishSketch();
  }
}

function drawCircleStrokeRange(circle, fromDistance, toDistance) {
  if (toDistance <= fromDistance) return;

  const startAngle = (fromDistance / circle.perimeter) * TWO_PI;
  const endAngle = (toDistance / circle.perimeter) * TWO_PI;

  push();
  noFill();
  stroke(...CIRCLE_STROKE_COLOR);
  strokeWeight(circle.strokeW);
  strokeCap(SQUARE);
  arc(circle.x, circle.y, circle.r * 2, circle.r * 2, startAngle, endAngle);
  pop();
}

function finishSketch() {
  isComplete = true;
  if (!hasValidatedPacking) {
    validatePackingInvariants();
    hasValidatedPacking = true;
  }
  if (!activeCircle) noLoop();
}

function validatePackingInvariants() {
  for (let i = 0; i < circles.length; i += 1) {
    const circleA = circles[i];
    let touchingNeighbors = 0;

    for (let j = 0; j < circles.length; j += 1) {
      if (i === j) continue;

      const circleB = circles[j];
      const d = dist(circleA.x, circleA.y, circleB.x, circleB.y);
      const minimumDistance = circleA.r + circleB.r;
      if (d < minimumDistance) {
        console.error("Circle packing invariant failed: intersecting circles", {
          indexA: i,
          indexB: j,
          distance: d,
          minimumDistance,
        });
        return false;
      }

      if (abs(d - minimumDistance) <= TOUCH_EPSILON) touchingNeighbors += 1;
    }

    if (i > 0 && touchingNeighbors === 0) {
      console.error("Circle packing invariant failed: isolated non-seed circle", {
        index: i,
      });
      return false;
    }
  }

  return true;
}

function mousePressed(event) {
  if (event && event.target && (event.target.closest(".main-controls") || event.target.closest(".main-credit"))) return;
  startPacking();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startPacking();
}

function getMainSpeedMode() {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.getSpeedMode === "function") {
    return window.HUAHUA_APP.getSpeedMode();
  }
  if (!window.HUAHUA_APP || !Number.isFinite(window.HUAHUA_APP.speed)) return 1;
  const speed = window.HUAHUA_APP.speed;
  if (speed === 2 || speed === 4) return speed;
  return 1;
}

function shouldSkipPlacementFrame(frameIndex) {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.shouldSkipPlacementFrame === "function") {
    return window.HUAHUA_APP.shouldSkipPlacementFrame(frameIndex);
  }
  return getMainSpeedMode() === 1 && frameIndex % FALLBACK_1X_PLACEMENT_FRAME_INTERVAL !== 0;
}

function getSpeedAdjustedIncrement(baseIncrement) {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.getStrokeIncrement === "function") {
    return window.HUAHUA_APP.getStrokeIncrement(baseIncrement);
  }

  const speedMode = getMainSpeedMode();
  if (speedMode === 1) return baseIncrement * FALLBACK_SPEED_1_MULTIPLIER;
  if (speedMode === 2) return baseIncrement * FALLBACK_SPEED_2_MULTIPLIER;

  let increment = baseIncrement * FALLBACK_SPEED_4_MULTIPLIER;
  if (random() < FALLBACK_4X_BURST_CHANCE) {
    increment += baseIncrement * random(FALLBACK_4X_BURST_MIN, FALLBACK_4X_BURST_MAX);
  }
  return increment;
}

function registerSketchCredits(credits) {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.setCredits === "function") {
    window.HUAHUA_APP.setCredits(credits);
    return;
  }
  window.HUAHUA_PENDING_CREDITS = credits;
}
