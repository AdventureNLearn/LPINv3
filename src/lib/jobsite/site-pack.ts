/**
 * Site geometry packs — handoff to GeoLibre / GIS tools.
 * Separate from state jurisdiction packs and full board packs.
 */

import { sanitizeForPublicSurface } from "@/lib/integrity";
import {
  normalizeFeatureCollection,
  normalizeSiteGeo,
  siteGeoToFeatureCollection,
} from "./site-geo";
import type { Jobsite, SiteGeo, SitePack } from "./types";

export const SITE_PACK_DISCLAIMER =
  "LPIN Suite site geometry pack (United States). User-owned map pin and layers on this device — not a city/county system of record, not legal advice, not an AHJ portal. State selection still drives code packs separately.";

export function buildSitePack(jobsite: Jobsite): SitePack | null {
  const siteGeo = normalizeSiteGeo(jobsite.siteGeo);
  if (!siteGeo) return null;
  return {
    format: "lpin-site-pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "lpin-jobsite",
    productRegion: "US",
    disclaimer: SITE_PACK_DISCLAIMER,
    project: {
      name: jobsite.name,
      stateCode: jobsite.stateCode,
      placeLabel: jobsite.cityState || jobsite.location || undefined,
    },
    siteGeo,
  };
}

export function sitePackToJson(jobsite: Jobsite): string | null {
  const pack = buildSitePack(jobsite);
  if (!pack) return null;
  return JSON.stringify(pack, null, 2);
}

export function sitePackFilename(jobsite: Jobsite): string {
  const slug = (jobsite.name || "jobsite")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const day = new Date().toISOString().slice(0, 10);
  return `${slug || "lpin-site"}-${day}.lpin-site.json`;
}

export function downloadSitePack(jobsite: Jobsite): boolean {
  const json = sitePackToJson(jobsite);
  if (!json) return false;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sitePackFilename(jobsite);
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function downloadSiteGeoJson(jobsite: Jobsite): boolean {
  const siteGeo = normalizeSiteGeo(jobsite.siteGeo);
  if (!siteGeo) return false;
  const fc = siteGeoToFeatureCollection(siteGeo);
  if (!fc.features.length) return false;
  const json = JSON.stringify(fc, null, 2);
  const slug = (jobsite.name || "jobsite")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "lpin-site"}-${day}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Parse lpin-site-pack JSON, raw SiteGeo, or bare GeoJSON FeatureCollection.
 */
export function parseSitePackJson(
  raw: string,
):
  | { ok: true; siteGeo: SiteGeo; projectName?: string }
  | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  if (!isObject(data)) {
    return { ok: false, error: "Unrecognized site file." };
  }

  // lpin-site-pack
  if (data.format === "lpin-site-pack") {
    const siteGeo = normalizeSiteGeo(data.siteGeo);
    if (!siteGeo) {
      return { ok: false, error: "Site pack has no usable pin or layers." };
    }
    const project = isObject(data.project) ? data.project : undefined;
    return {
      ok: true,
      siteGeo,
      projectName: project?.name ? String(project.name) : undefined,
    };
  }

  // Embedded on a full board pack
  if (
    (data.format === "lpin-jobsite-pack" || data.format === "fieldpulse-pack") &&
    isObject(data.jobsite)
  ) {
    const siteGeo = normalizeSiteGeo(
      (data.jobsite as Record<string, unknown>).siteGeo,
    );
    if (!siteGeo) {
      return { ok: false, error: "Project pack has no site map data." };
    }
    return {
      ok: true,
      siteGeo,
      projectName: data.jobsite.name
        ? String((data.jobsite as Record<string, unknown>).name)
        : undefined,
    };
  }

  // Bare SiteGeo-ish
  if (data.version === 1 && (data.pin || Array.isArray(data.layers))) {
    const siteGeo = normalizeSiteGeo(data);
    if (!siteGeo) {
      return { ok: false, error: "No usable pin or layers in file." };
    }
    return { ok: true, siteGeo };
  }

  // Bare GeoJSON
  const fc = normalizeFeatureCollection(data);
  if (fc) {
    let pin: SiteGeo["pin"] | undefined;
    const remaining = [];
    for (const f of fc.features) {
      if (
        !pin &&
        f.geometry.type === "Point" &&
        Array.isArray(f.geometry.coordinates)
      ) {
        const [lon, lat] = f.geometry.coordinates as number[];
        if (
          typeof lat === "number" &&
          typeof lon === "number" &&
          Number.isFinite(lat) &&
          Number.isFinite(lon)
        ) {
          pin = { lat, lon };
          continue;
        }
      }
      remaining.push(f);
    }
    const siteGeo = normalizeSiteGeo({
      version: 1,
      pin,
      layers: remaining.length
        ? [
            {
              id: "import_1",
              kind: "other",
              label: "Imported GeoJSON",
              source: "user_import",
              geojson: { type: "FeatureCollection", features: remaining },
            },
          ]
        : [],
    });
    if (!siteGeo) {
      return { ok: false, error: "GeoJSON had no usable geometry." };
    }
    return { ok: true, siteGeo };
  }

  return {
    ok: false,
    error: sanitizeForPublicSurface(
      "Unrecognized format. Use .geojson, .lpin-site.json, or a project pack with site map data.",
    ),
  };
}
