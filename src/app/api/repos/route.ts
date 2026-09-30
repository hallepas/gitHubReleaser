import { NextResponse, type NextRequest } from "next/server";
import { getAllRepos } from "@/lib/repos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const repos = await getAllRepos(req.nextUrl.searchParams.has("refresh"));
    return NextResponse.json(repos, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
