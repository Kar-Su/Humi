import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emotionLabel, isEmphasised } from "./emotionLabel.ts";
import { EMOTIONS, type Emotion } from "./protocol.ts";

describe("emotionLabel", () => {
  it("covers every emotion on the wire, so no raw token can leak to the screen", () => {
    const missing = EMOTIONS.filter((e) => emotionLabel(e).length === 0);
    assert.deepEqual(missing, []);
  });

  it("has a distinct Indonesian label for each emotion", () => {
    const labels = EMOTIONS.map(emotionLabel);
    assert.equal(new Set(labels).size, EMOTIONS.length, "ada label yang dipakai dua emotion");
  });

  it("never returns the English token for an emotion the product knows", () => {
    for (const emotion of EMOTIONS) {
      assert.notEqual(emotionLabel(emotion), emotion, `${emotion} masih tampil apa adanya`);
    }
  });

  it("uses Indonesian capitalisation rather than all-caps shouting", () => {
    for (const emotion of EMOTIONS) {
      const label = emotionLabel(emotion);
      assert.equal(label, label.trim());
      assert.ok(!/\s{2,}/.test(label), `label ${label} punya spasi ganda`);
    }
  });

  it("falls back to the raw token when an emotion is not in the table", () => {
    // A widened protocol must not render as an empty bubble.
    const future = "sleepy" as Emotion;
    assert.equal(emotionLabel(future), "sleepy");
  });
});

describe("isEmphasised", () => {
  it("marks the charged emotions and leaves level ones alone", () => {
    for (const emotion of ["happy", "angry", "sad", "excited", "sarcastic"] as const) {
      assert.equal(isEmphasised(emotion), true, `${emotion} seharusnya ditegaskan`);
    }
    for (const emotion of ["netral", "calm", "relaxed", "confident", "proud"] as const) {
      assert.equal(isEmphasised(emotion), false, `${emotion} seharusnya datar`);
    }
  });

  it("keeps netral unmarked so a quiet turn looks quiet", () => {
    assert.equal(isEmphasised("netral"), false);
  });

  it("returns false for an unknown emotion instead of throwing", () => {
    assert.equal(isEmphasised("sleepy" as Emotion), false);
  });
});
