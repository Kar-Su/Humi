// Package protocol memuat kontrak pesan WebSocket Humi.
// Sinkron dengan: skill protocol-contract, ai-service/app/protocol.py,
// dan frontend/src/lib/protocol.ts. Ubah SEMUA dalam satu commit.
package protocol

import (
	"encoding/binary"
	"fmt"
)

// Tipe pesan client -> server.
const (
	TypeText       = "text"
	TypeAudioStart = "audio_start"
	TypeAudioChunk = "audio_chunk"
	TypeAudioEnd   = "audio_end"
	TypeInterrupt  = "interrupt"
)

// Tipe pesan server -> client.
const (
	TypeSessionReady = "session_ready"
	TypeSttFinal     = "stt_final"
	TypeLlmSentence  = "llm_sentence"
	TypeTtsStart     = "tts_start"
	TypeTtsEnd       = "tts_end"
	TypeTurnEnd      = "turn_end"
	TypeError        = "error"
)

// Emosi yang dikenali (kamus di skill persona-prompting).
const (
	EmotionNetral    = "netral"
	EmotionSenang    = "senang"
	EmotionSedih     = "sedih"
	EmotionKaget     = "kaget"
	EmotionPenasaran = "penasaran"
)

// Header audio biner: [seq u32 LE][len u32 LE][payload].
const HeaderBytes = 8

// PackAudio membungkus payload PCM menjadi frame biner.
func PackAudio(seq uint32, payload []byte) []byte {
	frame := make([]byte, HeaderBytes+len(payload))
	binary.LittleEndian.PutUint32(frame[0:4], seq)
	binary.LittleEndian.PutUint32(frame[4:8], uint32(len(payload)))
	copy(frame[HeaderBytes:], payload)
	return frame
}

// UnpackAudio mengurai frame biner. Validasi truncated header/payload.
func UnpackAudio(frame []byte) (uint32, []byte, error) {
	if len(frame) < HeaderBytes {
		return 0, nil, fmt.Errorf("truncated header: got %d bytes, need %d", len(frame), HeaderBytes)
	}
	seq := binary.LittleEndian.Uint32(frame[0:4])
	length := binary.LittleEndian.Uint32(frame[4:8])
	if len(frame) < HeaderBytes+int(length) {
		return 0, nil, fmt.Errorf("truncated payload: header claims %d bytes, frame has %d", length, len(frame)-HeaderBytes)
	}
	payload := frame[HeaderBytes : HeaderBytes+int(length)]
	return seq, payload, nil
}

// IsValidEmotion cek apakah string adalah emosi valid.
func IsValidEmotion(e string) bool {
	switch e {
	case EmotionNetral, EmotionSenang, EmotionSedih, EmotionKaget, EmotionPenasaran:
		return true
	default:
		return false
	}
}
