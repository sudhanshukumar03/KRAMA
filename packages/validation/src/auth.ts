import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .refine((password) => new TextEncoder().encode(password).length <= 72, 'Password must be 72 UTF-8 bytes or fewer'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Preserve legacy login/current-password inputs; bound every newly chosen password.
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: SignupSchema.shape.password,
});

export const PreferencesSchema = z.object({
  timerPreferences: z.object({
    focusDuration: z.number().int().min(1).max(1440).optional(),
    shortBreak: z.number().int().min(1).max(1440).optional(),
    longBreak: z.number().int().min(1).max(1440).optional(),
    longBreakAfter: z.number().int().min(1).max(16).optional(),
  }).strict().optional(),
  focusLayout: z.enum(['standby', 'centered', 'overlay', 'sidebar', 'card', 'zen']).optional(),
  focusWallpaper: z.object({
    type: z.enum(['gradient', 'unsplash', 'upload', 'curated']),
    value: z.string().min(1).max(4096),
    thumb: z.string().max(4096).optional(),
    credit: z.string().max(500).optional(),
    creditUrl: z.string().max(4096).optional(),
  }).strict().optional(),
  weeklyCapacityMinutes: z.number().int().min(0).max(10080).optional(),
  locationConfig: z.object({
    countryCode: z.string().regex(/^[A-Za-z]{2}$/).transform(value => value.toUpperCase()).default('IN'),
    regionCode: z.string().max(32).nullable().optional(),
  }).strict().optional(),
}).strict().refine(value => Object.entries(value).some(([key, field]) =>
  field !== undefined && (key !== 'timerPreferences' || Object.keys(field as object).length > 0)), 'Provide at least one preference');
