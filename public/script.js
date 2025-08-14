// ==========================
// Rehabify — script.js (sticky intros + gating + pro fonts)
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

const status = msg => { if (statusEl) statusEl.textContent = msg || ''; };
const coach  = msg => { if (coachBoxEl) coachBoxEl.textContent = msg || ''; };

function bopMascot() {
  if (!mascot) return;
  mascot.style.transition = 'transform 120ms ease';
  mascot.style.transform = 'scale(1.06)';
  setTimeout(()=> mascot.style.transform = 'scale(1)', 120);
}

// -------- Exercises (from separate files). If none, use safe defaults.
const RAW_LIST = Object.values(window.Exercises || {});
let exercises = RAW_LIST.length ? RAW_LIST : [{
  id:'shoulderAbduction',
  name:'Shoulder Abduction',
  description:'Raise then lower both arms to pop stars 1→4→1',
  criteria:'shoulderAbduction',
  repetitions_target:6,
  showShoulderLine:true
},{
  id:'shoulderFlexionForwardRaise',
  name:'Shoulder Flexion',
  description:'Hold BOTH palms on the ring until it descends to shoulder level',
  criteria:'shoulderFlexionForwardRaise',
  repetitions_target:6,
  showShoulderLine:true
},{
  id:'forwardReach',
  name:'Forward Reach',
  description:'Reach forward to the ring and hold briefly',
  criteria:'forwardReach',
  repetitions_target:8,
  showShoulderLine:true
}];

// -------- State
let running=false;
let score=0, streak=0;
let starCount=0, sessionStarHits=0;
let repCount=0;
let latestLm=null;

let currentExerciseIndex=0;
let currentExercise=null;

// -------- Settings
const VIS_THRESH = 0.25;
const SHOW_LANDMARKS = false;
const MISS_Y_FRAC = 0.60;
let   MISS_Y = 300;

// ---- frame pacing
let _prevNow = performance.now();

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

  // Defaults: waist required for forward/side reach
  if (currentExercise?.requiresWaist){
    if (!(visOK(latestLm[23]) && visOK(latestLm[24]))){
      _intro.sub = 'Show body till the waist';
      return true;
    }
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
  canvas.width  = video.videoWidth  || canvas.clientWidth  || 640;
  canvas.height = video.videoHeight || canvas.clientHeight || 480;
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

// ---- Rep increment (debounced)
let _lastRepAt = 0;
function incrementRep() {
  const now = performance.now();
  if (now - _lastRepAt < 250) return;
  _lastRepAt = now;

  repCount++;
  if (repBigEl) repBigEl.textContent = String(repCount);
  updateExerciseInfo();

  const need = currentExercise?.repetitions_target || 8;
  if (repCount >= need) setTimeout(()=>goToExercise(currentExerciseIndex+1), 250);
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
    ctx.shadowBlur = 10;
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
// NORMALIZE EXERCISES (defaults ensure intros & gates work even if files omit them)
// =========================================================================================
function normalizeExercise(ex){
  const out = { ...ex };
  if (ex.criteria === 'shoulderAbduction'){
    if (out.introSticky === undefined) out.introSticky = true;
    if (!out.introText) out.introText = 'Stand up. Keep both shoulders visible. Straighten BOTH elbows to begin.';
    if (!out.introGate) out.introGate = ({ lm }) =>
      elbowsStraightEnough(lm) ? { ok:true } : { ok:false, msg:'Straighten both elbows to begin' };
  }
  if (ex.criteria === 'forwardReach' || ex.criteria === 'sideReach'){
    if (out.requiresWaist === undefined) out.requiresWaist = true;
    if (out.introSticky === undefined) out.introSticky = true;
    if (!out.introText) out.introText = 'Stand up. Show your body till the waist. Follow the prompt and hold until it bursts.';
  }
  if (ex.criteria === 'shoulderFlexionForwardRaise'){
    if (!out.introText) out.introText = 'Stand up. Keep both shoulders visible. Put BOTH palms in the ring and hold while it drops to shoulder level.';
    // no elbow check
  }
  return out;
}
exercises = exercises.map(normalizeExercise);

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
    ctx.shadowBlur = isCurrent ? 18 : 0;
    ctx.shadowColor = isCurrent ? s.color : 'transparent';
    ctx.fillStyle = s.color;
    starPath(s.x, s.y, 5, starRadius, starRadius*0.44);
    ctx.fill();
    ctx.lineWidth = 2.1; ctx.strokeStyle = '#fff'; ctx.stroke();

    // ★ PRO font for numbers (outlined)
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
  // block progress if intro is active
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
    if (repCount < (currentExercise?.repetitions_target || 8)) {
      coach("Rep done — raise again!");
      setTimeout(()=>{ for (const s of rainbowStars) s.hit=false; ascending=true; currentStepL=0; currentStepR=0; }, 600);
    }
  }

  if (scoreEl) scoreEl.textContent=score;
  if (streakEl) streakEl.textContent=streak;
  if (starsEl) starsEl.textContent=starCount;
}

// =========================================================================================
// GENERIC TARGETS (Flexion / Forward Reach / Side Reach)
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
  const parts=[]; for (let i=0;i<16;i++){ const a=(i/16)*Math.PI*2+Math.random()*0.3, sp=2.2+Math.random()*2.2;
    parts.push({ x,y,vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:420+Math.random()*260, born:performance.now() }); }
  return parts;
}

// Shapes (ring/star/diamond/target) — colorable + glow
function drawRingShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  const stroke = s.strokeColor || '#45e0f0';
  const fillDim = s.fillDimColor || 'rgba(80,220,240,0.18)';
  const fillGlow = s.fillGlowColor || 'rgba(80,220,240,0.26)';
  const glow = s.glowColor || '#67f7ff';
  ctx.globalAlpha = 1;
  if (s.inside){ ctx.shadowColor = glow; ctx.shadowBlur = 22; }
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
  if (s.inside){ ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 26; }
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
  if (s.inside){ ctx.shadowColor = glow; ctx.shadowBlur = 22; }
  starPath(x, y, 5, r, r*0.48);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffffcc'; ctx.stroke();
  ctx.restore();
}
function drawTargetShape(s){
  const {x,y} = s; const r = s._rDraw ?? s.r;
  ctx.save();
  if (s.inside){ ctx.shadowColor='#9aff7a'; ctx.shadowBlur=22; }
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.strokeStyle='#aaff88'; ctx.lineWidth=Math.max(6,r*0.18); ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y,r*0.66,0,Math.PI*2); ctx.strokeStyle='#ffffff'; ctx.lineWidth=Math.max(3,r*0.10); ctx.stroke();
  ctx.restore();
}

function spawnSingleStar(now){
  if (stars.length>0 || now<nextAllowedSpawnAt) return;

  // readiness (also enforced by sticky intro)
  if (latestLm){
    if (currentExercise?.requiresWaist){
      if (!(visOK(latestLm[23]) && visOK(latestLm[24]))){ coach('Show body till the waist'); return; }
    }
    if (typeof currentExercise?.readinessCheck === 'function'){
      const r = currentExercise.readinessCheck({ lm: latestLm, visOK, toPix, shouldersLevel, trunkNotRotated });
      if (!r?.ok){ coach(r?.msg || 'Get into position'); return; }
    }
  }

  let target=null;

  // Prefer per-exercise spawner
  if (currentExercise?.getNextTarget && latestLm){
    try {
      target = currentExercise.getNextTarget({
        lm: latestLm, canvas, toPix, visOK, shouldersLevel,
        fixedHand: currentExercise?.fixedHand
      });
    } catch { target = null; }
  }

  // Built-ins (includes pink flexion + both palms)
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
      const fixed = currentExercise?.fixedHand === 'left' ? 'left' :
                    currentExercise?.fixedHand === 'right' ? 'right' : null;
      const leftTurn = fixed ? (fixed === 'left') : (sessionStarHits % 2 === 0);

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

  // Final fallback
  if (!target){
    const w = canvas.width, h = canvas.height;
    target = { x:w*0.5, y:h*0.25, label:'PALM', shape:'star', posture:null, required:'palm', holdMs:500 };
  }

  // star
  let baseR = Math.max(38, Math.min(80, canvas.width*0.06));
  if (target.shape === 'ring' || target.shape === 'target') baseR = Math.max(baseR, canvas.width*0.065);

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
    if (!ok){ coach("Keep shoulders level"); }
    return ok;
  }
  if (tag === 'shouldersLevel+elbowStraight'){
    const ok = shouldersLevel(lm,12) && elbowsStraightEnough(lm);
    if (!ok) coach("Level shoulders + straighter elbows");
    return ok;
  }
  if (tag==='forwardReachLeft' || tag==='forwardReachRight'){
    const side = tag.endsWith('Left') ? 'left' : 'right';
    const sIdx = side==='left' ? 11 : 12, eIdx = side==='left' ? 13 : 14, wIdx = side==='left' ? 15 : 16;
    if (![lm[sIdx],lm[eIdx],lm[wIdx]].every(visOK)) { coach(`We can’t see your ${side} arm`); return false; }
    if (!shouldersLevel(lm, 14)){ coach("Keep shoulders level"); return false; }
    const ang = angleDeg(toPix(lm[sIdx]), toPix(lm[eIdx]), toPix(lm[wIdx]));
    if (ang < 148){ coach("Straighten your reaching arm"); return false; }
    coach("Reach and hold");
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

    // ★ PRO label font (centered, outlined)
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

  // HUD
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(10,10,canvas.width-20,44);
  ctx.fillStyle='#fff'; ctx.font='16px ui-monospace,monospace';
  ctx.textAlign='left';  ctx.fillText(`Combo: ${combo}`, 20, 38);
  ctx.textAlign='right'; ctx.fillText(stars.length ? 'Move palm to the glowing target' : 'Get ready…', canvas.width-20, 38);
  ctx.restore();
}

function updateCoachAndTargets(lm, dt, now, introActive){
  if (introActive) return; // block gameplay while intro is active

  const LW = visOK(lm?.[15]) ? toPix(lm[15]) : null;
  const RW = visOK(lm?.[16]) ? toPix(lm[16]) : null;
  const LS = visOK(lm?.[11]) ? toPix(lm[11]) : null;
  const RS = visOK(lm?.[12]) ? toPix(lm[12]) : null;

  const LP = palmPix(lm, 'left');
  const RP = palmPix(lm, 'right');

  // spawn after gating
  spawnSingleStar(now);

  for (const s of stars){
    if (!s.hit){
      if (s.y < s.targetY) s.y += Math.min(NOTE_SPEED_PX_S * dt, s.targetY - s.y);
      else s.y += 16 * dt;

      if (s.y > MISS_Y + 30 || (now - s.spawnedAt) > STAR_TTL_MS){
        stars = []; nextAllowedSpawnAt = now + NEXT_DELAY_MS; coach("Miss — next target"); continue;
      }

      if (!postureOKWithOverrides(s.posture, lm, s)){ s.inside=false; s.holdStart=0; continue; }

      s.inside = computeInsideWithOverrides(s, LW, RW, LP, RP);

      if (s.behavior === 'descendToShoulder' && LS && RS){
        const shoulderY = Math.min(LS.y, RS.y);
        const goalY = shoulderY;
        if (s.inside){
          s.y = Math.min(goalY, s.y + DESCEND_SPEED * dt);
          if (Math.abs(s.y - goalY) < DESCEND_EPS){
            s.hit=true; s.hitAt=now; lastHitAt=now; s.particles = spawnExplosionParticles(s.x, s.y);
            score+=15; starCount++; sessionStarHits++; streak++; playDing(); bopMascot();
            currentExercise?.onStarHit?.(s);
            incrementRep();
          } else {
            coach("Hold your palms on the ring");
          }
        } else {
          s.holdStart=0; coach("Place BOTH palms on the ring");
        }
      } else {
        const needHold = s.holdMs || HOLD_MS_DEFAULT;
        if (s.inside){
          if (!s.holdStart) s.holdStart = now;
          const held = now - s.holdStart;
          if (held >= needHold && now - lastHitAt > 200){
            s.hit=true; s.hitAt=now; lastHitAt=now; s.particles = spawnExplosionParticles(s.x, s.y);
            combo++; score+=15; starCount++; sessionStarHits++; streak++; playDing(); bopMascot();
            currentExercise?.onStarHit?.(s);
            if (currentExercise?.repBy !== 'criteria'){
              incrementRep();
            } else if (currentExercise?.repBy === 'stars' && currentExercise?.starsPerRep){
              if (sessionStarHits % currentExercise.starsPerRep === 0) incrementRep();
            }
          } else {
            const sec = Math.max(0, Math.ceil((needHold - held)/100)/10).toFixed(1);
            coach(`Hold ${sec}s`);
          }
        } else { s.holdStart=0; }
      }
    } else {
      if (now - s.hitAt > POST_HIT_DESPAWN_MS){ stars=[]; nextAllowedSpawnAt = now + NEXT_DELAY_MS; }
    }
  }

  if (scoreEl) scoreEl.textContent = score;
  if (streakEl) streakEl.textContent= streak;
  if (starsEl) starsEl.textContent = starCount;
  if (!stars.length) coach('');
}

// -------- Criteria reps (optional)
function updateRepsByCriteria(lm){
  const fn = window.CRITERIA?.[currentExercise?.criteria];
  if (!fn) return false;
  const out = fn(lm);
  if (out && out.rep_completed){
    score += 10; streak++; playDing(); bopMascot();
    incrementRep();
    return true;
  }
  return false;
}

// -------- Loop
function renderLoop(){
  const now = performance.now(), dt = (now - _prevNow)/1000; _prevNow = now;
  drawCameraFrame();

  const introActive = introIsActive(now); // computes & updates sticky visibility

  if (latestLm){
    if (currentExercise?.showShoulderLine) drawShoulderLocator(latestLm);
    if (SHOW_LANDMARKS) drawLandmarks(latestLm);

    // draw intro overlay (on top of video)
    if (introActive) drawIntroOverlay(now);

    if (isAbduction()){
      updateRainbowBilateralHits(latestLm, introActive);
      drawRainbowStars();
    } else {
      updateCoachAndTargets(latestLm, dt, now, introActive);
      drawStarsAndUI(now);
      if (!introActive && currentExercise?.repBy === 'criteria') updateRepsByCriteria(latestLm);
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
  const desc = currentExercise?.description ?? '';
  const reps = currentExercise?.repetitions_target ?? 8;
  if (exerciseInfoEl) exerciseInfoEl.textContent = `${name}: ${desc}  |  Reps ${repCount}/${reps}`;
  if (repBigEl) repBigEl.textContent = String(repCount);
}
function resetPerExercise(){
  repCount = 0; sessionStarHits = 0; starCount = 0;
  if (starsEl) starsEl.textContent = '0';
  stars = []; rainbowStars = [];
  ascending = true; currentStepL = 0; currentStepR = 0;
  nextAllowedSpawnAt = 0; lastHitAt = 0; combo = 0;

  if (isAbduction()) setupRainbowStars(true);
  updateExerciseInfo();
  coach('Follow the on-screen target');
}

let _switching = false;
function goToExercise(index){
  if (_switching) return;
  _switching = true;

  currentExerciseIndex = Math.max(0, Math.min(exercises.length-1, index));
  currentExercise = exercises[currentExerciseIndex];

  status(`Exercise: ${currentExercise?.name || ''}`);
  resetPerExercise();

  // show intro (sticky if requested)
  const sticky = !!currentExercise?.introSticky;
  const text = currentExercise?.introText || `${currentExercise?.name}: ${currentExercise?.description}`;
  showIntro(text, { sticky, seconds:4.5 });

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
    initAudio();
    status('requesting camera…');

    video.setAttribute('playsinline','');
    video.setAttribute('autoplay','');
    video.muted = true;

    const stream = await openCameraWithFallbacks();
    video.srcObject = stream;

    await new Promise(res=>{
      if (video.readyState >= 1) return res();
      video.addEventListener('loadedmetadata', res, {once:true});
    });

    await video.play().catch(()=>{});
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Initial intro for first exercise (BEFORE pose loop)
    goToExercise(0);

    renderLoop();
    status('camera ready');

    const PoseCtor =
      (window.Pose && window.Pose.Pose) ? window.Pose.Pose :
      (window.Pose) ? window.Pose :
      (window.pose && window.pose.Pose) ? window.pose.Pose :
      null;

    if (!PoseCtor){ status('ERROR: Pose constructor not found'); return; }

    pose = new PoseCtor({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(({ poseLandmarks })=>{ latestLm = poseLandmarks || null; });

    if (typeof Camera === 'function'){
      const cam = new Camera(video, { onFrame: async () => { await pose.send({ image: video }); }, width: canvas.width, height: canvas.height });
      cam.start(); status('running…');
    } else {
      (async function loop(){ await pose.send({ image: video }); requestAnimationFrame(loop); })();
      status('running…');
    }
  }catch(e){
    console.error(e);
    status(`ERROR: ${e?.name||''} ${e?.message||e}`);
    running=false;
  }
}

if (startBtn) startBtn.addEventListener('click', start);
if (nextBtn)  nextBtn.addEventListener('click', ()=> goToExercise(currentExerciseIndex+1));

// init (if auto-start buttonless, call start() elsewhere)
updateExerciseInfo();
status('Ready. Click Start when you are set.');
