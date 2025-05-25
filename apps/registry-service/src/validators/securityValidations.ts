import z, { symbol } from 'zod';

export const listSecuritySchema = z.object({
  name: z.string(),
  symbol: z.string(),
  description: z.string().optional(),
});

export const updateSecuritySchema = z.object({
  name: z.string().optional(),
  symbol: z.string().optional(),
  description: z.string().optional(),
});
