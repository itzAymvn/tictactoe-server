const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
    addPlayer,
    getPlayersInRoom,
    getPlayer,
    removePlayer,
} = require("./utils/players");

const { checkWinner, checkDraw } = require("./utils/game");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Connection event
io.on("connection", (socket) => {
    console.log("A user connected");

    // Join room event
    socket.on("join-room", ({ username, room }) => {
        // Check if room is full
        const playersInRoom = getPlayersInRoom(room);
        if (playersInRoom.length >= 2) {
            // If room is full, let user know
            socket.emit("join-room-error", "Room is full");
            return;
        }

        if (
            playersInRoom.find(
                (player) => player.username === username && player.room === room
            )
        ) {
            // If username is already taken, let user know
            socket.emit(
                "join-room-error",
                "This username is in use in the entered room"
            );
            return;
        }

        // Add player to players array
        const symbol =
            playersInRoom[0] && playersInRoom[0].symbol === "X" ? "O" : "X";
        addPlayer({ id: socket.id, username, room, symbol });

        // Set initial turn to whoever joined first
        const turn =
            playersInRoom.length === 0 ? username : playersInRoom[0].username;
        io.to(room).emit("turn", turn);

        // Join room & Tell the client that he has joined the room
        socket.join(room);
        socket.emit("joined", { username, room, symbol });

        // Tell the other player that someone has joined the room
        socket.to(room).emit("player-joined", username);

        // Tell everyone in the room how many players are in the room
        const users = getPlayersInRoom(room);
        io.to(room).emit("users-count", users);
    });

    // Update board event
    socket.on("update-board", ({ room, board, symbol }) => {
        const playersInRoom = getPlayersInRoom(room);

        // Send update board event to everyone in the room
        io.to(room).emit("update-board", { board, symbol });

        // Check if there is a winner
        const winner = checkWinner(board);
        if (winner) {
            // Get username of the winner
            const winnerUsername = playersInRoom.find(
                (player) => player.symbol === winner
            ).username;

            io.to(room).emit("winner", winnerUsername);
            return;
        }

        // Check if there is a draw
        const draw = checkDraw(board);
        if (draw) {
            // Send draw event to everyone in the room
            io.to(room).emit("draw");
            return;
        }

        // Set turn to the other player
        const player = playersInRoom.find((player) => player.symbol !== symbol);
        io.to(room).emit("turn", player.username);
    });

    // Restart game request event
    socket.on("restart-game-request", ({ username, room }) => {
        // Tell the other player that someone has requested to restart the game
        socket.to(room).emit("restart-game-server-request", { username, room });
    });

    // Restart game accepted event
    socket.on("restart-game-accepted", ({ room }) => {
        // Tell both players to restart the game
        io.to(room).emit("restart-game-accepted");
    });

    // Restart game declined event
    socket.on("restart-game-declined", ({ username, room }) => {
        // Tell the other player that someone has declined to restart the game
        socket.to(room).emit("restart-game-declined", username);
    });

    // Leave room event
    socket.on("leave-room", ({ username, room }) => {
        // Leave room
        socket.leave(room);

        // Remove player from players array
        removePlayer(socket.id);

        // Tell the client that he has left the room
        socket.emit("left");

        // Tell the other player that someone has left the room
        socket.to(room).emit("player-left", username);

        // Tell everyone in the room how many players are in the room
        const users = getPlayersInRoom(room);
        io.to(room).emit("users-count", users);
    });

    // Disconnect event
    socket.on("disconnect", () => {
        removePlayer(socket.id);
        console.log("A user disconnected");
    });
});

app.get("/", (req, res) => {
    res.send("Server is running");
});

server.listen(3001, () => {
    console.log("[HTTP] http://localhost:3001");
    console.log("[WS] ws://localhost:3001");
});
