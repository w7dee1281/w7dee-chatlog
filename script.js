let fontSize = 13;
const textInput = document.getElementById('textInput');
const previewLines = document.getElementById('previewLines');
const sizeInput = document.getElementById('sizeInput');
const colorPicker = document.getElementById('colorPicker');
const textColorPicker = document.getElementById('textColorPicker');
const bgToggle = document.getElementById('bgToggle');

function getLineColor(line) {
    const defaultColor = textColorPicker.value;
    
    if (!line || line.length === 0) return defaultColor;
    
    // Color code {XXXXXX}
    if (line.length >= 8 && line[0] === '{' && line[7] === '}') {
        const colorCode = line.substring(1, 7);
        if (/^[0-9A-Fa-f]{6}$/.test(colorCode)) {
            return '#' + colorCode;
        }
    }
    
    // Remove color code
    let cleanLine = line;
    if (line.length >= 8 && line[0] === '{' && line[7] === '}') {
        cleanLine = line.substring(8);
    }
    
    // Check for [RADIO] and whispers (case insensitive)
    const lowerLine = cleanLine.toLowerCase();
    
    // [RADIO] - Color: #FEE58F
    if (lowerLine.includes('[radio]')) {
        return '#FEE58F';
    }
    
    // whispers - Color: #eda841
    if (lowerLine.includes('whispers')) {
        return '#eda841';
    }
    
    const trimmed = cleanLine.trim();
    if (trimmed.length === 0) return defaultColor;
    
    const first = trimmed[0];
    
    // Only ✪ star doesn't change color (follows other color rules)
    // While * and ★ change color to purple
    if (first === '*' || first === String.fromCharCode(0x2605)) return '#C2A2DA';
    
    // If ✪ star is at the beginning, ignore it for other rule checks
    let lineForColorCheck = cleanLine;
    if (first === String.fromCharCode(0x272A)) {
        lineForColorCheck = cleanLine.substring(1).trim();
    }
    
    // Phone check
    const lower = lineForColorCheck.toLowerCase();
    if (lower.indexOf('[phone]') >= 0) return '#c8ffc8';
    
    // Gives/Gave check
    if (lineForColorCheck.indexOf(' gives ') >= 0) return '#56d64b';
    if (lineForColorCheck.indexOf(' gave ') >= 0) return '#56d64b';
    if (lineForColorCheck.indexOf('You gave $') === 0) return '#56d64b';
    if (lineForColorCheck.indexOf(' gave you $') >= 0) return '#56d64b';
    
    return defaultColor;
}

function cleanLineText(line) {
    if (!line) return '';
    if (line.length >= 8 && line[0] === '{' && line[7] === '}') {
        return line.substring(8);
    }
    return line;
}

function updatePreview() {
    const lines = textInput.value.split('\n');
    previewLines.innerHTML = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineDiv = document.createElement('div');
        lineDiv.className = 'chat-line';
        
        const displayText = cleanLineText(line);
        const textColor = getLineColor(line);
        
        // If line is empty, keep it empty without background
        if (!displayText.trim()) {
            lineDiv.innerHTML = '&nbsp;';
            lineDiv.style.background = 'transparent';
        } else {
            lineDiv.textContent = displayText;
            
            if (bgToggle.checked) {
                lineDiv.style.background = colorPicker.value;
            } else {
                lineDiv.style.background = 'transparent';
            }
        }
        
        lineDiv.style.fontSize = fontSize + 'px';
        lineDiv.style.color = textColor;
        
        previewLines.appendChild(lineDiv);
    }
}

// Event Listeners
textInput.addEventListener('input', updatePreview);
colorPicker.addEventListener('input', updatePreview);
textColorPicker.addEventListener('input', updatePreview);
bgToggle.addEventListener('change', updatePreview);

function increaseSize() {
    fontSize += 1;
    sizeInput.value = fontSize + 'px';
    updatePreview();
}

function decreaseSize() {
    if (fontSize > 8) {
        fontSize -= 1;
        sizeInput.value = fontSize + 'px';
        updatePreview();
    }
}

document.getElementById('copyText').addEventListener('click', function() {
    navigator.clipboard.writeText(textInput.value).then(function() {
        const notification = document.getElementById('notification');
        notification.classList.add('show');
        setTimeout(function() {
            notification.classList.remove('show');
        }, 2000);
    });
});

function downloadImage(transparent) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const text = textInput.value;
    
    if (!text.trim()) {
        alert('Please enter some text first!');
        return;
    }
    
    ctx.font = fontSize + 'px Tahoma, Arial, sans-serif';
    const lines = text.split('\n');
    const lineHeight = fontSize + 4;
    const paddingX = 4;
    const paddingY = 2;
    
    let maxWidth = 0;
    const lineData = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const displayText = cleanLineText(line) || ' ';
        const textColor = getLineColor(line);
        const width = ctx.measureText(displayText).width;
        
        lineData.push({
            text: displayText,
            color: textColor,
            width: width
        });
        
        if (width > maxWidth) maxWidth = width;
    }
    
    canvas.width = maxWidth + (paddingX * 2) + 10;
    canvas.height = (lines.length * lineHeight) + 10;
    
    ctx.font = fontSize + 'px Tahoma, Arial, sans-serif';
    ctx.textBaseline = 'top';
    
    let currentY = 5;
    
    for (let i = 0; i < lineData.length; i++) {
        const data = lineData[i];
        
        // Don't draw background for empty lines
        if (data.text.trim() && !transparent && bgToggle.checked) {
            ctx.fillStyle = colorPicker.value;
            ctx.fillRect(5, currentY, data.width + (paddingX * 2), lineHeight);
        }
        
        ctx.fillStyle = data.color;
        ctx.fillText(data.text, 5 + paddingX, currentY + paddingY);
        
        currentY += lineHeight;
    }
    
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transparent ? 'chatlog-transparent.png' : 'chatlog.png';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Initialization
updatePreview();