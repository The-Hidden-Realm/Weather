import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM locations WHERE id = ? AND user_id = ?").get(id, session.userId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM locations WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const row = db.prepare("SELECT * FROM locations WHERE id = ? AND user_id = ?").get(id, session.userId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.setDefault) {
    const tx = db.transaction(() => {
      db.prepare("UPDATE locations SET is_default = 0 WHERE user_id = ?").run(session.userId);
      db.prepare("UPDATE locations SET is_default = 1 WHERE id = ?").run(id);
    });
    tx();
  }

  const updated = db.prepare("SELECT * FROM locations WHERE id = ?").get(id);
  return NextResponse.json({ location: updated });
}
