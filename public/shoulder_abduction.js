// shoulder_abduction.js
window.Exercises = window.Exercises || {};

window.Exercises.shoulderAbduction = {
  id: 'shoulderAbduction',
  name: 'Shoulder Abduction',
  description: 'Raise both arms out to the sides like a rainbow',
  criteria: 'shoulderAbduction',
  repetitions_target: 2,
  level: 1,
  showShoulderLine: true,
  requiresWaist: true,
  introSticky: true,
  introText: 'Stand up straight. Keep both shoulders visible. Raise both arms out to the sides to form a rainbow pattern.',
  
  // Custom gate function for this exercise
  introGate: ({ lm, visOK, elbowsStraightEnough }) => {
    if (!elbowsStraightEnough(lm)) {
      return { ok: false, msg: 'Straighten both elbows to begin' };
    }
    return { ok: true };
  }
};

console.log('shoulder_abduction.js loaded');
