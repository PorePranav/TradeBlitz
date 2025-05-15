import dotenv from 'dotenv';
dotenv.config();

import { socketIoApp } from './app';

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception, Shutting Down');
  console.error(err);
  process.exit(1);
});

const port = process.env.PORT || 3007;

if (process.env.NODE_ENV !== 'production') {
  const server = socketIoApp.listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Rejection, Shutting Down');
    console.error(err);
    server.close(() => {
      process.exit(1);
    });
  });
}

export default socketIoApp;
