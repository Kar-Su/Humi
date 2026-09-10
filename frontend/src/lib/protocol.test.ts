import assert from "node:assert/strict";
import { describe, it } from "node:test";

// RED — expects functions not yet in protocol.ts, must fail before GREEN
import { EMOTIONS, HEADER_BYTES, isValidEmotion, packAudio, unpackAudio } from "./protocol.ts";

describe("protocol — audio framing", () => {
  it("roundtrip small payload", () => {
    const payload = new Uint8Array([0, 1, 2]);
    const frame = packAudio(3, payload);
    assert.equal(frame.length, HEADER_BYTES + 3);
    const { seq, payload: out } = unpackAudio(frame);
    assert.equal(seq, 3);
    assert.deepEqual(out, payload);
  });

  it("roundtrip empty payload", () => {
    const frame = packAudio(0, new Uint8Array([]));
    const { seq, payload } = unpackAudio(frame);
    assert.equal(seq, 0);
    assert.equal(payload.length, 0);
  });

  it("rejects truncated header", () => {
    assert.throws(() => unpackAudio(new Uint8Array([1, 0, 0, 0])), /truncated/);
  });

  it("rejects lying length", () => {
    const frame = packAudio(1, new Uint8Array([0, 1]));
    // corrupt len=10 LE at offset 4
    frame[4] = 10;
    assert.throws(() => unpackAudio(frame), /truncated/);
  });

  it("little-endian header", () => {
    const frame = packAudio(0x01020304, new Uint8Array([9]));
    assert.equal(frame[0], 0x04);
    assert.equal(frame[1], 0x03);
    assert.equal(frame[2], 0x02);
    assert.equal(frame[3], 0x01);
    assert.equal(frame[4], 0x01); // len=1
  });
});

describe("protocol — emotions", () => {
  it("valid emotions", () => {
    for (const e of EMOTIONS) assert.equal(isValidEmotion(e), true);
  });
  it("invalid emotions", () => {
    assert.equal(isValidEmotion("marah"), false);
    assert.equal(isValidEmotion("senang"), false);
    assert.equal(isValidEmotion(""), false);
    assert.equal(isValidEmotion("HAPPY"), false);
  });
});
