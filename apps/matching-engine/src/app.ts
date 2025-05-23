import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

import { AppError, globalErrorHandler } from '@tradeblitz/common-utils';
import { matchingConsumer } from './consumers/matchingConsumer';
import matchingRoutes from './routers/matchingRoutes';

const app = express();

matchingConsumer();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/matching', matchingRoutes);

app.all('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
  );
});

app.use(globalErrorHandler);

export default app;
