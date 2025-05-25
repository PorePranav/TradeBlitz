import z from 'zod';
import { Side, OrderType } from '../types/prismaTypes';

export const createOrderSchema = z
  .object({
    securityId: z.string().trim(),
    type: z.nativeEnum(OrderType),
    side: z.nativeEnum(Side),
    quantity: z.number().positive('Quantity must be a positive number'),
    price: z.number().positive('Price must be a positive number').optional(),
  })
  .refine(
    (data) => {
      if (data.type === OrderType.LIMIT && data.price === undefined)
        return false;
      return true;
    },
    {
      message: 'Price is required for LIMIT orders',
      path: ['price'],
    }
  );
