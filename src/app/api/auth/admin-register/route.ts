import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/security";
import { registerSchema } from "@/lib/validation";

const ADMIN_REGISTRATION_ID = 1;
const MAX_ADMIN_COUNT = 2;

export async function GET() {
  const [state, adminCount] = await Promise.all([
    prisma.adminRegistrationState.findUnique({ where: { id: ADMIN_REGISTRATION_ID } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
  ]);

  return NextResponse.json({
    available: !state?.registrationClosed && adminCount < MAX_ADMIN_COUNT,
    adminCount,
    maxAdminCount: MAX_ADMIN_COUNT,
  });
}

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
  }

  const { fullName, phone, password } = parsed.data;

  try {
    const user = await prisma.$transaction(
      async (tx) => {
        const state = await tx.adminRegistrationState.upsert({
          where: { id: ADMIN_REGISTRATION_ID },
          update: {},
          create: { id: ADMIN_REGISTRATION_ID },
        });

        const adminCount = await tx.user.count({ where: { role: Role.ADMIN } });
        if (state.registrationClosed || adminCount >= MAX_ADMIN_COUNT) {
          throw new Error("ADMIN_REGISTRATION_CLOSED");
        }

        const createdUser = await tx.user.create({
          data: {
            fullName,
            phone,
            passwordHash: await hashPassword(password),
            role: Role.ADMIN,
          },
        });

        await tx.adminRegistrationState.update({
          where: { id: ADMIN_REGISTRATION_ID },
          data: { registrationClosed: adminCount + 1 >= MAX_ADMIN_COUNT },
        });

        await tx.auditLog.create({
          data: { userId: createdUser.id, action: "REGISTER", details: { role: Role.ADMIN } },
        });

        return createdUser;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await createSession(user.id, user.role);
    return NextResponse.json(
      { user: { id: user.id, role: user.role, fullName: user.fullName, phone: user.phone } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REGISTRATION_CLOSED") {
      return NextResponse.json({ error: "Both administrator registration slots are already used." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002" || error.code === "P2034") {
        return NextResponse.json({ error: "Both administrator registration slots are already used." }, { status: 409 });
      }
    }
    console.error("[auth.admin-register] Registration service unavailable", error);
    return NextResponse.json({ error: "Registration could not be completed" }, { status: 500 });
  }
}
