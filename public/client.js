const socket = io();

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

const coordinatesElement = document.getElementById('coordinates');
canvas.addEventListener('mousemove', function(event) {
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor((event.clientX - rect.left) / pixelSize);
    const y = Math.floor((event.clientY - rect.top) / pixelSize);

    coordinatesElement.innerText = 'X: ' + x + ', Y: ' + y;
});

const canvasSize = 1000;
const gridSize = 120;
const pixelSize = canvasSize / gridSize;

canvas.width = canvasSize;
canvas.height = canvasSize;

let canvasData = new Array(gridSize);
for (let i = 0; i < gridSize; i++) {
    canvasData[i] = new Array(gridSize).fill('#FFFFFF');
}

context.fillStyle = '#FFFFFF';
context.fillRect(0, 0, canvasSize, canvasSize);

context.strokeStyle = 'lightgray';
for (let x = 0; x <= canvasSize; x += pixelSize) {
    for (let y = 0; y <= canvasSize; y += pixelSize) {
        context.strokeRect(x, y, pixelSize, pixelSize);
    }
}

let lastDrawTime = null;

let currentColor = '#000000';

const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', (event) => {
        currentColor = event.target.style.background;
    });
});

const colorPicker = document.getElementById('color-picker');
colorPicker.addEventListener('change', (event) => {
    currentColor = event.target.value;
});

canvas.addEventListener('click', (event) => {
    const now = new Date();

    if (lastDrawTime && now - lastDrawTime < 1000) {
        showCooldownIndicator();
        return;
    }

    lastDrawTime = now;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const x = Math.floor((event.clientX - rect.left + scrollX) * scaleX / pixelSize);
    const y = Math.floor((event.clientY - rect.top + scrollY) * scaleY / pixelSize);

    drawPixel(x, y, currentColor);

    socket.emit('draw_pixel', { x, y, color: currentColor });
});

function showCooldownIndicator() {
    const indicator = document.getElementById('cooldown-indicator');
    indicator.style.display = 'block';
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

function drawPixel(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

const hitCounterElement = document.getElementById("hit-counter");

socket.on("update_hit_counter", (hits) => {
    hitCounterElement.textContent = "Hits: " + hits;
});

function drawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            drawPixel(x, y, canvasData[x][y]);
        }
    }
}

socket.on('draw_pixel', (data) => {
    const { x, y, color } = data;
    canvasData[x][y] = color;
    drawPixel(x, y, color);
});

socket.on('init', (data) => {
    canvasData = data;
    drawCanvas();
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            drawPixel(x, y, data[x][y]);
        }
    }
});