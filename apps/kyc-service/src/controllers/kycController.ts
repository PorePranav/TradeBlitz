import { Request, Response, NextFunction } from 'express';

import '@tradeblitz/shared-types';
import { AppError, catchAsync } from '@tradeblitz/common-utils';
import { RabbitMQClient } from '@tradeblitz/rabbitmq';

import {
  createKycSchema,
  createKycUserDocumentSchema,
  updateKycSchema,
  updateKycUserDocumentSchema,
} from '../validators/kycValidations';
import { Status } from '../types/prisma-client';
import prisma from '../utils/prisma';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();

export const getKycProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const kycProfile = await prisma.kycProfile.findUnique({
    where: { userId: Number(req.user!.id) },
  });

  if (!kycProfile) {
    return next(new AppError('KYC profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: kycProfile,
  });
});

export const getKycStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const kycProfile = await prisma.kycProfile.findUnique({
    where: { userId: Number(req.user!.id) },
  });

  if (!kycProfile) {
    return next(new AppError('KYC profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { verificationStatus: kycProfile.verificationStatus },
  });
});

export const createKycProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const existingProfile = await prisma.kycProfile.findFirst({
      where: { userId: Number(req.user!.id) },
    });

    if (existingProfile) {
      return next(new AppError('KYC profile already exists', 400));
    }

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
        verificationStatus: 'INREVIEW',
        ...data,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { kycRequestId: kycProfile.id },
    });
  }
);

export const createKycDocuments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const existingDocuments = await prisma.kycUserDocument.findFirst({
      where: { userId: Number(req.user!.id) },
    });

    if (existingDocuments) {
      return next(new AppError('Documents already exist', 400));
    }

    const zodResult = createKycUserDocumentSchema.safeParse(req.body);
    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const userDocuments = await prisma.kycUserDocument.create({
      data: {
        ...zodResult.data,
        userId: Number(req.user!.id),
        aadhaarCardStatus: 'INREVIEW',
        panCardStatus: 'INREVIEW',
      },
    });

    res.status(201).json({
      status: 'success',
      data: userDocuments,
    });
  }
);

export const updateKycProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const kycProfile = await prisma.kycProfile.findFirst({
      where: { userId: Number(req.user!.id) },
    });

    if (!kycProfile) {
      return next(new AppError('KYC not found', 404));
    }

    if (kycProfile.verificationStatus === 'APPROVED') {
      return next(new AppError('KYC cannot be updated once approved', 400));
    }

    if (kycProfile.verificationStatus === 'INREVIEW') {
      return next(new AppError('KYC is in review and details cannot be updated', 400));
    }

    const zodResult = updateKycSchema.safeParse(req.body);
    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const updatedProfile = await prisma.kycProfile.update({
      where: { userId: Number(req.user!.id) },
      data: { ...zodResult.data, verificationStatus: 'INREVIEW' },
    });

    res.status(200).json({
      status: 'success',
      data: updatedProfile,
    });
  }
);

export const updateKycDocuments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const kycDocuments = await prisma.kycUserDocument.findFirst({
      where: { userId: Number(req.user!.id) },
    });

    if (!kycDocuments) {
      return next(new AppError('Documents not found', 404));
    }

    if (
      kycDocuments.aadhaarCardStatus === 'APPROVED' &&
      kycDocuments.panCardStatus === 'APPROVED'
    ) {
      return next(new AppError('Documents cannot be updated once approved', 400));
    }

    if (
      kycDocuments.aadhaarCardStatus === 'INREVIEW' ||
      kycDocuments.panCardStatus === 'INREVIEW'
    ) {
      return next(new AppError('Documents are in review and cannot be updated', 400));
    }

    const zodResult = updateKycUserDocumentSchema.safeParse(req.body);
    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    const updateData: Record<string, any> = {};

    if (zodResult.data.aadhaarCardUrl) {
      if (kycDocuments.aadhaarCardStatus === 'APPROVED') {
        return next(new AppError('Aadhaar card is already approved and cannot be updated', 400));
      }
      updateData.aadhaarCardUrl = zodResult.data.aadhaarCardUrl;
      updateData.aadhaarCardStatus = 'INREVIEW';
    }

    if (zodResult.data.panCardUrl) {
      if (kycDocuments.panCardStatus === 'APPROVED') {
        return next(new AppError('PAN card is already approved and cannot be updated', 400));
      }
      updateData.panCardUrl = zodResult.data.panCardUrl;
      updateData.panCardStatus = 'INREVIEW';
    }

    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No valid fields to update', 400));
    }

    const updatedDocuments = await prisma.kycUserDocument.update({
      where: { userId: Number(req.user!.id) },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: updatedDocuments,
    });
  }
);

export const getInReviewKycs = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const inReviewKycs = await prisma.kycProfile.findMany({
      where: { verificationStatus: 'INREVIEW' },
      include: { document: true },
    });

    if (!inReviewKycs || inReviewKycs.length === 0) {
      return next(new AppError('No KYC profiles in review', 404));
    }

    res.status(200).json({
      status: 'success',
      data: inReviewKycs,
    });
  }
);

export const updateKycStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, status } = req.params;
    const validStatuses = ['APPROVED', 'REJECTED'] as const;

    if (!userId || !status) {
      return next(new AppError('User ID and status are required', 400));
    }

    if (!validStatuses.includes(status as any)) {
      return next(new AppError('Invalid status', 400));
    }

    const fetchedKyc = await prisma.kycProfile.findUnique({
      where: { userId: Number(userId) },
      include: { document: true },
    });

    if (!fetchedKyc) {
      return next(new AppError('KYC profile not found', 404));
    }

    if (fetchedKyc.verificationStatus !== 'INREVIEW') {
      return next(new AppError('KYC profile is not in review', 400));
    }

    if (
      fetchedKyc.document?.aadhaarCardStatus !== 'APPROVED' &&
      fetchedKyc.document?.panCardStatus !== 'APPROVED'
    ) {
      return next(new AppError('Both documents must be approved before KYC can be approved', 400));
    }

    const updatedKyc = await prisma.kycProfile.update({
      where: { userId: Number(userId) },
      data: { verificationStatus: status === 'APPROVED' ? Status.APPROVED : Status.REJECTED },
    });

    await producer.sendToQueue('kyc.approved', {
      userId: Number(userId),
    });

    res.status(200).json({
      status: 'success',
      data: updatedKyc,
    });
  }
);

export const updateKycDocumentStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, type, status } = req.params;
    const validTypes = ['aadhaarCardStatus', 'panCardStatus'] as const;
    const validStatuses = ['APPROVED', 'REJECTED'] as const;

    if (!userId || !type || !status) {
      return next(new AppError('User ID, document type, and status are required', 400));
    }

    if (!validTypes.includes(type as any) || !validStatuses.includes(status as any)) {
      return next(new AppError('Invalid document type or status', 400));
    }

    const fetchedKyc = await prisma.kycUserDocument.findUnique({
      where: { userId: Number(userId) },
    });

    if (!fetchedKyc) {
      return next(new AppError('KYC profile not found', 404));
    }

    const documentType = type as 'aadhaarCardStatus' | 'panCardStatus';

    if (fetchedKyc[documentType] === status) {
      return next(new AppError(`KYC profile is already ${status.toLowerCase()}`, 400));
    }

    if (fetchedKyc[documentType] !== 'INREVIEW') {
      return next(new AppError('KYC profile is not in review', 400));
    }

    const updatedKyc = await prisma.kycUserDocument.update({
      where: { userId: Number(userId) },
      data: { [documentType]: status },
    });

    res.status(200).json({
      status: 'success',
      data: updatedKyc,
    });
  }
);
