import dotenv from 'dotenv';
dotenv.config();

import { socketIoApp, app } from './app';

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception, Shutting Down');
  console.error(err);
  process.exit(1);
});

const port = process.env.PORT || 3006;
const socketPort = process.env.SOCKET_PORT || 3007;

if (process.env.NODE_ENV !== 'production') {
  const socketIoServer = socketIoApp.listen(socketPort, () => {
    console.log(`Socket.IO server running on port ${socketPort}`);
  });

  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Rejection, Shutting Down');
    console.error(err);
    socketIoServer.close(() => {
      process.exit(1);
    });
    server.close(() => {
      process.exit(1);
    });
  });
}

export default app;
