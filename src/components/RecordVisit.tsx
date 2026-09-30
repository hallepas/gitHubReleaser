"use client";

import { useEffect } from "react";
import { addRecent } from "@/lib/favorites";

export function RecordVisit({ repo }: { repo: string }) {
  useEffect(() => addRecent(repo), [repo]);
  return null;
}
