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
  panCardNumber: z
    .string()
    .min(10, 'PAN card number should have at least 10 characters')
    .max(10, 'PAN card number can have at most 10 characters'),
});
