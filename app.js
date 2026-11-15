/* StayStrong50 — free strength check + plan for adults 50+.
   Plain JS, no build step. All data in localStorage (key: staystrong50.v1). */
'use strict';

const KEY = 'staystrong50.v1';
const SETS = 3;

/* ---------- Published reference ranges ----------
   Senior Fitness Test (Rikli & Jones). Middle 50% (25th–75th percentile) of
   7,183 community-dwelling US adults aged 60–94. No published SFT ranges exist under 60. */
const SFT_BANDS = [60, 65, 70, 75, 80, 85, 90];
const NORMS = {
  chair: {
    m: [[14, 19], [12, 18], [12, 17], [11, 17], [10, 15], [8, 14], [7, 12]],
    f: [[12, 17], [11, 16], [10, 15], [10, 15], [9, 14], [8, 13], [4, 11]]
  },
  curl: {
    m: [[16, 22], [15, 21], [14, 21], [13, 19], [13, 19], [11, 17], [10, 14]],
    f: [[13, 19], [12, 18], [12, 17], [11, 17], [10, 16], [10, 15], [8, 13]]
  }
};
// EWGSOP2 (European Working Group on Sarcopenia in Older People, 2019) low grip strength cut-offs, kg.
const GRIP_LOW = { m: 27, f: 16 };

function bandIndex(age) { let i = 0; SFT_BANDS.forEach((b, k) => { if (age >= b) i = k; }); return i; }
function bandLabel(age) { const i = bandIndex(age); const lo = SFT_BANDS[i]; return `${lo}–${lo + 4}`; }
function normFor(test, age, sex) {
  const i = bandIndex(age);
  if (sex === 'm' || sex === 'f') return { range: NORMS[test][sex][i], under60: age < 60 };
  return { m: NORMS[test].m[i], f: NORMS[test].f[i], under60: age < 60 };
}
function rate(score, range) { if (score < range[0]) return 'below'; if (score > range[1]) return 'above'; return 'within'; }

/* ---------- Exercise ladders ----------
   n name, r [min,max], u 'r' reps | 's' seconds, c cue, load: true = add weight at top instead of changing exercise. */
const LADDERS = {
  squat: { name: 'Legs', levels: [
    { n: 'Sit-to-stand from a raised seat', r: [8, 12], u: 'r', c: 'Add a firm cushion to a sturdy chair. Stand up without using your hands if you can.' },
    { n: 'Sit-to-stand (standard chair)', r: [8, 15], u: 'r', c: 'Feet hip-width, lean forward slightly, stand tall, sit back down slowly.' },
    { n: 'Chair tap squat', r: [8, 15], u: 'r', c: 'Lower until you lightly touch the chair, then stand straight back up.' },
    { n: 'Bodyweight squat', r: [10, 15], u: 'r', c: 'Hips back and down, knees follow toes, chest proud.' },
    { n: 'Goblet squat (light weight)', r: [8, 12], u: 'r', load: true, c: 'Hold a dumbbell, kettlebell or filled bag at your chest. Squat to a comfortable depth.' }
  ]},
  push: { name: 'Push', levels: [
    { n: 'Wall push-up', r: [8, 15], u: 'r', c: 'Hands on the wall at shoulder height, body straight, chest towards the wall.' },
    { n: 'Worktop push-up', r: [8, 15], u: 'r', c: 'Hands on a kitchen worktop, step back, lower chest to the edge.' },
    { n: 'Low incline push-up', r: [8, 12], u: 'r', c: 'Hands on a sturdy sofa arm, bench or stair. Body in one line.' },
    { n: 'Knee push-up', r: [6, 12], u: 'r', c: 'Knees on a cushion, hips in line, lower chest towards the floor.' },
    { n: 'Push-up', r: [5, 12], u: 'r', c: 'Full plank, elbows at about 45°, lower with control.' }
  ]},
  row: { name: 'Pull', levels: [
    { n: 'Towel door row', r: [10, 15], u: 'r', c: 'Towel around a solid door handle (door closed towards you). Lean back slightly and pull.' },
    { n: 'Supported one-arm row', r: [10, 15], u: 'r', load: true, c: 'One hand on a table, pull a bag or dumbbell to your hip. Squeeze your shoulder blade.' },
    { n: 'Bent-over two-arm row', r: [8, 12], u: 'r', load: true, c: 'Hinge forward with a flat back, pull two weights to your ribs.' }
  ]},
  hinge: { name: 'Hips & back', levels: [
    { n: 'Glute bridge', r: [10, 15], u: 'r', c: 'Lie on your back, feet flat, lift hips until body is straight from shoulders to knees.' },
    { n: 'Hip hinge to wall', r: [10, 15], u: 'r', c: 'Stand a foot from a wall, push hips back to touch it, keep a flat back, stand tall.' },
    { n: 'Single-leg glute bridge (each leg)', r: [8, 12], u: 'r', c: 'One foot down, other knee up. Keep hips level.' },
    { n: 'Romanian deadlift (light weight)', r: [8, 12], u: 'r', load: true, c: 'Weights in front of thighs, soft knees, push hips back, flat back, stand up tall.' }
  ]},
  carry: { name: 'Carry & grip', levels: [
    { n: 'Suitcase hold (light bags)', r: [20, 45], u: 's', load: true, c: 'Hold a bag or weight in each hand, stand tall, shoulders down. Walk slowly if steady.' },
    { n: "Farmer's walk", r: [20, 60], u: 's', load: true, c: 'Walk tall with a weight in each hand. Short steps, look ahead.' }
  ]},
  core: { name: 'Core', levels: [
    { n: 'Bent-knee dead bug (each side)', r: [6, 12], u: 'r', c: 'Lie on your back, lower back pressed down, slowly lower opposite arm and leg.' },
    { n: 'Bird dog (each side)', r: [6, 12], u: 'r', c: 'On hands and knees, reach opposite arm and leg long, pause, return.' },
    { n: 'Worktop plank', r: [15, 45], u: 's', c: 'Forearms on a worktop, step back, body straight, breathe.' },
    { n: 'Floor plank', r: [15, 45], u: 's', c: 'Forearms and toes (or knees), straight line, no sagging.' }
  ]},
  balance: { name: 'Balance', levels: [
    { n: 'Feet together (hand on worktop)', r: [20, 30], u: 's', c: 'Stand by a worktop, feet together, light fingertip support only.' },
    { n: 'Heel-to-toe stand', r: [15, 30], u: 's', c: 'One foot directly in front of the other, near a worktop. Swap front foot each set.' },
    { n: 'Single-leg stand (fingertip support)', r: [10, 30], u: 's', c: 'Lift one foot, fingertips on the worktop. Swap legs each set.' },
    { n: 'Single-leg stand', r: [10, 30], u: 's', c: 'No hands, next to a worktop for safety. Swap legs each set.' },
    { n: 'Single-leg stand, head turns', r: [10, 30], u: 's', c: 'On one leg, slowly turn your head side to side. Stay next to support.' }
  ]}
};
const ORDER = ['squat', 'push', 'row', 'hinge', 'carry', 'core', 'balance'];
const PROGRAM = { A: ['squat', 'push', 'row', 'balance'], B: ['squat', 'hinge', 'carry', 'core', 'balance'] };
const LIGHT_EVERY = 6; // every 6th session is a lighter recovery session

/* ---------- Friendly coaching lines ---------- */
const MSG = {
  hit: ['Well done — good set.', 'Nicely controlled.', 'That\'s strength being built.', 'Lovely work.', 'Steady and strong.', 'Great effort.'],
  miss: ['Good effort — every rep counts.', 'That\'s fine. Quality over quantity.', 'You showed up. That\'s what matters.'],
  exercise: ['Exercise done ✓', 'That one\'s ticked off ✓', 'Nicely done ✓'],
  session: ['Session complete. Well done!', 'That\'s your session done — be proud of that.', 'Great work today. Rest well.']
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- State ---------- */
function defaults() {
  const ex = {};
  ORDER.forEach((id) => { ex[id] = { lvl: 0, target: LADDERS[id].levels[0].r[0], fails: 0 }; });
  return { v: 1, onboarded: false, age: 55, sex: 'x', rest: 90, gap: 2, sound: true, next: 'A', ex, log: [], tests: [], current: null };
}
function clampInt(v, mn, mx, d) { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(mx, Math.max(mn, n)); }
function clampNum(v, mn, mx) { const n = parseFloat(v); return isNaN(n) ? null : Math.min(mx, Math.max(mn, n)); }
const RESULTS = ['up', 'level', 'load', 'top', 'fail', 'reset', 'down', 'skip', 'light', 'easy'];
function sanitize(d) {
  const s = defaults();
  if (!d || typeof d !== 'object') return s;
  s.onboarded = !!d.onboarded;
  s.age = clampInt(d.age, 40, 110, 55);
  s.sex = ['m', 'f', 'x'].includes(d.sex) ? d.sex : 'x';
  s.rest = clampInt(d.rest, 0, 600, 90);
  s.gap = clampInt(d.gap, 0, 4, 2);
  s.sound = d.sound !== false;
  s.next = d.next === 'B' ? 'B' : 'A';
  ORDER.forEach((id) => {
    const e = d.ex && d.ex[id]; if (!e) return;
    const L = LADDERS[id].levels; const lvl = clampInt(e.lvl, 0, L.length - 1, 0);
    s.ex[id] = { lvl, target: clampInt(e.target, L[lvl].r[0], L[lvl].r[1], L[lvl].r[0]), fails: clampInt(e.fails, 0, 2, 0) };
  });
  if (Array.isArray(d.log)) {
    s.log = d.log.filter((l) => l && Array.isArray(l.items) && !isNaN(new Date(l.date))).map((l) => ({
      date: new Date(l.date).toISOString(), wk: l.wk === 'B' ? 'B' : 'A',
      mode: ['normal', 'easy', 'light'].includes(l.mode) ? l.mode : 'normal',
      items: l.items.filter((i) => LADDERS[i.id]).map((i) => ({
        id: i.id, lvl: clampInt(i.lvl, 0, LADDERS[i.id].levels.length - 1, 0), target: clampInt(i.target, 0, 999, 0),
        sets: (Array.isArray(i.sets) ? i.sets : []).slice(0, SETS).map((x) => (x == null ? null : clampInt(x, 0, 999, 0))),
        result: RESULTS.includes(i.result) ? i.result : 'skip'
      }))
    }));
  }
  if (Array.isArray(d.tests)) {
    s.tests = d.tests.filter((t) => t && !isNaN(new Date(t.date))).map((t) => ({
      date: new Date(t.date).toISOString(), age: clampInt(t.age, 40, 110, s.age),
      chair: t.chair == null ? null : clampInt(t.chair, 0, 80, 0),
      curl: t.curl == null ? null : clampInt(t.curl, 0, 80, 0),
      balL: t.balL == null ? null : clampInt(t.balL, 0, 60, 0),
      balR: t.balR == null ? null : clampInt(t.balR, 0, 60, 0),
      push: t.push == null ? null : clampInt(t.push, 0, 200, 0),
      pushType: clampInt(t.pushType, 0, 4, 0),
      grip: t.grip == null ? null : clampNum(t.grip, 0, 120)
    }));
  }
  if (d.current && Array.isArray(d.current.items)) {
    s.current = {
      wk: d.current.wk === 'B' ? 'B' : 'A', mode: ['normal', 'easy', 'light'].includes(d.current.mode) ? d.current.mode : 'normal',
      sets: clampInt(d.current.sets, 1, SETS, SETS), started: String(d.current.started || new Date().toISOString()),
      items: d.current.items.filter((i) => LADDERS[i.id]).map((i) => ({
        id: i.id, sets: (Array.isArray(i.sets) ? i.sets : []).slice(0, SETS).map((x) => (x == null ? null : clampInt(x, 0, 999, 0)))
      }))
    };
  }
  return s;
}
function load() { try { const r = localStorage.getItem(KEY); return r ? sanitize(JSON.parse(r)) : defaults(); } catch (e) { return defaults(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save — storage is full or blocked.'); } }
let S = load();

/* ---------- Progression (pure) ----------
   mode 'light'  = recovery session, nothing changes.
   mode 'easy'   = readiness was low: success still counts, a miss is not counted against you.
   mode 'normal' = all sets hit -> +1 rep / +5s; top of range -> next exercise (or add weight on loadable levels);
                   3 misses in a row -> back to bottom of range, or down one level if already there. */
function stepOf(l) { return l.u === 's' ? 5 : 1; }
function progress(exState, id, sets, mode = 'normal') {
  const L = LADDERS[id].levels; const e = { ...exState }; const lv = L[e.lvl];
  const [mn, mx] = lv.r; const step = stepOf(lv);
  if (sets.every((x) => x == null)) return { e, result: 'skip' };
  if (mode === 'light') return { e, result: 'light' };
  const done = sets.filter((x) => x != null);
  const success = done.length > 0 && sets.every((x) => x != null && x >= e.target);
  if (success) {
    e.fails = 0;
    if (e.target >= mx) {
      if (lv.load) { e.target = mn; return { e, result: 'load' }; }
      if (e.lvl < L.length - 1) { e.lvl += 1; e.target = L[e.lvl].r[0]; return { e, result: 'level' }; }
      return { e, result: 'top' };
    }
    e.target = Math.min(mx, e.target + step);
    return { e, result: 'up' };
  }
  if (mode === 'easy') return { e, result: 'easy' };
  e.fails += 1;
  if (e.fails < 3) return { e, result: 'fail' };
  e.fails = 0;
  if (e.target > mn) { e.target = mn; return { e, result: 'reset' }; }
  if (e.lvl > 0) { e.lvl -= 1; const p = L[e.lvl]; e.target = Math.max(p.r[0], p.r[1] - 2 * stepOf(p)); return { e, result: 'down' }; }
  return { e, result: 'fail' };
}

/* Readiness: 4 answers 1–5 (5 = best). */
function readiness(a) {
  const total = a.sleep + a.energy + a.stiff + a.sore; // 4..20
  if (total >= 14) return 'green';
  if (total >= 10) return 'amber';
  return 'red';
}

/* ---------- Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const main = () => $('#main');
function esc(t) { return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function unit(u, n) { return u === 's' ? n + ' sec' : n + (n === 1 ? ' rep' : ' reps'); }
function lvlOf(id, lvl) { return LADDERS[id].levels[lvl]; }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function daysSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); }
function fraction(id, e) { const L = LADDERS[id].levels; const [mn, mx] = L[e.lvl].r; return (e.lvl + (mx > mn ? (e.target - mn) / (mx - mn) : 1)) / L.length; }
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
let ac;
function beep() {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ac.createOscillator(); const g = ac.createGain(); o.frequency.value = 660; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.25, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.2);
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.22);
    });
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
}

/* Rest timer */
let restLeft = 0, restInt = null;
function startRest() {
  if (!S.rest) return;
  restLeft = S.rest; clearInterval(restInt); $('#timer').hidden = false; drawRest();
  restInt = setInterval(() => { restLeft -= 1; if (restLeft <= 0) { stopRest(); beep(); toast('Rest over — ready when you are.'); return; } drawRest(); }, 1000);
}
function drawRest() {
  const m = Math.floor(restLeft / 60), s = String(restLeft % 60).padStart(2, '0');
  $('#timer').innerHTML = `<span>Rest ${m}:${s}</span><button type="button" id="restAdd">+30s</button><button type="button" id="restSkip">Skip</button>`;
  $('#restAdd').onclick = () => { restLeft += 30; drawRest(); };
  $('#restSkip').onclick = stopRest;
}
function stopRest() { clearInterval(restInt); restInt = null; $('#timer').hidden = true; }

/* Modal */
let lastFocus = null;
function openModal(html, onClose) {
  const m = $('#modal'); lastFocus = document.activeElement;
  m.innerHTML = `<div class="box">${html}</div>`; m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; m.onkeydown = null; if (onClose) onClose(); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  m.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
  m.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  const f = m.querySelector('button, [href], input, select'); if (f) f.focus();
  return close;
}

/* Count-up / count-down timer modal used in tests and holds */
function timerModal({ title, seconds = null, onDone, note = '' }) {
  let t = seconds == null ? 0 : seconds, run = null;
  const close = openModal(`
    <h2 id="modalTitle">${esc(title)}</h2>
    ${note ? `<p class="muted">${note}</p>` : ''}
    <div class="big" id="tm" aria-live="off">${seconds == null ? '0' : seconds}s</div>
    <div class="actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" id="tmGo" type="button">Start</button></div>`,
    () => clearInterval(run));
  $('#tmGo').onclick = () => {
    if (run) { clearInterval(run); run = null; close(); onDone(seconds == null ? t : seconds - t); return; }
    $('#tmGo').textContent = seconds == null ? 'Stop' : 'Stop early';
    run = setInterval(() => {
      t += seconds == null ? 1 : -1;
      const el = $('#tm'); if (el) el.textContent = t + 's';
      if (seconds != null && t <= 0) { clearInterval(run); run = null; beep(); close(); onDone(seconds); }
    }, 1000);
  };
}

/* ---------- Navigation ---------- */
let view = 'today';
function go(v) {
  view = v;
  document.querySelectorAll('.nav').forEach((b) => (b.dataset.view === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  render(); main().focus({ preventScroll: true }); window.scrollTo(0, 0);
}
document.querySelectorAll('.nav').forEach((b) => (b.onclick = () => go(b.dataset.view)));
function render() {
  if (!S.onboarded) return renderOnboarding();
  if (view === 'check') return renderCheck();
  if (view === 'progress') return renderProgress();
  if (view === 'swap') return renderSwap();
  if (view === 'settings') return renderSettings();
  return S.current ? renderSession() : renderToday();
}

/* ---------- Onboarding ---------- */
const HEALTH_Q = [
  'Has a doctor ever said you have a heart condition or high blood pressure?',
  'Do you get chest pain at rest, during daily activity or when exercising?',
  'Do you lose balance from dizziness, or have you fallen or lost consciousness in the last 12 months?',
  'Do you have a bone, joint or muscle problem (for example osteoporosis, arthritis or a recent injury) that could be made worse by exercise?',
  'Are you taking medication for your heart or blood pressure?',
  'Have you had surgery in the last 6 months?',
  'Is there any other reason you should not exercise without medical advice?'
];
let ob = 0;
function renderOnboarding() {
  const m = main();
  if (ob === 0) {
    m.innerHTML = `
      <section class="card intro">
        <h1>Welcome to StayStrong50</h1>
        <p>A free, steady way to check and build the strength you use every day — getting out of a chair, carrying shopping, staying steady on your feet.</p>
        <ul><li>A 10-minute strength check you can repeat every 6 weeks</li>
          <li>A simple plan: about 3 sessions a week, 30–40 minutes, mostly at home</li>
          <li>A quick "how do I feel today?" check that adjusts each session</li>
          <li>No account. Your answers stay on this device.</li></ul>
      </section>
      <form class="card" id="health">
        <h2>Health check</h2>
        <p class="muted small">Please answer honestly. Your answers are not saved or sent anywhere.</p>
        ${HEALTH_Q.map((q, i) => `<fieldset><legend>${esc(q)}</legend>
          <label class="opt"><input type="radio" name="q${i}" value="no" required> No</label>
          <label class="opt"><input type="radio" name="q${i}" value="yes"> Yes</label></fieldset>`).join('')}
        <button class="btn big" type="submit">Continue</button>
      </form>`;
    $('#health').onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (HEALTH_Q.some((_, i) => fd.get('q' + i) === 'yes')) {
        const close = openModal(`<h2 id="modalTitle">Please speak to your GP first</h2>
          <p>You answered yes to at least one question. Before starting a new exercise programme, check with your GP, practice nurse or physiotherapist. Take this app along — they can tell you which parts suit you.</p>
          <p class="small muted">StayStrong50 gives general fitness information, not medical advice.</p>
          <div class="actions"><button class="btn ghost" data-close type="button">Go back</button><button class="btn" id="ack" type="button">I've been cleared to exercise</button></div>`);
        $('#ack').onclick = () => { close(); ob = 1; renderOnboarding(); };
      } else { ob = 1; renderOnboarding(); }
    };
    return;
  }
  // ob === 1: about you
  m.innerHTML = `
    <form class="card" id="about">
      <h1>About you</h1>
      <p class="muted">Used only to compare your strength check with published age ranges. Stored on this device only.</p>
      <label for="age">Your age</label>
      <input type="number" id="age" min="40" max="110" value="${S.age}" required inputmode="numeric">
      <fieldset><legend>Which reference ranges should we show?</legend>
        <label class="opt"><input type="radio" name="sex" value="f" ${S.sex === 'f' ? 'checked' : ''} required> Women's</label>
        <label class="opt"><input type="radio" name="sex" value="m" ${S.sex === 'm' ? 'checked' : ''}> Men's</label>
        <label class="opt"><input type="radio" name="sex" value="x" ${S.sex === 'x' ? 'checked' : ''}> Show both</label>
      </fieldset>
      <button class="btn big" type="submit">Next: your strength check</button>
    </form>`;
  $('#about').onsubmit = (e) => {
    e.preventDefault();
    S.age = clampInt($('#age').value, 40, 110, 55);
    S.sex = e.target.sex.value;
    S.onboarded = true; save(); ob = 0;
    go('check');
  };
}

/* ---------- Strength check ---------- */
const PUSH_TYPES = ['Wall', 'Worktop', 'Low incline', 'Knee', 'Full'];
let draft = null;
function renderCheck() {
  if (!draft) draft = { chair: null, curl: null, balL: null, balR: null, push: null, pushType: 0, grip: null };
  const last = S.tests[S.tests.length - 1];
  main().innerHTML = `
    <h1>Strength check</h1>
    <section class="card intro">
      <p>Five quick tests of everyday strength and balance. Do them in any order, rest between each, and skip any that don't feel right. Repeat every 6 weeks to see your progress.</p>
      ${last ? `<p class="small">Last check: ${esc(fmtDate(last.date))} (${daysSince(last.date)} days ago).</p>` : ''}
      <p class="small muted">You'll need a sturdy chair without arms against a wall, and a timer (built in below). Warm up first with a few minutes of marching on the spot.</p>
    </section>

    ${testCard('chair', '1. 30-second chair stand (legs)',
      'Sit in the middle of the chair, arms crossed on your chest. Stand up fully and sit back down as many times as you can in 30 seconds. Count each full stand.',
      'Number of stands', true)}
    ${testCard('curl', '2. 30-second arm curl (arms)',
      'Sit on the chair holding a weight in your stronger hand — 2.3 kg (5 lb) for women, 3.6 kg (8 lb) for men is the standard test. Curl it up fully and lower fully as many times as you can in 30 seconds.',
      'Number of curls', true)}
    <div class="card">
      <h3>3. Single-leg balance</h3>
      <p class="cue">Stand next to a worktop for safety. Lift one foot and time how long you can hold — up to 30 seconds. Then the other leg.</p>
      <div class="row">
        <div style="flex:1;min-width:140px"><label for="t_balL">Left leg (sec)</label><input type="number" id="t_balL" min="0" max="60" inputmode="numeric" value="${draft.balL ?? ''}"></div>
        <div style="flex:1;min-width:140px"><label for="t_balR">Right leg (sec)</label><input type="number" id="t_balR" min="0" max="60" inputmode="numeric" value="${draft.balR ?? ''}"></div>
      </div>
      <div class="tools"><button type="button" data-hold="balL">⏱ Time left leg</button><button type="button" data-hold="balR">⏱ Time right leg</button></div>
    </div>
    <div class="card">
      <h3>4. Push-up test</h3>
      <p class="cue">Pick the version you can do with good form, then do as many as you can without stopping or losing form.</p>
      <label for="t_pushType">Version</label>
      <select id="t_pushType">${PUSH_TYPES.map((p, i) => `<option value="${i}" ${draft.pushType === i ? 'selected' : ''}>${p} push-up</option>`).join('')}</select>
      <label for="t_push">Number of push-ups</label>
      <input type="number" id="t_push" min="0" max="200" inputmode="numeric" value="${draft.push ?? ''}">
    </div>
    <div class="card">
      <h3>5. Grip strength (optional)</h3>
      <p class="cue">Only if you have a hand grip dynamometer (many gyms and physios do). Best of 2 tries with your stronger hand.</p>
      <label for="t_grip">Grip (kg)</label>
      <input type="number" id="t_grip" min="0" max="120" step="0.5" inputmode="decimal" value="${draft.grip ?? ''}">
    </div>
    <button class="btn big" id="saveCheck">See my results</button>`;
  main().querySelectorAll('[data-timer]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.timer;
    timerModal({ title: id === 'chair' ? 'Chair stand — 30 seconds' : 'Arm curl — 30 seconds', seconds: 30,
      note: 'Press start and go. Count your reps — we\'ll beep at 30 seconds.', onDone: () => { toast('Time! Enter your count.'); const i = $('#t_' + id); if (i) i.focus(); } });
  }));
  main().querySelectorAll('[data-hold]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.hold;
    timerModal({ title: id === 'balL' ? 'Left leg balance' : 'Right leg balance', note: 'Press start as you lift your foot, stop when it touches down (or at 30s).',
      onDone: (secs) => { draft[id] = Math.min(60, secs); const i = $('#t_' + id); if (i) i.value = draft[id]; } });
  }));
  ['chair', 'curl', 'balL', 'balR', 'push', 'grip'].forEach((k) => { const i = $('#t_' + k); if (i) i.oninput = () => { draft[k] = i.value === '' ? null : +i.value; }; });
  $('#t_pushType').onchange = (e) => { draft.pushType = +e.target.value; };
  $('#saveCheck').onclick = () => {
    const vals = ['chair', 'curl', 'balL', 'balR', 'push', 'grip'].map((k) => draft[k]);
    if (vals.every((v) => v == null)) { toast('Enter at least one result.'); return; }
    const t = sanitize({ tests: [{ ...draft, date: new Date().toISOString(), age: S.age }] }).tests[0];
    const first = S.tests.length === 0;
    S.tests.push(t);
    if (first) applyStartLevels(t);
    save(); draft = null;
    showResults(t, first);
  };
}
function testCard(id, title, how, label) {
  return `<div class="card"><h3>${esc(title)}</h3><p class="cue">${esc(how)}</p>
    <div class="tools"><button type="button" data-timer="${id}">⏱ Start 30-second timer</button></div>
    <label for="t_${id}">${esc(label)}</label>
    <input type="number" id="t_${id}" min="0" max="80" inputmode="numeric" value="${draft[id] ?? ''}"></div>`;
}
function applyStartLevels(t) {
  const set = (id, lvl) => { const L = LADDERS[id].levels; const l = Math.min(L.length - 1, lvl); S.ex[id] = { lvl: l, target: L[l].r[0], fails: 0 }; };
  // Legs from chair stands
  if (t.chair != null) set('squat', t.chair < 8 ? 0 : t.chair < 12 ? 1 : t.chair < 16 ? 2 : t.chair < 20 ? 3 : 4);
  // Push from push-up test
  if (t.push != null) {
    const base = t.pushType; // 0 wall .. 4 full
    set('push', t.push >= 15 ? Math.min(4, base + 1) : base);
  }
  // Pull and carry from arm curl
  if (t.curl != null) { set('row', t.curl < 12 ? 0 : t.curl < 18 ? 1 : 2); set('carry', t.curl < 18 ? 0 : 1); }
  // Balance from single-leg stand (worse leg)
  const bal = [t.balL, t.balR].filter((x) => x != null);
  if (bal.length) { const b = Math.min(...bal); set('balance', b < 5 ? 0 : b < 10 ? 1 : b < 20 ? 2 : b < 30 ? 3 : 4); }
  // Core and hinge start gently
  set('core', t.chair != null && t.chair >= 16 ? 1 : 0);
  set('hinge', t.chair != null && t.chair >= 16 ? 1 : 0);
}
function rangeText(test, age, sex) {
  const n = normFor(test, age, sex);
  const band = bandLabel(age);
  if (n.range) return `Typical range for ${sex === 'f' ? 'women' : 'men'} aged ${band}: ${n.range[0]}–${n.range[1]}`;
  return `Typical range aged ${band}: women ${n.f[0]}–${n.f[1]}, men ${n.m[0]}–${n.m[1]}`;
}
function ratingText(test, score, age, sex) {
  const n = normFor(test, age, sex);
  if (!n.range) return '';
  const r = rate(score, n.range);
  return r === 'below' ? 'Below the typical range — a great place to focus. This improves quickly with training.'
    : r === 'above' ? 'Above the typical range — excellent. Keep it up.' : 'Within the typical range — good. Let\'s build on it.';
}
function showResults(t, first) {
  const rows = [];
  const under60 = t.age < 60;
  if (t.chair != null) rows.push(`<tr><th scope="row">Chair stands</th><td><b>${t.chair}</b><br><span class="small">${esc(rangeText('chair', t.age, S.sex))}</span><br><span class="small">${esc(ratingText('chair', t.chair, t.age, S.sex))}</span></td></tr>`);
  if (t.curl != null) rows.push(`<tr><th scope="row">Arm curls</th><td><b>${t.curl}</b><br><span class="small">${esc(rangeText('curl', t.age, S.sex))}</span><br><span class="small">${esc(ratingText('curl', t.curl, t.age, S.sex))}</span></td></tr>`);
  if (t.balL != null || t.balR != null) {
    const worst = Math.min(...[t.balL, t.balR].filter((x) => x != null));
    rows.push(`<tr><th scope="row">Balance</th><td>Left <b>${t.balL ?? '–'}s</b> · Right <b>${t.balR ?? '–'}s</b><br><span class="small">${worst < 10 ? 'Under 10 seconds on one leg — we\'ll add extra balance practice to every session.' : 'Good base — we\'ll keep challenging it.'}</span></td></tr>`);
  }
  if (t.push != null) rows.push(`<tr><th scope="row">Push-ups</th><td><b>${t.push}</b> ${esc(PUSH_TYPES[t.pushType].toLowerCase())}<br><span class="small">Your personal baseline — beat it next time.</span></td></tr>`);
  if (t.grip != null) {
    const low = S.sex === 'm' ? t.grip < GRIP_LOW.m : S.sex === 'f' ? t.grip < GRIP_LOW.f : null;
    rows.push(`<tr><th scope="row">Grip</th><td><b>${t.grip} kg</b><br><span class="small">${low === true ? `Below the ${S.sex === 'm' ? GRIP_LOW.m : GRIP_LOW.f} kg level European guidelines use to flag low muscle strength. Worth mentioning to your GP — strength training helps.` : low === false ? 'Above the level European guidelines use to flag low muscle strength.' : `European guidelines flag grip below ${GRIP_LOW.f} kg (women) or ${GRIP_LOW.m} kg (men) as low.`}</span></td></tr>`);
  }
  openModal(`
    <h2 id="modalTitle">Your results</h2>
    <table><tbody>${rows.join('')}</tbody></table>
    ${under60 ? '<p class="small muted">Published ranges start at age 60, so we\'ve shown the 60–64 range. Aim to be at or above it.</p>' : ''}
    <p class="small muted">Ranges are the middle 50% of scores from the Senior Fitness Test (Rikli &amp; Jones). They're a comparison, not a diagnosis.</p>
    ${first ? '<p><b>We\'ve set your starting exercises from these results.</b></p>' : '<p>Saved. See how you\'ve changed on the Progress page.</p>'}
    <div class="actions"><button class="btn" data-close type="button">${first ? 'See my plan' : 'Done'}</button></div>`, () => go(first ? 'today' : 'progress'));
}

/* ---------- Today ---------- */
function sessionNumber() { return S.log.length + 1; }
function isLightNext() { return sessionNumber() % LIGHT_EVERY === 0; }
function nextReadyDate() {
  const last = S.log[S.log.length - 1]; if (!last) return null;
  const d = new Date(last.date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + S.gap + 1); return d;
}
function renderToday() {
  const ids = PROGRAM[S.next];
  const ready = nextReadyDate();
  const early = ready && Date.now() < ready.getTime();
  const lastTest = S.tests[S.tests.length - 1];
  const retest = !lastTest || daysSince(lastTest.date) >= 42;
  main().innerHTML = `
    <section class="card intro">
      <div class="row"><span class="pill teal">Session ${sessionNumber()} · Workout ${S.next}</span>${isLightNext() ? '<span class="pill">Lighter recovery session</span>' : ''}</div>
      <h1>${S.log.length ? 'Ready for your next session?' : 'Your first session'}</h1>
      ${early ? `<div class="status amber">Recommended rest until ${esc(ready.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }))}. Recovery is when you get stronger — a walk is perfect today. You can still train if you feel good.</div>` : ''}
      ${retest ? `<div class="status green">${lastTest ? 'It\'s been 6 weeks — time to redo your' : 'Start with your'} <button class="linkbtn" id="goCheck">strength check</button>.</div>` : ''}
    </section>
    ${ids.map((id) => {
      const e = S.ex[id]; const l = lvlOf(id, e.lvl);
      return `<div class="card"><div class="row"><h3>${esc(l.n)}</h3><span class="pill">${isLightNext() ? 2 : SETS} × ${unit(l.u, e.target)}</span></div>
        <div class="lvl muted small">${esc(LADDERS[id].name)} · step ${e.lvl + 1} of ${LADDERS[id].levels.length}</div></div>`;
    }).join('')}
    <button class="btn big" id="start">Start — quick "how do I feel?" check</button>
    <p style="text-align:center"><button class="linkbtn" id="swapWk">Do workout ${S.next === 'A' ? 'B' : 'A'} instead</button></p>`;
  const gc = $('#goCheck'); if (gc) gc.onclick = () => go('check');
  $('#start').onclick = readinessCheck;
  $('#swapWk').onclick = () => { S.next = S.next === 'A' ? 'B' : 'A'; save(); render(); };
}
function readinessCheck() {
  const q = [['sleep', 'How did you sleep?', 'Badly', 'Very well'], ['energy', 'Energy right now?', 'Very low', 'Great'],
    ['stiff', 'Joint stiffness?', 'Very stiff', 'None'], ['sore', 'Muscle soreness?', 'Very sore', 'None']];
  const close = openModal(`
    <h2 id="modalTitle">How do you feel today?</h2>
    ${q.map(([k, label, lo, hi]) => `<label for="r_${k}">${label}</label>
      <input type="range" id="r_${k}" min="1" max="5" value="4" aria-valuetext="4 of 5">
      <div class="scale" aria-hidden="true"><span>${lo}</span><span>${hi}</span></div>`).join('')}
    <fieldset><legend>Any sharp, new or worsening joint pain?</legend>
      <label class="opt"><input type="radio" name="pain" value="no" checked> No</label>
      <label class="opt"><input type="radio" name="pain" value="yes"> Yes</label></fieldset>
    <div class="actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" id="rGo" type="button">Continue</button></div>`);
  q.forEach(([k]) => { const r = $('#r_' + k); r.oninput = () => r.setAttribute('aria-valuetext', r.value + ' of 5'); });
  $('#rGo').onclick = () => {
    const a = {}; q.forEach(([k]) => (a[k] = +$('#r_' + k).value));
    const pain = $('#modal input[name="pain"]:checked').value === 'yes';
    close();
    if (pain) {
      const c2 = openModal(`<h2 id="modalTitle">Let's not train through pain</h2>
        <div class="status red">Sharp, new or worsening joint pain is a signal to stop. If it's severe, came on suddenly, or comes with swelling, numbness or a fall, contact your GP or NHS 111.</div>
        <p>For mild niggles, try the <b>Exercise swaps</b> page for joint-friendly options, or do a gentle walk today.</p>
        <div class="actions"><button class="btn ghost" data-close type="button">Rest today</button><button class="btn" id="toSwap" type="button">Exercise swaps</button></div>`);
      $('#toSwap').onclick = () => { c2(); go('swap'); };
      return;
    }
    const r = readiness(a);
    const light = isLightNext();
    if (r === 'green') return startSession(light ? 'light' : 'normal');
    if (r === 'amber') {
      const c3 = openModal(`<h2 id="modalTitle">Take it a bit easier today</h2>
        <div class="status amber">You're not at your best — that's normal. We'll do 2 sets of each exercise and a missed target won't count against you.</div>
        <div class="actions"><button class="btn ghost" data-close type="button">Not today</button><button class="btn" id="eGo" type="button">Start easy session</button></div>`);
      $('#eGo').onclick = () => { c3(); startSession(light ? 'light' : 'easy'); };
      return;
    }
    const c4 = openModal(`<h2 id="modalTitle">Today looks like a recovery day</h2>
      <div class="status red">Poor sleep, low energy and stiffness all add up. A 20–30 minute walk and some gentle stretching will help you more than a hard session.</div>
      <p class="small muted">If you often feel like this, mention it to your GP.</p>
      <div class="actions"><button class="btn ghost" id="eAny" type="button">Do an easy session anyway</button><button class="btn" data-close type="button">Rest today</button></div>`);
    $('#eAny').onclick = () => { c4(); startSession('easy'); };
  };
}
function startSession(mode) {
  const sets = mode === 'normal' ? SETS : 2;
  S.current = { wk: S.next, mode, sets, started: new Date().toISOString(), items: PROGRAM[S.next].map((id) => ({ id, sets: Array(sets).fill(null) })) };
  save(); window.hypeTrack && window.hypeTrack('workout_start', { workout: S.next, mode });
  toast(mode === 'normal' ? 'Let\'s go — warm up first.' : 'Easy does it — warm up first.');
  render();
}

/* ---------- Session ---------- */
function renderSession() {
  const c = S.current;
  main().innerHTML = `
    <section class="card intro"><div class="row"><span class="pill teal">Workout ${c.wk}${c.mode !== 'normal' ? ' · ' + (c.mode === 'light' ? 'Light' : 'Easy') : ''}</span>
      <button class="linkbtn" id="cancel">Cancel session</button></div>
      <h1>Tap a circle when you finish a set</h1>
      <p class="small muted">Tap again to lower the number if you did fewer. Start with 5 minutes of marching on the spot and arm circles.</p>
    </section>
    <div id="items"></div>
    <button class="btn big" id="finish">Finish session</button>`;
  drawItems();
  $('#finish').onclick = finishSession;
  $('#cancel').onclick = () => {
    const close = openModal(`<h2 id="modalTitle">Cancel this session?</h2><p>Nothing from this session will be saved.</p>
      <div class="actions"><button class="btn ghost" data-close type="button">Keep going</button><button class="btn danger" id="yc" type="button">Cancel session</button></div>`);
    $('#yc').onclick = () => { S.current = null; save(); stopRest(); close(); render(); };
  };
}
function drawItems() {
  const c = S.current;
  $('#items').innerHTML = c.items.map((it, idx) => {
    const e = S.ex[it.id]; const l = lvlOf(it.id, e.lvl); const done = it.sets.every((x) => x != null);
    return `<div class="card ex ${done ? 'done' : ''}">
      <div class="row"><h3>${esc(l.n)}</h3><span class="pill">${it.sets.length} × ${unit(l.u, e.target)}</span></div>
      <p class="cue">${esc(l.c)}</p>
      <div class="sets" role="group" aria-label="${esc(l.n)} sets">
        ${it.sets.map((x, si) => {
          const cls = x == null ? '' : x >= e.target ? 'hit' : 'miss';
          const lab = x == null ? `Set ${si + 1}, not done. Tap to log ${unit(l.u, e.target)}` : `Set ${si + 1}: ${unit(l.u, x)}. Tap to lower`;
          return `<button type="button" class="set ${cls}" data-i="${idx}" data-s="${si}" aria-label="${esc(lab)}">${x == null ? '–' : x}<small>${x == null ? 'set ' + (si + 1) : l.u === 's' ? 'sec' : 'reps'}</small></button>`;
        }).join('')}
      </div>
      <div class="tools">${l.u === 's' ? `<button type="button" data-hold="${idx}">⏱ Time this hold</button>` : ''}<button type="button" data-reset="${idx}">Clear</button></div>
    </div>`;
  }).join('');
  $('#items').querySelectorAll('.set').forEach((b) => (b.onclick = () => tapSet(+b.dataset.i, +b.dataset.s)));
  $('#items').querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => { const it = S.current.items[+b.dataset.reset]; it.sets = it.sets.map(() => null); save(); drawItems(); }));
  $('#items').querySelectorAll('[data-hold]').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.hold; const it = S.current.items[i]; const si = it.sets.findIndex((x) => x == null);
    if (si < 0) { toast('All sets logged.'); return; }
    stopRest();
    timerModal({ title: `Hold — set ${si + 1}`, note: `Target ${S.ex[it.id].target} seconds. Stop any time.`, onDone: (secs) => {
      it.sets[si] = secs; save(); drawItems(); toast(secs >= S.ex[it.id].target ? pick(MSG.hit) : pick(MSG.miss));
      if (it.sets.some((x) => x == null)) startRest();
    } });
  }));
}
function tapSet(i, si) {
  const it = S.current.items[i]; const e = S.ex[it.id]; const l = lvlOf(it.id, e.lvl); const step = stepOf(l);
  const prev = it.sets[si];
  const next = prev == null ? e.target : prev <= 0 ? null : Math.max(0, prev - step);
  it.sets[si] = next; save(); drawItems();
  const btn = $(`#items .set[data-i="${i}"][data-s="${si}"]`); if (btn) btn.focus();
  if (prev == null) {
    const all = it.sets.every((x) => x != null);
    toast(all ? pick(MSG.exercise) : pick(MSG.hit));
    if (!all || i < S.current.items.length - 1) startRest();
  } else if (next != null && prev >= e.target && next < e.target) toast(pick(MSG.miss));
}
function finishSession() {
  const c = S.current;
  if (!c.items.some((it) => it.sets.some((x) => x != null))) { toast('Log at least one set first.'); return; }
  stopRest();
  const entry = { date: new Date().toISOString(), wk: c.wk, mode: c.mode, items: [] };
  const lines = [];
  c.items.forEach((it) => {
    const before = S.ex[it.id];
    const { e, result } = progress(before, it.id, it.sets, c.mode);
    entry.items.push({ id: it.id, lvl: before.lvl, target: before.target, sets: it.sets.slice(), result });
    S.ex[it.id] = e;
    const lb = lvlOf(it.id, before.lvl), la = lvlOf(it.id, e.lvl);
    if (result === 'level') lines.push(`<li><b>New exercise unlocked:</b> ${esc(la.n)} (was ${esc(lb.n)})</li>`);
    else if (result === 'load') lines.push(`<li><b>${esc(la.n)}:</b> next time add a little weight (about 1 kg) and go back to ${unit(la.u, e.target)}.</li>`);
    else if (result === 'up') lines.push(`<li>${esc(la.n)}: next time ${unit(la.u, e.target)}.</li>`);
    else if (result === 'top') lines.push(`<li>${esc(la.n)}: you've reached the top step. Keep it up.</li>`);
    else if (result === 'fail' || result === 'easy') lines.push(`<li>${esc(la.n)}: same target next time.</li>`);
    else if (result === 'reset') lines.push(`<li>${esc(la.n)}: target eased back to ${unit(la.u, e.target)} to rebuild.</li>`);
    else if (result === 'down') lines.push(`<li>Back to ${esc(la.n)} for a while to build up again.</li>`);
  });
  S.log.push(entry);
  S.next = c.wk === 'A' ? 'B' : 'A';
  S.current = null; save();
  window.hypeTrack && window.hypeTrack('workout_complete', { workout: c.wk, mode: c.mode, sessions: S.log.length });
  const ready = nextReadyDate();
  openModal(`<h2 id="modalTitle">${esc(pick(MSG.session))}</h2>
    ${c.mode === 'light' ? '<p>Recovery session done — targets stay the same for next time.</p>' : `<ul>${lines.join('')}</ul>`}
    <p class="small muted">Next: Workout ${S.next}${ready && S.gap ? `, from ${esc(ready.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }))}` : ''}. Drink some water and have a protein-rich meal.</p>
    <div class="actions"><button class="btn" data-close type="button">Done</button></div>`, () => render());
  render();
}

/* ---------- Progress ---------- */
function renderProgress() {
  const t = S.tests;
  main().innerHTML = `
    <h1>Your progress</h1>
    <div class="stats">
      <div class="stat"><b>${S.log.length}</b><span class="small muted">sessions</span></div>
      <div class="stat"><b>${S.log.filter((l) => daysSince(l.date) < 28).length}</b><span class="small muted">last 4 weeks</span></div>
      <div class="stat"><b>${t.length}</b><span class="small muted">strength checks</span></div>
    </div>
    <h2>Strength check results</h2>
    ${t.length ? `<div class="card"><table><thead><tr><th>Date</th><th>Chair</th><th>Curl</th><th>Balance L/R</th><th>Push</th><th>Grip</th></tr></thead><tbody>
      ${t.slice().reverse().map((x) => `<tr><td>${esc(new Date(x.date).toLocaleDateString('en-GB'))}</td><td>${x.chair ?? '–'}</td><td>${x.curl ?? '–'}</td><td>${x.balL ?? '–'}/${x.balR ?? '–'}</td><td>${x.push ?? '–'}${x.push != null ? ' ' + esc(PUSH_TYPES[x.pushType].toLowerCase()) : ''}</td><td>${x.grip ?? '–'}</td></tr>`).join('')}
      </tbody></table>
      ${chartTests('chair', 'Chair stands')}${chartTests('curl', 'Arm curls')}</div>` : '<div class="card">No strength check yet. <button class="linkbtn" id="goCheck">Do your first one</button>.</div>'}
    <h2>Your exercises</h2>
    ${ORDER.map((id) => { const e = S.ex[id]; const l = lvlOf(id, e.lvl); const pct = Math.round(fraction(id, e) * 100);
      return `<div class="card"><div class="row"><h3>${esc(LADDERS[id].name)}</h3><span class="pill">Step ${e.lvl + 1} of ${LADDERS[id].levels.length}</span></div>
        <p class="small muted" style="margin:4px 0 8px">${esc(l.n)} · ${unit(l.u, e.target)}</p>
        <div class="bar" role="img" aria-label="${pct}% through the ${esc(LADDERS[id].name)} steps"><i style="width:${pct}%"></i></div></div>`; }).join('')}
    <h2>Recent sessions</h2>
    ${S.log.length ? S.log.slice(-10).reverse().map((l) => `<div class="card"><div class="row"><h3>${esc(fmtDate(l.date))}</h3><span class="pill">Workout ${l.wk}${l.mode !== 'normal' ? ' · ' + l.mode : ''}</span></div>
      <table><tbody>${l.items.map((i) => { const lv = lvlOf(i.id, i.lvl); return `<tr><td>${esc(lv.n)}</td><td>${i.sets.map((x) => (x == null ? '–' : x)).join(' / ')} ${lv.u === 's' ? 'sec' : ''}</td></tr>`; }).join('')}</tbody></table></div>`).join('') : '<div class="card">No sessions yet.</div>'}`;
  const gc = $('#goCheck'); if (gc) gc.onclick = () => go('check');
}
function chartTests(key, label) {
  const pts = S.tests.filter((x) => x[key] != null).map((x) => x[key]);
  if (pts.length < 2) return '';
  const W = 300, H = 90, P = 6, max = Math.max(...pts), min = Math.min(...pts), span = max - min || 1;
  const xy = pts.map((p, i) => `${(P + (i * (W - 2 * P)) / (pts.length - 1)).toFixed(1)},${(H - P - ((p - min) / span) * (H - 2 * P)).toFixed(1)}`);
  return `<h3 style="margin-top:14px">${esc(label)}: ${pts[0]} → ${pts[pts.length - 1]}</h3>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} went from ${pts[0]} to ${pts[pts.length - 1]} over ${pts.length} checks">
    <polyline fill="none" stroke="#0d5c5c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${xy.join(' ')}"/></svg>`;
}

/* ---------- Joint-friendly swap finder ---------- */
const AREAS = { knee: 'Knees', back: 'Lower back', shoulder: 'Shoulders', hip: 'Hips', wrist: 'Wrists or elbows' };
const MOVES = {
  squat: 'Squats (bodyweight or barbell)', lunge: 'Lunges', deadlift: 'Deadlifts', ohp: 'Overhead press',
  bench: 'Bench press or push-ups', row: 'Rows', run: 'Running or jogging', stairs: 'Stairs or step-ups'
};
const SWAPS = {
  'squat|knee': ['Box squat to a high chair (stop where it\'s comfortable)', 'Glute bridge', 'Wall sit at a shallow angle (hold 15–30 s)'],
  'squat|back': ['Goblet squat with a light weight held at the chest', 'Sit-to-stand from a chair', 'Leg press at a gym, moderate depth'],
  'squat|hip': ['Box squat to a high seat with a narrower stance', 'Glute bridge', 'Step-ups onto a low step'],
  'lunge|knee': ['Split squat holding a support, shorter range', 'Glute bridge', 'Step-ups onto a low step'],
  'lunge|hip': ['Supported split squat, short range', 'Single-leg glute bridge', 'Side-lying leg raises'],
  'lunge|back': ['Supported split squat', 'Step-ups onto a low step', 'Glute bridge'],
  'deadlift|back': ['Glute bridge or hip thrust', 'Hip hinge to wall (no weight)', 'Kettlebell deadlift from a raised block'],
  'deadlift|hip': ['Glute bridge', 'Romanian deadlift with a short range and light weight', 'Cable pull-through at a gym'],
  'deadlift|knee': ['Romanian deadlift (soft knees, light weight)', 'Glute bridge', 'Hip hinge to wall'],
  'ohp|shoulder': ['Landmine press (angled press) at a gym', 'Incline push-up on a worktop', 'Seated dumbbell press with palms facing in, partial range'],
  'ohp|back': ['Seated dumbbell press with back support', 'Landmine press', 'Incline push-up'],
  'ohp|wrist': ['Dumbbell press with palms facing in', 'Landmine press', 'Wall push-up on fists or handles'],
  'bench|shoulder': ['Wall or worktop push-up', 'Floor press with dumbbells (elbows stop at the floor)', 'Palms-in dumbbell press'],
  'bench|wrist': ['Push-ups on fists, handles or dumbbells (neutral wrist)', 'Wall push-up', 'Machine chest press'],
  'row|back': ['Chest-supported row (lying face down on an incline bench)', 'Seated cable row with an upright back', 'Towel door row'],
  'row|shoulder': ['Row with palms facing in, short range', 'Resistance band row', 'Straight-arm band pull-down'],
  'row|wrist': ['Row using a towel or straps', 'Resistance band row with a loose grip', 'Machine row'],
  'run|knee': ['Brisk walking, gradually adding pace or hills', 'Cycling (static or road)', 'Swimming or aqua jogging'],
  'run|hip': ['Cycling', 'Swimming', 'Brisk walking on flat ground'],
  'run|back': ['Brisk walking', 'Cycling with an upright posture', 'Cross-trainer'],
  'stairs|knee': ['Step-ups onto a lower step, leading with the stronger leg', 'Glute bridge', 'Sit-to-stand from a high chair'],
  'stairs|hip': ['Low step-ups with handrail support', 'Glute bridge', 'Side-lying leg raises']
};
const GENERAL = {
  knee: ['Reduce the depth — work in the range that feels comfortable', 'Slow the lowering phase to 3 seconds', 'Strengthen around the joint with glute bridges and supported step-ups'],
  back: ['Brace gently (as if about to cough) before each rep', 'Use lighter weight and a shorter range for a while', 'Swap standing lifts for supported ones (bench, chair, machine)'],
  shoulder: ['Keep elbows a little lower and closer to your body', 'Work in a pain-free range', 'Add band pull-aparts and rows to balance pushing'],
  hip: ['Try a narrower or wider stance to find comfort', 'Reduce depth', 'Add glute bridges and side-lying leg raises'],
  wrist: ['Use handles, dumbbells or fists to keep wrists straight', 'Try straps or a towel for grip', 'Reduce load and build up slowly']
};
let swapSel = { move: 'squat', area: 'knee' };
function renderSwap() {
  const key = swapSel.move + '|' + swapSel.area;
  const list = SWAPS[key] || GENERAL[swapSel.area];
  main().innerHTML = `
    <h1>Joint-friendly exercise swaps</h1>
    <section class="card intro"><p>If an exercise bothers a joint, try a swap. These are general alternatives — not a diagnosis or treatment.</p></section>
    <div class="card">
      <label for="sMove">Which exercise bothers you?</label>
      <select id="sMove">${Object.entries(MOVES).map(([k, v]) => `<option value="${k}" ${swapSel.move === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <label for="sArea">Where do you feel it?</label>
      <select id="sArea">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}" ${swapSel.area === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
    </div>
    <div class="card">
      <h2 style="margin-top:0">${SWAPS[key] ? 'Try instead' : 'General tips for ' + esc(AREAS[swapSel.area].toLowerCase())}</h2>
      <ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="small muted">Rule of thumb: mild discomfort (up to about 3 out of 10) that settles within 24 hours is usually OK. Sharper pain, or pain that lingers, means change the exercise.</p>
    </div>
    <div class="status red">Stop and get advice from your GP, a physiotherapist or NHS 111 if pain is sharp or severe, came on suddenly, keeps you awake, comes with swelling, numbness, pins and needles or weakness, or followed a fall.</div>`;
  $('#sMove').onchange = (e) => { swapSel.move = e.target.value; renderSwap(); $('#sMove').focus(); };
  $('#sArea').onchange = (e) => { swapSel.area = e.target.value; renderSwap(); $('#sArea').focus(); };
}

/* ---------- Settings ---------- */
function renderSettings() {
  main().innerHTML = `
    <h1>Settings</h1>
    <section class="card">
      <label for="age">Your age</label><input type="number" id="age" min="40" max="110" value="${S.age}" inputmode="numeric">
      <label for="sex">Reference ranges</label>
      <select id="sex"><option value="f" ${S.sex === 'f' ? 'selected' : ''}>Women's</option><option value="m" ${S.sex === 'm' ? 'selected' : ''}>Men's</option><option value="x" ${S.sex === 'x' ? 'selected' : ''}>Show both</option></select>
      <label for="gap">Rest days between sessions</label>
      <select id="gap">${[0, 1, 2, 3].map((v) => `<option value="${v}" ${S.gap === v ? 'selected' : ''}>${v === 0 ? 'No minimum' : v + (v === 1 ? ' day' : ' days')}${v === 2 ? ' (recommended)' : ''}</option>`).join('')}</select>
      <label for="rest">Rest timer between sets</label>
      <select id="rest">${[0, 60, 90, 120, 180].map((v) => `<option value="${v}" ${S.rest === v ? 'selected' : ''}>${v ? v + ' seconds' : 'Off'}</option>`).join('')}</select>
      <label class="opt"><input type="checkbox" id="sound" ${S.sound ? 'checked' : ''}> Sound and vibration when the timer ends</label>
    </section>
    <section class="card">
      <h2>Change an exercise</h2>
      <p class="muted small">Too easy or too hard? Choose a different step.</p>
      ${ORDER.map((id) => `<label for="lv_${id}">${esc(LADDERS[id].name)}</label>
        <select id="lv_${id}" data-id="${id}">${LADDERS[id].levels.map((l, i) => `<option value="${i}" ${S.ex[id].lvl === i ? 'selected' : ''}>${i + 1}. ${esc(l.n)}</option>`).join('')}</select>`).join('')}
    </section>
    <section class="card">
      <h2>Your data</h2>
      <p class="muted small">Stored on this device only. Back it up before changing phone or clearing your browser.</p>
      <div class="tools"><button type="button" id="expJson">Download backup</button><button type="button" id="expCsv">Download history (spreadsheet)</button></div>
      <label for="imp">Restore a backup</label><input type="file" id="imp" accept="application/json,.json">
      <p style="margin-top:16px"><button type="button" class="btn danger" id="wipe">Delete all my data</button></p>
    </section>
    <section class="card">
      <h2>Sources</h2>
      <ul class="small">
        <li>Chair stand and arm curl ranges: Rikli &amp; Jones, Senior Fitness Test (ages 60–94). Rikli R, Jones C. Functional fitness normative scores for community-residing older adults, ages 60–94. J Aging Phys Act. 1999;7(2):162–181.</li>
        <li>Grip strength cut-offs: Cruz-Jentoft AJ et al. Sarcopenia: revised European consensus (EWGSOP2). Age Ageing. 2019;48(1):16–31.</li>
      </ul>
    </section>`;
  $('#age').onchange = (e) => { S.age = clampInt(e.target.value, 40, 110, S.age); save(); toast('Saved'); };
  $('#sex').onchange = (e) => { S.sex = e.target.value; save(); toast('Saved'); };
  $('#gap').onchange = (e) => { S.gap = +e.target.value; save(); toast('Saved'); };
  $('#rest').onchange = (e) => { S.rest = +e.target.value; save(); toast('Saved'); };
  $('#sound').onchange = (e) => { S.sound = e.target.checked; save(); };
  document.querySelectorAll('select[data-id]').forEach((sel) => (sel.onchange = () => {
    const id = sel.dataset.id, lvl = +sel.value; S.ex[id] = { lvl, target: LADDERS[id].levels[lvl].r[0], fails: 0 }; save(); toast('Saved');
  }));
  $('#expJson').onclick = () => download('staystrong50-backup.json', JSON.stringify(S, null, 2), 'application/json');
  $('#expCsv').onclick = () => {
    const rows = [['type', 'date', 'detail', 'value1', 'value2', 'value3', 'result']];
    S.log.forEach((l) => l.items.forEach((i) => { const lv = lvlOf(i.id, i.lvl); rows.push(['session', l.date, lv.n, ...i.sets.map((x) => (x == null ? '' : x)), i.result]); }));
    S.tests.forEach((t) => rows.push(['strength check', t.date, `chair ${t.chair ?? ''}; curl ${t.curl ?? ''}; balance ${t.balL ?? ''}/${t.balR ?? ''}; push ${t.push ?? ''} ${PUSH_TYPES[t.pushType]}; grip ${t.grip ?? ''}`, '', '', '', '']));
    download('staystrong50-history.csv', rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  };
  $('#imp').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d || !d.ex) throw 0; S = sanitize(d); save(); toast('Backup restored'); render(); } catch (err) { toast('That file isn\'t a StayStrong50 backup.'); } };
    rd.readAsText(f);
  };
  $('#wipe').onclick = () => {
    const close = openModal(`<h2 id="modalTitle">Delete everything?</h2><p>All sessions, strength checks and settings on this device will be permanently deleted. This can't be undone.</p>
      <div class="actions"><button class="btn ghost" data-close type="button">Keep my data</button><button class="btn danger" id="yw" type="button">Delete all</button></div>`);
    $('#yw').onclick = () => { try { localStorage.removeItem(KEY); } catch (e) {} S = defaults(); ob = 0; draft = null; close(); go('today'); };
  };
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

if (typeof window !== 'undefined') window.StayStrong = { progress, readiness, normFor, rate, LADDERS, sanitize, defaults };
render();
