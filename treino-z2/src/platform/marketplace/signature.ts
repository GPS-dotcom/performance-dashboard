import type { PluginManifest, PluginSignature } from "../sdk/types/manifest";

export interface SignatureVerificationResult {
  verified: boolean;
  reason: string | null;
}

/** Pluggable so a real marketplace can swap in an actual cryptographic verifier (ed25519/RSA) without touching call sites -- this SDK ships no crypto implementation itself. */
export interface SignatureVerifier {
  verify(manifest: PluginManifest, signature: PluginSignature): SignatureVerificationResult;
}

/**
 * FASE 5's "assinatura": local/dev plugins ship with `manifest.signature: null`
 * and are allowed through (there is no marketplace yet to sign against).
 * A signed plugin is checked against whatever `SignatureVerifier` the
 * caller supplies -- by default, `unsignedPluginPolicy` below rejects any
 * plugin that *claims* to be signed but supplies no verifier capable of
 * checking it, which is safer than silently trusting an unverifiable
 * signature.
 */
export const trustUnsignedVerifier: SignatureVerifier = {
  verify(): SignatureVerificationResult {
    return { verified: false, reason: "No SignatureVerifier configured -- cannot verify a signed plugin." };
  },
};

export function verifyPluginSignature(manifest: PluginManifest, verifier: SignatureVerifier = trustUnsignedVerifier): SignatureVerificationResult {
  if (manifest.signature == null) {
    return { verified: true, reason: null }; // unsigned local/dev plugin -- allowed, per the policy above
  }
  return verifier.verify(manifest, manifest.signature);
}
