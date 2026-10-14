package ratelimit

import (
	"testing"
	"time"
)

func TestCooldownGateBlocksAfterMark(t *testing.T) {
	gate := NewCooldownGate(time.Hour)
	gate.Mark("sync:1")

	blocked, retryAfter := gate.Remaining("sync:1")
	if !blocked || retryAfter <= 0 {
		t.Fatalf("expected key to be in cooldown, got blocked=%v retryAfter=%v", blocked, retryAfter)
	}
}

func TestCooldownGateClearReleasesKey(t *testing.T) {
	gate := NewCooldownGate(time.Hour)
	gate.Mark("sync:1")
	gate.Mark("sync:2")

	gate.Clear("sync:1")

	if blocked, _ := gate.Remaining("sync:1"); blocked {
		t.Fatal("expected cleared key to be allowed again")
	}
	if blocked, _ := gate.Remaining("sync:2"); !blocked {
		t.Fatal("clearing one key must not release other keys")
	}
}
