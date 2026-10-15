import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/security";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
  const { fullName, phone, sellingPointName, password } = parsed.data;
  try {
    const user = await prisma.user.create({ data: { fullName, phone, sellingPointName, passwordHash: await hashPassword(password) } });
    await createSession(user.id, user.role);
    return NextResponse.json({ user: { id: user.id, role: user.role, fullName: user.fullName, phone: user.phone, sellingPointName } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "Registration could not be completed" }, { status: 409 });
    return NextResponse.json({ error: "Registration could not be completed" }, { status: 500 });
  }
}
