const exercises = [
  {
    id: "shoulder_abduction",
    name: "Shoulder Abduction Rainbow",
    description: "Raise both arms out to the side and touch the stars with your wrists!",
    criteria: "shoulderAbduction",
    repetitions_target: 6,
    mediapipe_landmarks: [11, 13, 15, 12, 14, 16]
  },
  {
    id: "weight_shifting",
    name: "Weight Shifting",
    description: "Shift your weight slowly from left to right foot while standing.",
    criteria: "weightShifting",
    repetitions_target: 10,
    mediapipe_landmarks: [23, 24, 27, 28]
  },

  // …rest of your exercises unchanged…
  { id:"shoulder_flexion_forward_raise", name:"Shoulder Flexion – Forward Raise", criteria:"shoulderFlexionForwardRaise", repetitions_target:8, mediapipe_landmarks:[11,13,15,12,14,16], description:"Raise both arms forward and up toward overhead, then lower with control." },
  { id:"elbow_flexion_extension", name:"Elbow Bends", criteria:"elbowFlexionExtension", repetitions_target:10, mediapipe_landmarks:[11,13,15,12,14,16], description:"Bend your elbows to bring wrists toward shoulders, then fully straighten." },
  { id:"scapular_retraction", name:"Shoulder Blade Squeeze", criteria:"scapularRetraction", repetitions_target:8, mediapipe_landmarks:[11,12], description:"Gently squeeze shoulder blades together (chest open), then relax." },
  { id:"forward_reach", name:"Forward Reach Touch", criteria:"forwardReach", repetitions_target:8, mediapipe_landmarks:[11,12,13,14,15,16], description:"Reach forward with one hand to touch the floating star, keep trunk steady." },
  { id:"lateral_reach", name:"Side Reach Touch", criteria:"lateralReach", repetitions_target:8, mediapipe_landmarks:[11,12,13,14,15,16], description:"Reach sideways with one hand while keeping shoulders level." },
  { id:"marching_in_place", name:"Marching in Place", criteria:"marchingInPlace", repetitions_target:12, mediapipe_landmarks:[23,24,25,26], description:"Lift one knee at a time toward hip height, alternating." },
  { id:"mini_squats", name:"Mini Squats", criteria:"miniSquats", repetitions_target:10, mediapipe_landmarks:[23,24,25,26,27,28], description:"Bend both knees a little as if to sit, then stand tall again." },
  { id:"heel_raises", name:"Heel Raises (Calf Strength)", criteria:"heelRaises", repetitions_target:12, mediapipe_landmarks:[27,28,29,30,31,32], description:"Rise up onto your toes, then lower your heels slowly." },
  { id:"weight_transfer_reach", name:"Weight Transfer + Opposite Reach", criteria:"weightTransferReach", repetitions_target:10, mediapipe_landmarks:[11,12,15,16,23,24,27,28], description:"Shift weight to one leg while reaching with the opposite hand." },
  { id:"side_steps", name:"Side Steps", criteria:"sideSteps", repetitions_target:12, mediapipe_landmarks:[23,24,25,26,27,28], description:"Step to the side and back to center, alternating directions." },
  { id:"trunk_rotation", name:"Trunk Rotation (Seated/Standing)", criteria:"trunkRotation", repetitions_target:10, mediapipe_landmarks:[11,12,23,24], description:"Rotate your shoulders gently left and right while hips stay forward." },
  { id:"ankle_dorsiflexion_taps", name:"Toe Taps (Ankle Dorsiflexion)", criteria:"ankleDorsiflexionTaps", repetitions_target:12, mediapipe_landmarks:[27,28,31,32], description:"Lift your toes up and tap, keeping heels down." }
];

// expose global
window.exercises = exercises;
console.log('exercises.js loaded', exercises.length);
