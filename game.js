// Configurazione del gioco
const config = {
    discSpawnRate: 2000, // millisecondi tra ogni disco
    discSpeed: 2, // velocità dei dischi
    bulletSpeed: 15, // velocità dei proiettili
    discRadius: 30, // raggio dei dischi
    bulletRadius: 5, // raggio dei proiettili
    thumbThreshold: 0.1, // soglia per rilevare pollice abbassato (distanza relativa)
    maxThumbHeight: 0.05 // altezza massima del pollice per considerarlo "abbassato" (grilletto)
};

// Stato del gioco
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    hits: 0,
    missed: 0,
    lastShotTime: 0,
    shotCooldown: 200 // millisecondi tra un colpo e l'altro
};

// Elementi DOM
const video = document.getElementById('video');
const gameCanvas = document.getElementById('gameCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const gameCtx = gameCanvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const scoreEl = document.getElementById('score');
const hitsEl = document.getElementById('hits');
const missedEl = document.getElementById('missed');
const showSkeletonCheckbox = document.getElementById('showSkeleton');
const statusBanner = document.getElementById('statusBanner');
const gameOverlayMessage = document.getElementById('gameOverlayMessage');

// Array di gioco
let discs = [];
let bullets = [];
let particles = [];
let handLandmarks = null;
let lastThumbState = false;

// Inizializza dimensioni canvas
function resizeCanvas() {
    const rect = gameCanvas.getBoundingClientRect();
    gameCanvas.width = rect.width;
    gameCanvas.height = rect.height;
    overlayCanvas.width = rect.width;
    overlayCanvas.height = rect.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mostra un messaggio di stato nel pannello laterale
function showStatus(message, isInfo = false) {
    statusBanner.textContent = message;
    statusBanner.hidden = false;
    statusBanner.classList.toggle('status-banner--info', isInfo);
}

function hideStatus() {
    statusBanner.hidden = true;
}

// Classe Disco
class Disc {
    constructor() {
        this.radius = config.discRadius;
        this.x = Math.random() < 0.5 ? -this.radius : gameCanvas.width + this.radius;
        this.y = Math.random() * (gameCanvas.height - 100) + 50;
        this.speedX = this.x < gameCanvas.width / 2 ? config.discSpeed : -config.discSpeed;
        this.speedY = (Math.random() - 0.5) * config.discSpeed * 0.5;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        
        // Rimuovi se esce dallo schermo
        if (this.x < -this.radius || this.x > gameCanvas.width + this.radius) {
            return false;
        }
        if (this.y < -this.radius || this.y > gameCanvas.height + this.radius) {
            return false;
        }
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Disegna disco
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Disegna centro
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(bullet) {
        const dx = this.x - bullet.x;
        const dy = this.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + bullet.radius;
    }
}

// Classe Proiettile
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.radius = config.bulletRadius;
        this.speed = config.bulletSpeed;
        this.angle = angle;
        this.speedX = Math.cos(angle) * this.speed;
        this.speedY = Math.sin(angle) * this.speed;
        this.life = 60; // frame di vita
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        return this.life > 0 && 
               this.x > 0 && this.x < gameCanvas.width &&
               this.y > 0 && this.y < gameCanvas.height;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Effetto bagliore
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius * 2, this.y - this.radius * 2, this.radius * 4, this.radius * 4);
    }
}

// Classe Particella (effetto esplosione al colpo)
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        this.radius = 2 + Math.random() * 3;
        this.life = 30;
        this.maxLife = this.life;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.15; // gravità leggera
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(this.life / this.maxLife, 0);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onHandResults);

// Funzione callback per i risultati della mano
function onHandResults(results) {
    overlayCtx.save();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        handLandmarks = landmarks;
        
        // Disegna punti della mano solo se l'opzione è attiva
        if (showSkeletonCheckbox.checked) {
            drawHandLandmarks(landmarks);
        }
        
        // Calcola posizione di mira (punta dell'indice)
        // Inverti la coordinata X per correggere il movimento invertito
        const indexTip = landmarks[8]; // punta dell'indice
        const aimX = (1 - indexTip.x) * overlayCanvas.width; // Invertito
        const aimY = indexTip.y * overlayCanvas.height;
        
        // Disegna mirino
        drawCrosshair(aimX, aimY);
        
        // Controlla se il pollice è abbassato per sparare (come grilletto)
        checkThumbForShooting(landmarks, aimX, aimY);
    } else {
        handLandmarks = null;
    }
    
    overlayCtx.restore();
}

// Disegna i landmark della mano
function drawHandLandmarks(landmarks) {
    overlayCtx.strokeStyle = '#00ff00';
    overlayCtx.lineWidth = 2;
    
    // Disegna connessioni (con coordinate X invertite)
    const connections = [
        [0, 1, 2, 3, 4], // pollice
        [0, 5, 6, 7, 8], // indice
        [0, 9, 10, 11, 12], // medio
        [0, 13, 14, 15, 16], // anulare
        [0, 17, 18, 19, 20], // mignolo
        [5, 9], [9, 13], [13, 17] // connessioni tra dita
    ];
    
    connections.forEach(connection => {
        overlayCtx.beginPath();
        connection.forEach((pointIndex, i) => {
            const point = landmarks[pointIndex];
            const x = (1 - point.x) * overlayCanvas.width; // Invertito
            const y = point.y * overlayCanvas.height;
            if (i === 0) {
                overlayCtx.moveTo(x, y);
            } else {
                overlayCtx.lineTo(x, y);
            }
        });
        overlayCtx.stroke();
    });
    
    // Disegna punti chiave (con coordinate X invertite)
    const keyPoints = [4, 8, 12, 16, 20]; // punte delle dita
    keyPoints.forEach(pointIndex => {
        const point = landmarks[pointIndex];
        const x = (1 - point.x) * overlayCanvas.width; // Invertito
        const y = point.y * overlayCanvas.height;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, 5, 0, Math.PI * 2);
        overlayCtx.fillStyle = '#00ff00';
        overlayCtx.fill();
    });
}

// Disegna mirino
function drawCrosshair(x, y) {
    overlayCtx.strokeStyle = '#ff0000';
    overlayCtx.lineWidth = 3;
    
    const size = 20;
    
    // Cerchio esterno
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, size, 0, Math.PI * 2);
    overlayCtx.stroke();
    
    // Croce
    overlayCtx.beginPath();
    overlayCtx.moveTo(x - size - 5, y);
    overlayCtx.lineTo(x + size + 5, y);
    overlayCtx.moveTo(x, y - size - 5);
    overlayCtx.lineTo(x, y + size + 5);
    overlayCtx.stroke();
    
    // Punto centrale
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 3, 0, Math.PI * 2);
    overlayCtx.fillStyle = '#ff0000';
    overlayCtx.fill();
}

// Controlla se il pollice è abbassato per sparare (come grilletto)
function checkThumbForShooting(landmarks, aimX, aimY) {
    const thumbTip = landmarks[4]; // punta del pollice
    const thumbMCP = landmarks[2]; // base del pollice
    const thumbIP = landmarks[3]; // articolazione intermedia del pollice
    
    // Calcola se il pollice è "abbassato" (più in basso rispetto alla base)
    // Per il gesto del grilletto, il pollice deve essere piegato verso l'interno
    const thumbHeight = thumbTip.y - thumbMCP.y;
    const thumbDown = thumbHeight > config.maxThumbHeight; // pollice più in basso
    
    // Calcola anche la distanza tra pollice e indice per verificare il gesto "pistola"
    const thumbToIndexDist = Math.sqrt(
        Math.pow(thumbTip.x - landmarks[8].x, 2) +
        Math.pow(thumbTip.y - landmarks[8].y, 2)
    );
    
    // Il pollice è abbassato se è più in basso della base (come un grilletto)
    // E deve essere relativamente vicino all'indice (gesto pistola)
    const isThumbDown = thumbDown && thumbToIndexDist < config.thumbThreshold;
    
    // Sparare solo quando il pollice passa da "su" a "giù" (premere il grilletto)
    if (isThumbDown && !lastThumbState && gameState.isRunning && !gameState.isPaused) {
        const currentTime = Date.now();
        if (currentTime - gameState.lastShotTime > gameState.shotCooldown) {
            shoot(aimX, aimY);
            gameState.lastShotTime = currentTime;
        }
    }
    
    lastThumbState = isThumbDown;
    
    // Indicatore visivo del pollice quando è abbassato
    if (isThumbDown) {
        const thumbX = (1 - thumbTip.x) * overlayCanvas.width; // Invertito
        const thumbY = thumbTip.y * overlayCanvas.height;
        overlayCtx.beginPath();
        overlayCtx.arc(thumbX, thumbY, 10, 0, Math.PI * 2);
        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        overlayCtx.fill();
    }
}

// Funzione per sparare
function shoot(x, y) {
    // Calcola angolo di sparo (verso il centro dello schermo o direzione della mano)
    const centerX = gameCanvas.width / 2;
    const centerY = gameCanvas.height / 2;
    const angle = Math.atan2(centerY - y, centerX - x);
    
    // Crea proiettile dalla posizione di mira
    const bullet = new Bullet(x, y, angle);
    bullets.push(bullet);
    
    // Effetto sonoro (opzionale)
    playShootSound();
}

// Suono di sparo (usando Web Audio API)
// Un solo AudioContext riutilizzato: crearne uno nuovo ad ogni sparo esaurisce
// rapidamente il limite di contesti concorrenti imposto dal browser.
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playShootSound() {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
}

// Piccolo suono per il colpo a segno, distinto da quello di sparo
function playHitSound() {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(500, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
}

// Loop principale del gioco
function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Pulisci canvas
    gameCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Aggiorna e disegna dischi
    discs = discs.filter(disc => {
        if (!disc.update()) {
            gameState.missed++;
            updateScore();
            return false;
        }
        disc.draw(gameCtx);
        return true;
    });
    
    // Aggiorna e disegna proiettili
    bullets = bullets.filter(bullet => {
        if (!bullet.update()) {
            return false;
        }
        bullet.draw(gameCtx);
        return true;
    });
    
    // Aggiorna e disegna particelle
    particles = particles.filter(particle => {
        if (!particle.update()) {
            return false;
        }
        particle.draw(gameCtx);
        return true;
    });

    // Controlla collisioni
    checkCollisions();

    requestAnimationFrame(gameLoop);
}

// Controlla collisioni tra proiettili e dischi
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = discs.length - 1; j >= 0; j--) {
            if (discs[j].checkCollision(bullets[i])) {
                // Collisione rilevata!
                spawnHitParticles(discs[j].x, discs[j].y, discs[j].color);
                discs.splice(j, 1);
                bullets.splice(i, 1);
                gameState.score += 10;
                gameState.hits++;
                updateScore();
                playHitSound();
                break;
            }
        }
    }
}

// Genera dischi periodicamente
let lastDiscSpawn = 0;
function spawnDiscs() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const now = Date.now();
    if (now - lastDiscSpawn > config.discSpawnRate) {
        discs.push(new Disc());
        lastDiscSpawn = now;
    }
    
    setTimeout(spawnDiscs, 100);
}

// Aggiorna punteggio
function updateScore() {
    scoreEl.textContent = gameState.score;
    hitsEl.textContent = gameState.hits;
    missedEl.textContent = gameState.missed;
    bumpScoreValue(scoreEl);
}

// Piccola animazione di "bump" quando un valore cambia
function bumpScoreValue(el) {
    el.classList.remove('bump');
    // Forza il reflow per poter riavviare l'animazione anche su colpi ravvicinati
    void el.offsetWidth;
    el.classList.add('bump');
}

// Inizializza camera
const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({image: video});
    },
    width: 1280,
    height: 720
});

// Event listeners
startBtn.addEventListener('click', async () => {
    // getUserMedia richiede un contesto sicuro (https o localhost).
    // Aprendo il file direttamente (file://) la webcam non può funzionare.
    if (!window.isSecureContext) {
        showStatus('La webcam richiede una connessione sicura (https o localhost). Apri il gioco tramite un server locale, non con doppio click sul file.');
        return;
    }

    startBtn.disabled = true;
    startBtn.textContent = 'Avvio webcam...';

    try {
        await camera.start();
    } catch (err) {
        console.error('Errore avvio webcam:', err);
        startBtn.disabled = false;
        startBtn.textContent = 'Inizia Gioco';
        showStatus('Impossibile accedere alla webcam. Controlla di aver consentito il permesso e che nessun\'altra app la stia usando.');
        return;
    }

    hideStatus();
    getAudioContext(); // sblocca l'audio al primo gesto dell'utente

    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.hits = 0;
    gameState.missed = 0;
    discs = [];
    bullets = [];
    particles = [];
    updateScore();

    startBtn.textContent = 'Inizia Gioco';
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pausa';
    gameOverlayMessage.classList.add('hidden');

    gameLoop();
    spawnDiscs();
});

pauseBtn.addEventListener('click', () => {
    gameState.isPaused = !gameState.isPaused;
    pauseBtn.textContent = gameState.isPaused ? 'Riprendi' : 'Pausa';
});

// Avvia il loop del gioco
gameLoop();

