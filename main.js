const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

const colors = {
    backgroundTop: "#111827",
    backgroundBottom: "#172554",
    panel: "rgba(15, 23, 42, 0.78)",
    text: "#f8fafc",
    muted: "#cbd5e1",
    accent: "#38bdf8",
    paddle: "#f8fafc",
    ball: "#fde68a",
    danger: "#fb7185",
    powerup: "#86efac"
};

const levels = [
    {
        name: "Rookie Ramp",
        speed: 3,
        paddleWidth: 92,
        layout: [
            "11111",
            "11111",
            "11111"
        ]
    },
    {
        name: "Color Climb",
        speed: 3.5,
        paddleWidth: 86,
        layout: [
            "22222",
            "11111",
            "02220",
            "11111"
        ]
    },
    {
        name: "Tunnel Vision",
        speed: 4,
        paddleWidth: 80,
        layout: [
            "10201",
            "22222",
            "10101",
            "22222",
            "10201"
        ]
    },
    {
        name: "Final Wall",
        speed: 4.6,
        paddleWidth: 74,
        layout: [
            "33333",
            "23232",
            "11111",
            "23232",
            "33333"
        ]
    }
];

let ballRadius = 9;
let x = canvas.width / 2;
let y = canvas.height - 42;
let dx = 0;
let dy = 0;
let paddleHeight = 12;
let paddleWidth = 92;
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let score = 0;
let lives = 3;
let levelIndex = 0;
let bricks = [];
let powerups = [];
let particles = [];
let status = "start";
let message = "Trykk Space for å starte";
let highScore = getHighScore();
let activeWidePaddleUntil = 0;

const brickWidth = 74;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 54;
const brickOffsetLeft = 30;
const maxBallSpeed = 8.5;
const brickSpeedBoost = 1.035;
const paddleSpeedBoost = 1.055;

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);

function keyDownHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        e.preventDefault();
        rightPressed = true;
    }
    else if (e.key === "Left" || e.key === "ArrowLeft") {
        e.preventDefault();
        leftPressed = true;
    }
    else if (e.code === "Space") {
        e.preventDefault();
        if (status === "start" || status === "gameOver" || status === "complete") {
            startGame();
        }
        else if (status === "levelClear") {
            loadLevel(levelIndex + 1);
            status = "playing";
        }
    }
    else if (e.key === "p" || e.key === "P") {
        if (status === "playing") {
            status = "paused";
            message = "Pause";
        }
        else if (status === "paused") {
            status = "playing";
        }
    }
}

function keyUpHandler(e) {
    if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
    }
    else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
    }
}

function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const scale = canvas.width / rect.width;
    const scaledX = relativeX * scale;

    if (scaledX > 0 && scaledX < canvas.width) {
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, scaledX - paddleWidth / 2));
    }
}

function startGame() {
    score = 0;
    lives = 3;
    levelIndex = 0;
    powerups = [];
    particles = [];
    activeWidePaddleUntil = 0;
    loadLevel(0);
    status = "playing";
}

function loadLevel(index) {
    if (index >= levels.length) {
        status = "complete";
        message = "Du klarte alle nivåene!";
        saveHighScore();
        resetBall();
        return;
    }

    levelIndex = index;
    const level = levels[levelIndex];
    paddleWidth = level.paddleWidth;
    paddleX = (canvas.width - paddleWidth) / 2;
    bricks = buildBricks(level.layout);
    powerups = [];
    activeWidePaddleUntil = 0;
    resetBall();
}

function buildBricks(layout) {
    return layout.map((row, rowIndex) => {
        return row.split("").map((value, columnIndex) => {
            const strength = Number(value);
            return {
                x: brickOffsetLeft + columnIndex * (brickWidth + brickPadding),
                y: brickOffsetTop + rowIndex * (brickHeight + brickPadding),
                strength,
                maxStrength: strength,
                alive: strength > 0
            };
        });
    });
}

function resetBall() {
    const speed = levels[levelIndex] ? levels[levelIndex].speed : 3;
    x = canvas.width / 2;
    y = canvas.height - 42;
    dx = speed * (Math.random() > 0.5 ? 1 : -1);
    dy = -speed;
}

function collisionDetection() {
    let remaining = 0;

    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            const b = bricks[r][c];
            if (!b.alive) {
                continue;
            }

            remaining++;
            if (x + ballRadius > b.x && x - ballRadius < b.x + brickWidth && y + ballRadius > b.y && y - ballRadius < b.y + brickHeight) {
                dy = -dy;
                boostBallSpeed(brickSpeedBoost);
                b.strength--;
                score += 10;
                spawnParticles(b.x + brickWidth / 2, b.y + brickHeight / 2, brickColor(b));

                if (b.strength <= 0) {
                    b.alive = false;
                    remaining--;
                    score += 15;
                    maybeSpawnPowerup(b.x + brickWidth / 2, b.y + brickHeight / 2);
                }
            }
        }
    }

    if (remaining === 0 && status === "playing") {
        saveHighScore();
        if (levelIndex === levels.length - 1) {
            status = "complete";
            message = "Du klarte alle nivåene!";
        }
        else {
            status = "levelClear";
            message = "Level fullført!";
            resetBall();
        }
    }
}

function maybeSpawnPowerup(px, py) {
    if (Math.random() < 0.18) {
        powerups.push({
            x: px,
            y: py,
            radius: 8,
            dy: 1.6,
            type: Math.random() > 0.45 ? "wide" : "life"
        });
    }
}

function spawnParticles(px, py, color) {
    for (let i = 0; i < 7; i++) {
        particles.push({
            x: px,
            y: py,
            dx: (Math.random() - 0.5) * 3,
            dy: (Math.random() - 0.5) * 3,
            life: 22,
            color
        });
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.dy;

        if (p.y + p.radius > canvas.height - paddleHeight && p.x > paddleX && p.x < paddleX + paddleWidth) {
            if (p.type === "wide") {
                paddleWidth = Math.min(126, paddleWidth + 24);
                activeWidePaddleUntil = Date.now() + 8000;
            }
            else {
                lives = Math.min(5, lives + 1);
            }
            score += 30;
            powerups.splice(i, 1);
        }
        else if (p.y - p.radius > canvas.height) {
            powerups.splice(i, 1);
        }
    }

    if (activeWidePaddleUntil && Date.now() > activeWidePaddleUntil) {
        paddleWidth = levels[levelIndex].paddleWidth;
        paddleX = Math.min(paddleX, canvas.width - paddleWidth);
        activeWidePaddleUntil = 0;
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors.backgroundTop);
    gradient.addColorStop(1, colors.backgroundBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 80, canvas.height);
        ctx.stroke();
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = colors.ball;
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
}

function drawPaddle() {
    const paddleY = canvas.height - paddleHeight - 6;
    ctx.beginPath();
    roundedRect(paddleX, paddleY, paddleWidth, paddleHeight, 6);
    ctx.fillStyle = colors.paddle;
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = colors.accent;
    ctx.fillRect(paddleX + 8, paddleY + 4, Math.max(10, paddleWidth - 16), 2);
}

function drawBricks() {
    for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < bricks[r].length; c++) {
            const b = bricks[r][c];
            if (!b.alive) {
                continue;
            }

            ctx.beginPath();
            roundedRect(b.x, b.y, brickWidth, brickHeight, 4);
            ctx.fillStyle = brickColor(b);
            ctx.fill();
            ctx.closePath();

            if (b.strength > 1) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.font = "bold 12px Arial";
                ctx.textAlign = "center";
                ctx.fillText(b.strength, b.x + brickWidth / 2, b.y + 14);
                ctx.textAlign = "left";
            }
        }
    }
}

function brickColor(brick) {
    const palette = ["#38bdf8", "#a3e635", "#f97316"];
    return palette[Math.max(0, brick.strength - 1)];
}

function drawPowerups() {
    powerups.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.type === "wide" ? colors.powerup : colors.danger;
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.type === "wide" ? "W" : "+", p.x, p.y + 4);
        ctx.textAlign = "left";
    });
}

function drawParticles() {
    particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 22);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
    });
}

function drawHud() {
    ctx.fillStyle = colors.text;
    ctx.font = "bold 14px Arial";
    ctx.fillText("Poeng: " + score, 12, 23);
    ctx.fillText("Liv: " + lives, canvas.width - 62, 23);

    ctx.fillStyle = colors.muted;
    ctx.font = "12px Arial";
    ctx.fillText("Level " + (levelIndex + 1) + " - " + levels[levelIndex].name, 12, 40);
    ctx.textAlign = "right";
    ctx.fillText("Rekord: " + highScore, canvas.width - 12, 40);
    ctx.textAlign = "left";
}

function drawOverlay() {
    if (status === "playing") {
        return;
    }

    ctx.fillStyle = colors.panel;
    ctx.beginPath();
    roundedRect(56, 86, canvas.width - 112, 148, 8);
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, 128);

    ctx.fillStyle = colors.muted;
    ctx.font = "14px Arial";
    let helper = "Space starter. P pauser. Bruk piltaster eller mus.";
    if (status === "levelClear") {
        helper = "Trykk Space for neste level.";
    }
    else if (status === "paused") {
        helper = "Trykk P for å fortsette.";
    }
    else if (status === "gameOver" || status === "complete") {
        helper = "Trykk Space for å spille igjen.";
    }
    ctx.fillText(helper, canvas.width / 2, 158);
    ctx.fillText("Poeng: " + score + "   Rekord: " + highScore, canvas.width / 2, 188);
    ctx.textAlign = "left";
}

function roundedRect(rx, ry, width, height, radius) {
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + width - radius, ry);
    ctx.quadraticCurveTo(rx + width, ry, rx + width, ry + radius);
    ctx.lineTo(rx + width, ry + height - radius);
    ctx.quadraticCurveTo(rx + width, ry + height, rx + width - radius, ry + height);
    ctx.lineTo(rx + radius, ry + height);
    ctx.quadraticCurveTo(rx, ry + height, rx, ry + height - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
}

function updateBall() {
    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
    }

    if (y + dy < ballRadius) {
        dy = -dy;
    }
    else if (y + dy > canvas.height - ballRadius) {
        const paddleY = canvas.height - paddleHeight - 6;
        if (y + ballRadius >= paddleY && x > paddleX && x < paddleX + paddleWidth) {
            const hitPosition = (x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
            const speed = Math.sqrt(dx * dx + dy * dy) + 0.08;
            dx = hitPosition * speed;
            dy = -Math.max(2.4, speed - Math.abs(dx) * 0.35);
            boostBallSpeed(paddleSpeedBoost);
            y = paddleY - ballRadius;
        }
        else {
            loseLife();
        }
    }

    x += dx;
    y += dy;
}

function loseLife() {
    lives--;
    saveHighScore();

    if (!lives) {
        status = "gameOver";
        message = "Game over";
        resetBall();
        return;
    }

    resetBall();
}

function updatePaddle() {
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7.5;
    }
    else if (leftPressed && paddleX > 0) {
        paddleX -= 7.5;
    }

    paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        try {
            localStorage.setItem("breakoutHighScore", highScore);
        }
        catch (error) {
            // Some browsers block localStorage for local files.
        }
    }
}

function boostBallSpeed(multiplier) {
    const currentSpeed = Math.sqrt(dx * dx + dy * dy);
    if (currentSpeed <= 0 || currentSpeed >= maxBallSpeed) {
        return;
    }

    const nextSpeed = Math.min(maxBallSpeed, currentSpeed * multiplier);
    const scale = nextSpeed / currentSpeed;
    dx *= scale;
    dy *= scale;
}

function getHighScore() {
    try {
        return Number(localStorage.getItem("breakoutHighScore")) || 0;
    }
    catch (error) {
        return 0;
    }
}

function draw() {
    drawBackground();
    drawBricks();
    drawPowerups();
    drawParticles();
    drawBall();
    drawPaddle();
    drawHud();
    drawOverlay();

    if (status === "playing") {
        collisionDetection();
        updateBall();
        updatePaddle();
        updatePowerups();
        updateParticles();
    }

    requestAnimationFrame(draw);
}

loadLevel(0);
draw();
