import { NextResponse, type NextRequest } from "next/server";
import { getStageOptions } from "@/lib/stageOptions";

export const dynamic = "force-dynamic";

const NAME = /^[\w.-]+$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const owner = q.get("owner") ?? "";
  const repo = q.get("repo") ?? "";
  const runId = Number(q.get("runId"));
  const jobId = q.get("jobId") ? Number(q.get("jobId")) : undefined;
  const ref = q.get("ref") ?? undefined;
  if (!NAME.test(owner) || !NAME.test(repo) || !Number.isSafeInteger(runId) || (jobId !== undefined && !Number.isSafeInteger(jobId))) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getStageOptions(owner, repo, { runId, jobId, ref }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
