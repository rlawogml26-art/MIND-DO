import { z } from "zod";
import { PROFILE_NICKNAME_MAX } from "./profile.js";

export const SIGNUP_EMAIL_MAX = 255;
export const SIGNUP_PASSWORD_MIN = 8;
export const SIGNUP_PASSWORD_MAX = 64;

const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(SIGNUP_EMAIL_MAX)
  .email();

const signupNameSchema = z
  .string()
  .min(1)
  .max(PROFILE_NICKNAME_MAX)
  .refine((value) => value.trim().length > 0);

export const signupRequestSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(SIGNUP_PASSWORD_MIN).max(SIGNUP_PASSWORD_MAX),
  name: signupNameSchema,
});

export const signupResponseSchema = z.object({
  userId: z.number().int().positive(),
  email: authEmailSchema,
  name: signupNameSchema,
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type SignupResponse = z.infer<typeof signupResponseSchema>;
