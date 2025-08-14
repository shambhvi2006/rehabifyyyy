// exercises/shoulderAbduction.js
(function () {
  window.Exercises = window.Exercises || {};
  const ex = {
    id: 'shoulderAbduction',
    name: 'Shoulder Abduction',
    description: 'Raise then lower both arms to pop stars 1→4→1',
    criteria: 'shoulderAbduction',
    repetitions_target: 6,
    showShoulderLine: true,
    introSticky: true,
    introText: 'Stand up. Keep both shoulders visible. Straighten BOTH elbows to begin.',
    introGate: ({ lm }) => {
      const ok = typeof elbowsStraightEnough === 'function' ? elbowsStraightEnough(lm) : true;
      return ok ? {ok:true} : {ok:false, msg:'Straighten both elbows to begin'};
    },
    onEnter(){}, onExit(){}
  };
  window.Exercises[ex.id] = ex;
})();
