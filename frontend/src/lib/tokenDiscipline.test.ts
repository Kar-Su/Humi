import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Discipline gate for the three-layer token pipeline.
 *
 * `tokens.test.ts` proves the token *values* are right: references resolve and every declared
 * pair clears its WCAG threshold. This file proves nobody quietly routes around the layer, which
 * is the failure mode a value test cannot see. The three layers only earn their keep if
 * components read the semantic names, so a bypass has to fail loudly rather than ship.
 *
 * Each check below is one sentence of `design-system/humi/MASTER.md` turned into an assertion.
 */

const SRC = path.resolve(import.meta.dirname, "..");
const TOKEN_FILE = path.resolve(SRC, "../../design-system/humi/tokens.json");

/** Test files are allowed to mention hex and default sizes: they assert on them. */
function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((rel) => /\.tsx?$/.test(rel))
    .filter((rel) => !rel.endsWith(".test.ts") && !rel.endsWith(".test.tsx"))
    .map((rel) => path.join(SRC, rel))
    .sort();
}

const FILES = sourceFiles();
const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => path.relative(SRC, file);

/**
 * Leaf names of `primitive.color`, joined the way Tailwind spells a colour utility.
 *
 * `primitive.color.neutral.950` becomes `neutral-950`, which is exactly what someone would
 * type into `className` to bypass the semantic layer. The `status` group has no numeric step,
 * so its members collapse to a bare name that cannot collide with a utility.
 */
function primitiveColorNames(): string[] {
  const tree = JSON.parse(read(TOKEN_FILE)) as {
    primitive: { color: Record<string, Record<string, unknown>> };
  };
  return Object.entries(tree.primitive.color).flatMap(([group, steps]) =>
    Object.keys(steps).map((step) => (/^\d+$/.test(step) ? `${group}-${step}` : step)),
  );
}

const PRIMITIVE_NAMES = primitiveColorNames();

/**
 * Tailwind prefixes that take a colour, each grouped.
 *
 * The parentheses are load-bearing: a bare `bg|text|from` alternation lets `-neutral-950`
 * bind to the last branch only, which turns every one of those prefixes into a match on its
 * own and buries the real finding under a hundred false positives.
 */
const COLOR_PREFIXES =
  "(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|caret|accent|shadow)";

/** Default Tailwind size steps that overlap the range of Humi's role-named type scale. */
const DEFAULT_TEXT_SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];

/**
 * A class token only counts when it starts a word, so `bg-brand-hover` cannot be mistaken for a
 * hit on a shorter primitive. Held as plain strings rather than written inline, because
 * embedding a backtick and a dollar sign inside a template literal is a parser trap.
 */
const LEAD = "[\\s\"'`${(\\[]";
const TAIL = "(?![\\w/-])";

function findUtilities(body: string, pattern: string): string[] {
  return [...body.matchAll(new RegExp(`${LEAD}(?:${pattern})${TAIL}`, "g"))].map((m) =>
    m[0].trim(),
  );
}

describe("token discipline", () => {
  it("has source files to scan, so a rename cannot silently empty the gate", () => {
    assert.ok(FILES.length >= 6, `hanya menemukan ${FILES.length} berkas sumber`);
  });

  it("finds primitive colour names to forbid, so the gate is not vacuous", () => {
    assert.ok(PRIMITIVE_NAMES.includes("neutral-950"), "neutral-950 tidak ikut terambil");
    assert.ok(PRIMITIVE_NAMES.includes("ember-300"), "ember-300 tidak ikut terambil");
    assert.ok(PRIMITIVE_NAMES.length >= 20, `hanya ${PRIMITIVE_NAMES.length} nama primitive`);
  });

  it("never uses a primitive colour name as a Tailwind utility", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const name of PRIMITIVE_NAMES) {
        for (const hit of findUtilities(read(file), `${COLOR_PREFIXES}-${name}`)) {
          offenders.push(`${rel(file)}: ${hit}`);
        }
      }
    }
    assert.deepEqual(
      [...new Set(offenders)],
      [],
      "Komponen harus memakai nama semantic. Nilai mentah hanya boleh di design-system/humi/tokens.json.",
    );
  });

  it("keeps every literal colour out of the source tree", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const m of read(file).matchAll(/#[0-9a-f]{3,8}\b/gi)) {
        offenders.push(`${rel(file)}: ${m[0]}`);
      }
    }
    assert.deepEqual(offenders, [], "Warna literal belongi di tokens.json, bukan di komponen.");
  });

  it("uses the role-named type scale instead of default Tailwind sizes", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const hit of findUtilities(read(file), `text-(?:${DEFAULT_TEXT_SIZES.join("|")})`)) {
        offenders.push(`${rel(file)}: ${hit}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      "Ukuran teks harus lewat text-caption, text-body-sm, text-body, text-lead, text-title, atau text-display.",
    );
  });

  it("sizes the type scale so every step is declared in tokens.json", () => {
    const tree = JSON.parse(read(TOKEN_FILE)) as {
      primitive: { fontSize: Record<string, unknown> };
    };
    const declared = Object.keys(tree.primitive.fontSize);
    for (const used of ["caption", "body-sm", "body", "title"]) {
      assert.ok(declared.includes(used), `text-${used} dipakai tapi tidak ada di tokens.json`);
    }
  });
});
