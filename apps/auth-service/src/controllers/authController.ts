import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import '@tradeblitz/common-types';
import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { AppError, catchAsync } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';
import { User } from '../types/prismaTypes';
import { CustomJwtPayload } from '@tradeblitz/common-types';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();

const signToken = (user: User) => {
  return jwt.sign(
    { id: user.id, role: user.role } as CustomJwtPayload,
    process.env.JWT_SECRET!,
    {
      expiresIn: Number(process.env.JWT_EXPIRES_IN) * 60,
    }
  );
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user);

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 1000
    ),
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
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
      },
    });

    await producer.sendToQueue(
      'auth-service.user-created.notification-service.fanout',
      { email: newUser.email, name: newUser.name }
    );

    createSendToken(newUser, 201, res);
  }
);

export const loginController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  }
);

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const fetchedUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (
      !(await bcrypt.compare(req.body.currentPassword, fetchedUser!.password))
    ) {
      return next(new AppError('Your current password is wrong', 401));
    }

    if (await bcrypt.compare(req.body.newPassword, fetchedUser!.password)) {
      return next(new AppError('Please use a different password', 400));
    }

    const updatedUser = await prisma.user.update({
      where: { id: fetchedUser!.id },
      data: {
        password: await bcrypt.hash(req.body.newPassword, 12),
      },
    });

    createSendToken(updatedUser, 200, res);
  }
);

export const isLoggedIn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      status: 'success',
    });
  }
);

export const createAdminUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token !== process.env.ADMIN_API_KEY)
      return next(
        new AppError('You are not authorized to perform this action', 403)
      );

    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return next(new AppError('Passwords do not match', 400));

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    const { password: newUserPassword, ...data } = newUser;

    res.status(201).json({
      status: 'success',
      data,
    });
  }
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.clearCookie('jwt').status(200).json({
      status: 'success',
    });
  }
);
