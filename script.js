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

// selection by stable key
const selectedKeys = new Set();
let customColorsByKey = {}; // { key: "#RRGGBB" }

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

function applyFont(key) {
  currentFontKey = (key in FONT_MAP) ? key : 'tahoma';
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

/**
 * ✅ المطلوب:
 * - الخلفية على قد عرض السطر فقط
 * - الخلفية متلاصقة عموديًا (بدون فراغات)
 * - السطر الفاضي ما له خلفية
 */
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

    // خلفية فقط لو السطر مش فاضي + التفعيل شغال
    const hasText = !!displayText.trim();
    if (hasText && bgToggle.checked) {
      span.style.background = colorPicker.value;
    } else {
      span.style.background = 'transparent';
    }

    span.textContent = hasText ? displayText : ' '; // يحافظ على ارتفاع السطر

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
});

function increaseSize() {
  fontSize += 1;
  sizeInput.value = fontSize + 'px';
  updateAll();
}

function decreaseSize() {
  if (fontSize > 8) {
    fontSize -= 1;
    sizeInput.value = fontSize + 'px';
    updateAll();
  }
}

document.getElementById('copyText').addEventListener('click', function () {
  navigator.clipboard.writeText(textInput.value).then(function () {
    const notification = document.getElementById('notification');
    notification.classList.add('show');
    setTimeout(function () {
      notification.classList.remove('show');
    }, 2000);
  });
});

// ✅ Export: نفس منطق الخلفية (عرض السطر فقط + بدون فراغات + بدون خلفية للسطر الفاضي)
async function downloadImage(transparent) {
  await ensureFontLoaded();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const text = textInput.value;

  if (!text.trim()) {
    alert('Please enter some text first!');
    return;
  }

  const lines = text.split('\n');
  const keys = buildLineKeys(lines);

  const canvasFontFamily = (FONT_MAP[currentFontKey]?.canvas) || FONT_MAP.tahoma.canvas;
  ctx.font = `${fontSize}px ${canvasFontFamily}`;

  const lineHeight = fontSize + 4;
  const paddingX = 4;
  const paddingY = 2;

  let maxWidth = 0;
  const lineData = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const key = keys[i];

    const displayText = cleanLineText(raw) || ' ';
    const baseColor = getBaseLineColor(raw);
    const finalColor = customColorsByKey[key] || baseColor;

    const width = ctx.measureText(displayText).width;
    lineData.push({ text: displayText, color: finalColor, width });
    if (width > maxWidth) maxWidth = width;
  }

  canvas.width = maxWidth + (paddingX * 2) + 10;
  canvas.height = (lines.length * lineHeight) + 10;

  ctx.font = `${fontSize}px ${canvasFontFamily}`;
  ctx.textBaseline = 'top';

  let currentY = 5;

  for (let i = 0; i < lineData.length; i++) {
    const data = lineData[i];
    const hasText = !!data.text.trim();

    // ✅ خلفية على قد عرض السطر فقط + لا ترسم للسطر الفاضي
    if (hasText && !transparent && bgToggle.checked) {
      ctx.fillStyle = colorPicker.value;
      ctx.fillRect(5, currentY, data.width + (paddingX * 2), lineHeight);
    }

    ctx.fillStyle = data.color;
    ctx.fillText(data.text, 5 + paddingX, currentY + paddingY);
    currentY += lineHeight;
  }

  canvas.toBlob(function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    const fileName =
      'chatlog-' +
      now.getFullYear() + '-' +
      pad(now.getMonth() + 1) + '-' +
      pad(now.getDate()) + '_' +
      pad(now.getHours()) + '-' +
      pad(now.getMinutes()) + '-' +
      pad(now.getSeconds()) +
      (transparent ? '-transparent' : '') +
      '.png';

    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// init
applyFont('tahoma');
updateAll();
