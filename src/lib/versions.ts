export interface Version {
  tag: string;
  prefix: string;
  major: number;
  minor: number;
  patch: number;
  pre?: string;
}

export interface TagSuggestion {
  tag: string;
  preview: boolean;
  note: string;
}

const SEMVER = /^(v?)(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseVersion(tag: string): Version | undefined {
  const m = SEMVER.exec(tag);
  if (!m) return undefined;
  return { tag, prefix: m[1], major: +m[2], minor: +m[3], patch: +m[4], pre: m[5] };
}

function comparePre(a?: string, b?: string): number {
  if (a === b) return 0;
  if (!a) return 1; // a release ranks above its previews
  if (!b) return -1;
  const pa = a.split(".");
  const pb = b.split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const na = /^\d+$/.test(pa[i]) ? Number(pa[i]) : NaN;
    const nb = /^\d+$/.test(pb[i]) ? Number(pb[i]) : NaN;
    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb;
    } else if (!isNaN(na)) return -1;
    else if (!isNaN(nb)) return 1;
    else if (pa[i] !== pb[i]) {
      // "preview9" vs "preview10": compare trailing numbers numerically
      const ma = /^(.*?)(\d+)$/.exec(pa[i]);
      const mb = /^(.*?)(\d+)$/.exec(pb[i]);
      if (ma && mb && ma[1] === mb[1]) return Number(ma[2]) - Number(mb[2]);
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
}

export function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch || comparePre(a.pre, b.pre);
}

function base(v: Pick<Version, "major" | "minor" | "patch">) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** Git ref rules (simplified) plus a length limit. */
export function tagNameError(tag: string): string | undefined {
  if (!tag) return "Enter a tag name.";
  if (tag.length > 100) return "The tag name is too long.";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(tag)) return "Use only letters, digits, '.', '-', '_' and '/'.";
  if (/\.\.|\/\/|\/\.|\.lock$|[./]$/.test(tag)) return "This is not a valid Git tag name.";
  return undefined;
}

/** Suggests the next release and preview tags based on the existing tags. */
export function suggestTags(tags: string[]): {
  latestRelease?: string;
  latestPreview?: string;
  suggestions: TagSuggestion[];
} {
  const versions = tags.map(parseVersion).filter((v): v is Version => !!v);
  const sorted = [...versions].sort(compareVersions).reverse();
  const latestRelease = sorted.find((v) => !v.pre);
  const latestPreview = sorted.find((v) => v.pre);

  // Follow the repository's conventions: "v" prefix and preview naming like "preview.3", "rc1" or "beta-2".
  const prefix = (latestRelease ?? latestPreview)?.prefix ?? "v";
  const style = /^([A-Za-z]+)(?:([.-]?)\d+)?$/.exec(latestPreview?.pre ?? "");
  const label = style?.[1] ?? "preview";
  const sep = style?.[2] ?? ".";

  const stable = latestRelease ?? { major: 0, minor: 0, patch: 0 };
  const next = {
    patch: { ...stable, patch: stable.patch + 1 },
    minor: { major: stable.major, minor: stable.minor + 1, patch: 0 },
    major: { major: stable.major + 1, minor: 0, patch: 0 },
  };

  const existing = new Set(tags);
  const suggestions: TagSuggestion[] = [];
  const add = (tag: string, preview: boolean, note: string) => {
    if (!existing.has(tag) && !suggestions.some((s) => s.tag === tag)) suggestions.push({ tag, preview, note });
  };

  // A preview that is ahead of the latest release is the version currently being prepared.
  const upcoming =
    latestPreview && (!latestRelease || compareVersions({ ...latestPreview, pre: undefined }, latestRelease) > 0)
      ? latestPreview
      : undefined;
  if (upcoming) {
    add(`${prefix}${base(upcoming)}`, false, `release of ${upcoming.tag}`);
    const n = Number(/(\d+)$/.exec(upcoming.pre!)?.[1] ?? 0);
    const nextPre = /\d+$/.test(upcoming.pre!)
      ? upcoming.pre!.replace(/\d+$/, String(n + 1))
      : `${upcoming.pre}${sep || "."}1`;
    add(`${prefix}${base(upcoming)}-${nextPre}`, true, `next preview after ${upcoming.tag}`);
  }
  for (const [kind, v] of Object.entries(next)) {
    add(`${prefix}${base(v)}`, false, kind);
    if (!upcoming || base(v) !== base(upcoming)) add(`${prefix}${base(v)}-${label}${sep}1`, true, `first preview of the next ${kind}`);
  }

  return { latestRelease: latestRelease?.tag, latestPreview: latestPreview?.tag, suggestions };
}
