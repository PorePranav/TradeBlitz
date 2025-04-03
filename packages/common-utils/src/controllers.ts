import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import catchAsync from './catchAsync';
import AppError from './AppError';
import { User } from '@tradeblitz/shared-types';

const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.jwt;

  if (!token || token === null)
    return next(new AppError('You are not logged in! Please log in to get access.', 403));

  const decodedUser = (await jwt.verify(token, process.env.JWT_SECRET!)) as User;

  req.user = decodedUser as User;

  next();
});

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

const handleJWTError = () => new AppError(`Invalid token. Please log in again!`, 401);

const handleExpiredTokenError = () => new AppError(`Token expired. Please log in again`, 401);

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
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

const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role))
      return next(new AppError('You do not have permission to perform this action', 403));

    next();
  };
};

export { protect, errorHandler, restrictTo };
