// marching_in_place.js
window.Exercises = window.Exercises || {};

window.Exercises.marchingInPlace = {
  id: 'marchingInPlace',
  name: 'Marching in Place',
  description: 'Lift knees alternately for balance and coordination',
  criteria: 'marchingInPlace',
  repetitions_target: 6,
  level: 2,
  requiresFullBody: true,
  introSticky: true,
  introText: 'Stand upright and lift your knees alternately. Keep good posture and controlled movements.',
  
  // Custom criteria for marching
  customCriteria: function(lm) {
    const leftHip = lm?.[23], rightHip = lm?.[24];
    const leftKnee = lm?.[25], rightKnee = lm?.[26];
    
    if (![leftHip, rightHip, leftKnee, rightKnee].every(p => p && p.visibility > 0.5)) {
      return null;
    }
    
    // Check if knee is lifted (knee above hip level)
    const leftKneeLifted = leftKnee.y < leftHip.y - 0.05;
    const rightKneeLifted = rightKnee.y < rightHip.y - 0.05;
    
    return { leftKneeLifted, rightKneeLifted };
  }
};

console.log('marching_in_place.js loaded');
