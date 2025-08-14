// exercises/forwardReach.js
(function () {
  window.Exercises = window.Exercises || {};

  const ex = {
    id: 'forwardReach',
    name: 'Forward Reach',
    description: 'Reach forward to the ring; alternate hands; brief hold.',
    criteria: 'forwardReach',
    repetitions_target: 8,
    showShoulderLine: true,
    repBy: 'stars',
    requiresWaist: true,
    introSticky: true,
    introText: 'Stand up. Show your body till the waist. Reach forward to the RING with the prompted palm and hold briefly.'
    // (Spawner comes from engine’s built-in forwardReach; override if you want custom placements.)
  };

  window.Exercises[ex.id] = ex;
})();
