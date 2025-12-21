let fontSize = 13;

const textInput = document.getElementById('textInput');
const previewLines = document.getElementById('previewLines');
const sizeInput = document.getElementById('sizeInput');
const colorPicker = document.getElementById('colorPicker');
const textColorPicker = document.getElementById('textColorPicker');
const bgToggle = document.getElementById('bgToggle');
const fontSelect = document.getElementById('fontSelect');
const chatScope = document.getElementById('chatScope');
const saveColorBtn = document.getElementById('saveColorBtn');
const lineSelectInner = document.getElementById('lineSelectInner');

const bgUpload = document.getElementById('bgUpload');
const bgImg = document.getElementById('bgImg');
const stage = document.getElementById('stage');
const stageWrap = document.getElementById('stageWrap');

const chatOverlay = document.getElementById('chatOverlay');
const rotateHandle = document.getElementById('rotateHandle');
const rotationInput = document.getElementById('rotationInput');

const selectedKeys = new Set();
let customColorsByKey = {};

let rotationDeg = 0;

const FONT_MAP = {
  tahoma: { css: 'Tahoma, Arial, sans-serif', canvas: 'Tahoma, Arial, sans-serif', load: 'Tahoma' },
  roboto: { css: '"Roboto", Tahoma, Arial, sans-serif', canvas: '"Roboto", Tahoma, Arial, sans-serif', load: 'Roboto' },
  inter: { css: '"Inter", Tahoma, Arial, sans-serif', canvas: '"Inter", Tahoma, Arial, sans-serif', load: 'Inter' },
  opensans: { css: '"Open Sans", Tahoma, Arial, sans-serif', canvas: '"Open Sans", Tahoma, Arial, sans-serif', load: 'Open Sans' },
  lato: { css: '"Lato", Tahoma, Arial, sans-serif', canvas: '"Lato", Tahoma, Arial, sans-serif', load: 'Lato' },
  nunito: { css: '"Nunito", Tahoma, Arial, sans-serif', canvas: '"Nunito", Tahoma, Arial, sans-serif', load: 'Nunito' },
  raleway: { css: '"Raleway", Tahoma, Arial, sans-serif', canvas: '"Raleway", Tahoma, Arial, sans-serif', load: 'Raleway' },
  oswald: { css: '"Oswald", Tahoma, Arial, sans-serif', canvas: '"Oswald", Tahoma, Arial, sans-serif', load: 'Oswald' },
  ubuntu: { css: '"Ubuntu", Tahoma, Arial, sans-serif', canvas: '"Ubuntu", Tahoma, Arial, sans-serif', load: 'Ubuntu' },
  firasans: { css: '"Fira Sans", Tahoma, Arial, sans-serif', canvas: '"Fira Sans", Tahoma, Arial, sans-serif', load: 'Fira Sans' },
  rubik: { css: '"Rubik", Tahoma, Arial, sans-serif', canvas: '"Rubik", Tahoma, Arial, sans-serif', load: 'Rubik' },
  sourcesans3: { css: '"Source Sans 3", Tahoma, Arial, sans-serif', canvas: '"Source Sans 3", Tahoma, Arial, sans-serif', load: 'Source Sans 3' },

  cairo: { css: '"Cairo", Tahoma, Arial, sans-serif', canvas: '"Cairo", Tahoma, Arial, sans-serif', load: 'Cairo' },
  tajawal: { css: '"Tajawal", Tahoma, Arial, sans-serif', canvas: '"Tajawal", Tahoma, Arial, sans-serif', load: 'Tajawal' },
  notosansarabic: { css: '"Noto Sans Arabic", Tahoma, Arial, sans-serif', canvas: '"Noto Sans Arabic", Tahoma, Arial, sans-serif', load: 'Noto Sans Arabic' },
  notokufiarabic: { css: '"Noto Kufi Arabic", Tahoma, Arial, sans-serif', canvas: '"Noto Kufi Arabic", Tahoma, Arial, sans-serif', load: 'Noto Kufi Arabic' },
  notonaskharabic: { css: '"Noto Naskh Arabic", Tahoma, Arial, sans-serif', canvas: '"Noto Naskh Arabic", Tahoma, Arial, sans-serif', load: 'Noto Naskh Arabic' },

  poppins: { css: '"Poppins", Tahoma, Arial, sans-serif', canvas: '"Poppins", Tahoma, Arial, sans-serif', load: 'Poppins' },
  montserrat: { css: '"Montserrat", Tahoma, Arial, sans-serif', canvas: '"Montserrat", Tahoma, Arial, sans-serif', load: 'Montserrat' },
};

function stripInvisibleChars(str) {
  return String(str || '').replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
}

// Inline color markup:
// [c=56d64b]colored text[/c]
function parseInlineColors(text, fallbackColor) {
  const s = stripInvisibleChars(text || '');
  const runs = [];
  let i = 0;
  let current = fallbackColor;

  while (i < s.length) {
    const open = s.indexOf('[c=', i);
    const close = s.indexOf('[/c]', i);

    if (open === -1 && close === -1) {
      if (i < s.length) runs.push({ text: s.slice(i), color: current });
      break;
    }

    // closing tag first
    if (close !== -1 && (open === -1 || close < open)) {
      if (close > i) runs.push({ text: s.slice(i, close), color: current });
      current = fallbackColor;
      i = close + 4;
      continue;
    }

    // opening tag first
    if (open !== -1) {
      if (open > i) runs.push({ text: s.slice(i, open), color: current });

      const end = s.indexOf(']', open);
      if (end === -1) {
        // broken tag -> treat as text
        runs.push({ text: s.slice(open), color: current });
        break;
      }

      const code = s.slice(open + 3, end).trim();
      if (/^[0-9A-Fa-f]{6}$/.test(code)) current = '#' + code;
      // invalid codes are ignored (keep current)
      i = end + 1;
      continue;
    }
  }

  if (runs.length === 0) runs.push({ text: ' ', color: fallbackColor });
  return runs;
}

function runsToPlainText(runs) {
  return (runs || []).map(r => r.text).join('');
}

// Wrap colored runs for canvas drawing
function wrapRunsCanvas(ctx, runs, maxWidth) {
  const tokens = [];
  for (const r of runs) {
    // split keeping spaces
    const parts = String(r.text || '').split(/(\s+)/);
    for (const p of parts) {
      if (p.length) tokens.push({ text: p, color: r.color });
    }
  }

  const lines = [];
  let line = [];
  let lineText = '';

  function pushLine() {
    if (!line.length) line.push({ text: ' ', color: (runs[0]?.color || '#ffffff') });
    lines.push(line);
    line = [];
    lineText = '';
  }

  for (const tok of tokens) {
    const testText = lineText + tok.text;
    if (ctx.measureText(testText).width <= maxWidth) {
      line.push(tok);
      lineText = testText;
      continue;
    }

    // If current line has some content, push and start new
    if (lineText.trim().length) {
      pushLine();

      // try put token on new line
      if (ctx.measureText(tok.text).width <= maxWidth) {
        line.push(tok);
        lineText = tok.text;
        continue;
      }
      // token still too long -> split by chars
    }

    // token longer than maxWidth -> split char by char
    let chunk = '';
    for (const ch of tok.text) {
      const t2 = chunk + ch;
      if (ctx.measureText(t2).width <= maxWidth) {
        chunk = t2;
      } else {
        if (chunk.length) {
          line.push({ text: chunk, color: tok.color });
          pushLine();
        }
        chunk = ch;
      }
    }
    if (chunk.length) {
      line.push({ text: chunk, color: tok.color });
      lineText = chunk;
    }
  }

  if (line.length) lines.push(line);
  return lines;
}


let currentFontKey = 'tahoma';

async function ensureFontLoaded() {
  try {
    if (!document.fonts || !document.fonts.load) return;
    const f = FONT_MAP[currentFontKey] || FONT_MAP.tahoma;
    await document.fonts.load(`${Math.max(fontSize, 12)}px "${f.load}"`);
    await document.fonts.ready;
  } catch (_) {}
}

function applyFont(key) {
  currentFontKey = (key in FONT_MAP) ? key : 'tahoma';
  document.documentElement.style.setProperty('--chat-font', FONT_MAP[currentFontKey].css);
  chatScope.style.setProperty('--chat-font', FONT_MAP[currentFontKey].css);
  updateAll();
}
fontSelect.addEventListener('change', () => applyFont(fontSelect.value));

function setRotation(deg) {
  rotationDeg = deg;
  chatOverlay.style.transform = `rotate(${rotationDeg}deg)`;
  if (rotationInput) rotationInput.value = `${Math.round(rotationDeg)}°`;
  clampOverlayToStage();
}

/* ✅ stage على قد الصورة (بعد الرفع فقط) */
function resizeStageToImage() {
  if (!bgImg.naturalWidth || !bgImg.naturalHeight) return;

  const maxW = stageWrap ? stageWrap.clientWidth : Math.min(1100, window.innerWidth * 0.96);
  const natW = bgImg.naturalWidth;
  const natH = bgImg.naturalHeight;

  const scale = Math.min(1, maxW / natW);
  const w = Math.round(natW * scale);
  const h = Math.round(natH * scale);

  stage.style.width = w + 'px';
  stage.style.height = h + 'px';

  clampOverlayToStage();
}

function cleanLineText(line) {
  if (!line) return '';
  const clean = stripInvisibleChars(line);
  if (clean.length >= 8 && clean[0] === '{' && clean[7] === '}') return clean.substring(8);
  return clean;
}

function buildLineKeys(lines) {
  const counts = new Map();
  const keys = [];
  for (const raw of lines) {
    const t = cleanLineText(raw);
    const prev = counts.get(t) || 0;
    const now = prev + 1;
    counts.set(t, now);
    keys.push(`${t}__#${now}`);
  }
  return keys;
}

function getBaseLineColor(rawLine) {
  rawLine = stripInvisibleChars(rawLine);
  const defaultColor = '#ffffff';
  if (!rawLine || rawLine.length === 0) return defaultColor;

  if (rawLine.length >= 8 && rawLine[0] === '{' && rawLine[7] === '}') {
    const colorCode = rawLine.substring(1, 7);
    if (/^[0-9A-Fa-f]{6}$/.test(colorCode)) return '#' + colorCode;
  }

  let cleanLine = rawLine;
  if (rawLine.length >= 8 && rawLine[0] === '{' && rawLine[7] === '}') cleanLine = rawLine.substring(8);

  const lowerLine = cleanLine.toLowerCase();
  if (lowerLine.includes('[radio]')) return '#FEE58F';
  if (lowerLine.includes('whispers')) return '#eda841';

  const trimmed = cleanLine.trim();
  if (!trimmed) return defaultColor;

  const first = trimmed[0];
  if (first === '*' || first === String.fromCharCode(0x2605)) return '#C2A2DA';

  let lineForColorCheck = cleanLine;
  if (first === String.fromCharCode(0x272A)) lineForColorCheck = cleanLine.substring(1).trim();

  const lower = lineForColorCheck.toLowerCase();
  if (lower.includes('[phone]')) return '#c8ffc8';

  if (lineForColorCheck.includes(' gives ')) return '#56d64b';
  if (lineForColorCheck.includes(' gave ')) return '#56d64b';
  if (lineForColorCheck.indexOf('You gave $') === 0) return '#56d64b';
  if (lineForColorCheck.includes(' gave you $')) return '#56d64b';

  return defaultColor;
}

/* ===== Wrap helpers ===== */
function getTextareaLineHeightPx() {
  const cs = window.getComputedStyle(textInput);
  const lh = parseFloat(cs.lineHeight);
  return Number.isFinite(lh) ? lh : 20;
}

const wrapMeasureEl = (() => {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = '-99999px';
  el.style.top = '0';
  el.style.visibility = 'hidden';
  el.style.whiteSpace = 'pre-wrap';
  el.style.wordBreak = 'break-word';
  el.style.overflowWrap = 'anywhere';
  document.body.appendChild(el);
  return el;
})();

function getWrappedRowCountForTextareaLine(text) {
  const cs = window.getComputedStyle(textInput);
  const w = textInput.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  wrapMeasureEl.style.width = Math.max(0, w) + 'px';
  wrapMeasureEl.style.fontFamily = cs.fontFamily;
  wrapMeasureEl.style.fontSize = cs.fontSize;
  wrapMeasureEl.style.lineHeight = cs.lineHeight;
  wrapMeasureEl.textContent = text && text.length ? text : ' ';
  const lh = getTextareaLineHeightPx();
  const h = wrapMeasureEl.scrollHeight;
  return Math.max(1, Math.round(h / lh));
}

function wrapTextCanvas(ctx, text, maxWidth) {
  if (!text || !text.trim()) return [' '];

  const tokens = text.split(/(\s+)/);
  const lines = [];
  let line = '';

  function pushLine(l){ lines.push(l.length ? l : ' '); }

  for (const token of tokens) {
    const test = line + token;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      continue;
    }

    if (line.trim().length) {
      pushLine(line);
      line = token.trim() ? token : '';
      continue;
    }

    let chunk = '';
    for (const ch of token) {
      const t2 = chunk + ch;
      if (ctx.measureText(t2).width <= maxWidth) chunk = t2;
      else { pushLine(chunk); chunk = ch; }
    }
    line = chunk;
  }

  if (line.length) pushLine(line);
  return lines;
}

/* ===== Checkbox + preview ===== */
function syncCheckboxScroll() {
  lineSelectInner.style.transform = `translateY(${-textInput.scrollTop}px)`;
}

function pruneState(keysSet) {
  for (const k of Array.from(selectedKeys)) {
    if (!keysSet.has(k)) selectedKeys.delete(k);
  }
  const next = {};
  for (const [k, v] of Object.entries(customColorsByKey)) {
    if (keysSet.has(k)) next[k] = v;
  }
  customColorsByKey = next;
}

function renderSelectors(lines, keys) {
  lineSelectInner.innerHTML = '';

  const lh = getTextareaLineHeightPx();

  for (let i = 0; i < lines.length; i++) {
    const key = keys[i];
    const raw = lines[i];

    const wrappedRows = getWrappedRowCountForTextareaLine(raw);

    const row = document.createElement('div');
    row.className = 'line-check-row';
    row.style.height = `${lh}px`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'line-check';
    cb.checked = selectedKeys.has(key);

    cb.addEventListener('change', () => {
      if (cb.checked) selectedKeys.add(key);
      else selectedKeys.delete(key);
      updateAll();
    });

    row.appendChild(cb);
    lineSelectInner.appendChild(row);

    for (let k = 1; k < wrappedRows; k++) {
      const spacer = document.createElement('div');
      spacer.className = 'line-check-row spacer';
      spacer.style.height = `${lh}px`;
      lineSelectInner.appendChild(spacer);
    }
  }

  syncCheckboxScroll();
}

function saveColorToSelected() {
  if (selectedKeys.size === 0) return;
  const c = textColorPicker.value;

  const next = { ...customColorsByKey };
  for (const k of selectedKeys) next[k] = c;
  customColorsByKey = next;

  updateAll();
}
saveColorBtn.addEventListener('click', saveColorToSelected);


function updatePreview(lines, keys) {
  previewLines.innerHTML = '';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const key = keys[i];

    const displayText = cleanLineText(raw);
    const baseColor = getBaseLineColor(raw);
    const finalColor = customColorsByKey[key] || baseColor;

    const row = document.createElement('div');
    row.className = 'chat-line';
    row.style.fontSize = fontSize + 'px';

    const runs = parseInlineColors(displayText, finalColor);
    const plain = runsToPlainText(runs);
    const hasText = !!plain.trim();

    if (!hasText) {
      const span = document.createElement('span');
      span.className = 'chat-span';
      span.style.color = finalColor;
      span.style.background = 'transparent';
      span.textContent = ' ';
      row.appendChild(span);
      previewLines.appendChild(row);
      continue;
    }

    for (const part of runs) {
      const segText = part.text.length ? part.text : ' ';
      const span = document.createElement('span');
      span.className = 'chat-span';
      span.style.color = part.color;

      if (segText.trim() && bgToggle.checked) span.style.background = colorPicker.value;
      else span.style.background = 'transparent';

      span.textContent = segText;
      row.appendChild(span);
    }

    previewLines.appendChild(row);
  }
}

function updateAll() {
  const lines = textInput.value.split('\n');
  const keys = buildLineKeys(lines);
  const keysSet = new Set(keys);

  pruneState(keysSet);
  renderSelectors(lines, keys);
  updatePreview(lines, keys);

  // ✅ لو الصورة مرفوعة: نعيد حساب size (لأن preview ممكن تتغير)
  if (bgImg && bgImg.src) clampOverlayToStage();
}

textInput.addEventListener('input', updateAll);
textInput.addEventListener('scroll', syncCheckboxScroll);
window.addEventListener('resize', () => {
  updateAll();
  if (bgImg && bgImg.src) resizeStageToImage();
});

colorPicker.addEventListener('input', updateAll);
bgToggle.addEventListener('change', updateAll);

function increaseSize() {
  fontSize += 1;
  sizeInput.value = fontSize + 'px';
  updateAll();
  clampOverlayToStage();
}
function decreaseSize() {
  if (fontSize > 8) {
    fontSize -= 1;
    sizeInput.value = fontSize + 'px';
    updateAll();
    clampOverlayToStage();
  }
}
window.increaseSize = increaseSize;
window.decreaseSize = decreaseSize;

/* Upload background */
bgUpload.addEventListener('change', () => {
  const f = bgUpload.files?.[0];
  if (!f) return;

  const url = URL.createObjectURL(f);

  bgImg.onload = () => {
    URL.revokeObjectURL(url);

    // ✅ اظهر مكان الصورة بعد الرفع
    stageWrap.classList.remove('hidden');

    // ✅ خليه على قد الصورة بالضبط
    resizeStageToImage();

    // ✅ خلي مكان الشات داخل الصورة مضبوط
    clampOverlayToStage();
  };

  bgImg.src = url;
});

/* Drag overlay */
let dragging = false;
let startClientX = 0;
let startClientY = 0;
let startLeft = 0;
let startTop = 0;

function getClientPoint(e) {
  if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function clampOverlayToStage() {
  if (!stageWrap || stageWrap.classList.contains('hidden')) return;

  const stageRect = stage.getBoundingClientRect();
  const overlayRect = chatOverlay.getBoundingClientRect();

  let leftPx = parseFloat(chatOverlay.style.left || '0');
  let topPx = parseFloat(chatOverlay.style.top || '0');

  const ow = overlayRect.width;
  const oh = overlayRect.height;

  leftPx = Math.max(0, Math.min(leftPx, stageRect.width - ow));
  topPx = Math.max(0, Math.min(topPx, stageRect.height - oh));

  chatOverlay.style.left = leftPx + 'px';
  chatOverlay.style.top = topPx + 'px';
}

function onDragStart(e) {
  if (e.target === rotateHandle) return;
  e.preventDefault();
  dragging = true;
  chatOverlay.classList.add('dragging');

  const p = getClientPoint(e);
  startClientX = p.x;
  startClientY = p.y;

  startLeft = parseFloat(chatOverlay.style.left || '0');
  startTop = parseFloat(chatOverlay.style.top || '0');
}

function onDragMove(e) {
  if (!dragging) return;

  const stageRect = stage.getBoundingClientRect();
  const p = getClientPoint(e);

  const dx = p.x - startClientX;
  const dy = p.y - startClientY;

  let leftPx = startLeft + dx;
  let topPx = startTop + dy;

  const ow = chatOverlay.getBoundingClientRect().width;
  const oh = chatOverlay.getBoundingClientRect().height;

  leftPx = Math.max(0, Math.min(leftPx, stageRect.width - ow));
  topPx = Math.max(0, Math.min(topPx, stageRect.height - oh));

  chatOverlay.style.left = leftPx + 'px';
  chatOverlay.style.top = topPx + 'px';
}

function onDragEnd() {
  dragging = false;
  chatOverlay.classList.remove('dragging');
}

chatOverlay.addEventListener('mousedown', onDragStart);
window.addEventListener('mousemove', onDragMove);
window.addEventListener('mouseup', onDragEnd);

chatOverlay.addEventListener('touchstart', onDragStart, { passive: false });
window.addEventListener('touchmove', onDragMove, { passive: false });
window.addEventListener('touchend', onDragEnd);

/* Rotate handle */
let rotating = false;
let rotateCenter = { x: 0, y: 0 };
let rotateStartPointerAngle = 0;
let rotateStartRotation = 0;

function angleFromCenter(cx, cy, x, y) {
  const rad = Math.atan2(y - cy, x - cx);
  return rad * (180 / Math.PI);
}

function getOverlayCenter() {
  const overlayRect = chatOverlay.getBoundingClientRect();
  return { cx: overlayRect.left + overlayRect.width / 2, cy: overlayRect.top + overlayRect.height / 2 };
}

function onRotateStart(e) {
  e.preventDefault();
  e.stopPropagation();

  rotating = true;
  chatOverlay.classList.add('rotating');

  const p = getClientPoint(e);
  const c = getOverlayCenter();
  rotateCenter = { x: c.cx, y: c.cy };

  rotateStartPointerAngle = angleFromCenter(rotateCenter.x, rotateCenter.y, p.x, p.y);
  rotateStartRotation = rotationDeg;
}

function onRotateMove(e) {
  if (!rotating) return;
  e.preventDefault();

  const p = getClientPoint(e);
  const currentPointerAngle = angleFromCenter(rotateCenter.x, rotateCenter.y, p.x, p.y);
  const delta = currentPointerAngle - rotateStartPointerAngle;
  setRotation(rotateStartRotation + delta);
}

function onRotateEnd() {
  rotating = false;
  chatOverlay.classList.remove('rotating');
}

rotateHandle.addEventListener('mousedown', onRotateStart);
window.addEventListener('mousemove', onRotateMove);
window.addEventListener('mouseup', onRotateEnd);

rotateHandle.addEventListener('touchstart', onRotateStart, { passive: false });
window.addEventListener('touchmove', onRotateMove, { passive: false });
window.addEventListener('touchend', onRotateEnd);

/* Export composite (wrap like preview + rotation) */
async function downloadComposite() {
  await ensureFontLoaded();

  if (!bgImg.src) {
    alert('Please upload an image first!');
    return;
  }

  const text = textInput.value;
  if (!text.trim()) {
    alert('Please enter some text first!');
    return;
  }

  const naturalW = bgImg.naturalWidth;
  const naturalH = bgImg.naturalHeight;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = naturalW;
  canvas.height = naturalH;

  ctx.drawImage(bgImg, 0, 0, naturalW, naturalH);

  const imgRect = bgImg.getBoundingClientRect();
  const scaleX = naturalW / imgRect.width;
  const scaleY = naturalH / imgRect.height;

  const overlayLeft = parseFloat(chatOverlay.style.left || '0');
  const overlayTop = parseFloat(chatOverlay.style.top || '0');

  const drawX = overlayLeft * scaleX;
  const drawY = overlayTop * scaleY;

  const lines = text.split('\n');
  const keys = buildLineKeys(lines);

  const canvasFontFamily = (FONT_MAP[currentFontKey]?.canvas) || FONT_MAP.tahoma.canvas;
  ctx.font = `${fontSize}px ${canvasFontFamily}`;
  ctx.textBaseline = 'top';

  const lineHeight = fontSize + 4;
  const paddingX = 4;
  const paddingY = 2;

  const overlayRect = previewLines.getBoundingClientRect();
  const maxTextWidth = (620 * scaleX) - (paddingX * 2);

  const visualLines = [];
let maxLineWidth = 0;

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const key = keys[i];

  const originalText = cleanLineText(raw);
  const baseColor = getBaseLineColor(raw);
  const finalColor = customColorsByKey[key] || baseColor;

  const runs = parseInlineColors(originalText, finalColor);
  const plain = runsToPlainText(runs);
  const hasText = !!plain.trim();

  const wrapped = wrapRunsCanvas(ctx, runs, maxTextWidth);

  for (const wline of wrapped) {
    let w = 0;
    for (const run of wline) w += ctx.measureText(run.text).width;
    if (w > maxLineWidth) maxLineWidth = w;

    visualLines.push({
      runs: wline,
      width: w,
      hasBg: hasText && bgToggle.checked
    });
  }
}

const blockW = maxLineWidth + (paddingX * 2);
const blockH = visualLines.length * lineHeight;

const rad = (rotationDeg * Math.PI) / 180;
const cx = drawX + blockW / 2;
const cy = drawY + blockH / 2;

ctx.save();
ctx.translate(cx, cy);
ctx.rotate(rad);

const originX = -blockW / 2;
const originY = -blockH / 2;

// backgrounds per wrapped line
let y = originY;
for (const lineObj of visualLines) {
  if (lineObj.hasBg && lineObj.width > 0) {
    ctx.fillStyle = colorPicker.value;
    ctx.fillRect(originX, y, lineObj.width + (paddingX * 2), lineHeight);
  }
  y += lineHeight;
}

// text runs
y = originY;
for (const lineObj of visualLines) {
  let x = originX + paddingX;
  for (const run of lineObj.runs) {
    ctx.fillStyle = run.color;
    ctx.fillText(run.text, x, y + paddingY);
    x += ctx.measureText(run.text).width;
  }
  y += lineHeight;
}

ctx.restore();

canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fileName =
      'chatphoto-' +
      now.getFullYear() + '-' +
      pad(now.getMonth() + 1) + '-' +
      pad(now.getDate()) + '_' +
      pad(now.getHours()) + '-' +
      pad(now.getMinutes()) + '-' +
      pad(now.getSeconds()) +
      '.png';

    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

window.downloadComposite = downloadComposite;

/* Init */
applyFont('tahoma');
setRotation(0);
updateAll();

/* ✅ اول ما تفتح الصفحة: نخفي الـ stage نهائي */
if (stageWrap) stageWrap.classList.add('hidden');
