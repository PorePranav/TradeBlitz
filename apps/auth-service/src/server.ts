import dotenv from 'dotenv';
dotenv.config();

import app from './app';

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception, Shutting Down!');
  console.error(err);
  process.exit(1);
});

const port = process.env.PORT || 3000;
const url = process.env.URL || 'http://localhost';

if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(port, () => {
    console.log(`Auth service is running on ${url}:${port}`);
  });

  process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection, Shutting Down!');
    console.error(err);
    server.close(() => {
      process.exit(1);
    });
  });
}

export default app;
