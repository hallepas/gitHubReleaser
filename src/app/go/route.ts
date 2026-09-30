import { NextResponse, type NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const repo = (req.nextUrl.searchParams.get("repo") ?? "")
    .trim()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\.git$/, "");
  const [owner, name] = repo.split("/");
  const target = owner && name ? `/r/${owner}/${name}/deployments` : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
