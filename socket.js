import { Server } from 'socket.io';
import chalk from 'chalk';
import GameEngine from './managers/GameEngine.js';

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true, // Required for HTTP-only cookies
        },
        transports: ['websocket'], // Match the frontend transport
        pingTimeout: 60000, // Handle mobile backgrounding better
    });

    const engine = new GameEngine(io);

    io.on('connection', (socket) => {

        // get the userId from the query we set in the frontend
        const userId = socket.handshake.query.userId;

        console.log(`[Socket Connected] User ID: ${chalk.green(userId)} | Socket ID: ${chalk.yellow(socket.id)}`);

        if (!userId) return socket.disconnect();

        // Hand off all logic to the Engine
        engine.handleConnection(socket, userId);
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

export { initSocket }