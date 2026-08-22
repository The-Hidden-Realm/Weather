import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteCamera, findRemovalRequestById, resolveRemovalRequest } from "@/lib/cameras";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/cameras/removal-requests/[id]">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const requestId = Number(id);
  const target = Number.isInteger(requestId) ? findRemovalRequestById(requestId) : undefined;
  if (!target) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (target.status !== "pending") {
    return NextResponse.json({ error: "This request was already resolved." }, { status: 400 });
  }

  const body = await req.json();
  if (body.action !== "approve" && body.action !== "deny") {
    return NextResponse.json({ error: "action must be 'approve' or 'deny'." }, { status: 400 });
  }

  if (body.action === "approve") {
    deleteCamera(target.camera_id);
    resolveRemovalRequest(target.id, "approved", session.userId);
  } else {
    resolveRemovalRequest(target.id, "denied", session.userId);
  }

  return NextResponse.json({ ok: true });
}
