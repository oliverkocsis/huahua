const sketchCredits = {
  title: "Composition with large red plane, yellow, black, gray and blue",
  author: "Piet Mondriaan",
  url: "https://www.kunstmuseum.nl/en/collection/composition-large-red-plane-yellow-black-gray-and-blue",
};

registerSketchCredits(sketchCredits);

const AREA_MIN_RATIO = 0.01;
const AREA_MAX_RATIO = 0.05;
const RECT_RATIO_MIN = 0.50;
const RECT_RATIO_MAX = 2.00;
const COMPOSITION_MARGIN_RATIO = 0.06;
const COMPOSITION_MARGIN_MIN = 32;
const COMPOSITION_MARGIN_MAX = 96;
const ANGLE_OPTIONS = [0, 15, 30, 45, 60, 75, 90];
const HATCH_SPACING_MIN_PX = 2;
const HATCH_SPACING_MAX_PX = 5;
const HATCH_SPACING_MIN_SCALE = 0.004;
const HATCH_SPACING_MAX_SCALE = 0.008;
const BG_COLOR = [246, 244, 238];
const GRID_COLOR = [24, 24, 24, 230];
const HATCH_COLOR = [16, 16, 16, 170];

let mondrianRectangles = [];
let currentRectangleIndex = 0;
let borderWeight = 6;
let fillerLineWeight = 1.5;
let outlineSegments = [];
let currentOutlineIndex = 0;
let currentOutlineProgress = 0;
let drawPhase = "outlines";
let isComplete = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  buildMondrianComposition();
}

function draw() {
  if (isComplete) return;

  let remainingDistance = getDrawDistancePerFrame();

  while (remainingDistance > 0) {
    if (drawPhase === "outlines") {
      const outlineConsumed = drawNextOutlineDistance(remainingDistance);
      if (outlineConsumed > 0) {
        remainingDistance -= outlineConsumed;
        continue;
      }
      drawPhase = "fills";
      continue;
    }

    if (currentRectangleIndex >= mondrianRectangles.length) break;

    const section = mondrianRectangles[currentRectangleIndex];
    const consumed = drawNextStrokeDistance(section, remainingDistance);
    if (consumed > 0) {
      remainingDistance -= consumed;
    } else {
      currentRectangleIndex += 1;
    }
  }

  if (drawPhase === "fills" && currentRectangleIndex >= mondrianRectangles.length) {
    isComplete = true;
    noLoop();
  }
}

function buildMondrianComposition() {
  background(...BG_COLOR);
  fillerLineWeight = constrain(min(width, height) * 0.0018, 0.8, 1.4);
  borderWeight = fillerLineWeight * 4;
  mondrianRectangles = generateMondrianRectangles().map((section) => createFillPlan(section));
  outlineSegments = createOutlineSegments(mondrianRectangles);
  currentOutlineIndex = 0;
  currentOutlineProgress = 0;
  drawPhase = "outlines";
  currentRectangleIndex = 0;
  isComplete = false;
  loop();
}

function generateMondrianRectangles() {
  const margin = getCompositionMargin();
  const composition = {
    x: margin,
    y: margin,
    w: max(10, width - margin * 2),
    h: max(10, height - margin * 2),
  };
  const compositionArea = composition.w * composition.h;
  const minArea = compositionArea * AREA_MIN_RATIO;
  const maxArea = compositionArea * AREA_MAX_RATIO;
  const root = composition;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const sections = [root];
    let failed = false;
    let guard = 0;

    while (true) {
      guard += 1;
      if (guard > 600) {
        failed = true;
        break;
      }

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
}

function splitSection(section, minArea) {
  const orientations = shuffleValues(["vertical", "horizontal"]);
  for (const orientation of orientations) {
    const split = splitWithOrientation(section, minArea, orientation);
    if (split) return split;
  }
  return null;
}

function splitWithOrientation(section, minArea, orientation) {
  if (orientation === "vertical") {
    const minWidth = minArea / section.h;
    const maxWidth = section.w - minWidth;
    if (maxWidth <= minWidth) return null;

    for (let attempt = 0; attempt < 36; attempt += 1) {
      const cutX = random(minWidth, maxWidth);
      const left = { x: section.x, y: section.y, w: cutX, h: section.h };
      const right = { x: section.x + cutX, y: section.y, w: section.w - cutX, h: section.h };
      if (isSectionShapeValid(left) && isSectionShapeValid(right)) return [left, right];
    }
    return null;
  }

  const minHeight = minArea / section.w;
  const maxHeight = section.h - minHeight;
  if (maxHeight <= minHeight) return null;

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const cutY = random(minHeight, maxHeight);
    const top = { x: section.x, y: section.y, w: section.w, h: cutY };
    const bottom = { x: section.x, y: section.y + cutY, w: section.w, h: section.h - cutY };
    if (isSectionShapeValid(top) && isSectionShapeValid(bottom)) return [top, bottom];
  }

  return null;
}

function createFallbackGrid(bounds) {
  const rows = 5;
  const columns = 5;
  const cellWidth = bounds.w / columns;
  const cellHeight = bounds.h / rows;
  const sections = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      sections.push({
        x: bounds.x + column * cellWidth,
        y: bounds.y + row * cellHeight,
        w: cellWidth,
        h: cellHeight,
      });
    }
  }

  return sections;
}

function createFillPlan(section) {
  const inset = borderWeight * 0.7;
  const spacingBounds = getSpacingBounds();
  const angleDegrees = random(ANGLE_OPTIONS);
  const lineSpacing = random(spacingBounds.min, spacingBounds.max);
  const lines = createHatchLines(section, radians(angleDegrees), lineSpacing, inset);

  return {
    ...section,
    angleDegrees,
    lineSpacing,
    lines,
    currentLineIndex: 0,
    currentLineProgress: 0,
  };
}

function createOutlineSegments(sections) {
  const segments = [];
  for (const section of sections) {
    segments.push(createSegment(section.x, section.y, section.x + section.w, section.y));
    segments.push(createSegment(section.x + section.w, section.y, section.x + section.w, section.y + section.h));
    segments.push(createSegment(section.x + section.w, section.y + section.h, section.x, section.y + section.h));
    segments.push(createSegment(section.x, section.y + section.h, section.x, section.y));
  }
  return segments;
}

function createSegment(x1, y1, x2, y2) {
  return {
    x1,
    y1,
    x2,
    y2,
    length: dist(x1, y1, x2, y2),
  };
}

function getSpacingBounds() {
  const scale = min(width, height);
  return {
    min: max(HATCH_SPACING_MIN_PX, scale * HATCH_SPACING_MIN_SCALE),
    max: max(HATCH_SPACING_MAX_PX, scale * HATCH_SPACING_MAX_SCALE),
  };
}

function createHatchLines(section, angle, spacing, inset) {
  const x = section.x + inset;
  const y = section.y + inset;
  const w = section.w - inset * 2;
  const h = section.h - inset * 2;

  if (w <= 1 || h <= 1) return [];

  const centerX = x + w * 0.5;
  const centerY = y + h * 0.5;
  const dx = cos(angle);
  const dy = sin(angle);
  const nx = -dy;
  const ny = dx;
  const diagonal = sqrt(w * w + h * h);
  const corners = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];

  let minOffset = Infinity;
  let maxOffset = -Infinity;
  for (const [cx, cy] of corners) {
    const projection = (cx - centerX) * nx + (cy - centerY) * ny;
    minOffset = min(minOffset, projection);
    maxOffset = max(maxOffset, projection);
  }

  const lines = [];
  let offset = minOffset - random(spacing * 0.2, spacing);

  while (offset <= maxOffset + spacing) {
    offset += spacing;
    const baseX = centerX + nx * offset;
    const baseY = centerY + ny * offset;
    const rawX1 = baseX - dx * diagonal;
    const rawY1 = baseY - dy * diagonal;
    const rawX2 = baseX + dx * diagonal;
    const rawY2 = baseY + dy * diagonal;
    const clipped = clipSegmentToRect(rawX1, rawY1, rawX2, rawY2, x, y, w, h);
    if (clipped) {
      const length = dist(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
      if (length > 0.001) lines.push({ ...clipped, length });
    }
  }

  return lines;
}

function clipSegmentToRect(x1, y1, x2, y2, x, y, w, h) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - x, x + w - x1, y1 - y, y + h - y1];
  let t0 = 0;
  let t1 = 1;

  for (let i = 0; i < 4; i += 1) {
    if (abs(p[i]) < 0.000001) {
      if (q[i] < 0) return null;
      continue;
    }

    const r = q[i] / p[i];

    if (p[i] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  return {
    x1: x1 + t0 * dx,
    y1: y1 + t0 * dy,
    x2: x1 + t1 * dx,
    y2: y1 + t1 * dy,
  };
}

function drawNextStrokeDistance(section, distanceBudget) {
  if (section.currentLineIndex >= section.lines.length) return 0;

  let consumed = 0;
  stroke(...HATCH_COLOR);
  strokeCap(ROUND);

  while (distanceBudget > 0 && section.currentLineIndex < section.lines.length) {
    const segment = section.lines[section.currentLineIndex];
    const segmentLength = segment.length;
    if (segmentLength <= 0.001) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
      continue;
    }

    const remainingOnLine = segmentLength - section.currentLineProgress;
    if (remainingOnLine <= 0.001) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
      continue;
    }

    const step = min(remainingOnLine, distanceBudget);
    const nextProgress = section.currentLineProgress + step;
    strokeWeight(max(0.7, fillerLineWeight + random(-0.12, 0.14)));
    drawSegmentPortion(segment, section.currentLineProgress, nextProgress);
    section.currentLineProgress = nextProgress;
    distanceBudget -= step;
    consumed += step;

    if (section.currentLineProgress >= segmentLength - 0.001) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
    }
  }

  return consumed;
}

function drawSegmentPortion(segment, fromDistance, toDistance) {
  const t1 = constrain(fromDistance / segment.length, 0, 1);
  const t2 = constrain(toDistance / segment.length, 0, 1);
  if (t2 <= t1) return;

  const x1 = lerp(segment.x1, segment.x2, t1);
  const y1 = lerp(segment.y1, segment.y2, t1);
  const x2 = lerp(segment.x1, segment.x2, t2);
  const y2 = lerp(segment.y1, segment.y2, t2);
  line(x1, y1, x2, y2);
}

function drawNextOutlineDistance(distanceBudget) {
  if (currentOutlineIndex >= outlineSegments.length) return 0;

  let consumed = 0;
  stroke(...GRID_COLOR);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  while (distanceBudget > 0 && currentOutlineIndex < outlineSegments.length) {
    const segment = outlineSegments[currentOutlineIndex];
    const segmentLength = segment.length;
    if (segmentLength <= 0.001) {
      currentOutlineIndex += 1;
      currentOutlineProgress = 0;
      continue;
    }

    const remainingOnSegment = segmentLength - currentOutlineProgress;
    if (remainingOnSegment <= 0.001) {
      currentOutlineIndex += 1;
      currentOutlineProgress = 0;
      continue;
    }

    const step = min(remainingOnSegment, distanceBudget);
    const nextProgress = currentOutlineProgress + step;
    strokeWeight(max(1.2, borderWeight + random(-0.25, 0.25)));
    drawSegmentPortion(segment, currentOutlineProgress, nextProgress);
    currentOutlineProgress = nextProgress;
    distanceBudget -= step;
    consumed += step;

    if (currentOutlineProgress >= segmentLength - 0.001) {
      currentOutlineIndex += 1;
      currentOutlineProgress = 0;
    }
  }

  return consumed;
}

function getArea(section) {
  return section.w * section.h;
}

function getCompositionMargin() {
  return constrain(min(width, height) * COMPOSITION_MARGIN_RATIO, COMPOSITION_MARGIN_MIN, COMPOSITION_MARGIN_MAX);
}

function isSectionShapeValid(section) {
  const ratio = section.w / section.h;
  return ratio >= RECT_RATIO_MIN && ratio <= RECT_RATIO_MAX;
}

function isSectionFinalValid(section, minArea, maxArea) {
  const area = getArea(section);
  if (area < minArea - 0.5 || area > maxArea + 0.5) return false;
  return isSectionShapeValid(section);
}

function shuffleValues(values) {
  const shuffled = values.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = floor(random(i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

function getMainSpeedMode() {
  if (!window.HUAHUA_APP || !Number.isFinite(window.HUAHUA_APP.speed)) return 1;
  const speed = window.HUAHUA_APP.speed;
  if (speed === 2 || speed === 4) return speed;
  return 1;
}

function getDrawDistancePerFrame() {
  const speedMode = getMainSpeedMode();
  const scale = min(width, height);
  if (speedMode === 1) return max(8, scale * 0.02);
  if (speedMode === 2) return max(24, scale * 0.055);

  let burst = max(54, scale * 0.12);
  if (random() < 0.35) burst += max(28, scale * random(0.08, 0.2));
  return burst;
}

function mousePressed(event) {
  if (event && event.target && (event.target.closest(".main-controls") || event.target.closest(".main-credit"))) return;
  buildMondrianComposition();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildMondrianComposition();
}

function registerSketchCredits(credits) {
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.setCredits === "function") {
    window.HUAHUA_APP.setCredits(credits);
    return;
  }
  window.HUAHUA_PENDING_CREDITS = credits;
}
