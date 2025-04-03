import { Request, Response, NextFunction } from 'express';
import '@tradeblitz/shared-types';

import { AppError, catchAsync } from '@tradeblitz/common-utils';
import prisma from '../utils/prisma';
import { createKycSchema } from '../validators/kycValidations';

export const getKycProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const kycProfile = await prisma.kycProfile.findUnique({
    where: { userId: Number(req.user!.id) },
  });

  if (!kycProfile) return next(new AppError('KYC profile not found', 404));

  res.status(200).json({
    status: 'success',
    data: kycProfile,
  });
});

export const createKycProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const fetchedKycProfile = await prisma.kycProfile.findFirst({
      where: { userId: Number(req.user!.id) },
    });

    if (fetchedKycProfile) return next(new AppError('KYC profile already exists', 400));

    const zodResult = createKycSchema.safeParse(req.body);

    if (!zodResult.success) {
      const errorMessages = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errorMessages.join(', '), 400));
    }

    const { dateOfBirth, ...data } = zodResult.data;

    const kycProfile = await prisma.kycProfile.create({
      data: {
        userId: Number(req.user!.id),
        dateOfBirth: new Date(dateOfBirth),
        verificationStatus: 'PENDING',
        ...data,
      },
    });

    res.status(201).json({
      status: 'success',
      data: kycProfile,
    });
  }
);
