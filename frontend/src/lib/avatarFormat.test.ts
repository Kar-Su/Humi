import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATAR_FORMATS,
  DEFAULT_AVATAR_FORMAT,
  DEFAULT_LIVE2D_MODEL_URL,
  isAvatarFormat,
  parseAvatarFormat,
  resolveAvatarFormat,
  resolveLive2dModelUrl,
} from "./avatarFormat.ts";

describe("avatarFormat — parse", () => {
  it("known formats pass through", () => {
    for (const format of AVATAR_FORMATS) {
      assert.equal(parseAvatarFormat(format), format);
    }
  });

  it("normalises case and surrounding whitespace", () => {
    assert.equal(parseAvatarFormat("  Live2D "), "live2d");
    assert.equal(parseAvatarFormat("EMOJI"), "emoji");
  });

  it("falls back for anything unknown", () => {
    for (const raw of [undefined, null, "", "   ", "vrm", "live3d", "true", "1"]) {
      assert.equal(parseAvatarFormat(raw), DEFAULT_AVATAR_FORMAT, `input: ${String(raw)}`);
    }
  });

  it("rejects non string input without throwing", () => {
    assert.equal(parseAvatarFormat(undefined), "emoji");
    assert.equal(parseAvatarFormat(null), "emoji");
  });
});

describe("avatarFormat — guards", () => {
  it("isAvatarFormat only accepts declared formats", () => {
    assert.equal(isAvatarFormat("live2d"), true);
    assert.equal(isAvatarFormat("emoji"), true);
    assert.equal(isAvatarFormat("vrm"), false);
    assert.equal(isAvatarFormat(""), false);
  });

  it("default is emoji so a fresh checkout still renders", () => {
    assert.equal(DEFAULT_AVATAR_FORMAT, "emoji");
  });
});

describe("avatarFormat — resolve from env", () => {
  it("reads VITE_AVATAR_FORMAT", () => {
    assert.equal(resolveAvatarFormat({ VITE_AVATAR_FORMAT: "live2d" }), "live2d");
    assert.equal(resolveAvatarFormat({}), "emoji");
    assert.equal(resolveAvatarFormat({ VITE_AVATAR_FORMAT: "nope" }), "emoji");
  });

  it("falls back to the bundled sample model url", () => {
    assert.equal(resolveLive2dModelUrl({}), DEFAULT_LIVE2D_MODEL_URL);
    assert.equal(resolveLive2dModelUrl({ VITE_LIVE2D_MODEL_URL: "  " }), DEFAULT_LIVE2D_MODEL_URL);
  });

  it("honours an explicit model url", () => {
    assert.equal(
      resolveLive2dModelUrl({ VITE_LIVE2D_MODEL_URL: " /live2d/humi/humi.model3.json " }),
      "/live2d/humi/humi.model3.json",
    );
  });
});
