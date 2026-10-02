import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CUBISM_CORE_URL,
  type CubismCoreScope,
  type CubismCoreScriptHost,
  isCubismCorePresent,
  loadCubismCore,
} from "./cubismCore.ts";

interface FakeScript {
  src: string;
  async: boolean;
  listeners: Record<string, Array<() => void>>;
  addEventListener(type: string, handler: () => void): void;
  fire(type: string): void;
}

function createFakeHost() {
  const scripts: FakeScript[] = [];
  const doc = {
    createElement() {
      const script: FakeScript = {
        src: "",
        async: true,
        listeners: {},
        addEventListener(type, handler) {
          const bucket = script.listeners[type] ?? [];
          bucket.push(handler);
          script.listeners[type] = bucket;
        },
        fire(type) {
          for (const handler of script.listeners[type] ?? []) handler();
        },
      };
      scripts.push(script);
      return script;
    },
    head: {
      appendChild() {
        /* the fake "network" is driven by fire() */
      },
    },
  } as unknown as CubismCoreScriptHost;
  return { doc, scripts };
}

describe("cubismCore — presence", () => {
  it("detects the global", () => {
    assert.equal(isCubismCorePresent({}), false);
    assert.equal(isCubismCorePresent({ Live2DCubismCore: undefined }), false);
    assert.equal(isCubismCorePresent({ Live2DCubismCore: {} }), true);
  });
});

describe("cubismCore — loading", () => {
  it("resolves without touching the dom when the core is already there", async () => {
    const { doc, scripts } = createFakeHost();
    const scope: CubismCoreScope = { Live2DCubismCore: {} };
    await loadCubismCore(CUBISM_CORE_URL, doc, scope);
    assert.equal(scripts.length, 0);
  });

  it("injects a non async script pointing at the core url", async () => {
    const { doc, scripts } = createFakeHost();
    const scope: CubismCoreScope = {};
    const pending = loadCubismCore(CUBISM_CORE_URL, doc, scope);

    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, CUBISM_CORE_URL);
    assert.equal(scripts[0].async, false);

    scope.Live2DCubismCore = {};
    scripts[0].fire("load");
    await pending;
  });

  it("rejects when the script 404s, naming the expected path", async () => {
    const { doc, scripts } = createFakeHost();
    const pending = loadCubismCore(CUBISM_CORE_URL, doc, {});
    scripts[0].fire("error");
    await assert.rejects(pending, /Gagal memuat Cubism Core/);
    await assert.rejects(pending, /frontend\/public\/assets\/js/);
  });

  it("rejects when the script loads but never publishes the global", async () => {
    const { doc, scripts } = createFakeHost();
    const pending = loadCubismCore(CUBISM_CORE_URL, doc, {});
    scripts[0].fire("load");
    await assert.rejects(pending, /window\.Live2DCubismCore tidak ada/);
  });

  it("resolves a second call without re-injecting once loaded", async () => {
    const { doc, scripts } = createFakeHost();
    const scope: CubismCoreScope = {};

    const first = loadCubismCore(CUBISM_CORE_URL, doc, scope);
    scope.Live2DCubismCore = {};
    scripts[0].fire("load");
    await first;

    await loadCubismCore(CUBISM_CORE_URL, doc, scope);
    assert.equal(scripts.length, 1, "script tidak boleh diinjeksi dua kali");
  });
});
