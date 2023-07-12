const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
    addPlayer,
    getPlayersInRoom,
    getPlayer,
    removePlayer,
    getRooms,
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
        try {
            if (!username || !room) {
                throw new Error(
                    "Invalid data. Please provide a username and room."
                );
            }

            console.log(`${username} trying to join room ${room}`);
            // Check if room is full
            let playersInRoom = getPlayersInRoom(room);

            console.log(
                "There are " + playersInRoom.length + " players in room"
            );
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
                    (player) =>
                        player.username === username && player.room === room
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

            // Update playersInRoom array
            playersInRoom = getPlayersInRoom(room);
            console.log(
                "There are " + playersInRoom.length + " players in room"
            );

            socket.join(room);
            console.log(`${username} joined room ${room}`);

            // Tell the user and everyone in the room that a user has joined
            socket.emit("joined", { username, room, symbol });
            socket.to(room).emit("player-joined", username);

            // Send the users in the room to the client
            io.to(room).emit("users-count", playersInRoom);

            // Set initial turn to whoever joined first & send it to the client
            const turn =
                playersInRoom.length === 0
                    ? username
                    : playersInRoom[0].username;
            console.log(`${turn} will start the game`);
            io.to(room).emit("turn", turn);

            // Send rooms to the client
            const rooms = getRooms();
            io.emit("rooms", rooms);

            console.log(`Room: ${room} | Players: ${playersInRoom.length}`);
        } catch (error) {
            console.error(error);
            socket.emit(
                "join-room-error",
                "An error occurred while joining the room"
            );
        }
    });

    // Update board event
    socket.on("update-board", ({ room, board, symbol }) => {
        try {
            if (!room || !board || !symbol) {
                throw new Error(
                    "Invalid data. Please provide room, board, and symbol."
                );
            }

            const playersInRoom = getPlayersInRoom(room);

            // Send update board event to everyone in the room
            io.to(room).emit("update-board", { board, symbol });

            // Check if there is a winner
            const winner = checkWinner(board);
            if (winner) {
                // Get winner
                const winnerPlayer = playersInRoom.find(
                    (player) => player.symbol === winner
                );

                // Update score
                if (winnerPlayer) {
                    winnerPlayer.score++;
                }

                // Send winner event to everyone in the room
                io.to(room).emit("winner", winnerPlayer);

                // if A was the one started the game, then B will start the next game
                const nextTurn = playersInRoom.find(
                    (player) => player.symbol !== winner
                )?.username;
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
                    (player) => player?.symbol !== symbol
                )?.username;
                io.to(room).emit("turn", nextTurn);
                return;
            }

            // Set turn to the other player
            const player = playersInRoom.find(
                (player) => player?.symbol !== symbol
            );
            if (player) {
                io.to(room).emit("turn", player.username);
            }
        } catch (error) {
            console.error(error);
        }
    });

    // Restart game request event
    socket.on("restart-game-request", ({ username, room }) => {
        try {
            if (!username || !room) {
                throw new Error(
                    "Invalid data. Please provide a username and room."
                );
            }

            // Tell the other player that someone has requested to restart the game
            socket
                .to(room)
                .emit("restart-game-server-request", { username, room });
        } catch (error) {
            console.error(error);
        }
    });

    // Restart game accepted event
    socket.on("restart-game-accepted", ({ room }) => {
        try {
            if (!room) {
                throw new Error("Invalid data. Please provide a room.");
            }

            // Tell both players to restart the game
            io.to(room).emit("restart-game-accepted");
        } catch (error) {
            console.error(error);
        }
    });

    // Restart game declined event
    socket.on("restart-game-declined", ({ username, room, board }) => {
        try {
            if (!username || !room || !board) {
                throw new Error(
                    "Invalid data. Please provide username, room, and board."
                );
            }

            // Check if there is a winner
            const winner = checkWinner(board);
            if (winner) {
                // End game
                io.to(room).emit("end-game");
                return;
            }
            // Tell the other player that someone has declined to restart the game
            socket.to(room).emit("restart-game-declined", username);
        } catch (error) {
            console.error(error);
        }
    });

    // Leave room event
    socket.on("leave-room", ({ username, room }) => {
        try {
            if (!username || !room) {
                throw new Error(
                    "Invalid data. Please provide a username and room."
                );
            }

            // Leave room
            socket.leave(room);

            // Remove player from players array
            removePlayer(socket.id);

            // Tell the client that they have left the room
            socket.emit("left");

            // Tell the other player that someone has left the room
            socket.to(room).emit("player-left", username);

            // Tell everyone in the room how many players are in the room
            const users = getPlayersInRoom(room);
            io.to(room).emit("users-count", users);

            // Update the list of rooms
            const rooms = getRooms();
            io.emit("rooms", rooms);

            console.log(`Room: ${room} | Players: ${users.length}`);
        } catch (error) {
            console.error(error);
        }
    });

    // Disconnect event
    socket.on("disconnect", () => {
        removePlayer(socket.id);
        console.log("A user disconnected");
    });

    // Typing event
    socket.on("typing", ({ username, room }) => {
        try {
            if (!username || !room) {
                throw new Error(
                    "Invalid data. Please provide a username and room."
                );
            }

            socket.to(room).emit("typing", username);
        } catch (error) {
            console.error(error);
        }
    });

    // Stop typing event
    socket.on("typing-stop", ({ room }) => {
        try {
            if (!room) {
                throw new Error("Invalid data. Please provide a room.");
            }

            socket.to(room).emit("typing-stop");
        } catch (error) {
            console.error(error);
        }
    });

    // New message event
    socket.on("send-message", ({ username, message, room, timestamp }) => {
        try {
            if (!username || !message || !room || !timestamp) {
                throw new Error(
                    "Invalid data. Please provide username, message, room, and timestamp."
                );
            }

            io.to(room).emit("new-message", { username, message, timestamp });
        } catch (error) {
            console.error(error);
        }
    });

    // List rooms event
    socket.on("list-rooms", () => {
        try {
            const rooms = getRooms();
            socket.emit("rooms", rooms);
        } catch (error) {
            console.error(error);
        }
    });

    // Users count event
    socket.on("users-count-request", ({ room }) => {
        try {
            if (!room) {
                throw new Error("Invalid data. Please provide a room.");
            }

            const users = getPlayersInRoom(room);
            socket.emit("users-count", users);
        } catch (error) {
            console.error(error);
        }
    });
});

// Routes
app.get("/", (req, res) => {
    res.send("Server is running");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});

// Start server
server.listen(3001, () => {
    console.log("[HTTP] http://localhost:3001");
    console.log("[WS] ws://localhost:3001");
});
