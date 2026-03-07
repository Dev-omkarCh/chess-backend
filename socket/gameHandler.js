const games = new Map(); // Key: RoomID, Value: chess.js instance

io.on("connection", (socket) => {
    socket.on("joinGame", (roomId) => {
        if (!games.has(roomId)) {
            games.set(roomId, new Chess()); // Create new logic for this room
        }
        socket.join(roomId);
    });

    socket.on("move", ({ roomId, move }) => {
        const game = games.get(roomId);
        const result = game.move(move); // Backend validation

        if (result) {
            io.to(roomId).emit("moveUpdate", game.fen()); // Sync everyone
        } else {
            socket.emit("error", "Illegal move!"); // Busted!
        }
    });
});