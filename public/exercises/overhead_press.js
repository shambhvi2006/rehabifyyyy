// -----------------------------------------
// Overhead Press (upper body, criteria-based)
// -----------------------------------------
(function () {
  window.Exercises = window.Exercises || {};

  // Register exercise metadata so your UI can show name/desc/reps
  window.Exercises.overheadPress = {
    id: 'overheadPress',
    name: 'Overhead Press',
    description: 'Press both hands overhead, then return to shoulder level.',
    criteria: 'overheadPress',     // script.js will look up CRITERIA.overheadPress
    repetitions_target: 6,
    showShoulderLine: true,
    introSticky: true,
    introText:
      'Stand tall. Keep both shoulders visible. Press BOTH hands overhead, then bring them back to shoulder level.'
  };

  // ---- Optional: supply criteria here too (script.js also defines one;
  // this version will be used only if your main file doesn’t create it).
  window.CRITERIA = window.CRITERIA || {};

  if (!window.CRITERIA.overheadPress) {
    const state = { phaseUp: false };

    const visOK = (p) => !!p && (p.visibility === undefined || p.visibility >= 0.25);

    function wristsAboveHead(lm) {
      const nose = lm?.[0], LW = lm?.[15], RW = lm?.[16];
      if (![nose, LW, RW].every(visOK)) return false;
      // hands clearly above head (a bit above the nose landmark)
      return LW.y < (nose.y - 0.05) && RW.y < (nose.y - 0.05);
    }
    function wristsAtShoulders(lm) {
      const LS = lm?.[11], RS = lm?.[12], LW = lm?.[15], RW = lm?.[16];
      if (![LS, RS, LW, RW].every(visOK)) return false;
      const top = Math.min(LS.y, RS.y) - 0.03;
      const bot = Math.max(LS.y, RS.y) + 0.06;
      return (LW.y > top && LW.y < bot) && (RW.y > top && RW.y < bot);
    }

    window.CRITERIA.overheadPress = function (lm) {
      if (!state.phaseUp) {
        if (wristsAboveHead(lm)) {
          state.phaseUp = true;
          // status text handled by your main script
        }
        return null;
      } else {
        if (wristsAtShoulders(lm)) {
          state.phaseUp = false;
          return { rep_completed: true };
        }
        return null;
      }
    };
  }
})();
