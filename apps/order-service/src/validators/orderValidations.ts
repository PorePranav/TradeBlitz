import z from 'zod';

export const createOrderSchema = z.object({
  stockId: z.string().nonempty(),
  orderType: z.enum(['LIMIT', 'MARKET']),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
});
