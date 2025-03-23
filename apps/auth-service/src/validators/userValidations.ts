import z from 'zod';

export const updateMeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name should have at least 2 characters')
    .max(50, 'Name can have at most 50 characters')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  avatar: z.string().optional(),
});
