import { z } from "zod";
import { normalizePhone } from "@/lib/security";

export const phoneSchema = z.string().trim().min(1, "Phone number is required").transform(normalizePhone).refine(
  (phone) => phone.length > 0,
  "Enter a valid phone number",
);
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").regex(/[A-Za-z]/, "Password must contain at least one letter").regex(/[0-9]/, "Password must contain at least one number");
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  sellingPointName: z.string().trim().min(2).max(120),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords do not match",
});
export const loginSchema = z.object({ phone: phoneSchema, password: z.string().min(1) });
export const buyerPhoneSchema = phoneSchema.refine(
  (phone) => /^\d{11}$/.test(phone),
  "Buyer phone number must be exactly 11 digits",
);
export const saleSchema = z.object({
  buyerPhone: buyerPhoneSchema,
  sizes: z.array(z.enum(["S", "M", "L", "XL", "XXL"])).min(1).max(5),
  idempotencyKey: z.string().min(16).max(100),
});
