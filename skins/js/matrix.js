const canvas = document.getElementById('matrix-rain-canvas');
if (!canvas) {
    console.error('Matrix rain canvas not found!');
}
const ctx = canvas.getContext('2d');

let animationInterval = null;

function setupCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Karakter setini oluşturuyoruz: Katakana + Latin Harfleri + Rakamlar
const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const characters = katakana + latin + nums;

const fontSize = 16;
let columns = 0;
let drops = [];

function initializeDrops() {
    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
}

function draw() {
    // Her karede, bir önceki kareyi hafifçe silerek iz efekti yaratıyoruz.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00FF41'; // Matrix yeşili
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Damlanın ekranın altına ulaşıp ulaşmadığını kontrol et.
        // Rastgele bir koşulla damlayı tekrar yukarı göndererek yağmurun düzensiz görünmesini sağla.
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

export function startMatrixRain() {
    if (animationInterval || !canvas) return;
    setupCanvas();
    initializeDrops();
    canvas.style.display = 'block';
    animationInterval = setInterval(draw, 33); // ~30 FPS
}

export function stopMatrixRain() {
    if (!animationInterval || !canvas) return;
    clearInterval(animationInterval);
    animationInterval = null;
    canvas.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
    if (animationInterval) {
        setupCanvas();
        initializeDrops();
    }
});

