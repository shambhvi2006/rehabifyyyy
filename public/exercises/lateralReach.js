;(function(){
  window.Exercises = window.Exercises || {};
  window.Exercises["lateral_reach"] = {
    id: "lateral_reach",
    name: "Side Reach Touch",
    description: "Reach sideways with one hand while keeping shoulders level.",
    repetitions_target: 8,
    criteria: "lateralReach",
    showShoulderLine: true,

    getNextTarget: ({ canvas }) => {
      const w = canvas.width, h = canvas.height;
      const padX = Math.max(40, w*0.08), padY = Math.max(40, h*0.12);
      const left = Math.random() < 0.5;
      const y = Math.max(padY, Math.min(h*0.7, h*0.45));
      const x = left ? padX + w*0.08 : w - padX - w*0.08;
      return { x, y, label: left?'Reach left':'Reach right', kind:'wrist', posture:'shouldersLevel+elbowStraight', side: left ? 'left' : 'right' };
    }
  };
})();
