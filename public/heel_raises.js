// heel_raises.js
window.Exercises = window.Exercises || {};

window.Exercises.heelRaises = {
  id: 'heelRaises',
  name: 'Heel Raises',
  description: 'Rise up on toes to strengthen calves and improve balance',
  criteria: 'heelRaises',
  repetitions_target: 4,
  level: 2,
  requiresFullBody: true,
  introSticky: true,
  introText: 'Stand straight and rise up onto your toes. Hold briefly and lower with control.',
  
  // Custom criteria for heel raises
  customCriteria: function(lm) {
    const leftAnkle = lm?.[27], rightAnkle = lm?.[28];
    const leftHeel = lm?.[29], rightHeel = lm?.[30];
    const leftToe = lm?.[31], rightToe = lm?.[32];
    
    if (![leftAnkle, rightAnkle, leftHeel, rightHeel, leftToe, rightToe].every(p => p && p.visibility > 0.3)) {
      return null;
    }
    
    // Check if heels are raised (toe higher than heel)
    const leftHeelRaised = leftToe.y < leftHeel.y - 0.02;
    const rightHeelRaised = rightToe.y < rightHeel.y - 0.02;
    
    const bothHeelsRaised = leftHeelRaised && rightHeelRaised;
    
    return { leftHeelRaised, rightHeelRaised, bothHeelsRaised };
  }
};

console.log('heel_raises.js loaded');
