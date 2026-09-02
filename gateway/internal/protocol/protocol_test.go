package protocol

import "testing"

func TestUnpackAudio_Roundtrip(t *testing.T) {
	orig := []byte{0x00, 0x01, 0x02}
	frame := PackAudio(3, orig)
	seq, payload, err := UnpackAudio(frame)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seq != 3 {
		t.Fatalf("seq: want 3 got %d", seq)
	}
	if string(payload) != string(orig) {
		t.Fatalf("payload mismatch: %v vs %v", payload, orig)
	}
	if len(frame) != HeaderBytes+len(orig) {
		t.Fatalf("frame len: want %d got %d", HeaderBytes+len(orig), len(frame))
	}
}

func TestUnpackAudio_EmptyPayload(t *testing.T) {
	frame := PackAudio(0, []byte{})
	seq, payload, err := UnpackAudio(frame)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seq != 0 || len(payload) != 0 {
		t.Fatalf("empty: seq=%d payload=%v", seq, payload)
	}
}

func TestUnpackAudio_MaxSeq(t *testing.T) {
	frame := PackAudio(^uint32(0), []byte("hi"))
	seq, payload, err := UnpackAudio(frame)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seq != ^uint32(0) {
		t.Fatalf("seq max: want %d got %d", ^uint32(0), seq)
	}
	if string(payload) != "hi" {
		t.Fatalf("payload hi: got %q", payload)
	}
}

func TestUnpackAudio_RejectsTruncatedHeader(t *testing.T) {
	_, _, err := UnpackAudio([]byte{0x01, 0x00, 0x00, 0x00}) // 4 < 8
	if err == nil {
		t.Fatal("want error for truncated header, got nil")
	}
	if want := "truncated"; !contains(err.Error(), want) {
		t.Fatalf("error should mention %q, got %q", want, err.Error())
	}
}

func TestUnpackAudio_RejectsLyingLength(t *testing.T) {
	frame := PackAudio(1, []byte{0x00, 0x01})
	// corrupt length field to 10
	frame[4] = 10
	frame[5] = 0
	frame[6] = 0
	frame[7] = 0
	_, _, err := UnpackAudio(frame)
	if err == nil {
		t.Fatal("want error for lying length, got nil")
	}
}

func TestUnpackAudio_RejectsEmptyFrame(t *testing.T) {
	_, _, err := UnpackAudio([]byte{})
	if err == nil {
		t.Fatal("want error for empty frame")
	}
}

func TestIsValidEmotion(t *testing.T) {
	valid := []string{"netral", "senang", "sedih", "kaget", "penasaran"}
	for _, e := range valid {
		if !IsValidEmotion(e) {
			t.Fatalf("IsValidEmotion(%q) = false, want true", e)
		}
	}
	invalid := []string{"netral ", "SENANG", "marah", "", "senang "}
	for _, e := range invalid {
		if IsValidEmotion(e) {
			t.Fatalf("IsValidEmotion(%q) = true, want false", e)
		}
	}
}

func TestPackAudioHeaderLittleEndian(t *testing.T) {
	frame := PackAudio(0x01020304, []byte("x"))
	// LE: 04 03 02 01
	if frame[0] != 0x04 || frame[1] != 0x03 || frame[2] != 0x02 || frame[3] != 0x01 {
		t.Fatalf("seq LE wrong: %v", frame[:4])
	}
	// len=1 LE: 01 00 00 00
	if frame[4] != 0x01 || frame[5] != 0x00 || frame[6] != 0x00 || frame[7] != 0x00 {
		t.Fatalf("len LE wrong: %v", frame[4:8])
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool {
		for i := 0; i <= len(s)-len(sub); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()
}
