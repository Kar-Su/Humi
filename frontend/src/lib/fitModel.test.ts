import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitModelToPanel } from "./fitModel.ts";

/** The sample model this project ships against: a tall portrait canvas. */
const AUTHORED = { width: 2976, height: 4175 };

describe("fitModelToPanel — sizing", () => {
  it("keeps the aspect ratio by taking the tighter of the two axes", () => {
    // Panel is far wider than tall, so height is the binding constraint.
    const wide = fitModelToPanel({ width: 622, height: 126 }, AUTHORED);
    assert.ok(wide);
    assert.equal(wide.scale, 126 / AUTHORED.height);

    // Panel is taller than the model's ratio, so width binds.
    const tall = fitModelToPanel({ width: 500, height: 2000 }, AUTHORED);
    assert.ok(tall);
    assert.equal(tall.scale, 500 / AUTHORED.width);
  });

  it("leaves the model inside the panel on both axes", () => {
    for (const panel of [
      { width: 622, height: 126 },
      { width: 320, height: 480 },
      { width: 1024, height: 200 },
      { width: 200, height: 200 },
    ]) {
      const placed = fitModelToPanel(panel, AUTHORED);
      assert.ok(placed, `panel ${JSON.stringify(panel)}`);
      const drawn = {
        width: AUTHORED.width * placed.scale,
        height: AUTHORED.height * placed.scale,
      };
      assert.ok(drawn.width <= panel.width + 1e-9, `lebar meluber di ${JSON.stringify(panel)}`);
      assert.ok(drawn.height <= panel.height + 1e-9, `tinggi meluber di ${JSON.stringify(panel)}`);
      assert.ok(
        placed.x >= -1e-9 && placed.y >= -1e-9,
        `offset negatif di ${JSON.stringify(panel)}`,
      );
    }
  });

  it("centres the model in the leftover space", () => {
    const panel = { width: 622, height: 126 };
    const placed = fitModelToPanel(panel, AUTHORED);
    assert.ok(placed);
    assert.ok(Math.abs(placed.x - (panel.width - AUTHORED.width * placed.scale) / 2) < 1e-9);
    assert.ok(Math.abs(placed.y - (panel.height - AUTHORED.height * placed.scale) / 2) < 1e-9);
  });

  it("applies padding as a fraction of the fitting scale", () => {
    const tight = fitModelToPanel({ width: 622, height: 126 }, AUTHORED);
    const padded = fitModelToPanel({ width: 622, height: 126 }, AUTHORED, 0.94);
    assert.ok(tight);
    assert.ok(padded);
    assert.ok(Math.abs(padded.scale - tight.scale * 0.94) < 1e-12);
  });

  it("defaults to filling the panel with no margin", () => {
    assert.equal(
      fitModelToPanel({ width: 622, height: 126 }, AUTHORED)?.scale,
      fitModelToPanel({ width: 622, height: 126 }, AUTHORED, 1)?.scale,
    );
  });
});

describe("fitModelToPanel — rejects unusable input", () => {
  it("returns null when the panel has no area yet", () => {
    assert.equal(fitModelToPanel({ width: 0, height: 126 }, AUTHORED), null);
    assert.equal(fitModelToPanel({ width: 622, height: 0 }, AUTHORED), null);
    assert.equal(fitModelToPanel({ width: -5, height: 126 }, AUTHORED), null);
  });

  it("returns null when the authored size is unknown", () => {
    assert.equal(fitModelToPanel({ width: 622, height: 126 }, { width: 0, height: 0 }), null);
    assert.equal(fitModelToPanel({ width: 622, height: 126 }, { width: 2976, height: 0 }), null);
  });
});

describe("fitModelToPanel — stays stable across repeated calls", () => {
  // Regression guard: an earlier version read the live model size inside the fit, and
  // that size already includes the current scale. Every resize then multiplied the
  // scale again until the avatar filled the panel with one flat patch of texture.
  it("is idempotent for the same authored size", () => {
    const panel = { width: 622, height: 126 };
    const first = fitModelToPanel(panel, AUTHORED, 0.94);
    assert.ok(first);
    for (let i = 0; i < 10; i++) {
      const again = fitModelToPanel(panel, AUTHORED, 0.94);
      assert.ok(again);
      assert.equal(again.scale, first.scale, `scale berubah pada call ke-${i + 2}`);
      assert.equal(again.x, first.x);
      assert.equal(again.y, first.y);
    }
  });

  it("does not drift when the panel resizes back and forth", () => {
    const sizes = [
      { width: 622, height: 126 },
      { width: 400, height: 300 },
      { width: 622, height: 126 },
    ];
    const results = sizes.map((panel) => fitModelToPanel(panel, AUTHORED, 0.94));
    assert.ok(results[0] && results[2]);
    assert.equal(results[2]?.scale, results[0]?.scale);
    assert.equal(results[2]?.x, results[0]?.x);
    assert.equal(results[2]?.y, results[0]?.y);
  });
});
