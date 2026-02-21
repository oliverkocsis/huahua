const pebblePalette = [
  [128, 110, 93, 48],
  [110, 94, 78, 46],
  [148, 129, 112, 44],
  [95, 82, 70, 44],
  [170, 152, 133, 40],
];

const sketchCredits = {
  title: "doodle diary vol.90",
  author: "@camellia_doodle",
  url: "https://www.instagram.com/p/DTQC1gpE-6S/",
};

registerSketchCredits(sketchCredits);

const bgColor = [246, 241, 232];
const pebbles = [];
let centerX = 0;
let centerY = 0;
let failedPlacements = 0;
let isFull = false;
let activePebble = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  startCluster();
}

function draw() {
  if (activePebble) {
    animatePebbleDrawing(activePebble);
    return;
  }

  if (isFull) return;

  if (shouldSkipPlacementFrame(frameCount)) return;

  const next = findNextPebble();
  if (!next) {
    failedPlacements += 1;
    if (failedPlacements >= 40) {
      isFull = true;
      noLoop();
    }
    return;
  }

  failedPlacements = 0;
  pebbles.push(next);
  activePebble = next;
}

function startCluster() {
  background(...bgColor);
  pebbles.length = 0;
  centerX = width * 0.5;
  centerY = height * 0.5;
  failedPlacements = 0;
  isFull = false;
  activePebble = null;
  loop();

  const seed = createPebble(centerX, centerY, random(34, 56));
  pebbles.push(seed);
  activePebble = seed;
}

function findNextPebble() {
  let best = null;
  let bestScore = -Infinity;
  const attempts = 300;

  for (let i = 0; i < attempts; i += 1) {
    const parent = pickRandomParent();
    const candidate = createPebble(0, 0, random(18, 46));
    const angle = pickNeighborAngle(parent);
    const centerDistance = parent.packingRadius + candidate.packingRadius;
    candidate.x = parent.x + cos(angle) * centerDistance;
    candidate.y = parent.y + sin(angle) * centerDistance;

    if (!fitsInViewport(candidate.x, candidate.y, candidate.packingRadius)) continue;
    if (overlapsExisting(candidate)) continue;

    const contacts = countTouchingNeighbors(candidate);
    const outward = dist(centerX, centerY, candidate.x, candidate.y);
    const score = contacts * 100 + outward * 0.05 + random(0, 0.2);

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function pickRandomParent() {
  // Bias toward outer pebbles so growth moves from inside out.
  let totalWeight = 0;
  for (const pebble of pebbles) {
    pebble._w = pow(dist(centerX, centerY, pebble.x, pebble.y) + 12, 1.25);
    totalWeight += pebble._w;
  }

  let target = random(totalWeight);
  for (const pebble of pebbles) {
    target -= pebble._w;
    if (target <= 0) return pebble;
  }
  return pebbles[pebbles.length - 1];
}

function pickNeighborAngle(parent) {
  const outward = atan2(parent.y - centerY, parent.x - centerX);
  if (dist(centerX, centerY, parent.x, parent.y) < 8) {
    return random(TWO_PI);
  }
  return outward + random(-PI * 0.9, PI * 0.9);
}

function overlapsExisting(candidate) {
  for (const pebble of pebbles) {
    const target = pebble.packingRadius + candidate.packingRadius;
    if (dist(candidate.x, candidate.y, pebble.x, pebble.y) < target - 0.35) {
      return true;
    }
  }
  return false;
}

function countTouchingNeighbors(candidate) {
  let count = 0;
  for (const pebble of pebbles) {
    const d = dist(candidate.x, candidate.y, pebble.x, pebble.y);
    const target = candidate.packingRadius + pebble.packingRadius;
    if (abs(d - target) <= 1.2) count += 1;
  }
  return count;
}

function fitsInViewport(x, y, radius) {
  const margin = 2;
  return x - radius > margin && x + radius < width - margin && y - radius > margin && y + radius < height - margin;
}

function createPebble(x, y, radius) {
  const points = [];
  const segments = floor(random(10, 18));
  const [r, g, b, a] = random(pebblePalette);

  for (let i = 0; i < segments; i += 1) {
    const angle = map(i, 0, segments, 0, TWO_PI);
    const edge = radius * random(0.78, 0.98);
    points.push({ x: cos(angle) * edge, y: sin(angle) * edge });
  }

  const smoothPoints = smoothClosedPoints(points, 2);
  const perimeter = calculateLoopPerimeter(smoothPoints);
  const packingRadius = calculatePackingRadius(smoothPoints);

  return {
    x,
    y,
    r: radius,
    packingRadius,
    points: smoothPoints,
    color: [r, g, b, a],
    angle: random(TWO_PI),
    strokeW: random(0.7, 1.2),
    perimeter,
    drawProgress: 0,
    drawSpeed: max(2.2, radius * 0.2),
  };
}

function animatePebbleDrawing(pebble) {
  const from = pebble.drawProgress;
  pebble.drawProgress = min(pebble.perimeter, pebble.drawProgress + getSpeedAdjustedIncrement(pebble.drawSpeed));
  drawPebbleStrokeRange(pebble, from, pebble.drawProgress);

  if (pebble.drawProgress >= pebble.perimeter) {
    finalizePebble(pebble);
    activePebble = null;
  }
}

function drawPebbleStrokeRange(pebble, fromDistance, toDistance) {
  if (toDistance <= fromDistance) return;

  push();
  translate(pebble.x, pebble.y);
  rotate(pebble.angle);
  noFill();
  stroke(44, 35, 28, 110);
  strokeWeight(pebble.strokeW);
  strokeJoin(ROUND);
  strokeCap(ROUND);

  let traveled = 0;
  for (let i = 0; i < pebble.points.length; i += 1) {
    const a = pebble.points[i];
    const b = pebble.points[(i + 1) % pebble.points.length];
    const segmentLength = dist(a.x, a.y, b.x, b.y);
    const segmentStart = traveled;
    const segmentEnd = traveled + segmentLength;
    const start = max(fromDistance, segmentStart);
    const end = min(toDistance, segmentEnd);

    if (end > start) {
      const t1 = (start - segmentStart) / segmentLength;
      const t2 = (end - segmentStart) / segmentLength;
      line(lerp(a.x, b.x, t1), lerp(a.y, b.y, t1), lerp(a.x, b.x, t2), lerp(a.y, b.y, t2));
    }

    traveled = segmentEnd;
  }

  pop();
}

function finalizePebble(pebble) {
  push();
  translate(pebble.x, pebble.y);
  rotate(pebble.angle);

  fill(...pebble.color);
  stroke(46, 36, 28, 95);
  strokeWeight(pebble.strokeW);
  strokeJoin(ROUND);
  strokeCap(ROUND);

  beginShape();
  for (let i = -2; i < pebble.points.length + 2; i += 1) {
    const point = pebble.points[(i + pebble.points.length) % pebble.points.length];
    curveVertex(point.x, point.y);
  }
  endShape(CLOSE);

  stroke(255, 255, 255, 30);
  strokeWeight(0.7);
  line(-pebble.r * 0.25, -pebble.r * 0.12, pebble.r * 0.2, -pebble.r * 0.2);
  pop();
}

function mousePressed(event) {
  if (event && event.target && (event.target.closest(".main-controls") || event.target.closest(".main-credit"))) return;
  startCluster();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startCluster();
}

function smoothClosedPoints(inputPoints, iterations) {
  let smoothed = inputPoints.slice();

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [];
    for (let index = 0; index < smoothed.length; index += 1) {
      const current = smoothed[index];
      const nextPoint = smoothed[(index + 1) % smoothed.length];
      next.push({
        x: current.x * 0.75 + nextPoint.x * 0.25,
        y: current.y * 0.75 + nextPoint.y * 0.25,
      });
      next.push({
        x: current.x * 0.25 + nextPoint.x * 0.75,
        y: current.y * 0.25 + nextPoint.y * 0.75,
      });
    }
    smoothed = next;
  }

  return smoothed;
}

function calculateLoopPerimeter(points) {
  let perimeter = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const nextPoint = points[(index + 1) % points.length];
    perimeter += dist(current.x, current.y, nextPoint.x, nextPoint.y);
  }
  return perimeter;
}

function calculatePackingRadius(points) {
  let maxDistance = 0;
  for (const point of points) {
    const pointDistance = dist(0, 0, point.x, point.y);
    if (pointDistance > maxDistance) maxDistance = pointDistance;
  }
  return maxDistance;
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
  return getMainSpeedMode() === 1 && frameIndex % 3 !== 0;
}

function getSpeedAdjustedIncrement(baseIncrement) {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.getStrokeIncrement === "function") {
    return window.HUAHUA_APP.getStrokeIncrement(baseIncrement);
  }
  const speedMode = getMainSpeedMode();
  if (speedMode === 1) return baseIncrement * 0.5;
  if (speedMode === 2) return baseIncrement * 2;

  let increment = baseIncrement * 4;
  // 4x keeps the 2x base pace, then jumps ahead more often and farther.
  if (random() < 0.5) {
    increment += baseIncrement * random(10, 50);
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
