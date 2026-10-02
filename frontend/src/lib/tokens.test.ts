import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  contrastRatio,
  type FlatTokens,
  flattenTokens,
  relativeLuminance,
  resolveTokens,
} from "./tokens.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const TOKEN_FILE = path.join(REPO_ROOT, "design-system/humi/tokens.json");
const GENERATED_CSS = path.join(REPO_ROOT, "frontend/src/styles/tokens.css");

function loadTokenFile(): FlatTokens {
  const tree: unknown = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  return resolveTokens(flattenTokens(tree));
}

const tokens = loadTokenFile();

/** Read a resolved token, failing loudly when the path is a typo. */
function color(name: string): string {
  const value = tokens.get(name);
  assert.ok(value !== undefined, `missing token ${name}`);
  assert.match(value, /^#[0-9a-f]{6}$/i, `token ${name} is not a hex color: ${value}`);
  return value;
}

describe("flattenTokens", () => {
  it("treats a node with $value as a leaf and skips $ metadata", () => {
    const flat = flattenTokens({
      $schema: "ignored",
      layer: { color: { brand: { $value: "#ABCDEF", $type: "color" } } },
    });
    assert.deepEqual([...flat], [["layer.color.brand", "#ABCDEF"]]);
  });

  it("keeps a non-hex leaf such as a duration", () => {
    const flat = flattenTokens({ primitive: { duration: { normal: { $value: "220ms" } } } });
    assert.equal(flat.get("primitive.duration.normal"), "220ms");
  });

  it("drops groups that are not objects instead of emitting garbage", () => {
    const flat = flattenTokens({ layer: { a: "#FFF", b: 42, c: { $value: "#000" } } });
    assert.deepEqual([...flat], [["layer.c", "#000"]]);
  });

  it("returns an empty map for a non-object input", () => {
    assert.equal(flattenTokens("nope").size, 0);
    assert.equal(flattenTokens(null).size, 0);
  });
});

describe("resolveTokens", () => {
  it("inlines a reference that points at a primitive", () => {
    const flat = flattenTokens({
      primitive: { color: { ember: { $value: "#F0555F" } } },
      semantic: { color: { ember: { $value: "{primitive.color.ember}" } } },
    });
    assert.equal(resolveTokens(flat).get("semantic.color.ember"), "#F0555F");
  });

  it("follows a two hop chain from component to primitive", () => {
    const flat = flattenTokens({
      primitive: { color: { ember: { $value: "#F0555F" } } },
      semantic: { color: { ember: { $value: "{primitive.color.ember}" } } },
      component: { button: { bg: { $value: "{semantic.color.ember}" } } },
    });
    assert.equal(resolveTokens(flat).get("component.button.bg"), "#F0555F");
  });

  it("throws on a reference that names no token, so a typo cannot reach CSS", () => {
    const flat = flattenTokens({
      semantic: { color: { ember: { $value: "{primitive.color.nope}" } } },
    });
    assert.throws(() => resolveTokens(flat), /Unknown token primitive\.color\.nope/);
  });

  it("throws on a two token cycle instead of recursing forever", () => {
    const flat = flattenTokens({
      semantic: {
        color: {
          a: { $value: "{semantic.color.b}" },
          b: { $value: "{semantic.color.a}" },
        },
      },
    });
    assert.throws(() => resolveTokens(flat), /cycle/i);
  });

  it("throws on a token that references itself", () => {
    const flat = flattenTokens({ semantic: { color: { a: { $value: "{semantic.color.a}" } } } });
    assert.throws(() => resolveTokens(flat), /cycle/i);
  });
});

describe("relativeLuminance", () => {
  it("anchors black at 0 and white at 1", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#FFFFFF"), 1);
  });

  it("accepts shorthand hex by expanding each digit", () => {
    assert.equal(relativeLuminance("#fff"), relativeLuminance("#FFFFFF"));
    assert.equal(relativeLuminance("#000"), 0);
  });

  it("ignores case and surrounding whitespace", () => {
    assert.equal(relativeLuminance("  #AbCdEf "), relativeLuminance("#abcdef"));
  });

  it("rejects anything that is not a hex color instead of returning NaN", () => {
    assert.throws(() => relativeLuminance("transparent"), /hex color/);
    assert.throws(() => relativeLuminance("oklch(0.145 0 none)"), /hex color/);
    assert.throws(() => relativeLuminance("#12345"), /hex color/);
  });
});

describe("contrastRatio", () => {
  it("returns the full 21 to 1 for black against white", () => {
    assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  });

  it("returns 1 for a color against itself", () => {
    assert.equal(contrastRatio("#3DDCE8", "#3DDCE8"), 1);
  });

  it("is symmetric in its arguments", () => {
    assert.equal(contrastRatio("#0B0912", "#F5F2FF"), contrastRatio("#F5F2FF", "#0B0912"));
  });
});

/**
 * Every pair a user can actually read. The threshold is 4.5:1 because the smallest text we
 * ship is `caption` at 12px, which is well under the 24px large-text exemption.
 */
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["semantic.color.fg", "semantic.color.bg"],
  ["semantic.color.fg", "semantic.color.surface"],
  ["semantic.color.fg", "semantic.color.surface-raised"],
  ["semantic.color.fg", "semantic.color.bubble-user"],
  ["semantic.color.fg-muted", "semantic.color.bg"],
  ["semantic.color.fg-muted", "semantic.color.surface"],
  ["semantic.color.fg-muted", "semantic.color.surface-raised"],
  ["semantic.color.fg-subtle", "semantic.color.bg"],
  ["semantic.color.fg-subtle", "semantic.color.surface"],
  ["semantic.color.fg-subtle", "semantic.color.surface-raised"],
  ["semantic.color.ember", "semantic.color.bg"],
  ["semantic.color.ember", "semantic.color.surface"],
  ["semantic.color.ember", "semantic.color.surface-raised"],
  ["semantic.color.gold", "semantic.color.bg"],
  ["semantic.color.gold", "semantic.color.surface"],
  ["semantic.color.live", "semantic.color.bg"],
  ["semantic.color.live", "semantic.color.surface"],
  ["semantic.color.live", "semantic.color.surface-raised"],
  ["semantic.color.magenta", "semantic.color.bg"],
  ["semantic.color.magenta", "semantic.color.surface"],
  ["semantic.color.success", "semantic.color.surface"],
  ["semantic.color.danger", "semantic.color.surface"],
  ["semantic.color.warning", "semantic.color.surface"],
  ["semantic.color.on-ember", "semantic.color.ember"],
  ["semantic.color.on-ember", "semantic.color.ember-hover"],
  ["semantic.color.on-ember", "semantic.color.ember-active"],
  ["semantic.color.on-gold", "semantic.color.gold"],
  ["semantic.color.on-live", "semantic.color.live"],
  ["semantic.color.on-magenta", "semantic.color.magenta"],
];

/**
 * Boundaries and state indicators, not text. WCAG 1.4.11 asks for 3:1 here.
 */
const UI_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["semantic.color.border-control", "semantic.color.bg"],
  ["semantic.color.border-control", "semantic.color.surface"],
  ["semantic.color.border-control", "semantic.color.surface-raised"],
  ["semantic.color.live", "semantic.color.surface-raised"],
  ["semantic.color.magenta", "semantic.color.surface-raised"],
  ["semantic.color.ember", "semantic.color.surface-raised"],
];

describe("Humi palette contrast", () => {
  for (const [fg, bg] of TEXT_PAIRS) {
    it(`${fg} on ${bg} clears 4.5:1`, () => {
      const ratio = contrastRatio(color(fg), color(bg));
      assert.ok(
        ratio >= 4.5,
        `${fg} (${color(fg)}) on ${bg} (${color(bg)}) is ${ratio.toFixed(2)}:1, needs 4.5:1`,
      );
    });
  }

  for (const [fg, bg] of UI_PAIRS) {
    it(`${fg} on ${bg} clears 3:1 as a non-text indicator`, () => {
      const ratio = contrastRatio(color(fg), color(bg));
      assert.ok(
        ratio >= 3,
        `${fg} (${color(fg)}) on ${bg} (${color(bg)}) is ${ratio.toFixed(2)}:1, needs 3:1`,
      );
    });
  }

  it("reports the two pairs with the least headroom, so regressions are visible", () => {
    const ranked = TEXT_PAIRS.map(([fg, bg]) => ({
      pair: `${fg} on ${bg}`,
      ratio: contrastRatio(color(fg), color(bg)),
    })).sort((a, b) => a.ratio - b.ratio);

    assert.ok(
      ranked[0].ratio >= 4.5,
      `tightest pair is ${ranked[0].pair} at ${ranked[0].ratio.toFixed(2)}:1`,
    );
    assert.ok(ranked[1].ratio >= 4.5, `second tightest is ${ranked[1].pair}`);
  });
});

describe("generated CSS stays in sync with the token file", () => {
  it("emits every semantic color with the value the token file resolves to", () => {
    const css = readFileSync(GENERATED_CSS, "utf8");

    for (const [path, value] of tokens) {
      if (!path.startsWith("semantic.")) continue;
      // The generator turns path separators into dashes: semantic.color.surface-raised
      // becomes --color-surface-raised.
      const name = path.replace(/^semantic\./, "").replace(/\./g, "-");
      const declaration = `--${name}: ${value};`;
      assert.ok(
        css.includes(declaration),
        `frontend/src/styles/tokens.css is stale, missing "${declaration}". Re-run generate-tokens.cjs.`,
      );
    }
  });

  it("leaves no unresolved reference behind", () => {
    for (const [path, value] of tokens) {
      assert.doesNotMatch(value, /\{/, `${path} still holds an unresolved reference`);
    }
  });
});
