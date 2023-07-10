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
        console.log(`${username} trying to join room ${room}`);
        // Check if room is full
        let playersInRoom = getPlayersInRoom(room);

        console.log("There are " + playersInRoom.length + " players in room");
        if (playersInRoom.length === 2) {
            playersInRoom.forEach((player) => {
                console.log(player.username);
            });
            console.log("Room is full");
            socket.emit("join-room-error", "Room is full");
            return;
        }

        if (
            playersInRoom.find(
                (player) => player.username === username && player.room === room
            )
        ) {
            // If username is already taken, let user know
            console.log("Username is already taken");
            socket.emit(
                "join-room-error",
                "This username is in use in the entered room"
            );
            return;
        }

        // Set symbol to X if there is no player in the room yet, else set to O
        const symbol =
            playersInRoom[0] && playersInRoom[0].symbol === "X" ? "O" : "X";

        // Add player to players array & join room
        addPlayer({ id: socket.id, username, room, symbol });

        socket.join(room);
        console.log(`${username} joined room ${room}`);

        // Update playersInRoom array
        playersInRoom = getPlayersInRoom(room);
        console.log("There are " + playersInRoom.length + " players in room");

        // Tell the user and everyone in the room that a user has joined
        socket.emit("joined", { username, room, symbol });
        socket.to(room).emit("player-joined", username);

        // Send the users in the room to the client
        io.to(room).emit("users-count", playersInRoom);

        // Set initial turn to whoever joined first & send it to the client
        const turn =
            playersInRoom.length === 0 ? username : playersInRoom[0].username;
        console.log(`${turn} will start the game`);
        io.to(room).emit("turn", turn);

        console.log(`Room: ${room} | Players: ${playersInRoom.length}`);
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

            // if A was the one started the game, then B will start the next game
            const nextTurn = playersInRoom.find(
                (player) => player.symbol !== winner
            ).username;
            io.to(room).emit("turn", nextTurn);
            return;
        }

        // Check if there is a draw
        const draw = checkDraw(board);
        if (draw) {
            // Send draw event to everyone in the room
            io.to(room).emit("draw");

            // if A was the one started the game, then B will start the next game
            const nextTurn = playersInRoom.find(
                (player) => player.symbol !== symbol
            ).username;
            io.to(room).emit("turn", nextTurn);
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

        console.log(`Room: ${room} | Players: ${users.length}`);
    });

    // Disconnect event
    socket.on("disconnect", () => {
        removePlayer(socket.id);
        console.log("A user disconnected");
    });

    socket.on("send-message", ({ username, message, room, timestamp }) => {
        io.to(room).emit("new-message", { username, message, timestamp });
    });
});

app.get("/", (req, res) => {
    res.send("Server is running");
});

server.listen(3001, () => {
    console.log("[HTTP] http://localhost:3001");
    console.log("[WS] ws://localhost:3001");
});
