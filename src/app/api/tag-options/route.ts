import { NextResponse, type NextRequest } from "next/server";
import { getTagOptions } from "@/lib/tags";

export const dynamic = "force-dynamic";

const NAME = /^[\w.-]+$/;

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") ?? "";
  const repo = req.nextUrl.searchParams.get("repo") ?? "";
  if (!NAME.test(owner) || !NAME.test(repo)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getTagOptions(owner, repo));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
