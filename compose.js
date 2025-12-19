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

let currentFontKey = 'tahoma';

async function ensureFontLoaded() {
  try {
    if (!document.fonts || !document.fonts.load) return;
    const f = FONT_MAP[currentFontKey] || FONT_MAP.tahoma;
    await document.fonts.load(`${Math.max(fontSize, 12)}px "${f.load}"`);
    await document.fonts.ready;
  } catch (_) {}
}

function setRotation(deg) {
  rotationDeg = deg;
  chatOverlay.style.transform = `rotate(${rotationDeg}deg)`;
  if (rotationInput) rotationInput.value = `${Math.round(rotationDeg)}°`;
  clampOverlayToStage();
}

function applyFont(key) {
  currentFontKey = (key in FONT_MAP) ? key : 'tahoma';
  document.documentElement.style.setProperty('--chat-font', FONT_MAP[currentFontKey].css);
  chatScope.style.setProperty('--chat-font', FONT_MAP[currentFontKey].css);
  updateAll();
}
fontSelect.addEventListener('change', () => applyFont(fontSelect.value));

function cleanLineText(line) {
  if (!line) return '';
  if (line.length >= 8 && line[0] === '{' && line[7] === '}') return line.substring(8);
  return line;
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

function syncCheckboxLineHeight() {
  const cs = window.getComputedStyle(textInput);
  const lh = parseFloat(cs.lineHeight) || 20;
  const rows = lineSelectInner.querySelectorAll('.line-check-row');
  rows.forEach(r => r.style.height = `${lh}px`);
}

function syncCheckboxScroll() {
  lineSelectInner.style.transform = `translateY(${-textInput.scrollTop}px)`;
}

function renderSelectors(lines, keys) {
  lineSelectInner.innerHTML = '';

  for (let i = 0; i < lines.length; i++) {
    const key = keys[i];

    const row = document.createElement('div');
    row.className = 'line-check-row';
    if (selectedKeys.has(key)) row.classList.add('selected');

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
  }

  syncCheckboxLineHeight();
  syncCheckboxScroll();
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

function saveColorToSelected() {
  if (selectedKeys.size === 0) return;
  const c = textColorPicker.value;

  const next = { ...customColorsByKey };
  for (const k of selectedKeys) next[k] = c;
  customColorsByKey = next;

  updateAll();
}
saveColorBtn.addEventListener('click', saveColorToSelected);

// ✅ Preview فوق الصورة: خلفية على قد عرض السطر + متلاصقة + السطر الفاضي بدون خلفية
function updatePreview(lines, keys) {
  previewLines.innerHTML = '';

  const lineHeight = fontSize + 4;
  const paddingX = 4;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const key = keys[i];

    const displayText = cleanLineText(raw);
    const baseColor = getBaseLineColor(raw);
    const finalColor = customColorsByKey[key] || baseColor;

    const row = document.createElement('div');
    row.className = 'chat-line';
    row.style.fontSize = fontSize + 'px';
    row.style.lineHeight = lineHeight + 'px';
    row.style.height = lineHeight + 'px';
    row.style.margin = '0';
    row.style.padding = '0';

    const span = document.createElement('span');
    span.className = 'chat-span';
    span.style.display = 'inline-block';
    span.style.padding = `0 ${paddingX}px`;
    span.style.height = lineHeight + 'px';
    span.style.lineHeight = lineHeight + 'px';
    span.style.color = finalColor;

    const hasText = !!displayText.trim();
    if (hasText && bgToggle.checked) span.style.background = colorPicker.value;
    else span.style.background = 'transparent';

    span.textContent = hasText ? displayText : ' ';

    row.appendChild(span);
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
}

textInput.addEventListener('input', updateAll);
textInput.addEventListener('scroll', syncCheckboxScroll);

colorPicker.addEventListener('input', updateAll);
bgToggle.addEventListener('change', updateAll);

window.addEventListener('resize', () => {
  syncCheckboxLineHeight();
  syncCheckboxScroll();
  clampOverlayToStage();
});

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

bgUpload.addEventListener('change', () => {
  const f = bgUpload.files?.[0];
  if (!f) return;

  const url = URL.createObjectURL(f);
  bgImg.onload = () => {
    URL.revokeObjectURL(url);
    clampOverlayToStage();
  };
  bgImg.src = url;
});

let dragging = false;
let startClientX = 0;
let startClientY = 0;
let startLeft = 0;
let startTop = 0;

function getClientPoint(e) {
  if (e.touches && e.touches.length) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function clampOverlayToStage() {
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

// Rotate
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
  const cx = overlayRect.left + overlayRect.width / 2;
  const cy = overlayRect.top + overlayRect.height / 2;
  return { cx, cy };
}

function onRotateStart(e) {
  e.preventDefault();
  e.stopPropagation();

  rotating = true;
  chatOverlay.classList.add('rotating');

  const p = getClientPoint(e);
  const c = getOverlayCenter();
  rotateCenter = { x: c.cx, y: c.cy };

  const a = angleFromCenter(rotateCenter.x, rotateCenter.y, p.x, p.y);
  rotateStartPointerAngle = a;
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

// ✅ Export (Image + Chat): نفس منطق الخلفية + يحافظ على rotation
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

  // Measure each line
  const prepared = [];
  let maxWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const key = keys[i];

    const displayText = cleanLineText(raw) || ' ';
    const baseColor = getBaseLineColor(raw);
    const finalColor = customColorsByKey[key] || baseColor;

    const w = ctx.measureText(displayText).width;
    if (w > maxWidth) maxWidth = w;

    prepared.push({ text: displayText, color: finalColor, width: w });
  }

  const blockW = maxWidth + (paddingX * 2);
  const blockH = lines.length * lineHeight;

  const rad = (rotationDeg * Math.PI) / 180;
  const cx = drawX + blockW / 2;
  const cy = drawY + blockH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  const originX = -blockW / 2;
  const originY = -blockH / 2;

  // ✅ خلفية لكل سطر على قد عرضه + متلاصقة + بدون خلفية للسطر الفاضي
  for (let i = 0; i < prepared.length; i++) {
    const hasText = !!prepared[i].text.trim();
    if (hasText && bgToggle.checked) {
      ctx.fillStyle = colorPicker.value;
      ctx.fillRect(
        originX,
        originY + (i * lineHeight),
        prepared[i].width + (paddingX * 2),
        lineHeight
      );
    }
  }

  for (let i = 0; i < prepared.length; i++) {
    ctx.fillStyle = prepared[i].color;
    ctx.fillText(
      prepared[i].text,
      originX + paddingX,
      originY + (i * lineHeight) + paddingY
    );
  }

  ctx.restore();

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

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

    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

window.downloadComposite = downloadComposite;

// Init
applyFont('tahoma');
setRotation(0);
updateAll();
