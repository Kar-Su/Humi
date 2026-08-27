from app import protocol
from app.llm import parse_emotion, split_sentence


def test_parse_emotion():
    assert parse_emotion("[senang] Hai") == ("senang", "Hai")
    assert parse_emotion("  [kaget]  wow") == ("kaget", "wow")
    assert parse_emotion("hai biasa") == ("netral", "hai biasa")
    assert parse_emotion("[sedih]hmm") == ("sedih", "hmm")


def test_split_sentence():
    assert split_sentence("Halo dunia! terus apa") == ("Halo dunia!", " terus apa")
    assert split_sentence("Halo dunia. Ya?") == ("Halo dunia.", " Ya?")
    assert split_sentence("tanpa tanda baca") == ("", "tanpa tanda baca")


def test_pack_unpack_audio():
    frame = protocol.pack_audio(3, b"\x00\x01\x02")
    seq, payload = protocol.unpack_audio(frame)
    assert seq == 3
    assert payload == b"\x00\x01\x02"
    assert len(frame) == protocol.HEADER_BYTES + 3