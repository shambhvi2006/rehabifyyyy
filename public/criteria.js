/***********************
 * Pose utils & helpers
 ***********************/
const MP = {
  leftShoulder: 11,
  leftElbow: 13,
  leftWrist: 15,
  rightShoulder: 12,
  rightElbow: 14,
  rightWrist: 16,
  leftHip: 23,
  leftKnee: 25,
  leftAnkle: 27,
  rightHip: 24,
  rightKnee: 26,
  rightAnkle: 28,
  leftHeel: 29,
  leftFootIndex: 31,
  rightHeel: 30,
  rightFootIndex: 32
};

const THRESH = {
  ANGLE: 15,
  DIST: 0.05,
  Y: 0.05
};

function P(lm, idx) {
  return { x: lm[idx].x, y: lm[idx].y };
}

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  const cosine = dot / (magAB * magCB);
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

const Y_UP = false;

function above(a, b) {
  return Y_UP ? a.y < b.y : a.y > b.y;
}

function yDelta(a, b) {
  return Math.abs(a.y - b.y);
}

function ema(prev, cur, alpha = 0.3) {
  return alpha * cur + (1 - alpha) * prev;
}

/********************************************
 * Rep detector creator
 ********************************************/
function createRepDetector({ name, upCond, downCond }) {
  let state = "down";
  let reps = 0;

  return function (landmarks) {
    const isUp = upCond(landmarks);
    const isDown = downCond(landmarks);

    if (state === "down" && isUp) {
      state = "up";
    } else if (state === "up" && isDown) {
      state = "down";
      reps++;
    }

    return { reps, state };
  };
}

/********************************************
 * All exercise criteria detectors
 ********************************************/
const shoulderAbduction = createRepDetector({
  name: "shoulderAbduction",
  upCond: (lm) =>
    above(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) &&
    above(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
  downCond: (lm) =>
    !above(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) &&
    !above(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
});

const weightShifting = createRepDetector({
  name: "weightShifting",
  upCond: (lm) => dist2D(P(lm, MP.leftHip), P(lm, MP.leftAnkle)) >
                  dist2D(P(lm, MP.rightHip), P(lm, MP.rightAnkle)),
  downCond: (lm) => dist2D(P(lm, MP.leftHip), P(lm, MP.leftAnkle)) <
                    dist2D(P(lm, MP.rightHip), P(lm, MP.rightAnkle)),
});

const shoulderFlexionForwardRaise = createRepDetector({
  name: "shoulderFlexionForwardRaise",
  upCond: (lm) =>
    above(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) &&
    above(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
  downCond: (lm) =>
    !above(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) &&
    !above(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
});

const elbowFlexionExtension = createRepDetector({
  name: "elbowFlexionExtension",
  upCond: (lm) =>
    angleDeg(P(lm, MP.leftShoulder), P(lm, MP.leftElbow), P(lm, MP.leftWrist)) <
    60 &&
    angleDeg(P(lm, MP.rightShoulder), P(lm, MP.rightElbow), P(lm, MP.rightWrist)) <
    60,
  downCond: (lm) =>
    angleDeg(P(lm, MP.leftShoulder), P(lm, MP.leftElbow), P(lm, MP.leftWrist)) >
    150 &&
    angleDeg(P(lm, MP.rightShoulder), P(lm, MP.rightElbow), P(lm, MP.rightWrist)) >
    150,
});

const scapularRetraction = createRepDetector({
  name: "scapularRetraction",
  upCond: (lm) =>
    dist2D(P(lm, MP.leftShoulder), P(lm, MP.rightShoulder)) >
    dist2D(P(lm, MP.leftShoulder), P(lm, MP.rightShoulder)) + THRESH.DIST,
  downCond: (lm) =>
    dist2D(P(lm, MP.leftShoulder), P(lm, MP.rightShoulder)) <
    dist2D(P(lm, MP.leftShoulder), P(lm, MP.rightShoulder)) + THRESH.DIST / 2,
});

const forwardReach = createRepDetector({
  name: "forwardReach",
  upCond: (lm) => dist2D(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) >
                  dist2D(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
  downCond: (lm) => dist2D(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) <
                    dist2D(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)),
});

const lateralReach = createRepDetector({
  name: "lateralReach",
  upCond: (lm) =>
    dist2D(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) > 0.5 ||
    dist2D(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)) > 0.5,
  downCond: (lm) =>
    dist2D(P(lm, MP.leftWrist), P(lm, MP.leftShoulder)) < 0.3 &&
    dist2D(P(lm, MP.rightWrist), P(lm, MP.rightShoulder)) < 0.3,
});

const marchingInPlace = createRepDetector({
  name: "marchingInPlace",
  upCond: (lm) =>
    above(P(lm, MP.leftKnee), P(lm, MP.leftHip)) ||
    above(P(lm, MP.rightKnee), P(lm, MP.rightHip)),
  downCond: (lm) =>
    !above(P(lm, MP.leftKnee), P(lm, MP.leftHip)) &&
    !above(P(lm, MP.rightKnee), P(lm, MP.rightHip)),
});

const miniSquats = createRepDetector({
  name: "miniSquats",
  upCond: (lm) =>
    angleDeg(P(lm, MP.leftHip), P(lm, MP.leftKnee), P(lm, MP.leftAnkle)) < 160 &&
    angleDeg(P(lm, MP.rightHip), P(lm, MP.rightKnee), P(lm, MP.rightAnkle)) < 160,
  downCond: (lm) =>
    angleDeg(P(lm, MP.leftHip), P(lm, MP.leftKnee), P(lm, MP.leftAnkle)) > 170 &&
    angleDeg(P(lm, MP.rightHip), P(lm, MP.rightKnee), P(lm, MP.rightAnkle)) > 170,
});

const heelRaises = createRepDetector({
  name: "heelRaises",
  upCond: (lm) => above(P(lm, MP.leftHeel), P(lm, MP.leftToe)) ||
                  above(P(lm, MP.rightHeel), P(lm, MP.rightToe)),
  downCond: (lm) => !above(P(lm, MP.leftHeel), P(lm, MP.leftToe)) &&
                    !above(P(lm, MP.rightHeel), P(lm, MP.rightToe)),
});

const weightTransferReach = createRepDetector({
  name: "weightTransferReach",
  upCond: (lm) =>
    (dist2D(P(lm, MP.leftHip), P(lm, MP.leftAnkle)) >
     dist2D(P(lm, MP.rightHip), P(lm, MP.rightAnkle))) ||
    (dist2D(P(lm, MP.rightHip), P(lm, MP.rightAnkle)) >
     dist2D(P(lm, MP.leftHip), P(lm, MP.leftAnkle))),
  downCond: () => false,
});

const sideSteps = createRepDetector({
  name: "sideSteps",
  upCond: (lm) =>
    dist2D(P(lm, MP.leftAnkle), P(lm, MP.rightAnkle)) > 0.5,
  downCond: (lm) =>
    dist2D(P(lm, MP.leftAnkle), P(lm, MP.rightAnkle)) < 0.3,
});

const trunkRotation = createRepDetector({
  name: "trunkRotation",
  upCond: (lm) =>
    angleDeg(P(lm, MP.leftShoulder), P(lm, MP.leftHip), P(lm, MP.rightHip)) >
    30,
  downCond: (lm) =>
    angleDeg(P(lm, MP.leftShoulder), P(lm, MP.leftHip), P(lm, MP.rightHip)) <
    10,
});

const ankleDorsiflexionTaps = createRepDetector({
  name: "ankleDorsiflexionTaps",
  upCond: (lm) =>
    above(P(lm, MP.leftToe), P(lm, MP.leftHeel)) ||
    above(P(lm, MP.rightToe), P(lm, MP.rightHeel)),
  downCond: (lm) =>
    !above(P(lm, MP.leftToe), P(lm, MP.leftHeel)) &&
    !above(P(lm, MP.rightToe), P(lm, MP.rightHeel)),
});

/*****************************************
 * Map: criteria name -> evaluator fn
 *****************************************/
const CRITERIA = {
  shoulderAbduction,
  weightShifting,
  shoulderFlexionForwardRaise,
  elbowFlexionExtension,
  scapularRetraction,
  forwardReach,
  lateralReach,
  marchingInPlace,
  miniSquats,
  heelRaises,
  weightTransferReach,
  sideSteps,
  trunkRotation,
  ankleDorsiflexionTaps,
};

// Expose globally for non-module usage
window.CRITERIA = CRITERIA;
console.log('criteria.js loaded successfully');
