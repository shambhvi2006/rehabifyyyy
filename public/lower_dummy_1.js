// mini_squats.js
window.Exercises = window.Exercises || {};

window.Exercises.miniSquats = {
  id: 'miniSquats',
  name: 'Mini Squats',
  description: 'Small squatting movements for leg strength',
  criteria: 'miniSquats',
  repetitions_target: 3,
  level: 2,
  requiresFullBody: true,
  introSticky: true,
  introText: 'Level 2: Lower Body Exercises! Stand with feet shoulder-width apart and perform mini squats.',
  
  // Custom criteria for mini squats
  customCriteria: function(lm) {
    const leftHip = lm?.[23], rightHip = lm?.[24];
    const leftKnee = lm?.[25], rightKnee = lm?.[26];
    const leftAnkle = lm?.[27], rightAnkle = lm?.[28];
    
    if (![leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].every(p => p && p.visibility > 0.5)) {
      return null;
    }
    
    // Calculate knee angles
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Squat detected when both knees are bent (angles < 160 degrees)
    const isSquatting = leftKneeAngle < 160 && rightKneeAngle < 160;
    
    return { isSquatting, leftKneeAngle, rightKneeAngle };
  },
  
  calculateAngle: function(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }
};

console.log('mini_squats.js loaded');
