import type { CampaignMap } from "./attribution";
import rawMap from "@/config/campaign-map.json";

/**
 * Lecture de la configuration. Les erreurs de configuration sont la première
 * cause de tableau de bord vide : on les remonte avec un message qui dit quoi
 * faire, plutôt qu'un écran à zéro qui ressemble à un mauvais mois.
 */

export interface AppConfig {
  chariowApiKey: string;
  metaAccessToken: string;
  metaAdAccountId: string;
  metaApiVersion: string;
}

export class ConfigError extends Error {
  constructor(public readonly missing: string[]) {
    super(
      `Configuration incomplète. Renseigne dans .env.local : ${missing.join(", ")}.`,
    );
    this.name = "ConfigError";
  }
}

export function loadConfig(): AppConfig {
  const missing: string[] = [];

  const chariowApiKey = process.env.CHARIOW_API_KEY ?? "";
  const metaAccessToken = process.env.META_ACCESS_TOKEN ?? "";
  const metaAdAccountId = process.env.META_AD_ACCOUNT_ID ?? "";

  if (!chariowApiKey) missing.push("CHARIOW_API_KEY");
  if (!metaAccessToken) missing.push("META_ACCESS_TOKEN");
  if (!metaAdAccountId) missing.push("META_AD_ACCOUNT_ID");

  if (missing.length > 0) throw new ConfigError(missing);

  return {
    chariowApiKey,
    metaAccessToken,
    metaAdAccountId,
    metaApiVersion: process.env.META_API_VERSION || "v23.0",
  };
}

/**
 * Extrait la table de correspondance du fichier de configuration, en ignorant
 * les clés de documentation préfixées par « _ ».
 */
export function loadCampaignMap(): CampaignMap {
  const source = rawMap as Record<string, unknown>;
  const mapping = source.mapping;

  if (!mapping || typeof mapping !== "object") return {};

  const out: CampaignMap = {};
  for (const [key, value] of Object.entries(mapping as Record<string, unknown>)) {
    if (key.startsWith("_")) continue;
    if (typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      out[key] = value as string[];
    }
  }
  return out;
}
