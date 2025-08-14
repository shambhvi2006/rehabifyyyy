// ==========================
// Rehabify — script.js (perf mode, ghost coach, levels, gating, 2 reps)
// ==========================

// -------- DOM
const video   = document.getElementById('video');
const canvas  = document.getElementById('overlay');
const ctx     = canvas.getContext('2d');
const startBtn= document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const scoreEl = document.getElementById('score');
const starsEl = document.getElementById('stars');
const streakEl= document.getElementById('streak');
const mascot  = document.getElementById('mascot');
const statusEl= document.getElementById('status');
const exerciseInfoEl = document.getElementById('exerciseInfo');
const repBigEl   = document.getElementById('repBig');
const coachBoxEl = document.getElementById('coachBox');
const levelTagEl = document.getElementById('levelTag');
const stickFigureCanvas = document.getElementById('stickFigureCanvas');
const stickFigureCtx = stickFigureCanvas ? stickFigureCanvas.getContext('2d') : null;

const status = msg => { if (statusEl) statusEl.textContent = msg || ''; };
const coach  = msg => { if (coachBoxEl) coachBoxEl.textContent = msg || ''; };
const setLevelTag = n => { 
  if (levelTagEl) {
    levelTagEl.textContent = `• Level ${n}`;
    // Update level styling
    levelTagEl.className = `level-tag level-${n}`;
  }
};

function bopMascot() {
  if (!mascot) return;
  mascot.style.transition = 'transform 120ms ease';
  mascot.style.transform = 'scale(1.06)';
  setTimeout(()=> mascot.style.transform = 'scale(1)', 120);
}

// --- Performance mode (reduces GPU/CPU work)
const PERF = { 
  LOW: true,
  SKIP_FRAMES: 2, // Skip every N frames for better performance
  REDUCE_QUALITY: true,
  DISABLE_SHADOWS: true
};

// Frame skipping counter
let frameSkipCounter = 0;

// -------- Exercises (from separate files). Fallbacks if none are provided.
const RAW_LIST = Object.values(window.Exercises || {});
let exercisesRaw = RAW_LIST.length ? RAW_LIST : [{
  id:'shoulderAbduction',
  name:'Shoulder Abduction',
  description:'Raise then lower both arms to pop stars 1→4→1',
  criteria:'shoulderAbduction',
  repetitions_target:2,
  showShoulderLine:true
},{
  id:'shoulderFlexionForwardRaise',
  name:'Shoulder Flexion',
  description:'Hold BOTH palms on the ring until it descends to shoulder level',
  criteria:'shoulderFlexionForwardRaise',
  repetitions_target:2,
  showShoulderLine:true
},{
  id:'forwardReach',
  name:'Front Reaches',
  description:'Reach forward to the ring and hold briefly',
  criteria:'forwardReach',
  repetitions_target:2,
  showShoulderLine:true
}];

// remove any side-reach variants that might be present
exercisesRaw = exercisesRaw.filter(e => e.criteria !== 'sideReach' && e.criteria !== 'side_reach');

// NEW upper-body exercise: Overhead Press (criteria-based)
const overheadPressExercise = {
  id: 'overheadPress',
  name: 'Overhead Press',
  description: 'Press both hands overhead, then return to shoulder level',
  criteria: 'overheadPress',
  repetitions_target: 2,
  showShoulderLine: true,
  introSticky: true,
  introText: 'Stand tall. Keep both shoulders visible. Press BOTH hands overhead, then bring them back to shoulder level.'
};

// -------- Level plan (updated with real exercises)
const PLAN = [
  // Level 1 (Upper Body)
  { ...(exercisesRaw.find(e => e.criteria === 'forwardReach') || window.Exercises?.frontReach || {}), level: 1, requiresWaist: true, repetitions_target: 2 },
  { ...overheadPressExercise, level: 1, requiresWaist: true },

  // Level transition
  { mode: 'LEVEL_BREAK', message: '🎉 Congratulations! You completed Level 1!', delay: 2000, nextLevel: 2 },

  // Level 2 (Same exercises for now)
  { ...(exercisesRaw.find(e => e.criteria === 'forwardReach') || window.Exercises?.frontReach || {}), level: 2, requiresWaist: true, repetitions_target: 3 },
  { ...overheadPressExercise, level: 2, requiresWaist: true, repetitions_target: 3 },

  // Session complete - redirect to dashboard 
  { mode: 'SESSION_COMPLETE', message: '✅ Amazing! You completed your rehabilitation session!' }
].filter(Boolean);

// -------- State
let running=false;
let score=0, streak=0;
let starCount=0, sessionStarHits=0;
let repCount=0;
let latestLm=null;

let currentExerciseIndex=0;
let currentExercise=null;

let _dummyTimer = null;

// -------- Settings
const VIS_THRESH = 0.25;
const SHOW_LANDMARKS = false;
const MISS_Y_FRAC = 0.60;
let   MISS_Y = 300;

// ---- frame pacing (optimized)
let _prevNow = performance.now();
let _lastDrawAt = 0;
const FRAME_MS = PERF.LOW ? 100 : 66; // 10fps in low mode, 15fps normal

// Stick figure animation state
let stickFigureAnimTime = 0;
let lastStickFigureUpdate = 0;

// ---- Intro overlay (sticky + gating)
let _intro = { text:'', sticky:false, visible:false, until:0, sub:'' };

function showIntro(text, { sticky=false, seconds=4 }={}){
  _intro.text = text || '';
  _intro.sub = '';
  _intro.sticky = !!sticky;
  _intro.visible = true;
  _intro.until = sticky ? 0 : (performance.now() + (seconds*1000));
}
function shouldHoldIntro(){
  if (!_intro.sticky) return false;
  if (!latestLm){ _intro.sub = 'Make sure you are visible'; return true; }

  // Exercise-provided gate
  if (typeof currentExercise?.introGate === 'function'){
    const g = currentExercise.introGate({ lm: latestLm, visOK, toPix, shouldersLevel, trunkNotRotated, elbowsStraightEnough });
    if (!g?.ok){ _intro.sub = g?.msg || 'Get into position'; return true; }
    _intro.sub = '';
    return false;
  }

  // Requirements per exercise
  if (currentExercise?.requiresFullBody){
    if (!fullBodyVisible(latestLm)){ _intro.sub = 'Show your FULL body (hips, knees, and ankles visible)'; return true; }
  } else if (currentExercise?.requiresWaist){
    if (!waistVisible(latestLm)){ _intro.sub = 'Show body till the waist'; return true; }
  }
  _intro.sub = '';
  return false;
}
function introIsActive(now){
  if (!_intro.visible) return false;
  if (!_intro.sticky){
    if (now > _intro.until){ _intro.visible=false; return false; }
    return true;
  }
  const hold = shouldHoldIntro();
  if (!hold){ _intro.visible=false; return false; }
  return true;
}
function drawIntroOverlay(now){
  if (!_intro.visible) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxW = Math.min(canvas.width*0.9, 1000);
  const base = Math.max(22, canvas.width*0.032);
  ctx.font = `600 ${base}px ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial`;

  // Wrap helper
  const lines=[]; let line='';
  for (const w of (_intro.text||'').split(' ')){
    const t = line ? (line+' '+w) : w;
    if (ctx.measureText(t).width > maxW){ lines.push(line); line=w; } else line=t;
  }
  if (line) lines.push(line);

  const lineH = Math.max(30, canvas.height*0.052);
  const startY = canvas.height*0.38 - ((lines.length-1)*lineH)/2;
  lines.forEach((ln,i)=> ctx.fillText(ln, canvas.width/2, startY + i*lineH));

  if (_intro.sub){
    ctx.font = `500 ${Math.max(18, base*0.9)}px ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial`;
    ctx.fillStyle = '#ffe07a';
    ctx.fillText(_intro.sub, canvas.width/2, startY + lines.length*lineH + lineH*0.85);
  }
  ctx.restore();
}

// -------- Audio
let audioCtx=null;
const initAudio = ()=>{ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); };
function playDing(){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.6,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
  o.start(t); o.stop(t+0.26);
}

// -------- Canvas
function setCanvasSize(){
  const targetW = PERF.LOW ? 640 : (video.videoWidth  || 640);
  const targetH = PERF.LOW ? 360 : (video.videoHeight || 480);
  canvas.width  = targetW;
  canvas.height = targetH;
  MISS_Y = canvas.height * MISS_Y_FRAC;
  if (isAbduction()) setupRainbowStars(false);
}
function drawCameraFrame(){
  if (video.readyState >= 2) {
    ctx.save(); ctx.scale(-1,1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
}

// -------- LM utils
const visOK = p => !!p && (p.visibility===undefined || p.visibility>=VIS_THRESH);
function toPix(p){ return { x:(1-p.x)*canvas.width, y:p.y*canvas.height, c:(p.visibility ?? 1) }; }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function safeAcos(x){ return Math.acos(Math.max(-1, Math.min(1, x))); }
function angleDeg(a,b,c){
  const bax=a.x-b.x, bay=a.y-b.y, bcx=c.x-b.x, bcy=c.y-b.y;
  const den = Math.hypot(bax,bay) * Math.hypot(bcx,bcy);
  if (!den || !isFinite(den)) return 180;
  const dot=bax*bcx+bay*bcy;
  return safeAcos(dot/den)*180/Math.PI;
}
function lineAngle(a,b){ return Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; }
function palmPix(lm, side){
  const w = side==='left' ? lm?.[15] : lm?.[16];
  const i = side==='left' ? lm?.[19] : lm?.[20];
  const t = side==='left' ? lm?.[21] : lm?.[22];
  if (![w,i,t].every(visOK)) return visOK(w) ? toPix(w) : null;
  const W = toPix(w), I = toPix(i), T = toPix(t);
  return { x:(W.x + I.x + T.x)/3, y:(W.y + I.y + T.y)/3 };
}

// Visibility requirements
function waistVisible(lm){ return visOK(lm?.[23]) && visOK(lm?.[24]); }
function fullBodyVisible(lm){
  return visOK(lm?.[23]) && visOK(lm?.[24]) &&  // hips
         visOK(lm?.[25]) && visOK(lm?.[26]) &&  // knees
         visOK(lm?.[27]) && visOK(lm?.[28]);    // ankles
}

// ---- Simplified correction system (coach messages only)
let _lastCorrectionAt = 0;
function showCorrection(message, urgent = false) {
  const now = performance.now();
  if (now - _lastCorrectionAt < 1000) return; // Debounce corrections
  _lastCorrectionAt = now;
  
  // Just show in coach box instead of popup
  coach(message);
}

// ---- Rep increment (debounced)
let _lastRepAt = 0;
function incrementRep() {
  const now = performance.now();
  if (now - _lastRepAt < 250) return;
  _lastRepAt = now;

  repCount++;
  const need = currentExercise?.repetitions_target || 2;
  const remaining = Math.max(0, need - repCount);
  if (repBigEl) repBigEl.textContent = String(remaining);
  updateExerciseInfo();

  // Better feedback messages based on reps left
  if (remaining === 0) {
    coach('Excellent! Exercise completed! 🎉');
    
    // Celebrate completion in live correction system
    if (window.liveCorrectionSystem) {
      window.liveCorrectionSystem.stopExercise();
    }
    
    setTimeout(()=>goToExercise(currentExerciseIndex+1), 250);
  } else if (remaining === 1) {
    coach('Great job! Just 1 more rep to go! 💪');
    
    // Celebrate rep in live correction system
    if (window.liveCorrectionSystem) {
      window.liveCorrectionSystem.celebrateRep();
    }
  } else if (remaining === 2) {
    coach('Perfect rep! 2 more to complete! 👍');
    
    // Celebrate rep in live correction system
    if (window.liveCorrectionSystem) {
      window.liveCorrectionSystem.celebrateRep();
    }
  } else {
    coach(`Well done! ${remaining} reps remaining! Keep going! ⭐`);
    
    // Celebrate rep in live correction system
    if (window.liveCorrectionSystem) {
      window.liveCorrectionSystem.celebrateRep();
    }
  }
}

// ---- Posture helpers
function drawShoulderLocator(lm){
  const LS = lm?.[11], RS = lm?.[12];
  if (!visOK(LS) || !visOK(RS)) return false;
  const sL = toPix(LS), sR = toPix(RS);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sL.x, sL.y); ctx.lineTo(sR.x, sR.y); ctx.stroke();
  for (const p of [sL, sR]){
    ctx.shadowColor = '#66e3ff';
    ctx.shadowBlur = PERF.LOW ? 0 : 10;
    ctx.fillStyle = '#66e3ff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function elbowsStraightEnough(lm){
  const Ls=lm[11], Le=lm[13], Lw=lm[15], Rs=lm[12], Re=lm[14], Rw=lm[16];
  if (![Ls,Le,Lw,Rs,Re,Rw].every(visOK)) return false;
  const leftAng  = angleDeg(toPix(Ls), toPix(Le), toPix(Lw));
  const rightAng = angleDeg(toPix(Rs), toPix(Re), toPix(Rw));
  return leftAng>150 && rightAng>150;
}
function shouldersLevel(lm, tolDeg=12){
  const LS=lm[11], RS=lm[12];
  if(!visOK(LS) || !visOK(RS)) return false;
  const a = lineAngle(toPix(LS), toPix(RS));
  return Math.abs(a) <= tolDeg;
}
function trunkNotRotated(lm, maxDeg=12){
  const Ls=lm[11], Rs=lm[12], Lh=lm[23], Rh=lm[24];
  if (![Ls,Rs,Lh,Rh].every(visOK)) return false;
  const sa = lineAngle(toPix(Ls), toPix(Rs));
  const ha = lineAngle(toPix(Lh), toPix(Rh));
  return Math.abs(sa - ha) <= maxDeg;
}

// =========================================================================================
// NORMALIZE EXERCISES
// =========================================================================================
function normalizeExercise(ex){
  const out = { ...ex };

  // upper-body default: require waist visible
  if (['shoulderAbduction','forwardReach','shoulderFlexionForwardRaise','overheadPress'].includes(ex.criteria)) {
    if (out.requiresWaist === undefined) out.requiresWaist = true;
  }

  if (ex.criteria === 'shoulderAbduction'){
    if (out.introSticky === undefined) out.introSticky = true;
    if (!out.introText) out.introText = 'Stand up. Keep both shoulders visible. Straighten BOTH elbows to begin.';
    if (!out.introGate) out.introGate = ({ lm }) =>
      elbowsStraightEnough(lm) ? { ok:true } : { ok:false, msg:'Straighten both elbows to begin' };
  }
  if (ex.criteria === 'forwardReach'){
    if (out.introSticky === undefined) out.introSticky = true;
    if (!out.introText) out.introText = 'Stand up. Show your body till the waist. Follow the prompt and hold until it bursts.';
  }
  if (ex.criteria === 'shoulderFlexionForwardRaise'){
    if (!out.introText) out.introText = 'Stand up. Keep both shoulders visible. Put BOTH palms in the ring and hold while it drops to shoulder level.';
  }
  if (ex.criteria === 'overheadPress'){
    if (out.introSticky === undefined) out.introSticky = true;
    if (!out.introText) out.introText = 'Stand tall. Press BOTH hands overhead, then bring them back to shoulder level.';
  }
  return out;
}
let exercises = PLAN.map(normalizeExercise);

// =========================================================================================
// SHOULDER ABDUCTION (Rainbow)
// =========================================================================================
const SIDE = { L:'left', R:'right' };
let rainbowStars = [];
let ascending = true;
let starRadius = 44;
let currentStepL = 0, currentStepR = 0;

function starPath(cx, cy, spikes, outerR, innerR, rotation=-Math.PI/2){
  const step = Math.PI / spikes; ctx.beginPath();
  for (let i=0;i<spikes*2;i++){
    const r = (i%2===0) ? outerR : innerR, a = i*step + rotation;
    const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  } ctx.closePath();
}
function isAbduction(ex=currentExercise){
  return ex?.criteria === 'shoulderAbduction' || ex?.mode === 'rainbow';
}
function setupRainbowStars(first=false){
  const N = 4;
  const pad = Math.max(30, canvas.width*0.04);
  const baseY   = clamp(canvas.height*0.78, pad, canvas.height-pad);
  const topY    = clamp(canvas.height*0.19, pad, canvas.height-pad);
  const midY    = (baseY + topY)/2;
  const arcRadius = clamp(canvas.width*0.28, 80, canvas.width*0.40);
  const cxL = clamp(canvas.width*0.29, pad, canvas.width-pad);
  const cxR = clamp(canvas.width*0.715, pad, canvas.width-pad);
  starRadius = clamp(canvas.width*0.023, 22, 44);

  rainbowStars = [];
  const deg = Math.PI/180, thetaStart=115*deg, thetaEnd=65*deg;
  for (let i=0;i<N;i++){
    const t = thetaStart + (thetaEnd-thetaStart)*(i/(N-1));
    rainbowStars.push({ x: clamp(cxL + arcRadius*Math.cos(t), pad, canvas.width-pad), y: clamp(midY - arcRadius*Math.sin(t), pad, canvas.height-pad), hit:false, number:i+1, side:SIDE.L, color:'#4da3ff' });
    rainbowStars.push({ x: clamp(cxR - arcRadius*Math.cos(t), pad, canvas.width-pad), y: clamp(midY - arcRadius*Math.sin(t), pad, canvas.height-pad), hit:false, number:i+1, side:SIDE.R, color:'#ff6fb0' });
  }
  ascending = true; currentStepL = 0; currentStepR = 0;
  if (first) sessionStarHits = 0;
  status("Raise both arms to burst stars 1→4!");
}
function drawRainbowStars(){
  for (let i=0;i<rainbowStars.length;i++){
    const s = rainbowStars[i];
    const isCurrent =
      (s.side===SIDE.L && i%2===0 && i/2===currentStepL && !s.hit) ||
      (s.side===SIDE.R && i%2===1 && (i-1)/2===currentStepR && !s.hit);

    ctx.save();
    ctx.globalAlpha = s.hit ? 0.18 : 1;
    ctx.shadowBlur = (PERF.LOW ? 0 : (isCurrent ? 18 : 0));
    ctx.shadowColor = isCurrent ? s.color : 'transparent';
    ctx.fillStyle = s.color;
    starPath(s.x, s.y, 5, starRadius, starRadius*0.44);
    ctx.fill();
    ctx.lineWidth = 2.1; ctx.strokeStyle = '#fff'; ctx.stroke();

    const numSize = Math.max(22, starRadius * 1.05);
    ctx.font = `700 ${numSize}px ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth = Math.max(3, numSize*0.12);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(String(s.number), s.x, s.y);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(s.number), s.x, s.y);
    ctx.restore();
  }
}
function updateRainbowBilateralHits(lm, introActive){
  if (introActive) return;
  if (!shouldersLevel(lm)) { coach("Make shoulders level"); return; }
  if (!elbowsStraightEnough(lm)) { coach("Straighten both elbows"); return; }

  const LW  = lm[15], RW = lm[16];

  const idxL = 0 + currentStepL*2, targetL = rainbowStars[idxL];
  if (targetL && visOK(LW) && dist(toPix(LW), targetL) <= starRadius + 36 && !targetL.hit){
    targetL.hit = true; sessionStarHits++; starCount++; score += 5; streak++; playDing(); bopMascot();
    currentStepL += (ascending? 1 : -1);
  }
  const idxR = 1 + currentStepR*2, targetR = rainbowStars[idxR];
  if (targetR && visOK(RW) && dist(toPix(RW), targetR) <= starRadius + 36 && !targetR.hit){
    targetR.hit = true; sessionStarHits++; starCount++; score += 5; streak++; playDing(); bopMascot();
    currentStepR += (ascending? 1 : -1);
  }

  currentStepL = Math.max(0, Math.min(4, currentStepL));
  currentStepR = Math.max(0, Math.min(4, currentStepR));

  if (ascending && currentStepL>=4 && currentStepR>=4){
    ascending=false; currentStepL=3; currentStepR=3;
    coach("Great! Lower arms to catch 4→1.");
    for (const s of rainbowStars) s.hit=false;
  }
  if (!ascending && currentStepL<1 && currentStepR<1){
    score += 20; streak++; sessionStarHits = 0;
    incrementRep();
    if (repCount < (currentExercise?.repetitions_target || 2)) {
      coach("Rep done — raise again!");
      setTimeout(()=>{ for (const s of rainbowStars) s.hit=false; ascending=true; currentStepL=0; currentStepR=0; }, 600);
    }
  }

  if (scoreEl) scoreEl.textContent=score;
  if (streakEl) streakEl.textContent=streak;
  if (starsEl) starsEl.textContent=starCount;
}

// =========================================================================================
// GENERIC TARGETS (Flexion / Front Reach)
// =========================================================================================
const NOTE_SPEED_PX_S = 110;
const POST_HIT_DESPAWN_MS = 650;
const NEXT_DELAY_MS = 220;
const HOLD_MS_DEFAULT = 600;
const CONTACT_RADIUS_BONUS = 28;
const STAR_TTL_MS = 6000;
const DESCEND_SPEED = 140;
const DESCEND_EPS   = 10;

let stars = [];
let lastHitAt = 0;
let nextAllowedSpawnAt = 0;
let combo = 0;

function spawnExplosionParticles(x,y){
  if (PERF.LOW) return []; // disable particles for perf
  const parts=[]; 
  for (let i=0;i<16;i++){
    const a=(i/16)*Math.PI*2+Math.random()*0.3, sp=2.2+Math.random()*2.2;
    parts.push({ x,y,vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:420+Math.random()*260, born:performance.now() });
  }
  return parts;
}

// Shapes (shadow blur disabled in perf)
function drawRingShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  const stroke = s.strokeColor || '#45e0f0';
  const fillDim = s.fillDimColor || 'rgba(80,220,240,0.18)';
  const fillGlow = s.fillGlowColor || 'rgba(80,220,240,0.26)';
  const glow = s.glowColor || '#67f7ff';
  ctx.globalAlpha = 1;
  if (s.inside && !PERF.LOW){ ctx.shadowColor = glow; ctx.shadowBlur = 22; }
  ctx.beginPath(); ctx.arc(x, y, r + 14, 0, Math.PI*2); ctx.fillStyle = s.inside ? fillGlow : fillDim; ctx.fill();
  ctx.lineWidth = Math.max(6, r * 0.22); ctx.strokeStyle = stroke;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  ctx.lineWidth = Math.max(3, r * 0.10); ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y, r*0.65, 0, Math.PI*2); ctx.stroke();
  ctx.shadowBlur = 0;
}
function drawDiamondShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  ctx.save();
  if (s.inside && !PERF.LOW){ ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 26; }
  ctx.beginPath();
  ctx.moveTo(x, y-r);
  ctx.lineTo(x+r, y);
  ctx.lineTo(x, y+r);
  ctx.lineTo(x-r, y);
  ctx.closePath();
  ctx.fillStyle = s.inside ? '#ffd54a' : '#ffef7a';
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffffcc'; ctx.stroke();
  ctx.restore();
}
function drawStarShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  const fill = s.fillColor || (s.inside ? '#ffd54a' : '#ffef7a');
  const glow = s.glowColor || '#ffd84a';
  ctx.save();
  if (s.inside && !PERF.LOW){ ctx.shadowColor = glow; ctx.shadowBlur = 22; }
  starPath(x, y, 5, r, r*0.48);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffffcc'; ctx.stroke();
  ctx.restore();
}
function drawTargetShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  ctx.save();
  if (s.inside && !PERF.LOW){ ctx.shadowColor='#9aff7a'; ctx.shadowBlur=22; }
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.strokeStyle='#aaff88'; ctx.lineWidth=Math.max(6,r*0.18); ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y,r*0.66,0,Math.PI*2); ctx.strokeStyle='#ffffff'; ctx.lineWidth=Math.max(3,r*0.10); ctx.stroke();
  ctx.restore();
}

function spawnSingleStar(now){
  // do not spawn for criteria-only or dummy exercises
  if (currentExercise?.criteria === 'overheadPress' || currentExercise?.dummy) return;
  if (stars.length>0 || now<nextAllowedSpawnAt) return;

  if (latestLm){
    if (currentExercise?.requiresFullBody){
      if (!fullBodyVisible(latestLm)){ coach('Show your FULL body'); return; }
    } else if (currentExercise?.requiresWaist){
      if (!waistVisible(latestLm)){ coach('Show body till the waist'); return; }
    }
    if (typeof currentExercise?.readinessCheck === 'function'){
      const r = currentExercise.readinessCheck({ lm: latestLm, visOK, toPix, shouldersLevel, trunkNotRotated });
      if (!r?.ok){ coach(r?.msg || 'Get into position'); return; }
    }
  }

  let target=null;

  if (currentExercise?.getNextTarget && latestLm){
    try {
      target = currentExercise.getNextTarget({
        lm: latestLm, canvas, toPix, visOK, shouldersLevel,
        fixedHand: currentExercise?.fixedHand
      });
    } catch { target = null; }
  }

  if (!target && latestLm){
    const w = canvas.width, h = canvas.height, padX=Math.max(40,w*0.08), padY=Math.max(40,h*0.12);
    if (currentExercise?.criteria === 'shoulderFlexionForwardRaise'){
      const LS=latestLm[11], RS=latestLm[12]; if (!visOK(LS) || !visOK(RS)) { coach("Keep both shoulders visible"); return; }
      const sL=toPix(LS), sR=toPix(RS), midX=(sL.x+sR.x)/2, baseY=Math.min(sL.y, sR.y);
      target = {
        x: clamp(midX, padX, w-padX),
        y: clamp(baseY - h*0.27, padY, h*0.5),
        label:'BOTH PALMS',
        shape:'ring',
        posture: null,
        required:'bothPalms',
        behavior:'descendToShoulder',
        strokeColor:'#ff6fb0',
        fillDimColor:'rgba(255,111,176,0.18)',
        fillGlowColor:'rgba(255,111,176,0.28)',
        glowColor:'#ff9fd0'
      };
    } else if (currentExercise?.criteria === 'forwardReach'){
      const LS=latestLm[11], RS=latestLm[12]; if (!visOK(LS) || !visOK(RS)) { coach("Keep both shoulders visible"); return; }
      const sL=toPix(LS), sR=toPix(RS), midX=(sL.x+sR.x)/2, midY=(sL.y+sR.y)/2;
      const leftTurn = (sessionStarHits % 2 === 0);
      target = {
        x: clamp(midX + (leftTurn? -1:1) * (w*0.22), padX, w-padX),
        y: clamp(midY - h*0.12, padY, h*0.65),
        label: leftTurn ? 'LEFT PALM' : 'RIGHT PALM',
        shape:'ring',
        posture: leftTurn ? 'forwardReachLeft' : 'forwardReachRight',
        required: leftTurn ? 'palmLeft' : 'palmRight',
        holdMs: 450
      };
    }
  }

  if (!target){
    const w = canvas.width, h = canvas.height;
    target = { x:w*0.5, y:h*0.25, label:'PALM', shape:'star', posture:null, required:'palm', holdMs:500 };
  }

  // Make stars smaller for increased difficulty
  let baseR = Math.max(28, Math.min(60, canvas.width*0.04)); // Reduced from 0.06 to 0.04
  if (target.shape === 'ring' || target.shape === 'target') baseR = Math.max(baseR, canvas.width*0.05); // Reduced from 0.065 to 0.05

  stars = [{
    x: target.x, y: -60, targetY: target.y, r: baseR,
    vy: NOTE_SPEED_PX_S, spawnedAt: now, hit:false, hitAt:0, holdStart:0, inside:false,
    particles:[],
    holdMs: target.holdMs ?? HOLD_MS_DEFAULT,
    required: target.required ?? 'palm',
    posture: target.posture,
    label: target.label,
    shape: target.shape || 'star',
    behavior: target.behavior || null,
    strokeColor: target.strokeColor,
    fillDimColor: target.fillDimColor,
    fillGlowColor: target.fillGlowColor,
    glowColor: target.glowColor,
    fillColor: target.fillColor
  }];
}

function postureOK(tag, lm){
  if (!tag) return true;
  if (tag === 'shouldersLevel'){
    const ok = shouldersLevel(lm, 12);
    if (!ok){ showCorrection("Keep your shoulders level and aligned", true); }
    return ok;
  }
  if (tag === 'shouldersLevel+elbowStraight'){
    const ok = shouldersLevel(lm,12) && elbowsStraightEnough(lm);
    if (!ok) showCorrection("Level your shoulders and straighten your elbows", true);
    return ok;
  }
  if (tag==='forwardReachLeft' || tag==='forwardReachRight'){
    const side = tag.endsWith('Left') ? 'left' : 'right';
    const sIdx = side==='left' ? 11 : 12, eIdx = side==='left' ? 13 : 14, wIdx = side==='left' ? 15 : 16;
    if (![lm[sIdx],lm[eIdx],lm[wIdx]].every(visOK)) { 
      showCorrection(`Position yourself so we can see your ${side} arm clearly`, true); 
      return false; 
    }
    if (!shouldersLevel(lm, 14)){ 
      showCorrection("Keep your shoulders level while reaching", true); 
      return false; 
    }
    const ang = angleDeg(toPix(lm[sIdx]), toPix(lm[eIdx]), toPix(lm[wIdx]));
    if (ang < 148){ 
      showCorrection(`Straighten your ${side} elbow completely - your arm should be fully extended!`, true);
      return false; 
    }
    coach("Perfect form! Hold the position");
    return true;
  }
  return true;
}

function postureOKWithOverrides(tag, lm, star){
  if (typeof currentExercise?.postureCheck === 'function'){
    const res = currentExercise.postureCheck({
      lm, tag, star,
      toPix, visOK, angleDeg,
      shouldersLevel, elbowsStraightEnough, trunkNotRotated
    });
    if (res === true) return true;
    if (res === false) return false;
    if (typeof res === 'string'){ coach(res); return false; }
  }
  return postureOK(tag, lm);
}
function computeInsideWithOverrides(star, LW, RW, LP, RP){
  if (typeof currentExercise?.insideCheck === 'function'){
    return !!currentExercise.insideCheck({ star, LW, RW, LP, RP, dist });
  }
  const palmBonus = (star.required && String(star.required).startsWith('palm')) || star.required === 'bothPalms' ? 10 : 0;
  const rad = (star.r || 40) + CONTACT_RADIUS_BONUS + palmBonus;

  const leftWristIn  = !!LW && dist(LW, star) <= rad;
  const rightWristIn = !!RW && dist(RW, star) <= rad;
  const leftPalmIn   = !!LP && dist(LP, star) <= rad;
  const rightPalmIn  = !!RP && dist(RP, star) <= rad;

  switch (star.required) {
    case 'bothWrists': return leftWristIn && rightWristIn;
    case 'wristLeft':  return leftWristIn;
    case 'wristRight': return rightWristIn;
    case 'bothPalms':  return leftPalmIn && rightPalmIn;
    case 'palmLeft':   return leftPalmIn;
    case 'palmRight':  return rightPalmIn;
    case 'palm':       return leftPalmIn || rightPalmIn;
    default:           return leftPalmIn || rightPalmIn || leftWristIn || rightWristIn;
  }
}

function drawStarsAndUI(now){
  for (const s of stars){
    ctx.save();
    if (!s.hit){ s._rDraw = s.r * (1 + 0.10*Math.sin((now - s.spawnedAt)/220)); }
    else {
      const k = Math.min(1, (now - s.hitAt)/350);
      s._rDraw = s.r*(1+0.9*k);
      ctx.globalAlpha = 1 - Math.min(1,(now-s.hitAt)/650);
    }

    // halo
    ctx.beginPath(); ctx.arc(s.x, s.y, (s._rDraw||s.r)+12, 0, Math.PI*2);
    ctx.fillStyle = s.inside ? 'rgba(255,255,160,0.24)' : 'rgba(255,240,120,0.12)';
    ctx.fill();

    // shape
    if (s.shape === 'ring') drawRingShape(s);
    else if (s.shape === 'diamond') drawDiamondShape(s);
    else if (s.shape === 'target') drawTargetShape(s);
    else drawStarShape(s);

    // label
    ctx.globalAlpha = 1;
    const fpx = Math.max(20, (s._rDraw||s.r) * 0.65);
    ctx.font = `700 ${fpx}px ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth = Math.max(3, fpx*0.12);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(s.label || '', s.x, s.y);
    ctx.fillStyle='#fff';
    ctx.fillText(s.label || '', s.x, s.y);

    // particles
    if (s.particles?.length){
      for (const p of s.particles){
        const age = now - p.born;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy = p.vy*0.98 + 0.06; p.dead = age > p.life;
        ctx.globalAlpha = Math.max(0, 1 - age/(p.life));
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 2*ctx.globalAlpha, 0, Math.PI*2); ctx.fillStyle='#ffd54a'; ctx.fill();
      }
      s.particles = s.particles.filter(p=>!p.dead); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // HUD ribbon
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(10,10,canvas.width-20,44);
  ctx.fillStyle='#fff'; ctx.font='16px ui-monospace,monospace';
  ctx.textAlign='left';  ctx.fillText(`Combo: ${combo}`, 20, 38);
  ctx.textAlign='right'; ctx.fillText(stars.length ? 'Move palm to the glowing target' : 'Get ready…', canvas.width-20, 38);
  ctx.restore();
}

// -------- Criteria for Overhead Press
window.CRITERIA = window.CRITERIA || {};
const _criteriaState = { overheadPress: { phaseUp:false } };

function wristsAboveHead(lm){
  const nose = lm?.[0], LW = lm?.[15], RW = lm?.[16];
  if (![nose, LW, RW].every(visOK)) return false;
  return (LW.y < (nose.y - 0.05)) && (RW.y < (nose.y - 0.05));
}
function wristsAtShoulders(lm){
  const LS = lm?.[11], RS = lm?.[12], LW = lm?.[15], RW = lm?.[16];
  if (![LS, RS, LW, RW].every(visOK)) return false;
  const top = Math.min(LS.y, RS.y) - 0.03;
  const bot = Math.max(LS.y, RS.y) + 0.06;
  return (LW.y>top && LW.y<bot) && (RW.y>top && RW.y<bot);
}

if (!window.CRITERIA.overheadPress){
  window.CRITERIA.overheadPress = function(lm){
    const st = _criteriaState.overheadPress;
    if (!st.phaseUp){
      if (wristsAboveHead(lm)){ st.phaseUp = true; status('Good! Return to shoulder level…'); }
      return null;
    } else {
      if (wristsAtShoulders(lm)){ st.phaseUp = false; return { rep_completed:true }; }
      return null;
    }
  };
}

// =========================================================================================
// GHOST COACH (stick figure demo, paced by user progress)
// =========================================================================================
function ghostProgressOverhead(lm){
  const nose = lm?.[0], LS=lm?.[11], RS=lm?.[12], LW=lm?.[15], RW=lm?.[16];
  if (![nose,LS,RS,LW,RW].every(visOK)) return 0.4;
  const sY = (LS.y+RS.y)/2;
  const topY = nose.y - 0.05;                     // overhead
  const wrY = Math.min(LW.y, RW.y);
  const p = (sY - wrY) / (sY - topY + 1e-6);      // 0 at shoulders, 1 overhead
  return clamp(p, 0, 1);
}
function ghostProgressFrontReach(lm){
  const LS=lm?.[11], RS=lm?.[12], LW=lm?.[15], RW=lm?.[16];
  if (![LS,RS,LW,RW].every(visOK)) return 0.4;
  const shoulderY=(LS.y+RS.y)/2, chestY = shoulderY + 0.07;
  const wrY = (LW.y+RW.y)/2;
  const p = (chestY - wrY) / (chestY - (shoulderY - 0.02) + 1e-6); // 0 at chest, 1 just above shoulder line
  return clamp(p, 0, 1);
}
function drawGhostCoach(lm){
  const W = Math.min(200, canvas.width*0.26), H = Math.min(170, canvas.height*0.32);
  const x0 = 12, y0 = canvas.height - H - 12;

  ctx.save();
  // panel
  ctx.fillStyle = 'rgba(17,24,38,0.7)';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x0,y0,W,H,10); else { ctx.rect(x0,y0,W,H); }
  ctx.fill(); ctx.stroke();

  const cx = x0 + W*0.32, cy = y0 + H*0.65;
  const scale = H*0.4;

  const id = currentExercise?.criteria;

  // joints (static full body stick figure - no animation for performance)
  const head = {x:cx, y:cy - scale*0.85};
  const neck = {x:cx, y:cy - scale*0.65};
  const hip  = {x:cx, y:cy - scale*0.1};
  const Ls = {x: neck.x - scale*0.20, y: neck.y};
  const Rs = {x: neck.x + scale*0.20, y: neck.y};

  // Static arms in ready position
  const armLen = scale*0.45, foreLen = scale*0.35;
  const aL = deg2rad(180-45); // Left arm at 45 degrees
  const aR = deg2rad(45);     // Right arm at 45 degrees

  const Le = {x: Ls.x + Math.cos(aL)*armLen, y: Ls.y + Math.sin(aL)*armLen};
  const Re = {x: Rs.x + Math.cos(aR)*armLen, y: Rs.y + Math.sin(aR)*armLen};
  const Lw = {x: Le.x + Math.cos(aL)*foreLen, y: Le.y + Math.sin(aL)*foreLen};
  const Rw = {x: Re.x + Math.cos(aR)*foreLen, y: Re.y + Math.sin(aR)*foreLen};

  // Static legs
  const legLen = scale*0.35, shinLen = scale*0.32;
  const LaHip = { x: hip.x - scale*0.12, y: hip.y };
  const RaHip = { x: hip.x + scale*0.12, y: hip.y };
  const LaKnee = { x: LaHip.x, y: LaHip.y + legLen };
  const RaKnee = { x: RaHip.x, y: RaHip.y + legLen };
  const LaAnkle = { x: LaKnee.x, y: LaKnee.y + shinLen };
  const RaAnkle = { x: RaKnee.x, y: RaKnee.y + shinLen };

  // draw static stick figure
  ctx.strokeStyle = '#7ee1ff'; ctx.lineWidth = 3; ctx.lineCap='round';
  // torso
  line(neck, hip);
  circle(head, 6);
  // arms
  line(Ls, Le); line(Le, Lw);
  line(Rs, Re); line(Re, Rw);
  // legs  
  line(LaHip, LaKnee); line(LaKnee, LaAnkle);
  line(RaHip, RaKnee); line(RaKnee, RaAnkle);

  ctx.fillStyle = '#c7d2e0'; ctx.font = '600 12px system-ui, sans-serif';
  const cap = id==='overheadPress' ? 'Overhead Press' : 
              (id==='forwardReach' ? 'Front Reach' : 
               (id==='miniSquats' ? 'Mini Squats' :
                (id==='marchingInPlace' ? 'Marching' :
                 (id==='heelRaises' ? 'Heel Raises' : 'AI Coach'))));
  ctx.textAlign='left'; ctx.fillText(cap, x0+10, y0+16);

  ctx.restore();
}
function line(a,b){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
function circle(c,r){ ctx.beginPath(); ctx.arc(c.x,c.y,r,0,Math.PI*2); ctx.fillStyle='#7ee1ff'; ctx.fill(); }
function deg2rad(d){ return d*Math.PI/180; }
function lerp(a,b,t){ return a + (b-a)*clamp(t,0,1); }


// =========================================================================================
// Loop
// =========================================================================================
function renderLoop(){
  const now = performance.now();
  if (now - _lastDrawAt < FRAME_MS) { requestAnimationFrame(renderLoop); return; }
  const dt = (now - _prevNow)/1000; _prevNow = now; _lastDrawAt = now;

  drawCameraFrame();

  // draw ghost first so it's always visible
  drawGhostCoach(latestLm);

  const introActive = introIsActive(now);

  if (latestLm){
    if (currentExercise?.showShoulderLine) drawShoulderLocator(latestLm);
    if (SHOW_LANDMARKS) drawLandmarks(latestLm);

    if (introActive) drawIntroOverlay(now);

    if (isAbduction()){
      updateRainbowBilateralHits(latestLm, introActive);
      drawRainbowStars();
    } else {
      updateCoachAndTargets(latestLm, dt, now, introActive);
      drawStarsAndUI(now);
      if (!introActive && currentExercise?.criteria === 'overheadPress') {
        const out = window.CRITERIA.overheadPress(latestLm);
        if (out && out.rep_completed){ score += 10; streak++; playDing(); bopMascot(); incrementRep(); }
      }
    }
  } else {
    if (introActive) drawIntroOverlay(now);
    if (!isAbduction()) drawStarsAndUI(now);
  }

  requestAnimationFrame(renderLoop);
}

// -------- Flow
function updateExerciseInfo(){
  const name = currentExercise?.name ?? '—';
  const reps = currentExercise?.repetitions_target ?? 2;
  const remaining = Math.max(0, reps - repCount);

  const req = currentExercise?.requiresFullBody
    ? ' (Show FULL body)'
    : currentExercise?.requiresWaist
      ? ' (Show till waist)'
      : '';

  // Instead of description below camera, show a header or modal slide for first impression (handled elsewhere)
  if (exerciseInfoEl) exerciseInfoEl.textContent = `${name}${req}  |  ${remaining} reps left`;
  if (repBigEl) repBigEl.textContent = String(remaining);
}
function clearDummyTimer(){ if (_dummyTimer){ clearInterval(_dummyTimer); _dummyTimer = null; } }

function resetPerExercise(){
  clearDummyTimer();
  repCount = 0; sessionStarHits = 0;
  stars = []; rainbowStars = [];
  ascending = true; currentStepL = 0; currentStepR = 0;
  nextAllowedSpawnAt = 0; lastHitAt = 0; combo = 0;

  if (isAbduction()) setupRainbowStars(true);
  updateExerciseInfo();
  coach(''); // clear
  
  // Start live correction analysis for this exercise
  if (window.liveCorrectionSystem && currentExercise) {
    window.liveCorrectionSystem.startExercise(currentExercise);
  }

  // Auto progression for dummies
  if (currentExercise?.dummy){
    if (currentExercise?.seconds){
      let left = currentExercise.repetitions_target;
      coach(`Keep moving… (${left}s)`);
      _dummyTimer = setInterval(()=>{
        left--; setRepUI(currentExercise.repetitions_target - left);
        coach(`Keep moving… (${left}s)`);
        if (left<=0){ clearDummyTimer(); goToExercise(currentExerciseIndex+1); }
      }, 1000);
    } else {
      _dummyTimer = setInterval(()=>{
        setRepUI(repCount+1);
        if (repCount >= (currentExercise.repetitions_target||2)){ clearDummyTimer(); goToExercise(currentExerciseIndex+1); }
      }, 900);
    }
  }
}
function setRepUI(n){ 
  repCount = n; 
  const remaining = Math.max(0, (currentExercise?.repetitions_target || 2) - repCount);
  if (repBigEl) repBigEl.textContent = String(remaining); 
  updateExerciseInfo(); 
}

let _switching = false;
function goToExercise(index){
  if (_switching) return;
  _switching = true;

  currentExerciseIndex = Math.max(0, Math.min(exercises.length-1, index));
  currentExercise = exercises[currentExerciseIndex];

  // Special modes
  if (currentExercise?.mode === 'LEVEL_BREAK'){
    if (currentExercise?.nextLevel) setLevelTag(currentExercise.nextLevel);
    status(currentExercise.message || 'Level Complete!');
    
    // Redirect to level-up page
    setTimeout(() => {
      window.location.href = `/levelup.html?level=${currentExercise.nextLevel}`;
    }, currentExercise.delay || 2000);
    return;
  }
  
  if (currentExercise?.mode === 'SESSION_COMPLETE'){
    status(currentExercise.message || 'Session Complete!');
    coachBoxEl.textContent = 'Redirecting to feedback...';
    coachBoxEl.style.display = 'block';
    
    // Store session stats for feedback
    localStorage.setItem('sessionStats', JSON.stringify({
      score,
      streak,
      starCount,
      exercisesCompleted: currentExerciseIndex,
      completedAt: new Date().toISOString()
    }));
    
    // Redirect to feedback page
    setTimeout(() => {
      window.location.href = '/feedback.html';
    }, 2000);
    return;
  }
  
  if (currentExercise?.mode === 'DAY_DONE'){
    status(currentExercise.message || 'Done for today!');
    coachBoxEl.textContent = currentExercise.message || 'Done for today!';
    coachBoxEl.style.display = 'block';
    if (nextBtn) nextBtn.disabled = true;
    _switching=false;
    return;
  }

  // Level chip and reset stats when changing levels
  if (typeof currentExercise?.level === 'number') {
    const newLevel = currentExercise.level;
    const currentLevel = parseInt(levelTagEl?.textContent?.match(/Level (\d+)/)?.[1] || '1');
    
    setLevelTag(newLevel);
    
    // Reset stars and streak when starting a new level
    if (newLevel !== currentLevel) {
      starCount = 0;
      streak = 0;
      if (starsEl) starsEl.textContent = '0';
      if (streakEl) streakEl.textContent = '0';
    }
  }

  // Immediate description
  const name = currentExercise?.name ?? '—';
  const desc = currentExercise?.description ?? '';
  coachBoxEl.textContent = `Next: ${name} — ${desc}`;
  coachBoxEl.style.display = 'block';
  setTimeout(() => { coachBoxEl.style.display='none'; }, 900);

  status(`Exercise: ${name}`);
  resetPerExercise();

  // Show exercise explanation first
  if (window.ExerciseExplanations && shouldShowExplanation(currentExercise)) {
    showExerciseExplanation(currentExercise);
  } else {
    const sticky = !!currentExercise?.introSticky;
    const text = currentExercise?.introText || `${name}: ${desc}`;
    showIntro(text, { sticky, seconds:4.0 });
  }

  if (nextBtn) nextBtn.disabled = (currentExerciseIndex >= exercises.length - 1);
  setTimeout(()=>{ _switching = false; }, 80);
}

// -------- Camera + Pose
async function openCameraWithFallbacks(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia not supported');
  if (location.protocol !== 'https:' && !/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)){
    status('⚠️ Use HTTPS or localhost for camera access.');
  }
  const tries = [
    { video: { facingMode:{ideal:'user'}, width:{ideal:1280}, height:{ideal:720} }, audio:false },
    { video: { facingMode:'user' }, audio:false },
    { video: true, audio:false },
  ];
  let lastErr;
  for (const c of tries){
    try { return await navigator.mediaDevices.getUserMedia(c); } catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('Unable to open camera');
}

let pose = null;
async function start(){
  if (running) return; running=true;
  try{
    console.log('🎥 Starting camera initialization...');
    initAudio();
    status('requesting camera…');

    // Check if required APIs are available
    if (!navigator.mediaDevices) {
      throw new Error('navigator.mediaDevices not available');
    }
    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    
    console.log('📡 MediaDevices API available');
    
    video.setAttribute('playsinline','');
    video.setAttribute('autoplay','');
    video.muted = true;

    console.log('🔍 Requesting camera access...');
    const stream = await openCameraWithFallbacks();
    console.log('✅ Camera stream obtained:', stream);
    
    video.srcObject = stream;

    await new Promise(res=>{
      if (video.readyState >= 1) return res();
      video.addEventListener('loadedmetadata', res, {once:true});
    });

    await video.play().catch((e) => {
      console.error('❌ Video play failed:', e);
    });
    console.log('▶️ Video playing');
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Start plan from appropriate exercise based on URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const targetLevel = parseInt(urlParams.get('level')) || 1;
    const shouldContinue = urlParams.get('continue') === 'true';
    
    let startIndex = 0;
    if (shouldContinue && targetLevel > 1) {
      // Find the first exercise of the target level
      for (let i = 0; i < exercises.length; i++) {
        if (exercises[i].level === targetLevel && exercises[i].mode !== 'LEVEL_BREAK') {
          startIndex = i;
          break;
        }
      }
    }
    
    goToExercise(startIndex);

    renderLoop();
    status('camera ready');
    console.log('🎬 Camera ready and rendering');

    const PoseCtor =
      (window.Pose && window.Pose.Pose) ? window.Pose.Pose :
      (window.Pose) ? window.Pose :
      (window.pose && window.pose.Pose) ? window.pose.Pose :
      null;

    console.log('🤖 Checking MediaPipe Pose availability...');
    console.log('window.Pose:', window.Pose);
    console.log('PoseCtor:', PoseCtor);
    
    if (!PoseCtor){ 
      status('ERROR: Pose constructor not found'); 
      console.error('❌ MediaPipe Pose not loaded. Check network connection.');
      return; 
    }

    pose = new PoseCtor({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({
      modelComplexity: PERF.LOW ? 0 : 1,   // lighter model for perf
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    pose.onResults(({ poseLandmarks })=> { 
      latestLm = poseLandmarks || null; 
      console.log('🎯 Pose landmarks detected:', !!latestLm, 'Running:', !!running);
      if (latestLm && latestLm.length > 0) {
        console.log('👤 Pose has', latestLm.length, 'landmarks');
      }
    });

    if (typeof Camera === 'function'){
      const cam = new Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: canvas.width, height: canvas.height });
      cam.start(); status('running…');
    } else {
      (async function loop(){ await pose.send({ image: video }); requestAnimationFrame(loop); })();
      status('running…');
    }
  }catch(e){
    console.error('❌ Camera initialization failed:', e);
    console.error('Error details:', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack
    });
    
    let errorMsg = 'Camera Error: ';
    if (e.name === 'NotAllowedError') {
      errorMsg += 'Camera permission denied. Please allow camera access.';
    } else if (e.name === 'NotFoundError') {
      errorMsg += 'No camera found. Please connect a camera.';
    } else if (e.name === 'NotReadableError') {
      errorMsg += 'Camera is being used by another application.';
    } else if (e.name === 'OverconstrainedError') {
      errorMsg += 'Camera constraints not supported.';
    } else {
      errorMsg += e?.message || e;
    }
    
    status(errorMsg);
    running=false;
  }
}

if (nextBtn)  nextBtn.addEventListener('click', ()=> goToExercise(currentExerciseIndex+1));

// Prevent page scrolling during exercise session
function preventPageScroll() {
  // Prevent default scroll behavior
  document.body.style.overflow = 'hidden';
  
  // Prevent touch scrolling on mobile
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // Prevent keyboard scrolling
  document.addEventListener('keydown', function(e) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
      e.preventDefault();
    }
  });
}

// Enable scroll prevention when starting
if (startBtn) startBtn.addEventListener('click', () => {
  console.log('🚀 Start button clicked');
  preventPageScroll();
  start();
});

// Debug global state every few seconds
setInterval(() => {
  console.log('🔍 State check:', {
    running: !!running,
    latestLm: !!latestLm,
    poseInitialized: !!pose,
    videoReady: video?.readyState >= 2,
    canvasSize: `${canvas?.width}x${canvas?.height}`,
    currentExercise: currentExercise?.name || 'none'
  });
}, 5000);

// init
updateExerciseInfo();
status('Ready. Click Start when you are set.');

// -------- Missing update function
function updateCoachAndTargets(lm, dt, now, introActive) {
  if (introActive) return;
  
  // Spawn stars for target-based exercises
  spawnSingleStar(now);
  
  // Update existing stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    
    // Move star down until it reaches target Y
    if (star.y < star.targetY) {
      star.y += star.vy * dt;
      if (star.y >= star.targetY) star.y = star.targetY;
    }
    
    // Check if user is inside the star
    const LW = visOK(lm[15]) ? toPix(lm[15]) : null;
    const RW = visOK(lm[16]) ? toPix(lm[16]) : null;
    const LP = palmPix(lm, 'left');
    const RP = palmPix(lm, 'right');
    
    const wasInside = star.inside;
    star.inside = computeInsideWithOverrides(star, LW, RW, LP, RP);
    
    // Check posture if inside
    if (star.inside && !postureOKWithOverrides(star.posture, lm, star)) {
      star.inside = false;
    }
    
    // Handle hold timing
    if (star.inside && !wasInside) {
      star.holdStart = now;
    }
    
    if (star.inside && !star.hit && (now - star.holdStart) >= star.holdMs) {
      // Star completed!
      star.hit = true;
      star.hitAt = now;
      star.particles = spawnExplosionParticles(star.x, star.y);
      
      score += 15;
      streak++;
      combo++;
      sessionStarHits++;
      
      playDing();
      bopMascot();
      incrementRep();
      
      nextAllowedSpawnAt = now + NEXT_DELAY_MS;
    }
    
    // Remove expired stars
    if (star.hit && (now - star.hitAt) > POST_HIT_DESPAWN_MS) {
      stars.splice(i, 1);
    } else if (!star.hit && (now - star.spawnedAt) > STAR_TTL_MS) {
      stars.splice(i, 1);
      combo = 0; // Reset combo on miss
    }
  }
  
  // Update UI
  if (scoreEl) scoreEl.textContent = score;
  if (streakEl) streakEl.textContent = streak;
  if (starsEl) starsEl.textContent = starCount;
}

// no-op if not defined elsewhere
function drawLandmarks(){ /* optional debug */ }

// Exercise explanation system
function shouldShowExplanation(exercise) {
  // Show explanation for exercises that have explanations defined
  return window.ExerciseExplanations && 
         window.ExerciseExplanations[exercise.criteria] && 
         !localStorage.getItem(`explanation_seen_${exercise.criteria}`);
}

function showExerciseExplanation(exercise) {
  if (!window.ExerciseExplanations || !window.ExerciseExplanations[exercise.criteria]) {
    // Fallback to normal intro if no explanation available
    const sticky = !!exercise?.introSticky;
    const text = exercise?.introText || `${exercise.name}: ${exercise.description}`;
    showIntro(text, { sticky, seconds: 4.0 });
    return;
  }
  
  const explanation = window.ExerciseExplanations[exercise.criteria];
  
  // Create simplified explanation overlay
  const overlay = document.createElement('div');
  overlay.className = 'exercise-explanation-overlay';
  overlay.innerHTML = `
    <div class="explanation-card">
      <div class="explanation-header">
        <h1 class="explanation-title">${explanation.title}</h1>
        <p class="explanation-description">${explanation.description}</p>
        <div class="requirements-badge">Level ${exercise.level || 1}</div>
      </div>
      
      <div class="explanation-section">
        <h4>How to Perform</h4>
        <ul class="explanation-list">
          ${explanation.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
        </ul>
      </div>
      
      <div class="explanation-actions">
        <button class="skip-explanation-btn" onclick="skipExplanation()">Skip</button>
        <button class="start-exercise-btn" onclick="continueFromExplanation()">Start Exercise</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add show animation
  setTimeout(() => overlay.classList.add('show'), 10);
  
  // Store reference for cleanup
  window.currentExplanationOverlay = overlay;
}

function continueFromExplanation() {
  if (window.currentExplanationOverlay) {
    // Mark explanation as seen
    localStorage.setItem(`explanation_seen_${currentExercise.criteria}`, 'true');
    
    // Remove overlay
    document.body.removeChild(window.currentExplanationOverlay);
    window.currentExplanationOverlay = null;
    
    // Show normal intro
    const sticky = !!currentExercise?.introSticky;
    const text = currentExercise?.introText || `${currentExercise.name}: ${currentExercise.description}`;
    showIntro(text, { sticky, seconds: 4.0 });
  }
}

function skipExplanation() {
  if (window.currentExplanationOverlay) {
    // Mark explanation as seen so it doesn't show again
    localStorage.setItem(`explanation_seen_${currentExercise.criteria}`, 'true');
    
    // Remove overlay
    document.body.removeChild(window.currentExplanationOverlay);
    window.currentExplanationOverlay = null;
    
    // Show normal intro
    const sticky = !!currentExercise?.introSticky;
    const text = currentExercise?.introText || `${currentExercise.name}: ${currentExercise.description}`;
    showIntro(text, { sticky, seconds: 4.0 });
  }
}

// Make functions globally available
window.continueFromExplanation = continueFromExplanation;
window.skipExplanation = skipExplanation;
