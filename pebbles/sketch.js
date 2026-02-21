const pebblePalette = [
  [128, 110, 93, 48],
  [110, 94, 78, 46],
  [148, 129, 112, 44],
  [95, 82, 70, 44],
  [170, 152, 133, 40],
];

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

  // Grow one new neighboring pebble every 2 frames.
  if (frameCount % 2 !== 0) return;

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
    const radius = random(18, 46);
    const angle = pickNeighborAngle(parent);
    const x = parent.x + cos(angle) * (parent.r + radius);
    const y = parent.y + sin(angle) * (parent.r + radius);

    if (!fitsInViewport(x, y, radius)) continue;
    if (overlapsExisting(x, y, radius)) continue;

    const contacts = countTouchingNeighbors(x, y, radius);
    const outward = dist(centerX, centerY, x, y);
    const score = contacts * 100 + outward * 0.05 + random(0, 0.2);

    if (score > bestScore) {
      bestScore = score;
      best = createPebble(x, y, radius);
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

function overlapsExisting(x, y, radius) {
  for (const pebble of pebbles) {
    if (dist(x, y, pebble.x, pebble.y) < radius + pebble.r) {
      return true;
    }
  }
  return false;
}

function countTouchingNeighbors(x, y, radius) {
  let count = 0;
  for (const pebble of pebbles) {
    const d = dist(x, y, pebble.x, pebble.y);
    const target = radius + pebble.r;
    if (abs(d - target) <= 1.6) count += 1;
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

  let perimeter = 0;
  for (let i = 0; i < points.length; i += 1) {
    const aPoint = points[i];
    const bPoint = points[(i + 1) % points.length];
    perimeter += dist(aPoint.x, aPoint.y, bPoint.x, bPoint.y);
  }

  return {
    x,
    y,
    r: radius,
    points,
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
  pebble.drawProgress = min(pebble.perimeter, pebble.drawProgress + pebble.drawSpeed);
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

  beginShape();
  for (const point of pebble.points) {
    vertex(point.x, point.y);
  }
  endShape(CLOSE);

  stroke(255, 255, 255, 30);
  strokeWeight(0.7);
  line(-pebble.r * 0.25, -pebble.r * 0.12, pebble.r * 0.2, -pebble.r * 0.2);
  pop();
}

function mousePressed() {
  startCluster();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startCluster();
}

