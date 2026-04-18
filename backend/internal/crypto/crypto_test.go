package crypto

import (
	"os"
	"testing"
)

const testEncryptionKey = "12345678901234567890123456789012"

func setupTestKey(t *testing.T) {
	t.Helper()
	os.Setenv("ENCRYPTION_KEY", testEncryptionKey)
	t.Cleanup(func() {
		os.Unsetenv("ENCRYPTION_KEY")
	})
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	setupTestKey(t)

	plaintext := "access-sandbox-abc123-test-token"

	encrypted, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	if encrypted == plaintext {
		t.Fatal("encrypted text should not equal plaintext")
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if decrypted != plaintext {
		t.Fatalf("expected %q got %q", plaintext, decrypted)
	}
}

func TestEncryptProducesUniqueOutput(t *testing.T) {
	setupTestKey(t)

	plaintext := "access-sandbox-abc123-test-token"

	encrypted1, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("first Encrypt failed: %v", err)
	}

	encrypted2, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("second Encrypt failed: %v", err)
	}

	if encrypted1 == encrypted2 {
		t.Fatal("encrypting the same plaintext twice should produce different ciphertext due to random nonce")
	}
}

func TestDecryptWithWrongKey(t *testing.T) {
	setupTestKey(t)

	plaintext := "access-sandbox-abc123-test-token"

	encrypted, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	os.Setenv("ENCRYPTION_KEY", "99999999999999999999999999999999")

	_, err = Decrypt(encrypted)
	if err == nil {
		t.Fatal("expected error when decrypting with wrong key but got nil")
	}
}

func TestEncryptEmptyString(t *testing.T) {
	setupTestKey(t)

	encrypted, err := Encrypt("")
	if err != nil {
		t.Fatalf("Encrypt empty string failed: %v", err)
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt empty string failed: %v", err)
	}

	if decrypted != "" {
		t.Fatalf("expected empty string got %q", decrypted)
	}
}

func TestEncryptMissingKey(t *testing.T) {
	os.Unsetenv("ENCRYPTION_KEY")

	_, err := Encrypt("some-token")
	if err == nil {
		t.Fatal("expected error when ENCRYPTION_KEY is not set but got nil")
	}
}

func TestEncryptInvalidKeyLength(t *testing.T) {
	os.Setenv("ENCRYPTION_KEY", "tooshort")
	defer os.Unsetenv("ENCRYPTION_KEY")

	_, err := Encrypt("some-token")
	if err == nil {
		t.Fatal("expected error when ENCRYPTION_KEY is wrong length but got nil")
	}
}

func TestDecryptInvalidBase64(t *testing.T) {
	setupTestKey(t)

	_, err := Decrypt("this-is-not-valid-base64!!!")
	if err == nil {
		t.Fatal("expected error when decrypting invalid base64 but got nil")
	}
}

func TestDecryptTamperedCiphertext(t *testing.T) {
	setupTestKey(t)

	plaintext := "access-sandbox-abc123-test-token"

	encrypted, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	tampered := encrypted[:len(encrypted)-4] + "XXXX"

	_, err = Decrypt(tampered)
	if err == nil {
		t.Fatal("expected error when decrypting tampered ciphertext but got nil")
	}
}