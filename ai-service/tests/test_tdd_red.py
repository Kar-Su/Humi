"""RED phase: failing tests for pure logic gaps.
These must FAIL before GREEN fix — proving TDD gate works.
"""

import pytest

from app import protocol
from app.llm import parse_emotion, split_sentence
from app.persona import SYSTEM_PROMPT, build_messages


def test_unpack_audio_rejects_truncated_header():
    with pytest.raises(ValueError, match="truncated"):
        protocol.unpack_audio(b"\x01\x00\x00\x00")  # 4 bytes < 8


def test_unpack_audio_rejects_lying_length():
    # header claims len=10 but only 2 bytes payload
    frame = protocol.pack_audio(1, b"\x00\x01")
    # corrupt length field to 10
    bad = frame[:4] + (10).to_bytes(4, "little") + frame[8:]
    with pytest.raises(ValueError, match="truncated"):
        protocol.unpack_audio(bad)


def test_unpack_audio_roundtrip_empty_payload():
    seq, payload = protocol.unpack_audio(protocol.pack_audio(0, b""))
    assert seq == 0
    assert payload == b""


def test_unpack_audio_roundtrip_max_seq():
    seq, payload = protocol.unpack_audio(protocol.pack_audio(2**32 - 1, b"hi"))
    assert seq == 2**32 - 1
    assert payload == b"hi"


def test_parse_emotion_rejects_netral_tag():
    # "[netral]" is not a valid tag — should stay as plain text (netral)
    assert parse_emotion("[netral] hai") == ("netral", "[netral] hai")


def test_parse_emotion_rejects_uppercase():
    assert parse_emotion("[HAPPY] hai") == ("netral", "[HAPPY] hai")


def test_parse_emotion_rejects_space_inside_brackets():
    assert parse_emotion("[happy ] hai") == ("netral", "[happy ] hai")


def test_parse_emotion_empty_string():
    assert parse_emotion("") == ("netral", "")


def test_parse_emotion_only_tag_no_text():
    assert parse_emotion("[surprised]") == ("surprised", "")


def test_split_sentence_ellipsis():
    assert split_sentence("Tunggu... lanjut ya") == ("Tunggu...", " lanjut ya")


def test_split_sentence_mixed_punct():
    assert split_sentence("Hah!? lanjut") == ("Hah!?", " lanjut")


def test_split_sentence_empty_buffer():
    assert split_sentence("") == ("", "")


def test_split_sentence_only_delimiter():
    assert split_sentence("!") == ("!", "")


def test_split_sentence_no_delimiter_returns_empty_sentence():
    assert split_sentence("halo dunia") == ("", "halo dunia")


def test_split_sentence_keeps_trailing_ellipsis_content():
    s, r = split_sentence("Hai... Apa kabar? Lanjut")
    assert s == "Hai..."
    assert r == " Apa kabar? Lanjut"


def test_build_messages_immutability():
    hist = [{"role": "user", "content": "hi"}]
    original_len = len(hist)
    msgs = build_messages(hist)
    assert len(msgs) == 2  # system + user
    msgs.append({"role": "assistant", "content": "oops"})
    assert len(hist) == original_len  # caller history unchanged
    assert len(msgs) == 3


def test_build_messages_system_prompt_first():
    msgs = build_messages([{"role": "user", "content": "halo"}])
    assert msgs[0]["role"] == "system"
    assert msgs[0]["content"] == SYSTEM_PROMPT
    assert msgs[1] == {"role": "user", "content": "halo"}


def test_build_messages_empty_history():
    msgs = build_messages([])
    assert len(msgs) == 1
    assert msgs[0]["role"] == "system"


def test_protocol_emotions_constant():
    assert set(protocol.EMOTIONS) == {
        "netral",
        "happy",
        "sad",
        "angry",
        "excited",
        "calm",
        "nervous",
        "confident",
        "surprised",
        "satisfied",
        "delighted",
        "scared",
        "worried",
        "upset",
        "frustrated",
        "depressed",
        "empathetic",
        "embarrassed",
        "disgusted",
        "moved",
        "proud",
        "relaxed",
        "grateful",
        "curious",
        "sarcastic",
    }
    assert len(protocol.EMOTIONS) == 25
