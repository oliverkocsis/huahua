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
const FILL_ANGLE_MIN_DEGREES = -60;
const FILL_ANGLE_MAX_DEGREES = -30;
const FILL_STROKE_WEIGHT_MULTIPLIER = 2.4;
const FILL_SPACING_MIN_PX = 2.8;
const FILL_SPACING_MAX_PX = 4.8;
const FILL_SPACING_MIN_SCALE = 0.0032;
const FILL_SPACING_MAX_SCALE = 0.0058;
const PIXEL_STEP_DISTANCE = 2;
const HUMAN_PIXEL_STEPS_PER_FRAME = 4;
const MAX_SPLIT_ATTEMPTS = 120;
const SPLIT_CUT_ATTEMPTS = 36;
const GEOMETRY_EPSILON = 0.001;
const CLIP_EPSILON = 0.000001;
const WHITE_RECTANGLE_PROBABILITY = 0.40;
const BLACK_FILL_PROBABILITY = 0.05;
const WHITE_FILL_COLOR = [250, 249, 245, 230];
const BLACK_FILL_COLOR = [20, 20, 20, 235];
const BG_COLOR = [246, 244, 238];
const GRID_COLOR = [24, 24, 24, 230];
const RED_PASTEL_SHADES = [
  [238, 122, 114],
  [232, 108, 102],
  [246, 136, 126],
];
const YELLOW_PASTEL_SHADES = [
  [245, 214, 104],
  [250, 222, 118],
  [239, 204, 92],
];
const BLUE_PASTEL_SHADES = [
  [128, 172, 236],
  [117, 163, 229],
  [141, 184, 242],
];

let mondrianRectangles = [];
let currentRectangleIndex = 0;
let borderWeight = 6;
let fillerLineWeight = 1.5;
let splitSections = [];
let splitMinArea = 0;
let splitMaxArea = 0;
let activeSplit = null;
let activeSplitProgress = 0;
let drawPhase = "splits";
let isComplete = false;
let sketchFillPalette = [];
let splitPhaseComplete = false;
let splitAttemptCount = 0;
let splitComposition = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  buildMondrianComposition();
}

function draw() {
  if (isComplete) return;

  const isHumanSpeed = getMainSpeedMode() === 1;
  let remainingDistance = getDrawDistancePerFrame();
  if (isHumanSpeed) remainingDistance = min(remainingDistance, PIXEL_STEP_DISTANCE * HUMAN_PIXEL_STEPS_PER_FRAME);

  while (remainingDistance > 0) {
    if (drawPhase === "splits") {
      const splitConsumed = drawNextSplitDistance(remainingDistance, isHumanSpeed);
      if (splitConsumed > 0) {
        remainingDistance -= splitConsumed;
        if (isHumanSpeed) break;
        continue;
      }
      if (splitPhaseComplete) {
        finalizeSplitPhase();
        continue;
      }
      break;
    }

    if (drawPhase !== "fills") break;
    if (currentRectangleIndex >= mondrianRectangles.length) break;

    const section = mondrianRectangles[currentRectangleIndex];
    const consumed = drawNextStrokeDistance(section, remainingDistance, isHumanSpeed);
    if (consumed > 0) {
      remainingDistance -= consumed;
      if (isHumanSpeed) break;
    } else {
      currentRectangleIndex += 1;
    }
  }

  if (drawPhase !== "splits" && currentRectangleIndex >= mondrianRectangles.length) {
    isComplete = true;
    noLoop();
  }
}

function buildMondrianComposition() {
  background(...BG_COLOR);
  fillerLineWeight = constrain(min(width, height) * 0.0018, 0.8, 1.4);
  borderWeight = fillerLineWeight * 4;
  sketchFillPalette = buildSketchFillPalette();
  const composition = getCompositionBounds();
  const compositionArea = composition.w * composition.h;
  splitMinArea = compositionArea * AREA_MIN_RATIO;
  splitMaxArea = compositionArea * AREA_MAX_RATIO;
  splitComposition = toSplitSection(composition);
  splitSections = [toSplitSection(splitComposition)];
  activeSplit = null;
  activeSplitProgress = 0;
  splitPhaseComplete = false;
  splitAttemptCount = 0;
  drawPhase = "splits";
  mondrianRectangles = [];
  currentRectangleIndex = 0;
  isComplete = false;
  stroke(...GRID_COLOR);
  strokeWeight(max(1.2, borderWeight + random(-0.25, 0.25)));
  noFill();
  rect(composition.x, composition.y, composition.w, composition.h);
  loop();
}

function getCompositionBounds() {
  const margin = getCompositionMargin();
  return {
    x: margin,
    y: margin,
    w: max(10, width - margin * 2),
    h: max(10, height - margin * 2),
  };
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

    for (let attempt = 0; attempt < SPLIT_CUT_ATTEMPTS; attempt += 1) {
      const cutX = random(minWidth, maxWidth);
      const left = { x: section.x, y: section.y, w: cutX, h: section.h };
      const right = { x: section.x + cutX, y: section.y, w: section.w - cutX, h: section.h };
      if (isSectionShapeValid(left) && isSectionShapeValid(right)) {
        return {
          first: left,
          second: right,
          splitLine: createSegment(section.x + cutX, section.y, section.x + cutX, section.y + section.h),
        };
      }
    }
    return null;
  }

  const minHeight = minArea / section.w;
  const maxHeight = section.h - minHeight;
  if (maxHeight <= minHeight) return null;

  for (let attempt = 0; attempt < SPLIT_CUT_ATTEMPTS; attempt += 1) {
    const cutY = random(minHeight, maxHeight);
    const top = { x: section.x, y: section.y, w: section.w, h: cutY };
    const bottom = { x: section.x, y: section.y + cutY, w: section.w, h: section.h - cutY };
    if (isSectionShapeValid(top) && isSectionShapeValid(bottom)) {
      return {
        first: top,
        second: bottom,
        splitLine: createSegment(section.x, section.y + cutY, section.x + section.w, section.y + cutY),
      };
    }
  }

  return null;
}

function createFallbackGrid(bounds, minArea, maxArea) {
  const area = bounds.w * bounds.h;
  const minCells = max(1, ceil(area / maxArea - 0.0001));
  const maxCells = max(minCells, floor(area / minArea + 0.0001));
  const dimensions = chooseFallbackGridDimensions(bounds, minCells, maxCells);
  const rows = dimensions.rows;
  const columns = dimensions.columns;
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

function chooseFallbackGridDimensions(bounds, minCells, maxCells) {
  const targetCells = constrain(25, minCells, maxCells);
  let best = null;

  for (let rows = 1; rows <= maxCells; rows += 1) {
    for (let columns = 1; columns <= maxCells; columns += 1) {
      const cellCount = rows * columns;
      if (cellCount < minCells || cellCount > maxCells) continue;

      const cellRatio = (bounds.w / columns) / (bounds.h / rows);
      if (cellRatio < RECT_RATIO_MIN || cellRatio > RECT_RATIO_MAX) continue;

      const score = abs(cellCount - targetCells) * 10 + abs(Math.log(cellRatio));
      if (!best || score < best.score) {
        best = { rows, columns, score };
      }
    }
  }

  if (best) return best;

  return { rows: 5, columns: 5 };
}

function createFillPlan(section) {
  const inset = borderWeight * 0.7;
  const fillStyle = pickRectangleFillStyle();
  const spacingBounds = getFillSpacingBounds();
  const lineSpacing = random(spacingBounds.min, spacingBounds.max);
  const fillAngleDegrees = random(FILL_ANGLE_MIN_DEGREES, FILL_ANGLE_MAX_DEGREES);
  const lines = fillStyle.skipFill ? [] : createSolidFillStrokes(section, lineSpacing, inset, fillAngleDegrees);

  return {
    ...section,
    fillColor: fillStyle.fillColor,
    skipFill: fillStyle.skipFill,
    fillAngleDegrees,
    lines,
    currentLineIndex: 0,
    currentLineProgress: 0,
  };
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

function getFillSpacingBounds() {
  const scale = min(width, height);
  return {
    min: max(FILL_SPACING_MIN_PX, scale * FILL_SPACING_MIN_SCALE),
    max: max(FILL_SPACING_MAX_PX, scale * FILL_SPACING_MAX_SCALE),
  };
}

function createSolidFillStrokes(section, spacing, inset, angleDegrees) {
  const x = section.x + inset;
  const y = section.y + inset;
  const w = section.w - inset * 2;
  const h = section.h - inset * 2;
  if (w <= 1 || h <= 1) return [];

  const angle = radians(angleDegrees);
  const dx = cos(angle);
  const dy = sin(angle);
  const nx = -dy;
  const ny = dx;
  const diagonal = sqrt(w * w + h * h);
  const centerX = x + w * 0.5;
  const centerY = y + h * 0.5;
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

  let offset = minOffset - random(spacing * 0.3, spacing);
  const lines = [];
  while (offset <= maxOffset + spacing) {
    offset += spacing;
    const jitter = random(-spacing * 0.14, spacing * 0.14);
    const baseX = centerX + nx * (offset + jitter);
    const baseY = centerY + ny * (offset + jitter);
    const rawX1 = baseX - dx * diagonal;
    const rawY1 = baseY - dy * diagonal;
    const rawX2 = baseX + dx * diagonal;
    const rawY2 = baseY + dy * diagonal;
    const clipped = clipSegmentToRect(rawX1, rawY1, rawX2, rawY2, x, y, w, h);
    if (clipped) {
      const startX = clipped.x1 <= clipped.x2 ? clipped.x1 : clipped.x2;
      const startY = clipped.x1 <= clipped.x2 ? clipped.y1 : clipped.y2;
      const endX = clipped.x1 <= clipped.x2 ? clipped.x2 : clipped.x1;
      const endY = clipped.x1 <= clipped.x2 ? clipped.y2 : clipped.y1;
      const segment = createSegment(startX, startY, endX, endY);
      if (segment.length > GEOMETRY_EPSILON) lines.push(segment);
    }
  }
  lines.sort((a, b) => {
    const aTop = min(a.y1, a.y2);
    const bTop = min(b.y1, b.y2);
    if (abs(aTop - bTop) > 0.5) return aTop - bTop;
    const aLeft = min(a.x1, a.x2);
    const bLeft = min(b.x1, b.x2);
    return aLeft - bLeft;
  });
  for (let i = 1; i < lines.length; i += 2) {
    lines[i] = reverseSegmentDirection(lines[i]);
  }
  return lines;
}

function reverseSegmentDirection(segment) {
  return createSegment(segment.x2, segment.y2, segment.x1, segment.y1);
}

function clipSegmentToRect(x1, y1, x2, y2, x, y, w, h) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - x, x + w - x1, y1 - y, y + h - y1];
  let t0 = 0;
  let t1 = 1;

  for (let i = 0; i < 4; i += 1) {
    if (abs(p[i]) < CLIP_EPSILON) {
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

function buildSketchFillPalette() {
  return [RED_PASTEL_SHADES, YELLOW_PASTEL_SHADES, BLUE_PASTEL_SHADES].map((family) => {
    const base = random(family);
    return [
      constrain(base[0] + random(-6, 6), 0, 255),
      constrain(base[1] + random(-6, 6), 0, 255),
      constrain(base[2] + random(-6, 6), 0, 255),
      random(200, 238),
    ];
  });
}

function pickRectangleFillStyle() {
  const roll = random();
  if (roll < WHITE_RECTANGLE_PROBABILITY) {
    return { fillColor: WHITE_FILL_COLOR.slice(), skipFill: true };
  }
  if (roll < WHITE_RECTANGLE_PROBABILITY + BLACK_FILL_PROBABILITY) {
    return { fillColor: BLACK_FILL_COLOR.slice(), skipFill: false };
  }

  const base = random(sketchFillPalette);
  if (!base) return { fillColor: BLACK_FILL_COLOR.slice(), skipFill: false };
  return { fillColor: base.slice(), skipFill: false };
}

function drawNextSplitDistance(distanceBudget, singleSegmentMode) {
  let consumed = 0;
  stroke(...GRID_COLOR);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  while (distanceBudget > 0) {
    if (!activeSplit) {
      const splitState = prepareNextSplit();
      if (splitState === "complete") {
        splitPhaseComplete = true;
        break;
      }
      if (splitState !== "ready") {
        break;
      }
    }

    const segment = activeSplit.splitLine;
    const segmentLength = segment.length;
    if (segmentLength <= GEOMETRY_EPSILON) {
      applyActiveSplit();
      if (singleSegmentMode) break;
      continue;
    }

    const remainingOnSegment = segmentLength - activeSplitProgress;
    if (remainingOnSegment <= GEOMETRY_EPSILON) {
      applyActiveSplit();
      if (singleSegmentMode) break;
      continue;
    }

    const step = min(remainingOnSegment, distanceBudget, PIXEL_STEP_DISTANCE);
    const nextProgress = activeSplitProgress + step;
    strokeWeight(max(1.2, borderWeight + random(-0.25, 0.25)));
    drawSegmentPortion(segment, activeSplitProgress, nextProgress);
    activeSplitProgress = nextProgress;
    distanceBudget -= step;
    consumed += step;

    if (activeSplitProgress >= segmentLength - GEOMETRY_EPSILON) {
      applyActiveSplit();
      if (singleSegmentMode) break;
    }
  }

  return consumed;
}

function prepareNextSplit() {
  const maxSearchSteps = getSplitSearchStepsPerFrame();
  for (let step = 0; step < maxSearchSteps; step += 1) {
    const largestIndex = findLargestOversizedIndex(splitSections, splitMaxArea);
    if (largestIndex === -1) return "complete";

    const split = splitSection(splitSections[largestIndex], splitMinArea);
    if (split) {
      activeSplit = {
        sectionIndex: largestIndex,
        first: toSplitSection(split.first),
        second: toSplitSection(split.second),
        splitLine: split.splitLine,
      };
      activeSplitProgress = 0;
      return "ready";
    }

    if (!restartSplitAttempt()) {
      splitSections = createFallbackGrid(splitComposition, splitMinArea, splitMaxArea);
      return "complete";
    }
    return "pending";
  }
  return "pending";
}

function findLargestOversizedIndex(sections, maxArea) {
  let largestIndex = -1;
  let largestArea = 0;
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const area = getArea(section);
    if (area > maxArea && area > largestArea) {
      largestArea = area;
      largestIndex = i;
    }
  }
  return largestIndex;
}

function restartSplitAttempt() {
  splitAttemptCount += 1;
  if (splitAttemptCount >= MAX_SPLIT_ATTEMPTS) return false;
  splitSections = [toSplitSection(splitComposition)];
  activeSplit = null;
  activeSplitProgress = 0;
  splitPhaseComplete = false;
  return true;
}

function getSplitSearchStepsPerFrame() {
  const speedMode = getMainSpeedMode();
  if (speedMode === 1) return 1;
  if (speedMode === 2) return 2;
  return 4;
}

function applyActiveSplit() {
  if (!activeSplit) return;
  splitSections.splice(
    activeSplit.sectionIndex,
    1,
    toSplitSection(activeSplit.first),
    toSplitSection(activeSplit.second)
  );
  activeSplit = null;
  activeSplitProgress = 0;
}

function finalizeSplitPhase() {
  const allSectionsValid = splitSections.every((section) => isSectionFinalValid(section, splitMinArea, splitMaxArea));
  if (!allSectionsValid) {
    splitSections = createFallbackGrid(splitComposition, splitMinArea, splitMaxArea);
  }
  mondrianRectangles = buildDrawableRectanglesFromSections(splitSections);
  mondrianRectangles.sort((a, b) => {
    if (abs(a.y - b.y) > 0.5) return a.y - b.y;
    return a.x - b.x;
  });
  drawPhase = "fills";
  currentRectangleIndex = 0;
}

function drawNextStrokeDistance(section, distanceBudget, singleSegmentMode) {
  if (section.currentLineIndex >= section.lines.length) return 0;

  let consumed = 0;
  strokeCap(ROUND);

  while (distanceBudget > 0 && section.currentLineIndex < section.lines.length) {
    const segment = section.lines[section.currentLineIndex];
    const segmentLength = segment.length;
    if (segmentLength <= GEOMETRY_EPSILON) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
      continue;
    }

    const remainingOnLine = segmentLength - section.currentLineProgress;
    if (remainingOnLine <= GEOMETRY_EPSILON) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
      continue;
    }

    const step = min(remainingOnLine, distanceBudget, PIXEL_STEP_DISTANCE);
    const nextProgress = section.currentLineProgress + step;
    stroke(
      constrain(section.fillColor[0] + random(-8, 8), 0, 255),
      constrain(section.fillColor[1] + random(-8, 8), 0, 255),
      constrain(section.fillColor[2] + random(-8, 8), 0, 255),
      constrain(section.fillColor[3] + random(-16, 16), 120, 255)
    );
    strokeWeight(max(1.8, fillerLineWeight * FILL_STROKE_WEIGHT_MULTIPLIER + random(-0.20, 0.35)));
    drawSegmentPortion(segment, section.currentLineProgress, nextProgress);
    section.currentLineProgress = nextProgress;
    distanceBudget -= step;
    consumed += step;

    if (section.currentLineProgress >= segmentLength - GEOMETRY_EPSILON) {
      section.currentLineIndex += 1;
      section.currentLineProgress = 0;
      if (singleSegmentMode) break;
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

function getArea(section) {
  return section.w * section.h;
}

function toSplitSection(section) {
  return {
    x: section.x,
    y: section.y,
    w: section.w,
    h: section.h,
  };
}

function buildDrawableRectanglesFromSections(sections) {
  return sections.map((section) => createFillPlan(toSplitSection(section)));
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
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.getSpeedMode === "function") {
    return window.HUAHUA_APP.getSpeedMode();
  }
  if (!window.HUAHUA_APP || !Number.isFinite(window.HUAHUA_APP.speed)) return 1;
  const speed = window.HUAHUA_APP.speed;
  if (speed === 2 || speed === 4) return speed;
  return 1;
}

function getDrawDistancePerFrame() {
  const scale = min(width, height);
  if (window.HUAHUA_APP && typeof window.HUAHUA_APP.getDrawDistancePerFrame === "function") {
    return window.HUAHUA_APP.getDrawDistancePerFrame(scale);
  }

  const speedMode = getMainSpeedMode();
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
