import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

import ordersRouter from './routers/orderRoutes';
import { AppError, globalErrorHandler } from '@tradeblitz/common-utils';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/orders', ordersRouter);

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  return next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
