import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomJwtPayload } from '@tradeblitz/common-types';
import '@tradeblitz/common-types';

import AppError from './AppError';
import catchAsync from './catchAsync';

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('Error!', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

const handleDuplicateErrorDB = (err: any) => {
  if (err.meta.target.includes('email'))
    return new AppError('Account with this email already exists', 400);
};

const handleJWTError = () =>
  new AppError(`Invalid token. Please log in again!`, 401);

const handleExpiredTokenError = () =>
  new AppError(`Token expired. Please log in again`, 401);

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode ||= 500;
  err.status ||= 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    if (err.code === 'P2002') err = handleDuplicateErrorDB(err);
    if (err.name === 'JsonWebTokenError') err = handleJWTError();
    if (err.name === 'TokenExpiredError') err = handleExpiredTokenError();
    sendErrorProd(err, res);
  }
};

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.jwt;

    if (!token || token === null)
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );

    const decodedUser = (await jwt.verify(
      token,
      process.env.JWT_SECRET as string
    )) as CustomJwtPayload;

    req.user = decodedUser as CustomJwtPayload;

    next();
  }
);

export { errorHandler };
