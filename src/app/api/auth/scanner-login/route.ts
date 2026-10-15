import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone or password" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
    if (!user || user.role !== "SCANNER" || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
      return NextResponse.json({ error: "Invalid scanner phone or password." }, { status: 401 });
    }
    if (!user.scannerApproved) {
      return NextResponse.json({ error: "Scanner account is waiting for admin approval." }, { status: 403 });
    }

    await createSession(user.id, "SCANNER");
    return NextResponse.json({
      user: { id: user.id, role: "SCANNER", fullName: user.fullName, phone: user.phone },
    });
  } catch (error) {
    console.error(
      "[auth.scanner-login] Login service unavailable",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "Scanner login service is temporarily unavailable." }, { status: 503 });
  }
}
