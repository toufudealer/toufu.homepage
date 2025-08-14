import * as storage from './storage.js';

const canvas = document.getElementById('weather-effect-canvas');
if (!canvas) {
    console.error('Weather effect canvas not found!');
}
const ctx = canvas.getContext('2d');

let animationFrameId = null;
let particles = [];
let effectType = 'none'; // 'none', 'rain', 'snow', 'thunderstorm'

// Efekt renklerini temadan almak için önbellek nesnesi
let effectColors = {
    rain: '255, 255, 255',
    snow: '255, 255, 255',
    lightning: '255, 255, 240'
};

// Şimşek efekti için değişkenler
let lightningActive = false;
let lightningOpacity = 0;
let lightningTimer = 0;

function getCssVariable(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

function setupCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// --- Yağmur Damlası Sınıfı ---
class RainDrop {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.length = Math.random() * 20 + 10;
        this.speed = Math.random() * 5 + 4;
        this.opacity = Math.random() * 0.5 + 0.3;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.strokeStyle = `rgba(${effectColors.rain}, ${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.reset();
        }
    }
}

// --- Kar Tanesi Sınıfı ---
class Snowflake {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.radius = Math.random() * 3 + 1;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 2 - 1; // Yana doğru salınım için
        this.opacity = Math.random() * 0.8 + 0.2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${effectColors.snow}, ${this.opacity})`;
        ctx.fill();
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;

        // Ekran dışına çıkarsa sıfırla
        if (this.y > canvas.height || this.x > canvas.width || this.x < 0) {
            this.reset();
        }
    }
}

function handleLightning() {
    // Rastgele bir zamanda şimşek çaktır
    if (!lightningActive && Math.random() < 0.005) { // Olasılığı ayarlayabilirsiniz
        lightningActive = true;
        lightningOpacity = Math.random() * 0.5 + 0.4; // Farklı parlaklıklar için rastgele opaklık
        lightningTimer = Math.random() * 15 + 5; // Şimşeğin ekranda kalma süresi (kare sayısı)
    }

    if (lightningActive) {
        // Tüm ekranı kaplayan parlak bir katman çiz
        ctx.fillStyle = `rgba(${effectColors.lightning}, ${lightningOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Zamanlayıcıyı ve opaklığı azaltarak sönme efekti yarat
        lightningTimer--;
        lightningOpacity *= 0.92; // Daha hızlı sönmesi için

        if (lightningTimer <= 0) {
            lightningActive = false;
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // Eğer fırtına efekti aktifse, şimşekleri de işle
    if (effectType === 'thunderstorm') {
        handleLightning();
    }

    animationFrameId = requestAnimationFrame(animate);
}

function stop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
    effectType = 'none';

    // Şimşek durumunu da sıfırla
    lightningActive = false;
    lightningOpacity = 0;
    lightningTimer = 0;
}

function updateEffectColors() {
    effectColors.rain = getCssVariable('--weather-rain-color', '255, 255, 255');
    effectColors.snow = getCssVariable('--weather-snow-color', '255, 255, 255');
    effectColors.lightning = getCssVariable('--weather-lightning-color', '255, 255, 240');
}

function start(newEffectType, particleCount) {
    if (!canvas) return;
    stop(); // Önceki efekti durdur
    effectType = newEffectType;
    updateEffectColors(); // Efekt başlamadan önce mevcut temadan renkleri al
    setupCanvas();

    if (effectType === 'none') return;

    let particleClass;
    if (newEffectType === 'rain' || newEffectType === 'thunderstorm') {
        particleClass = RainDrop;
    } else if (newEffectType === 'snow') {
        particleClass = Snowflake;
    }

    if (particleClass) {
        for (let i = 0; i < particleCount; i++) {
            particles.push(new particleClass());
        }
    }
    animate();
}

/**
 * WMO hava durumu koduna göre uygun efekti başlatır.
 * @param {number} code - WMO hava durumu yorumlama kodu.
 */
export function startEffectByWeatherCode(code) {
    // Debug ayarını kontrol et
    const debugEffect = storage.getStoredJSON('debugWeatherEffect', 'auto');
    if (debugEffect !== 'auto') {
        switch (debugEffect) {
            case 'rain':
                start('rain', 200);
                break;
            case 'snow':
                start('snow', 150);
                break;
            case 'thunderstorm':
                start('thunderstorm', 300);
                break;
            case 'none':
                stop();
                break;
        }
        return; // Debug modu aktifse, hava durumu kodunu kontrol etme.
    }

    // Ayarlardan efektlerin açık olup olmadığını kontrol et
    const effectsEnabled = storage.getStoredJSON('weatherEffectsEnabled', true); // Varsayılan olarak açık
    if (!effectsEnabled) {
        stop();
        return;
    }

    // Çisenti, Yağmur, Sağanak Yağmur
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        start('rain', 200);
    }
    // Kar
    else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        start('snow', 150);
    }
    // Fırtına (daha yoğun yağmur)
    else if (code >= 95 && code <= 99) {
        start('thunderstorm', 300);
    }
    // Açık veya diğer durumlar
    else {
        stop();
    }
}

export function stopAllEffects() {
    stop();
}

window.addEventListener('resize', () => {
    if (animationFrameId) setupCanvas();
});