const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serve static files like index.html

const boards = {}; // Tracks active boards and participants

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new board and automatically join the creator
    socket.on('createBoard', (_, callback) => {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        boards[code] = [socket.id]; // Add the creator to the board's participants
        socket.join(code); // Automatically join the creator to the board
        callback(code);
        console.log(`Board created and joined by creator ${socket.id}: ${code}`);
    });

    // Join an existing board
    socket.on('joinBoard', (code, callback) => {
        if (boards[code]) {
            boards[code].push(socket.id);
            socket.join(code); // Join the room
            callback(true);
            console.log(`User ${socket.id} joined board ${code}`);
        } else {
            callback(false);
            console.log(`User ${socket.id} tried to join nonexistent board ${code}`);
        }
    });

    // Handle drawing events
    socket.on('draw', ({ boardCode, x1, y1, x2, y2 }) => {
        if (boardCode) {
            console.log(`Drawing event in board ${boardCode} by ${socket.id}:`, { x1, y1, x2, y2 });
            io.to(boardCode).emit('draw', { x1, y1, x2, y2 });
        } else {
            console.log(`Invalid board code for drawing from ${socket.id}`);
        }
    });

    // Cleanup when a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const code in boards) {
            boards[code] = boards[code].filter((id) => id !== socket.id);
            if (boards[code].length === 0) {
                delete boards[code];
                console.log(`Board ${code} destroyed (no participants left).`);
            }
        }
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
