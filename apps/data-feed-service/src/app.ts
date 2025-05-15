import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { setupSocketHandlers, broadcastMarketDepth } from './core/socket';
import { AppError, globalErrorHandler } from '@tradeblitz/common-utils';
import { dataFeedConsumer } from './consumers/dataFeedConsumer';

dataFeedConsumer();

const app = express();

const socketIoApp = createServer(app);
const io = new Server(socketIoApp, { cors: { origin: '*' } });
setupSocketHandlers(io);

app.use(express.json());
app.use(morgan('dev'));
app.all('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
  );
});

app.use(globalErrorHandler);

export { socketIoApp, io };
