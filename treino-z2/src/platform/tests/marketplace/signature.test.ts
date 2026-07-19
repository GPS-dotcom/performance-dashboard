import { describe, expect, it } from "vitest";
import { trustUnsignedVerifier, verifyPluginSignature } from "../../marketplace/signature";
import type { SignatureVerifier } from "../../marketplace/signature";
import type { PluginManifest } from "../../sdk/types/manifest";

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "com.example.a",
    name: "A",
    version: "1.0.0",
    description: "d",
    author: { name: "Someone" },
    minHostVersion: "1.0.0",
    maxHostVersion: null,
    dependencies: {},
    extensionPoints: [],
    permissions: [],
    signature: null,
    ...overrides,
  };
}

describe("verifyPluginSignature", () => {
  it("allows an unsigned manifest through", () => {
    expect(verifyPluginSignature(makeManifest({ signature: null }))).toEqual({ verified: true, reason: null });
  });

  it("rejects a signed manifest when no real verifier is configured", () => {
    const manifest = makeManifest({ signature: { algorithm: "ed25519", publicKeyId: "key-1", value: "abc" } });
    const result = verifyPluginSignature(manifest);
    expect(result.verified).toBe(false);
    expect(result.reason).not.toBeNull();
  });

  it("delegates to a custom SignatureVerifier when one is supplied", () => {
    const manifest = makeManifest({ signature: { algorithm: "rsa-sha256", publicKeyId: "key-1", value: "abc" } });
    const acceptingVerifier: SignatureVerifier = { verify: () => ({ verified: true, reason: null }) };
    expect(verifyPluginSignature(manifest, acceptingVerifier)).toEqual({ verified: true, reason: null });
  });

  it("trustUnsignedVerifier itself always reports unverified", () => {
    const manifest = makeManifest();
    const signature = { algorithm: "ed25519" as const, publicKeyId: "key-1", value: "abc" };
    expect(trustUnsignedVerifier.verify(manifest, signature)).toEqual({ verified: false, reason: expect.any(String) });
  });
});
