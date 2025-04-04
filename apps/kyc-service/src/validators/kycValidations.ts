import z from 'zod';

export const createKycSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name should have at least 2 characters')
    .max(50, 'First name can have at most 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name should have at least 2 characters')
    .max(50, 'Last name can have at most 50 characters'),
  phoneNumber: z
    .string()
    .trim()
    .min(10, 'Phone number should have at least 10 digits')
    .max(10, 'Phone number can have at most 10 digits'),
  dateOfBirth: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Invalid date format'),
  addressLine: z
    .string()
    .trim()
    .min(10, 'Address should have at least 10 characters')
    .max(100, 'Address can have at most 100 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City should have at least 2 characters')
    .max(50, 'City can have at most 50 characters'),
  state: z
    .string()
    .trim()
    .min(2, 'State should have at least 2 characters')
    .max(50, 'State can have at most 50 characters'),
  country: z
    .string()
    .trim()
    .min(2, 'Country should have at least 2 characters')
    .max(50, 'Country can have at most 50 characters'),
  postalCode: z
    .string()
    .min(6, 'Postal code should have at least 6 digits')
    .max(6, 'Postal code can have at most 6 digits'),
  nationality: z
    .string()
    .min(2, 'Nationality should have at least 2 characters')
    .max(50, 'Nationality can have at most 50 characters'),
  panNumber: z
    .string()
    .min(10, 'PAN card number should have at least 10 characters')
    .max(10, 'PAN card number can have at most 10 characters'),
  aadhaarNumber: z
    .string()
    .min(12, 'Aadhaar number should have at least 12 digits')
    .max(12, 'Aadhaar number can have at most 12 digits'),
});

export const updateKycSchema = z.object({
  email: z.string().trim().email('Invalid email address').optional(),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name should have at least 2 characters')
    .max(50, 'First name can have at most 50 characters')
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name should have at least 2 characters')
    .max(50, 'Last name can have at most 50 characters')
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .min(10, 'Phone number should have at least 10 digits')
    .max(10, 'Phone number can have at most 10 digits')
    .optional(),
  dateOfBirth: z
    .string()
    .refine((date) => !isNaN(new Date(date).getTime()), 'Invalid date format')
    .optional(),
  addressLine: z
    .string()
    .trim()
    .min(10, 'Address should have at least 10 characters')
    .max(100, 'Address can have at most 100 characters')
    .optional(),
  city: z
    .string()
    .trim()
    .min(2, 'City should have at least 2 characters')
    .max(50, 'City can have at most 50 characters')
    .optional(),
  state: z
    .string()
    .trim()
    .min(2, 'State should have at least 2 characters')
    .max(50, 'State can have at most 50 characters')
    .optional(),
  country: z
    .string()
    .trim()
    .min(2, 'Country should have at least 2 characters')
    .max(50, 'Country can have at most 50 characters')
    .optional(),
  postalCode: z
    .string()
    .min(6, 'Postal code should have at least 6 digits')
    .max(6, 'Postal code can have at most 6 digits')
    .optional(),
  nationality: z
    .string()
    .min(2, 'Nationality should have at least 2 characters')
    .max(50, 'Nationality can have at most 50 characters')
    .optional(),
  panNumber: z
    .string()
    .min(10, 'PAN card number should have at least 10 characters')
    .max(10, 'PAN card number can have at most 10 characters')
    .optional(),
  aadhaarNumber: z
    .string()
    .min(12, 'Aadhaar number should have at least 12 digits')
    .max(12, 'Aadhaar number can have at most 12 digits')
    .optional(),
});

export const createKycUserDocumentSchema = z.object({
  aadhaarCardUrl: z.string().url('Invalid URL format for Aadhaar card'),
  panCardUrl: z.string().url('Invalid URL format for PAN card'),
});

export const updateKycUserDocumentSchema = z.object({
  aadhaarCardUrl: z.string().url('Invalid URL format for Aadhaar card').optional(),
  panCardUrl: z.string().url('Invalid URL format for PAN card').optional(),
});