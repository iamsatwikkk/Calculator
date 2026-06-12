/* ─── STATE ───────────────────────────────────────────── */
const state = {
  current:    '0',   // number shown on main display
  expression: '',    // expression shown above display
  operator:   null,  // pending operator symbol
  operand:    null,  // left-hand operand (string)
  freshInput: false, // next digit replaces current
  justEvaled: false, // just pressed equals
  memory:     0,
  hasMemory:  false,
  useRadians: false,
  invMode:    false,
};

/* ─── ELEMENTS ────────────────────────────────────────── */
const displayEl    = document.getElementById('display');
const expressionEl = document.getElementById('expressionLine');
const themeBtn     = document.getElementById('themeBtn');
const degRadBtn    = document.getElementById('degRadBtn');
const modeBadge    = document.getElementById('modeBadge');
const invBtn       = document.querySelector('[data-fn="inv"]');

/* ─── THEME ───────────────────────────────────────────── */
let isDark = false; // light is default
themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
});

/* ─── DEG / RAD ───────────────────────────────────────── */
degRadBtn.addEventListener('click', () => {
  state.useRadians = !state.useRadians;
  modeBadge.textContent = state.useRadians ? 'RAD' : 'DEG';
  degRadBtn.textContent  = state.useRadians ? 'DEG' : 'RAD';
});

/* ─── RENDER ─────────────────────────────────────────── */
function render() {
  const len = state.current.length;
  displayEl.className = 'display';
  if      (len > 13) displayEl.classList.add('xsmall');
  else if (len > 9)  displayEl.classList.add('small');

  displayEl.textContent    = state.current;
  expressionEl.textContent = state.expression || '\u00a0';

  // memory dot on MS and MR
  document.querySelectorAll('[data-action="memStore"],[data-action="memRecall"]')
    .forEach(b => b.classList.toggle('has-mem', state.hasMemory));
}

function animateDisplay(type) {
  displayEl.classList.remove('pulse', 'shake');
  void displayEl.offsetWidth; // force reflow to restart animation
  displayEl.classList.add(type);
  setTimeout(() => displayEl.classList.remove(type), 400);
}

/* ─── OPERATOR HIGHLIGHT ──────────────────────────────── */
function highlightOp(sym) {
  document.querySelectorAll('.btn-op')
    .forEach(b => b.classList.toggle('active-op', b.dataset.value === sym));
}
function clearOpHighlight() {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
}

/* ─── MATH HELPERS ────────────────────────────────────── */
function toAngleRad(v) {
  // convert display value to radians for trig functions
  return state.useRadians ? v : (v * Math.PI) / 180;
}
function fromAngleRad(r) {
  // convert radians result back to display unit for inverse trig
  return state.useRadians ? r : (r * 180) / Math.PI;
}

function factorial(n) {
  n = Math.round(n);
  if (n < 0 || n > 170) return NaN;
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function formatNum(n) {
  if (!isFinite(n) || isNaN(n)) return 'Error';
  // kill floating-point noise with 12 significant digits
  const rounded = parseFloat(n.toPrecision(12));
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  if (abs >= 1e-9 && abs < 1e13) return String(rounded);
  return rounded.toExponential(6);
}

/* ─── BASIC DIGIT / DECIMAL INPUT ────────────────────── */
function inputDigit(d) {
  if (state.justEvaled) {
    // After equals, start fresh
    state.current    = d === '0' ? '0' : d;
    state.expression = '';
    state.justEvaled = false;
    state.freshInput = false;
    return;
  }
  if (state.freshInput) {
    state.current    = d;
    state.freshInput = false;
  } else {
    state.current = (state.current === '0') ? d : state.current + d;
  }
}

function inputDecimal() {
  if (state.justEvaled) {
    state.current    = '0.';
    state.expression = '';
    state.justEvaled = false;
    state.freshInput = false;
    return;
  }
  if (state.freshInput) {
    state.current    = '0.';
    state.freshInput = false;
    return;
  }
  if (!state.current.includes('.')) state.current += '.';
}

/* ─── CLEAR / BACKSPACE ───────────────────────────────── */
function doClear() {
  state.current    = '0';
  state.expression = '';
  state.operator   = null;
  state.operand    = null;
  state.freshInput = false;
  state.justEvaled = false;
  clearOpHighlight();
}

function doBackspace() {
  if (state.current === 'Error') { state.current = '0'; return; }
  if (state.freshInput)          { return; } // don't backspace into operand
  const s = state.current;
  if (s.length <= 1 || (s.length === 2 && s[0] === '-')) {
    state.current = '0';
  } else {
    state.current = s.slice(0, -1);
    // clean up trailing dot: "3." → "3"
    if (state.current.endsWith('.')) state.current = state.current.slice(0, -1);
  }
}

/* ─── PERCENT / SIGN ──────────────────────────────────── */
function doPercent() {
  const n = parseFloat(state.current);
  if (isNaN(n)) return;
  // If there's a pending addition/subtraction, treat as x% of operand
  // Otherwise just divide by 100
  if (state.operand !== null && (state.operator === '+' || state.operator === '−')) {
    state.current = formatNum((parseFloat(state.operand) * n) / 100);
  } else {
    state.current = formatNum(n / 100);
  }
  state.freshInput = false;
}

function doToggleSign() {
  if (state.current === '0' || state.current === 'Error') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
}

/* ─── ARITHMETIC COMPUTE ──────────────────────────────── */
function compute(a, op, b) {
  const fa = parseFloat(a);
  const fb = parseFloat(b);
  if (isNaN(fa) || isNaN(fb)) return NaN;
  switch (op) {
    case '÷':   return fb === 0 ? NaN : fa / fb;
    case '×':   return fa * fb;
    case '−':   return fa - fb;
    case '+':   return fa + fb;
    case '^':   return Math.pow(fa, fb);
    case 'mod': return fb === 0 ? NaN : fa % fb;
    default:    return NaN;
  }
}

function inputOperator(op) {
  clearOpHighlight();
  highlightOp(op);
  // Chain: if there's already a pending op and we have new input, evaluate first
  if (state.operator && !state.freshInput) {
    const result = compute(state.operand, state.operator, state.current);
    const fmt    = formatNum(result);
    if (fmt === 'Error') {
      showError(`${state.operand} ${state.operator} ${state.current}`);
      return;
    }
    state.current    = fmt;
    state.operand    = fmt;
    state.expression = `${fmt} ${op}`;
  } else {
    state.operand    = state.current;
    state.expression = `${state.current} ${op}`;
  }
  state.operator   = op;
  state.freshInput = true;
  state.justEvaled = false;
}

/* ─── EQUALS ──────────────────────────────────────────── */
function doEquals() {
  clearOpHighlight();
  if (state.operator === null || state.operand === null) {
    animateDisplay('pulse');
    state.expression = '\u00a0';
    return;
  }
  const b      = state.current;
  const exprStr = `${state.operand} ${state.operator} ${b} =`;
  const result  = compute(state.operand, state.operator, b);
  const fmt     = formatNum(result);

  state.expression = exprStr;

  if (fmt === 'Error') {
    showError(exprStr);
    return;
  }

  animateDisplay('pulse');
  state.current    = fmt;
  state.operator   = null;
  state.operand    = null;
  state.freshInput = false;
  state.justEvaled = true;
  render();
}

function showError(exprStr) {
  animateDisplay('shake');
  state.current    = 'Error';
  state.expression = exprStr;
  state.operator   = null;
  state.operand    = null;
  state.freshInput = false;
  state.justEvaled = true;
  render();
  setTimeout(() => {
    state.current    = '0';
    state.expression = '';
    state.justEvaled = false;
    render();
  }, 1400);
}

/* ─── MEMORY ──────────────────────────────────────────── */
function doMemStore() {
  const n = parseFloat(state.current);
  if (!isNaN(n) && isFinite(n)) {
    state.memory    = n;
    state.hasMemory = true;
  }
}
function doMemRecall() {
  if (!state.hasMemory) return;
  state.current    = formatNum(state.memory);
  state.freshInput = false;
  state.justEvaled = false;
}
function doMemClear() {
  state.memory    = 0;
  state.hasMemory = false;
}

/* ─── INV LABEL HELPER ────────────────────────────────── */
const INV_LABELS = {
  on:  { sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', log: '10^x', ln: 'eˣ' },
  off: { sin: 'sin',   cos: 'cos',   tan: 'tan',   log: 'log',  ln: 'ln' },
};
function applyInvLabels(on) {
  const map = on ? INV_LABELS.on : INV_LABELS.off;
  document.querySelectorAll('.btn-sci[data-fn]').forEach(b => {
    if (map[b.dataset.fn]) b.textContent = map[b.dataset.fn];
  });
  invBtn.classList.toggle('inv-active', on);
}

/* ─── SCIENTIFIC FUNCTIONS ────────────────────────────── */
function doSci(fn) {
  // INV: toggle mode and relabel buttons, no calculation
  if (fn === 'inv') {
    state.invMode = !state.invMode;
    applyInvLabels(state.invMode);
    return;
  }

  // Constants: insert value directly
  if (fn === 'pi') {
    setConstant(String(Math.PI));
    return;
  }
  if (fn === 'e_const') {
    setConstant(String(Math.E));
    return;
  }

  // Operators that chain (set pending operator)
  if (fn === 'powN') { inputOperator('^');   render(); return; }
  if (fn === 'mod')  { inputOperator('mod'); render(); return; }

  // EXP (scientific notation): current × 10^n
  // e.g. user enters 1.5, presses EXP, enters 3 → 1.5 × 10³ = 1500
  if (fn === 'exp10') {
    // Save current as operand for ×, push 10 as a sub-power
    // Simplest correct approach: treat as operator ×10^
    // We'll store a special 'exp10' operator and handle in compute
    inputOperator('×');
    // After this, user types exponent. On equals we'll compute current × 10^exponent
    // Actually simpler: set current to "1e" prefix via state trick
    // Cleanest: store operand = current, op = 'exp10', fresh = true
    state.operator   = 'exp10';
    state.expression = `${state.operand} × 10^`;
    clearOpHighlight();
    return;
  }

  // Unary functions
  const v = parseFloat(state.current);
  if (isNaN(v)) return;

  let result;
  const inv = state.invMode;

  switch (fn) {
    case 'sin':
      result = inv ? fromAngleRad(Math.asin(v)) : Math.sin(toAngleRad(v));
      break;
    case 'cos':
      result = inv ? fromAngleRad(Math.acos(v)) : Math.cos(toAngleRad(v));
      break;
    case 'tan':
      result = inv ? fromAngleRad(Math.atan(v)) : Math.tan(toAngleRad(v));
      // tan(90°) and similar near-infinity
      if (!inv && Math.abs(result) > 1e14) result = NaN;
      break;
    case 'log':
      result = inv ? Math.pow(10, v) : Math.log10(v);
      break;
    case 'ln':
      result = inv ? Math.exp(v) : Math.log(v);
      break;
    case 'pow2':  result = v * v;          break;
    case 'pow3':  result = v * v * v;      break;
    case 'sqrt':  result = Math.sqrt(v);   break;
    case 'cbrt':  result = Math.cbrt(v);   break;
    case 'abs':   result = Math.abs(v);    break;
    case 'fact':  result = factorial(v);   break;
    case 'recip': result = v === 0 ? NaN : 1 / v; break;
    // Parentheses: cosmetic in expression line only (no real eval engine)
    case 'open':
      state.expression = (state.expression || '') + '(';
      render();
      return;
    case 'close':
      state.expression = (state.expression || '').replace(/\(\s*$/, '');
      render();
      return;
    default: return;
  }

  const fmt = formatNum(result);
  const label = invBtn.textContent === 'INV' ? fn : invBtn.textContent; // for display
  state.expression = `${fn}(${state.current}) =`;
  state.current    = fmt;
  state.freshInput = false;
  state.justEvaled = true;

  if (fmt === 'Error') animateDisplay('shake');
  else                 animateDisplay('pulse');

  // Auto-exit INV mode after use
  if (inv && ['sin','cos','tan','log','ln'].includes(fn)) {
    state.invMode = false;
    applyInvLabels(false);
  }

  render();
}

function setConstant(val) {
  state.current    = val;
  state.freshInput = false;
  state.justEvaled = false;
  render();
}

/* ─── EXTENDED COMPUTE for exp10 ─────────────────────── */
// Override compute to handle exp10 operator
const _baseCompute = compute;
function computeFull(a, op, b) {
  if (op === 'exp10') {
    const fa = parseFloat(a), fb = parseFloat(b);
    if (isNaN(fa) || isNaN(fb)) return NaN;
    return fa * Math.pow(10, fb);
  }
  return _baseCompute(a, op, b);
}

/* Patch doEquals and inputOperator to use computeFull */
// Re-bind compute reference inside those closures by using a wrapper
function computeAll(a, op, b) { return computeFull(a, op, b); }

/* ─── DISPATCH ────────────────────────────────────────── */
function dispatch(action, value) {
  switch (action) {
    case 'digit':      inputDigit(value);   break;
    case 'decimal':    inputDecimal();      break;
    case 'operator':   inputOperator(value); break;
    case 'equals':     doEqualsPatched();   return;
    case 'percent':    doPercent();         break;
    case 'toggleSign': doToggleSign();      break;
    case 'clear':      doClear();           break;
    case 'backspace':  doBackspace();       break;
    case 'memStore':   doMemStore();        break;
    case 'memRecall':  doMemRecall();       break;
    case 'memClear':   doMemClear();        break;
    case 'sci':        doSci(value);        return; // doSci calls render itself
    default:           return;
  }
  render();
}

// Patched equals that uses computeFull (handles exp10)
function doEqualsPatched() {
  clearOpHighlight();
  if (state.operator === null || state.operand === null) {
    animateDisplay('pulse');
    state.expression = '\u00a0';
    render();
    return;
  }
  const b       = state.current;
  const exprStr = `${state.operand} ${state.operator} ${b} =`;
  const result  = computeFull(state.operand, state.operator, b);
  const fmt     = formatNum(result);

  state.expression = exprStr;

  if (fmt === 'Error') {
    showError(exprStr);
    return;
  }

  animateDisplay('pulse');
  state.current    = fmt;
  state.operator   = null;
  state.operand    = null;
  state.freshInput = false;
  state.justEvaled = true;
  render();
}

// Also patch inputOperator to use computeFull for chaining
function inputOperator(op) {
  clearOpHighlight();
  highlightOp(op);
  if (state.operator && !state.freshInput) {
    const result = computeFull(state.operand, state.operator, state.current);
    const fmt    = formatNum(result);
    if (fmt === 'Error') {
      showError(`${state.operand} ${state.operator} ${state.current}`);
      return;
    }
    state.current    = fmt;
    state.operand    = fmt;
    state.expression = `${fmt} ${op}`;
  } else {
    state.operand    = state.current;
    state.expression = `${state.current} ${op}`;
  }
  state.operator   = op;
  state.freshInput = true;
  state.justEvaled = false;
}

/* ─── RIPPLE ──────────────────────────────────────────── */
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const cx = (e.clientX != null) ? e.clientX
           : (e.touches && e.touches[0]) ? e.touches[0].clientX
           : rect.left + rect.width  / 2;
  const cy = (e.clientY != null) ? e.clientY
           : (e.touches && e.touches[0]) ? e.touches[0].clientY
           : rect.top  + rect.height / 2;
  btn.style.setProperty('--rx', `${((cx - rect.left) / rect.width)  * 100}%`);
  btn.style.setProperty('--ry', `${((cy - rect.top)  / rect.height) * 100}%`);
  btn.classList.add('ripple');
  setTimeout(() => btn.classList.remove('ripple'), 320);
}

/* ─── POINTER EVENT DELEGATION ────────────────────────── */
function handleBtnEvent(e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  e.preventDefault();
  addRipple(btn, e);
  const action = btn.dataset.action;
  if (!action) return;
  // sci buttons use data-fn; all others use data-value
  const value = btn.dataset.fn || btn.dataset.value;
  dispatch(action, value);
}

document.querySelector('.sci-grid').addEventListener('pointerdown', handleBtnEvent);
document.querySelector('.std-grid').addEventListener('pointerdown', handleBtnEvent);

/* ─── KEYBOARD ────────────────────────────────────────── */
const KEY_MAP = {
  '0':'digit:0','1':'digit:1','2':'digit:2','3':'digit:3','4':'digit:4',
  '5':'digit:5','6':'digit:6','7':'digit:7','8':'digit:8','9':'digit:9',
  '.':'decimal', ',':'decimal',
  '+':'operator:+', '-':'operator:−', '*':'operator:×', '/':'operator:÷',
  'Enter':'equals', '=':'equals',
  'Escape':'clear', 'Delete':'clear',
  'Backspace':'backspace',
  '%':'percent',
};

document.addEventListener('keydown', e => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();

  const colonIdx = mapped.indexOf(':');
  const action   = colonIdx >= 0 ? mapped.slice(0, colonIdx) : mapped;
  const value    = colonIdx >= 0 ? mapped.slice(colonIdx + 1) : undefined;

  dispatch(action, value);

  // Flash matching button
  let btn = null;
  if (value) {
    btn = document.querySelector(`.btn[data-action="${action}"][data-value="${CSS.escape(value)}"]`);
  }
  if (!btn) {
    btn = document.querySelector(`.btn[data-action="${action}"]`);
  }
  if (btn) {
    btn.classList.add('ripple');
    setTimeout(() => btn.classList.remove('ripple'), 200);
  }
});

/* ─── INIT ────────────────────────────────────────────── */
render();
