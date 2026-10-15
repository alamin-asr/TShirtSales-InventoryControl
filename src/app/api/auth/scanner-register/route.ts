import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { passwordSchema, phoneSchema } from "@/lib/validation";
import { z } from "zod";

const scannerRegisterSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

export async function POST(request: Request) {
  const parsed = scannerRegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
  const { fullName, phone, password } = parsed.data;
  try {
    await prisma.user.create({
      data: { fullName, phone, passwordHash: await hashPassword(password), role: "SCANNER" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "This phone number is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: "Scanner registration could not be completed" }, { status: 500 });
  }
}
