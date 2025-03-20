import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'shared-types';

import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import prisma from '../utils/prisma';

import { Role, User } from '../types/prisma-client';
import { loginSchema, signupSchema } from '../validators/authValidations';

type jwtPayload = {
  userId: number;
  role: string;
};

const signToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: Number(process.env.JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000,
  });
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user.id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'none' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  const { password, ...data } = user;

  res.cookie('jwt', token, cookieOptions).status(statusCode).json({
    status: 'success',
    data,
  });
};

export const signupController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const zodResult = signupSchema.safeParse(req.body);

    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const { name, email, password, confirmPassword, role, avatar } = zodResult.data;

    if (password !== confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
        avatar,
      },
    });

    createSendToken(newUser, 201, res);
  }
);

export const loginController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const zodResult = loginSchema.safeParse(req.body);

    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const { email, password } = zodResult.data;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  }
);

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.jwt;
  if (!token || token == null)
    return next(new AppError('You are not logged in. Please log in to get access', 401));

  const decoded = (await jwt.verify(token, process.env.JWT_SECRET!)) as jwtPayload;

  const fetchedUser = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!fetchedUser)
    return next(new AppError('The user belonging to this token does no longer exist.', 401));

  req.user = fetchedUser as User;
  next();
});

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req.user as User).role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};