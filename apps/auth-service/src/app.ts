import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

import AppError from './utils/AppError';
import globalErrorHandler from './controllers/errorController';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  return next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
