import z from 'zod';

import { Role } from '../types/prisma-client';

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name should have at least 2 characters')
    .max(50, 'Name can have at most 50 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(50, 'Password can have at most 50 characters'),
  confirmPassword: z.string(),
  role: z.enum(Object.values(Role) as [string, ...string[]]).default(Role.USER),
  avatar: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string(),
});
