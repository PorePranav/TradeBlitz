import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import prisma from '../utils/prisma';

import { User } from '../types/prisma-client';
import { signupSchema, loginSchema } from '../validators/authValidations';

type jwtPayload = {
  userId: number;
  role: string;
};

const signToken = (userId: number, role: string) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET as string, {
    expiresIn: Number(process.env.JWT_EXPIRES_IN),
  });
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user.id, user.role);

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 86400000
    ),
    httpOnly: true,
    sameSate: 'none',
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
      const errors = zodResult.error.errors.map((err) => err.message);
      return next(new AppError(errors.join('. '), 400));
    }

    const { name, email, password, confirmPassword, role } = zodResult.data;

    if (password !== confirmPassword)
      return next(new AppError('Passwords do not match', 400));

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    createSendToken(newUser, 201, res);
  }
);
