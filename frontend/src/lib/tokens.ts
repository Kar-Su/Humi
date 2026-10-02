/**
 * Reader and checker for the Humi design tokens.
 *
 * The token tree lives in `design-system/humi/tokens.json` and is compiled to CSS by
 * `design-system/scripts/generate-tokens.cjs`. This module only reads the tree, so it stays
 * free of `node:fs` and can be imported from the browser bundle as well as from tests.
 */

/** Dotted path to raw value, for example `semantic.color.ember` to `#F0555F`. */
export type FlatTokens = Map<string, string>;

const REFERENCE = /^\{([^}]+)\}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Walk a token tree and collect every leaf under its dotted path.
 *
 * A node carrying `$value` is a leaf; `$type`, `$schema` and any other `$`-prefixed key is
 * metadata and is skipped. Anything that is not a `$value` object is walked as a group, so
 * malformed input is dropped rather than silently producing a bogus token.
 */
export function flattenTokens(tree: unknown, prefix: readonly string[] = []): FlatTokens {
  const flat: FlatTokens = new Map();
  walk(tree, prefix, flat, new Set());
  return flat;
}

function walk(
  node: unknown,
  prefix: readonly string[],
  flat: FlatTokens,
  visiting: Set<string>,
): void {
  if (!isRecord(node)) return;

  if (typeof node.$value === "string") {
    flat.set(prefix.join("."), node.$value);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const path = prefix.length === 0 ? key : `${prefix.join(".")}.${key}`;
    // A reference that resolves to one of its own ancestors would recurse forever.
    if (visiting.has(path)) {
      throw new Error(`Token reference cycle at ${path}`);
    }
    visiting.add(path);
    walk(value, path.split("."), flat, visiting);
    visiting.delete(path);
  }
}

/**
 * Resolve every `{layer.path}` reference in place.
 *
 * References are looked up in the same flat map, which is what lets a semantic token point at
 * a primitive and a component token point at a semantic one. An unknown reference throws
 * rather than emitting the literal braces into CSS, because a silent pass-through would hide
 * the typo until someone looked at the browser.
 */
export function resolveTokens(flat: FlatTokens): FlatTokens {
  const resolved: FlatTokens = new Map();

  const resolve = (path: string, seen: ReadonlySet<string>): string => {
    const cached = resolved.get(path);
    if (cached !== undefined) return cached;

    const raw = flat.get(path);
    if (raw === undefined) throw new Error(`Unknown token ${path}`);

    const reference = REFERENCE.exec(raw);
    if (!reference) {
      resolved.set(path, raw);
      return raw;
    }

    if (seen.has(path)) throw new Error(`Token reference cycle at ${path}`);

    const target = reference[1];
    const next = new Set(seen);
    next.add(path);
    const value = resolve(target, next);
    resolved.set(path, value);
    return value;
  };

  for (const path of flat.keys()) resolve(path, new Set());
  return resolved;
}

function parseHex(hex: string): [number, number, number] {
  const body = hex.trim().replace(/^#/, "");
  const digits = body.length === 3 ? body.replace(/./g, (c) => c + c) : body;

  if (!/^[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`Expected a 3 or 6 digit hex color, got ${JSON.stringify(hex)}`);
  }

  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
}

/** sRGB channel linearization from the WCAG 2.2 definition. */
function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.2 relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.2 contrast ratio between two colors, from 1 to 21.
 *
 * Argument order does not matter; the lighter color always becomes the numerator.
 */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
