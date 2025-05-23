import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { AppError, globalErrorHandler } from '@tradeblitz/common-utils';
import ordersRouter from './routers/orderRoutes';
import { orderConsumer } from './consumers/orderConsumers';

const app = express();

orderConsumer();

app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/orders', ordersRouter);

app.all('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
  );
});

app.use(globalErrorHandler);

export default app;
