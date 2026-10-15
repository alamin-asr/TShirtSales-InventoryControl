import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid phone or password" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
    if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
      return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
    }
    if (user.role === "SCANNER" && !user.scannerApproved) {
      return NextResponse.json({ error: "Scanner account is waiting for admin approval." }, { status: 403 });
    }
    await createSession(user.id, user.role);
    return NextResponse.json({ user: { id: user.id, role: user.role, fullName: user.fullName, phone: user.phone, sellingPointName: user.sellingPointName } });
  } catch (error) {
    console.error("[auth.login] Login service unavailable", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Login service is temporarily unavailable." }, { status: 503 });
  }
}
