const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const COLORS = [
    { key: 'green', hex: '#7BC67E', name: 'Зелёный' },
    { key: 'blue', hex: '#7BA8D9', name: 'Голубой' },
    { key: 'yellow', hex: '#F2D36B', name: 'Жёлтый' },
    { key: 'orange', hex: '#F2A65A', name: 'Оранжевый' },
    { key: 'pink', hex: '#E8A0BF', name: 'Розовый' },
    { key: 'purple', hex: '#B088D4', name: 'Фиолетовый' },
    { key: 'red', hex: '#E07A7A', name: 'Красный' },
    { key: 'teal', hex: '#6BCABA', name: 'Бирюзовый' },
];

let coins = JSON.parse(localStorage.getItem('vaze_coins') || '[]');
let vaseSize = parseInt(localStorage.getItem('vaze_size') || '25');
let selectedColor = null;

// Screens
const screenMain = document.getElementById('screen-main');
const screenAdd = document.getElementById('screen-add');
const overlaySuccess = document.getElementById('overlay-success');

// Elements
const canvas = document.getElementById('vase-canvas');
const ctx = canvas.getContext('2d');
const counter = document.getElementById('vase-counter');
const btnAdd = document.getElementById('btn-add');
const btnBack = document.getElementById('btn-back');
const btnSave = document.getElementById('btn-save');
const coinText = document.getElementById('coin-text');
const colorGrid = document.getElementById('color-grid');
const successCoin = document.getElementById('success-coin');

// Init color grid
COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.background = c.hex;
    btn.dataset.key = c.key;
    btn.setAttribute('aria-label', c.name);
    btn.addEventListener('click', () => selectColor(c.key, btn));
    colorGrid.appendChild(btn);
});

function selectColor(key, btn) {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = key;
    updateSaveBtn();
    tg.HapticFeedback.selectionChanged();
}

function updateSaveBtn() {
    btnSave.disabled = !(coinText.value.trim() && selectedColor);
}

coinText.addEventListener('input', updateSaveBtn);

// Navigation
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

btnAdd.addEventListener('click', () => {
    showScreen(screenAdd);
    coinText.value = '';
    selectedColor = null;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    updateSaveBtn();
    setTimeout(() => coinText.focus(), 300);
    tg.HapticFeedback.impactOccurred('light');
});

btnBack.addEventListener('click', () => {
    showScreen(screenMain);
    tg.HapticFeedback.impactOccurred('light');
});

// Save coin
btnSave.addEventListener('click', () => {
    const text = coinText.value.trim();
    if (!text || !selectedColor) return;

    const coin = {
        text: text,
        color: selectedColor,
        hex: COLORS.find(c => c.key === selectedColor).hex,
        date: new Date().toISOString()
    };

    coins.push(coin);
    localStorage.setItem('vaze_coins', JSON.stringify(coins));

    // Send to bot
    tg.sendData(JSON.stringify({
        action: 'add_coin',
        text: coin.text,
        color: coin.color
    }));

    // Show success
    successCoin.style.background = coin.hex;
    overlaySuccess.classList.add('active');
    tg.HapticFeedback.notificationOccurred('success');

    setTimeout(() => {
        overlaySuccess.classList.remove('active');
        showScreen(screenMain);
        renderVase();
    }, 1200);
});

// Vase rendering on canvas
function renderVase() {
    const dpr = window.devicePixelRatio || 1;
    const w = 300;
    const h = 400;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#fdf8f0';
    ctx.fillRect(0, 0, w, h);

    // Draw vase shape
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.08); // left rim
    ctx.quadraticCurveTo(w * 0.30, h * 0.15, w * 0.22, h * 0.25); // left neck
    ctx.quadraticCurveTo(w * 0.12, h * 0.40, w * 0.15, h * 0.60); // left belly
    ctx.quadraticCurveTo(w * 0.18, h * 0.80, w * 0.30, h * 0.92); // left base
    ctx.lineTo(w * 0.70, h * 0.92); // bottom
    ctx.quadraticCurveTo(w * 0.82, h * 0.80, w * 0.85, h * 0.60); // right base
    ctx.quadraticCurveTo(w * 0.88, h * 0.40, w * 0.78, h * 0.25); // right belly
    ctx.quadraticCurveTo(w * 0.70, h * 0.15, w * 0.65, h * 0.08); // right neck
    ctx.closePath();

    ctx.fillStyle = '#d4e8e0';
    ctx.fill();
    ctx.strokeStyle = '#8cbcab';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw coins inside vase
    const positions = getCoinPositions(vaseSize, w, h);
    const coinR = 14;

    positions.forEach((pos, i) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, coinR, 0, Math.PI * 2);

        if (i < coins.length) {
            ctx.fillStyle = coins[i].hex;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Text inside coin
            const displayText = coins[i].text.length > 5
                ? coins[i].text.substring(0, 4) + '…'
                : coins[i].text;
            ctx.fillStyle = 'white';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, pos.x, pos.y);
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.strokeStyle = 'rgba(200,200,200,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    counter.textContent = `${coins.length} / ${vaseSize}`;
}

function getCoinPositions(total, w, h) {
    const positions = [];
    const coinR = 14;
    const spacing = coinR * 2 + 6;
    let y = h * 0.86;
    const endY = h * 0.15;

    while (positions.length < total && y > endY) {
        const vaseWidth = getVaseWidthAtY(y, w, h) * 0.78;
        const cols = Math.max(1, Math.floor(vaseWidth / spacing));
        const startX = (w - (cols - 1) * spacing) / 2;

        for (let col = 0; col < cols && positions.length < total; col++) {
            positions.push({
                x: startX + col * spacing,
                y: y
            });
        }
        y -= spacing;
    }

    return positions;
}

function getVaseWidthAtY(y, w, h) {
    const ratio = y / h;
    if (ratio < 0.15) return w * 0.30;
    if (ratio < 0.25) return w * 0.35 + (ratio - 0.15) / 0.10 * w * 0.30;
    if (ratio < 0.60) return w * 0.70;
    if (ratio < 0.80) return w * 0.68;
    if (ratio < 0.92) return w * 0.55;
    return w * 0.40;
}

// Theme from Telegram
if (tg.colorScheme === 'dark') {
    document.documentElement.style.setProperty('--bg', '#1a1a2e');
    document.documentElement.style.setProperty('--bg-paper', '#16213e');
    document.documentElement.style.setProperty('--text', '#e0e0e0');
    document.documentElement.style.setProperty('--text-light', '#a0a0a0');
}

// Initial render
renderVase();
