const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
const path = require('path');

// Set up Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let lastDraw = new Map();
let hitCounter = 0;

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'z1k', // replace with your MySQL username
  password: 'hausemastersucks', // replace with your MySQL password
  database: 'place',
});

// Initialize the canvas
const canvas = Array(120).fill().map(() => Array(120).fill('#FFFFFF'));

// Connect to the MySQL server and initialize all pixels in the database
db.connect(err => {
  if (err) throw err;
  console.log('Connected to the MySQL server.');

  // Initialize all pixels in the database
  for (let x = 0; x < 120; x++) {
    for (let y = 0; y < 120; y++) {
      db.query('INSERT IGNORE INTO pixels (x, y, color) VALUES (?, ?, ?)', [x, y, '#FFFFFF'], (err, result) => {
        if (err) throw err;
      });
    }
  }
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Express route for "/"
app.get('/', function(req, res) {
  const userAgent = req.headers['user-agent'];
  hitCounter++;
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
  io.emit('update_hit_counter', hitCounter);
});

// Handle a new client connection
io.on('connection', (socket) => {
  // Send the initial state of the canvas
  socket.emit('init', canvas);
  
  // Handle a 'draw_pixel' event
  socket.on('draw_pixel', (data) => {
    const {x, y, color} = data;
    
    const now = new Date();
    const lastDrawTime = lastDraw.get(socket.id);
    if (lastDrawTime && now - lastDrawTime < 1000) { // 1000 ms = 1 second
      // User has drawn too recently, ignore this
      return;
    }
    lastDraw.set(socket.id, now);
    // Update the pixel color on the server
    canvas[x][y] = color;

    // Update the pixel color in the database
    db.query('REPLACE INTO pixels (x, y, color) VALUES (?, ?, ?)', [x, y, color], (err, result) => {
      if (err) throw err;
    });

    // Broadcast the pixel color to all clients
    io.sockets.emit('draw_pixel', data);

  });
  
  // Load pixel data from the database
  db.query('SELECT * FROM pixels', (err, rows) => {
    if (err) throw err;

    rows.forEach(row => {
      const {x, y, color} = row;
      canvas[x][y] = color;
    });
  });
  
  socket.on('disconnect', () => {});
});

server.listen(80, () => console.log('Server is running on port 80'));
