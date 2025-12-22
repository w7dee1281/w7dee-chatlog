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
const copyBtn = document.getElementById('copyText');

const selectedKeys = new Set();
let customColorsByKey = {};

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

/* ===== Wrap helpers (checkbox alignment + canvas export) ===== */
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

  const tokens = text.split(/(\s+)/); // keep spaces
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

    // token longer than maxWidth -> split
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

/* ===== Checkbox + preview rendering ===== */
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

    // row 1: real checkbox
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

    // continuation visual rows (no checkbox)
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
/* ===== Inline color tags [c=XXXXXX]...[/c] ===== */
function parseInlineColorSegments(text) {
  const segs = [];
  if (!text) return segs;

  const re = /\[c=([0-9A-Fa-f]{6})\]([\s\S]*?)\[\/c\]/g;
  let last = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) segs.push({ text: before, colorHex: null });

    segs.push({ text: m[2], colorHex: m[1].toUpperCase() });
    last = m.index + m[0].length;
  }

  const tail = text.slice(last);
  if (tail) segs.push({ text: tail, colorHex: null });

  return segs;
}

function renderInlineColoredText(parentEl, text, baseColor) {
  parentEl.textContent = '';

  const segs = parseInlineColorSegments(text);

  // لو ما فيه أي [c=] خل النص طبيعي
  if (segs.length === 0) {
    parentEl.textContent = text;
    return;
  }

  for (const s of segs) {
    const sp = document.createElement('span');
    sp.textContent = s.text;
    sp.style.color = s.colorHex ? ('#' + s.colorHex) : baseColor;
    parentEl.appendChild(sp);
  }
}


function wrapColoredSegmentsCanvas(ctx, segments, maxWidth) {
  // segments: [{text, color}] where color is '#RRGGBB'
  const lines = [];
  let line = [];
  let lineWidth = 0;

  function pushLine() {
    lines.push(line.length ? line : [{ text: ' ', color: '#ffffff' }]);
    line = [];
    lineWidth = 0;
  }

  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/); // keep spaces

    for (const part of parts) {
      if (!part) continue;

      const w = ctx.measureText(part).width;

      if (lineWidth + w <= maxWidth || line.length === 0) {
        line.push({ text: part, color: seg.color });
        lineWidth += w;
      } else {
        pushLine();
        line.push({ text: part, color: seg.color });
        lineWidth = w;
      }
    }
  }

  if (line.length) pushLine();
  return lines; // array of lines; each line is array of colored parts
}

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

    const span = document.createElement('span');
    span.className = 'chat-span';

    const hasText = !!displayText.trim();

    // الخلفية مثل ما هي عندك
    if (hasText && bgToggle.checked) {
      span.style.background = colorPicker.value;
    } else {
      span.style.background = 'transparent';
    }

    // ⭐ هنا الجديد: تلوين أجزاء من السطر
    if (hasText) {
      renderInlineColoredText(span, displayText, finalColor);
    } else {
      span.textContent = ' ';
    }

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
window.addEventListener('resize', updateAll);

colorPicker.addEventListener('input', updateAll);
bgToggle.addEventListener('change', updateAll);

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
window.increaseSize = increaseSize;
window.decreaseSize = decreaseSize;

/* Copy */
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(textInput.value).then(() => {
    const n = document.getElementById('notification');
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 1400);
  });
});

/* ===== Export (wrap like preview) ===== */
async function downloadImage(transparent) {
  await ensureFontLoaded();

  const text = textInput.value;
  if (!text.trim()) {
    alert('Please enter some text first!');
    return;
  }

  const lines = text.split('\n');
  const keys = buildLineKeys(lines);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const canvasFontFamily = (FONT_MAP[currentFontKey]?.canvas) || FONT_MAP.tahoma.canvas;
  ctx.font = `${fontSize}px ${canvasFontFamily}`;
  ctx.textBaseline = 'top';

  const lineHeight = fontSize + 4;
  const paddingX = 4;
  const paddingY = 2;

  const maxTextWidth = Math.max(220, (previewLines?.clientWidth || 900) - (paddingX * 2));

  const segments = [];
  let maxSegWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const key = keys[i];

    const originalText = cleanLineText(raw);
    const baseColor = getBaseLineColor(raw);
    const finalColor = customColorsByKey[key] || baseColor;

    const hasText = !!originalText.trim();
    const inlineSegs = parseInlineColorSegments(originalText);

    const coloredSegs = inlineSegs.length
    ? inlineSegs.map(s => ({
      text: s.text,
      color: s.colorHex ? ('#' + s.colorHex) : finalColor
     }))
  :   [{ text: originalText, color: finalColor }];

    const wrappedLines = wrapColoredSegmentsCanvas(ctx, coloredSegs, maxTextWidth);

for (const lineParts of wrappedLines) {
  const w = lineParts.reduce(
    (acc, p) => acc + ctx.measureText(p.text).width,
    0
  );

  if (w > maxSegWidth) maxSegWidth = w;

  segments.push({
    parts: lineParts,
    width: w,
    hasBg: hasText && bgToggle.checked && !transparent
  });
}

  }

  canvas.width = Math.ceil(maxSegWidth + (paddingX * 2) + 10);
  canvas.height = Math.ceil((segments.length * lineHeight) + 10);

  ctx.font = `${fontSize}px ${canvasFontFamily}`;
  ctx.textBaseline = 'top';

  let y = 5;

  for (const seg of segments) {
    if (seg.hasBg && seg.parts && seg.parts.some(p => p.text.trim())) {
      ctx.fillStyle = colorPicker.value;
      ctx.fillRect(5, y, seg.width + (paddingX * 2), lineHeight);
    }

   let x = 5 + paddingX;
for (const p of seg.parts) {
  ctx.fillStyle = p.color;
  ctx.fillText(p.text, x, y + paddingY);
  x += ctx.measureText(p.text).width;
}


    y += lineHeight;
  }

  canvas.toBlob((blob) => {
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
window.downloadImage = downloadImage;

/* Init */
applyFont('tahoma');
updateAll();
