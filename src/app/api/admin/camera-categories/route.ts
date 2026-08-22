import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCategoryPrivacy, setCategoryPrivate } from "@/lib/cameras";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ categories: listCategoryPrivacy() });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!category) {
    return NextResponse.json({ error: "Category is required." }, { status: 400 });
  }

  setCategoryPrivate(category, !!body.isPrivate);
  return NextResponse.json({ ok: true });
}
