import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import '@tradeblitz/shared-types';
import { RabbitMQClient, ExchangeType } from '@tradeblitz/rabbitmq';

import { AppError, catchAsync } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';

import { User } from '../types/prisma-client';
import { loginSchema, signupSchema } from '../validators/authValidations';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();

const signToken = (user: User) => {
  return jwt.sign(user, process.env.JWT_SECRET!, {
    expiresIn: Number(process.env.JWT_EXPIRES_IN) * 60,
  });
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user);

  const cookieOptions = {
    expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 1000),
    httpOnly: true,
    sameSite: 'none' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  const { password, verificationToken, ...data } = user;

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

    const { name, email, password, confirmPassword, avatar } = zodResult.data;

    if (password !== confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
        verified: false,
        verificationToken: verificationTokenHash,
        avatar,
      },
    });

    await producer.publish(
      { name: newUser.name, email: newUser.email, verificationToken },
      { exchangeName: 'auth.signup.fanout', exchangeType: ExchangeType.FANOUT }
    );

    res.status(201).json({
      status: 'success',
    });
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

    let user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    if (!user.verified) {
      return next(
        new AppError('Account is not verified, please check your email to verify the account.', 400)
      );
    }

    if (!user.active) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { active: true },
      });
    }

    createSendToken(user, 200, res);
  }
);

export const isLoggedIn = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: 'success',
  });
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.email) {
      return next(new AppError('Please provide your email address', 400));
    }

    const fetchedUser = await prisma.user.findFirst({
      where: { email: req.body.email },
    });

    if (!fetchedUser) {
      return next(new AppError('There is no user with that email address', 404));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: fetchedUser.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await producer.sendToQueue('auth.forgot-password', {
      name: fetchedUser.name,
      email: fetchedUser.email,
      resetToken,
    });

    res.status(200).json({
      status: 'success',
    });
  }
);

export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.query.token) return next(new AppError('Token is required', 400));

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.query.token as string)
    .digest('hex');

  const fetchedUser = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!fetchedUser) return next(new AppError('Token is invalid or has expired', 400));

  if (req.body.password !== req.body.confirmPassword)
    return next(new AppError('Passwords do not match', 400));

  const hashedPassword = await bcrypt.hash(req.body.password, 12);

  const updatedUser = await prisma.user.update({
    where: { id: fetchedUser.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  createSendToken(updatedUser, 200, res);
});

export const verifyUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.query.token) return next(new AppError('Token is required', 400));

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.query.token as string)
    .digest('hex');

  const fetchedUser = await prisma.user.findFirst({
    where: { verificationToken: hashedToken },
  });

  if (!fetchedUser) return next(new AppError('Token is invalid or expired', 400));

  const updatedUser = await prisma.user.update({
    where: { id: fetchedUser.id },
    data: { verified: true, verificationToken: null },
  });

  createSendToken(updatedUser, 200, res);
});

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.currentPassword || !req.body.newPassword || !req.body.confirmPassword) {
      return next(new AppError('Please provide your current password and new password', 400));
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    const fetchedUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!(await bcrypt.compare(req.body.currentPassword, fetchedUser!.password))) {
      return next(new AppError('Your current password is wrong', 401));
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

export const oAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await prisma.user.findFirst({
    where: { email: req.body.email },
  });

  if (user) {
    createSendToken(user, 200, res);
  } else {
    const generatedPassword = Math.random().toString(36).slice(-8);

    const newUser = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: await bcrypt.hash(generatedPassword, 12),
        avatar: req.body.photo,
        role: 'USER',
        verified: true,
      },
    });

    createSendToken(newUser, 201, res);
  }
});

export const createAdminUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token !== process.env.ADMIN_API_KEY)
      return next(new AppError('You are not authorized to perform this action', 403));

    const zodResult = signupSchema.safeParse(req.body);

    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const { name, email, password, confirmPassword, avatar } = zodResult.data;

    if (password !== confirmPassword) return next(new AppError('Passwords do not match', 400));

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        verified: true,
        avatar,
      },
    });

    const { password: newUserPassword, ...data } = newUser;

    res.status(201).json({
      status: 'success',
      data,
    });
  }
);

export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie('jwt').status(200).json({
    status: 'success',
  });
});