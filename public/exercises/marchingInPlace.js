;(function(){
  window.Exercises = window.Exercises || {};
  window.Exercises["marching_in_place"] = {
    id: "marching_in_place",
    name: "Marching in Place",
    description: "Lift one knee at a time toward hip height, alternating left/right.",
    repetitions_target: 12,
    criteria: "marchingInPlace",

    getNextTarget: ({ lm, canvas, toPix, visOK }) => {
      const w = canvas.width, h = canvas.height;
      const padX = Math.max(40, w*0.08), padY = Math.max(40, h*0.12);
      // pick visible knee (prefer alternating, but visibility first)
      const knees = [];
      if (visOK(lm[25])) knees.push({side:'left', p:toPix(lm[25])});
      if (visOK(lm[26])) knees.push({side:'right',p:toPix(lm[26])});
      if (!knees.length) return null;
      const k = knees[Math.floor(Math.random()*knees.length)];
      const y = Math.max(padY, Math.min(h*0.6, k.p.y - h*0.22));
      return { x: Math.max(padX, Math.min(w-padX, k.p.x)), y, label:`Lift ${k.side} knee`, kind:'knee', posture:'kneeAboveHip', side:k.side };
    }
  };
})();
