// exercises/shoulderFlexion.js
(function () {
  window.Exercises = window.Exercises || {};
  const ex = {
    id: 'shoulderFlexionForwardRaise',
    name: 'Shoulder Flexion',
    description: 'Hold wrists on the ring until it descends to shoulder height.',
    // Engine already recognizes this criteria in spawnSingleStar()
    criteria: 'shoulderFlexionForwardRaise',
    repetitions_target: 6,
    showShoulderLine: true,
    repBy: 'stars',

    postureCheck: ({ lm, shouldersLevel, elbowsStraightEnough }) => {
      if (!shouldersLevel(lm, 12)) return 'Keep shoulders level';
      if (!elbowsStraightEnough(lm)) return 'Straighten elbows';
      return true;
    },

    // If you ever want both wrists to be required inside the ring, uncomment:
    // insideCheck: ({ star, LW, RW, dist }) => {
    //   const rad = (star.r || 40) + 28;
    //   return !!LW && !!RW && dist(LW, star) <= rad && dist(RW, star) <= rad;
    // },

    onEnter() { /* reset if needed */ },
    onExit()  { /* cleanup if needed */ }
  };
  window.Exercises[ex.id] = ex;
})();
