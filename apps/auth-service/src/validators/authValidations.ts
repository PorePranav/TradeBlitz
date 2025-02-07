import z from 'zod';

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name should at least have 2 characters')
      .max(50, 'Name should not exceed 50 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password should be at least 8 characters')
      .max(50, 'Password should not exceed 50 characters'),
    confirmPassword: z.string(),
    role: z.enum(['USER']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});
