import { NextResponse } from "next/server";
import { getSession } from "@/lib/security";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user } = session;
  return NextResponse.json({ user: { id: user.id, role: user.role, fullName: user.fullName, phone: user.phone, sellingPointName: user.sellingPointName } });
}
