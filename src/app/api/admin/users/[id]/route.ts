import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserById, setUserActive, setUserRole, deleteUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const target = findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.id === session.userId) {
    return NextResponse.json(
      { error: "You can't change your own role or active status here — use Settings." },
      { status: 400 }
    );
  }

  const body = await req.json();

  if (body.role === "admin" || body.role === "user") {
    setUserRole(target.id, body.role);
  }

  if (typeof body.isActive === "boolean") {
    setUserActive(target.id, body.isActive);
  }

  const updated = findUserById(target.id)!;
  return NextResponse.json({
    ok: true,
    user: { id: updated.id, role: updated.role, isActive: updated.is_active === 1 },
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const target = findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  deleteUser(userId);
  return NextResponse.json({ ok: true });
}
