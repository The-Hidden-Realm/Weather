import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  findUserById,
  setUserActive,
  setUserRole,
  setUserFeatures,
  deleteUser,
  verifyAdminPassword,
  AVAILABLE_FEATURES,
  type FeatureKey,
} from "@/lib/auth";

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

  const body = await req.json();

  const changesRoleOrStatus = body.role !== undefined || typeof body.isActive === "boolean";
  if (target.id === session.userId && changesRoleOrStatus) {
    return NextResponse.json(
      { error: "You can't change your own role or active status here — use Settings." },
      { status: 400 }
    );
  }

  if (body.role === "admin" || body.role === "moderator" || body.role === "user") {
    if (!verifyAdminPassword(session, body.adminPassword)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }
    setUserRole(target.id, body.role);
  }

  if (typeof body.isActive === "boolean") {
    setUserActive(target.id, body.isActive);
  }

  if (Array.isArray(body.features)) {
    const features = body.features.filter((f: unknown): f is FeatureKey =>
      (AVAILABLE_FEATURES as readonly string[]).includes(f as string)
    );
    setUserFeatures(target.id, features);
  }

  const updated = findUserById(target.id)!;
  return NextResponse.json({
    ok: true,
    user: { id: updated.id, role: updated.role, isActive: updated.is_active === 1, features: updated.enabled_features },
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
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

  const body = await req.json().catch(() => ({}));
  if (!verifyAdminPassword(session, body.adminPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  deleteUser(userId);
  return NextResponse.json({ ok: true });
}
