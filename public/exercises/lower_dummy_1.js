// -----------------------------------------
// Level 2 dummy lower-body: Sit-to-Stand (auto reps)
// -----------------------------------------
(function () {
  window.Exercises = window.Exercises || {};

  window.Exercises.sitToStandDummy = {
    id: 'sit_to_stand_dummy',
    name: 'Level 2: Lower Body — Sit-to-Stand (demo)',
    description: 'Auto-counting demo (no pose logic).',
    criteria: 'dummyReps',          // your main script treats "dummy*" specially
    repetitions_target: 6,
    dummy: true
  };
})();
