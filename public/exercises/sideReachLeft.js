// exercises/sideReachLeft.js
(function () {
  window.Exercises = window.Exercises || {};
  const ex = {
    id: 'sideReachLeft',
    name: 'Side Reach — Left',
    description: 'Reach to your LEFT side with your LEFT palm and hold briefly.',
    criteria: 'sideReach',
    repetitions_target: 8,
    showShoulderLine: true,
    repBy: 'stars',
    fixedHand: 'left',
    requiresWaist: true,
    introSticky: true,
    introText: 'Stand up. Show your body till the waist. Reach to the LEFT with your LEFT PALM and hold.',

    getNextTarget({ lm, canvas, toPix, visOK }) {
      const LS = lm[11], RS = lm[12];
      if (!visOK(LS) || !visOK(RS)) return null;
      const sL = toPix(LS), sR = toPix(RS);
      const midX = (sL.x + sR.x) / 2, midY = (sL.y + sR.y) / 2;

      const w = canvas.width, h = canvas.height;
      const padX=Math.max(40,w*0.08), padY=Math.max(40,h*0.12);

      const x = Math.max(padX, Math.min(w - padX, midX - (w * 0.22)));
      const y = Math.max(padY, Math.min(h - padY, midY - h * 0.12));

      return {
        x, y,
        shape: 'diamond',
        label: 'LEFT PALM',
        posture: 'forwardReachLeft',
        required: 'palmLeft',
        holdMs: 500
      };
    },

    postureCheck: ({ lm, toPix, visOK, angleDeg, shouldersLevel, trunkNotRotated }) => {
      if (!shouldersLevel(lm, 12))  return 'Keep shoulders level';
      if (!trunkNotRotated(lm, 14)) return 'Face forward (no twisting)';
      const S=11, E=13, W=15;
      if (![lm[S], lm[E], lm[W]].every(visOK)) return 'Show your left arm';
      const ang = angleDeg(toPix(lm[S]), toPix(lm[E]), toPix(lm[W]));
      if (ang < 150) return 'Straighten your left arm';
      return true;
    }
  };
  window.Exercises[ex.id] = ex;
})();
