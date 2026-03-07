import { Server } from 'socket.io';
let io;
import chalk from 'chalk';

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

    io.on('connection', (socket) => {
        // We get the userId from the query we set in the frontend
        const userId = socket.handshake.query.userId;

        console.log(`🚀 User Connected: `, chalk.green(`${userId}`), `( Socket ID:`, chalk.blue(`${socket.id}`), ")");

        // Basic Join Room (User's private room for notifications/invites)
        if (userId) {
            socket.join(userId);
        }

        socket.on('disconnect', () => {
            console.log(`User Disconnected: ${socket.id}`);
        });
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