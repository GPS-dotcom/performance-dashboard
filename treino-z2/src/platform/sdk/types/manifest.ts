import type { PermissionScope } from "./permissions";

/** Reverse-domain style id, e.g. "com.example.negative-split-coach" -- globally unique across a future marketplace. */
export type PluginId = string;

/** Semver string, e.g. "1.2.3". Validated by marketplace/compatibilityChecker.ts, not re-validated here. */
export type PluginVersion = string;

/** The 7 extension point kinds a plugin may contribute to (FASE 4). */
export type ExtensionPointKind = "dashboard-page" | "widget" | "metric" | "insight" | "recommendation" | "integration" | "ai-command";

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * The manifest is the one artifact a host (or a future marketplace) needs
 * to know everything about a plugin before running a single line of its
 * code: identity, version, compatibility, what it touches, what it needs
 * permission for. Every field here maps directly to one of FASE 5's
 * requirements: "manifesto, metadados, compatibilidade, assinatura,
 * permissões."
 */
export interface PluginManifest {
  id: PluginId;
  name: string;
  version: PluginVersion;
  description: string;
  author: PluginAuthor;
  /** Lowest host (Performance OS) version this plugin is known to work with. */
  minHostVersion: PluginVersion;
  /** Highest host version this plugin is known to work with, or null for "no known upper bound". */
  maxHostVersion: PluginVersion | null;
  /** Other plugins this one requires, by id -> minimum version. Resolved by manager/dependencyResolver.ts. */
  dependencies: Record<PluginId, PluginVersion>;
  /** Every extension point kind this plugin registers a contribution against -- must be a superset-consistent with what it actually contributes at runtime. */
  extensionPoints: ExtensionPointKind[];
  /** Every permission scope this plugin requests. */
  permissions: PermissionScope[];
  /** Present once a plugin has been signed for marketplace distribution (FASE 5). Absent for local/dev plugins. */
  signature: PluginSignature | null;
  homepage?: string;
  license?: string;
}

/** A detached signature over the manifest + package contents -- verified by marketplace/signature.ts before install, never trusted blindly. */
export interface PluginSignature {
  algorithm: "ed25519" | "rsa-sha256";
  publicKeyId: string;
  value: string; // base64
}
