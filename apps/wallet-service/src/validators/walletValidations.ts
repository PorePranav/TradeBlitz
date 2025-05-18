import z from 'zod';

export const performTransactionSchema = z.object({
  amount: z.number().positive(),
});
