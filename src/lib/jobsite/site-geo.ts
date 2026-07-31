/**
 * Device-local site geometry helpers.
 * Geometry never drives AHJ pack resolution (state-only).
 */

import { newId } from "./domain";
import type {
  SiteGeo,
  SiteGeoJsonCollection,
  SiteGeoJsonFeature,
  SiteLayer,
  SiteLayerKind,
  SiteLayerSource,
} from "./types";

/** Soft caps so localStorage + project packs stay usable with photos. */
export const SITE_GEO_MAX_LAYERS = 12;
export const SITE_GEO_MAX_FEATURES = 40;
export const SITE_GEO_MAX_JSON_CHARS = 400_000;

export const EMPTY_SITE_GEO: SiteGeo = {
  version: 1,
  layers: [],
};

export function emptySiteGeo(): SiteGeo {
  return { version: 1, layers: [] };
}

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function isValidLatLon(lat: number, lon: number): boolean {
  return (
    isFiniteNum(lat) &&
    isFiniteNum(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function sanitizeFeature(raw: unknown): SiteGeoJsonFeature | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (f.type !== "Feature") return null;
  const geom = f.geometry;
  if (!geom || typeof geom !== "object") return null;
  const g = geom as Record<string, unknown>;
  if (typeof g.type !== "string" || g.coordinates === undefined) return null;
  return {
    type: "Feature",
    properties:
      f.properties && typeof f.properties === "object"
        ? (f.properties as Record<string, unknown>)
        : {},
    geometry: {
      type: g.type,
      coordinates: g.coordinates,
    },
  };
}

export function normalizeFeatureCollection(
  raw: unknown,
): SiteGeoJsonCollection | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Single Feature → wrap
  if (obj.type === "Feature") {
    const feat = sanitizeFeature(obj);
    if (!feat) return null;
    return { type: "FeatureCollection", features: [feat] };
  }

  if (obj.type !== "FeatureCollection" || !Array.isArray(obj.features)) {
    return null;
  }

  const features: SiteGeoJsonFeature[] = [];
  for (const item of obj.features) {
    const feat = sanitizeFeature(item);
    if (feat) features.push(feat);
    if (features.length >= SITE_GEO_MAX_FEATURES) break;
  }
  if (!features.length) return null;
  return { type: "FeatureCollection", features };
}

export function estimateSiteGeoSize(siteGeo: SiteGeo): number {
  try {
    return JSON.stringify(siteGeo).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export function normalizeSiteGeo(raw: unknown): SiteGeo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const layersIn = Array.isArray(s.layers) ? s.layers : [];
  const layers: SiteLayer[] = [];

  for (const item of layersIn) {
    if (!item || typeof item !== "object") continue;
    const L = item as Record<string, unknown>;
    const geojson = normalizeFeatureCollection(L.geojson);
    if (!geojson) continue;
    const kind = (String(L.kind || "other") as SiteLayerKind) || "other";
    const source = (String(L.source || "user_import") as SiteLayerSource) ||
      "user_import";
    layers.push({
      id: String(L.id || newId("ly")),
      kind: [
        "site_boundary",
        "flood",
        "utility",
        "access",
        "other",
      ].includes(kind)
        ? kind
        : "other",
      label: String(L.label || "Layer").slice(0, 80),
      source: ["user_draw", "user_import", "user_pin"].includes(source)
        ? source
        : "user_import",
      geojson,
    });
    if (layers.length >= SITE_GEO_MAX_LAYERS) break;
  }

  let pin: SiteGeo["pin"] | undefined;
  if (s.pin && typeof s.pin === "object") {
    const p = s.pin as Record<string, unknown>;
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (isValidLatLon(lat, lon)) pin = { lat, lon };
  }

  const zoom =
    typeof s.zoom === "number" && Number.isFinite(s.zoom)
      ? Math.min(20, Math.max(1, s.zoom))
      : undefined;

  const locateQuery =
    typeof s.locateQuery === "string" && s.locateQuery.trim()
      ? s.locateQuery.trim().slice(0, 120)
      : undefined;

  const siteGeo: SiteGeo = {
    version: 1,
    pin,
    zoom,
    layers,
    locateQuery,
  };

  if (estimateSiteGeoSize(siteGeo) > SITE_GEO_MAX_JSON_CHARS) {
    // Drop layers until under cap (keep pin)
    while (
      siteGeo.layers.length > 0 &&
      estimateSiteGeoSize(siteGeo) > SITE_GEO_MAX_JSON_CHARS
    ) {
      siteGeo.layers.pop();
    }
  }

  if (!siteGeo.pin && siteGeo.layers.length === 0 && !siteGeo.locateQuery) {
    return undefined;
  }
  return siteGeo;
}

export function setPin(
  siteGeo: SiteGeo | undefined,
  lat: number,
  lon: number,
  zoom?: number,
): SiteGeo {
  if (!isValidLatLon(lat, lon)) {
    return siteGeo ?? emptySiteGeo();
  }
  const base = siteGeo ?? emptySiteGeo();
  return {
    ...base,
    version: 1,
    pin: { lat, lon },
    zoom: zoom ?? base.zoom ?? 16,
  };
}

export function clearPin(siteGeo: SiteGeo | undefined): SiteGeo | undefined {
  if (!siteGeo) return undefined;
  const next: SiteGeo = {
    ...siteGeo,
    version: 1,
    pin: undefined,
  };
  if (!next.layers.length && !next.locateQuery) return undefined;
  return next;
}

export function upsertBoundaryLayer(
  siteGeo: SiteGeo | undefined,
  ring: [number, number][],
): SiteGeo {
  // ring: [lon, lat][] closed or open
  const base = siteGeo ?? emptySiteGeo();
  if (ring.length < 3) return base;

  let coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords = [...coords, first];
  }

  const geojson: SiteGeoJsonCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { role: "site_boundary" },
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      },
    ],
  };

  const other = base.layers.filter((l) => l.kind !== "site_boundary");
  const layer: SiteLayer = {
    id: newId("ly"),
    kind: "site_boundary",
    label: "Site boundary",
    source: "user_draw",
    geojson,
  };

  return {
    ...base,
    version: 1,
    layers: [layer, ...other].slice(0, SITE_GEO_MAX_LAYERS),
  };
}

export function clearBoundary(siteGeo: SiteGeo | undefined): SiteGeo | undefined {
  if (!siteGeo) return undefined;
  const layers = siteGeo.layers.filter((l) => l.kind !== "site_boundary");
  const next: SiteGeo = { ...siteGeo, version: 1, layers };
  if (!next.pin && !next.layers.length && !next.locateQuery) return undefined;
  return next;
}

export function addImportedLayer(
  siteGeo: SiteGeo | undefined,
  collection: SiteGeoJsonCollection,
  label = "Imported layer",
  kind: SiteLayerKind = "other",
): { ok: true; siteGeo: SiteGeo } | { ok: false; error: string } {
  const base = siteGeo ?? emptySiteGeo();
  if (base.layers.length >= SITE_GEO_MAX_LAYERS) {
    return {
      ok: false,
      error: `At most ${SITE_GEO_MAX_LAYERS} layers on this device.`,
    };
  }
  const geojson = normalizeFeatureCollection(collection);
  if (!geojson) {
    return { ok: false, error: "File is not a usable GeoJSON FeatureCollection." };
  }

  const layer: SiteLayer = {
    id: newId("ly"),
    kind,
    label: label.slice(0, 80),
    source: "user_import",
    geojson,
  };
  const next: SiteGeo = {
    ...base,
    version: 1,
    layers: [...base.layers, layer],
  };
  if (estimateSiteGeoSize(next) > SITE_GEO_MAX_JSON_CHARS) {
    return {
      ok: false,
      error: "Layer is too large for on-device storage. Simplify or split the file.",
    };
  }
  return { ok: true, siteGeo: next };
}

export function removeLayer(
  siteGeo: SiteGeo | undefined,
  layerId: string,
): SiteGeo | undefined {
  if (!siteGeo) return undefined;
  const layers = siteGeo.layers.filter((l) => l.id !== layerId);
  const next: SiteGeo = { ...siteGeo, version: 1, layers };
  if (!next.pin && !next.layers.length && !next.locateQuery) return undefined;
  return next;
}

export function clearAllSiteGeo(): undefined {
  return undefined;
}

/** Flatten pin + layers into one FeatureCollection for GeoLibre handoff. */
export function siteGeoToFeatureCollection(
  siteGeo: SiteGeo | undefined,
): SiteGeoJsonCollection {
  const features: SiteGeoJsonFeature[] = [];
  if (siteGeo?.pin && isValidLatLon(siteGeo.pin.lat, siteGeo.pin.lon)) {
    features.push({
      type: "Feature",
      properties: { role: "site_pin", label: "Site pin" },
      geometry: {
        type: "Point",
        coordinates: [siteGeo.pin.lon, siteGeo.pin.lat],
      },
    });
  }
  for (const layer of siteGeo?.layers ?? []) {
    for (const f of layer.geojson.features) {
      features.push({
        ...f,
        properties: {
          ...(f.properties ?? {}),
          lpinLayerId: layer.id,
          lpinLayerKind: layer.kind,
          lpinLayerLabel: layer.label,
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/** Bounds helper for map fit — [west, south, east, north] */
export function siteGeoBounds(
  siteGeo: SiteGeo | undefined,
): [number, number, number, number] | null {
  const pts: [number, number][] = [];
  if (siteGeo?.pin) pts.push([siteGeo.pin.lon, siteGeo.pin.lat]);

  const walk = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      pts.push([coords[0] as number, coords[1] as number]);
      return;
    }
    for (const c of coords) walk(c);
  };

  for (const layer of siteGeo?.layers ?? []) {
    for (const f of layer.geojson.features) {
      walk(f.geometry.coordinates);
    }
  }

  if (!pts.length) return null;
  let w = pts[0]![0],
    e = pts[0]![0],
    s = pts[0]![1],
    n = pts[0]![1];
  for (const [lon, lat] of pts) {
    w = Math.min(w, lon);
    e = Math.max(e, lon);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  if (w === e) {
    w -= 0.01;
    e += 0.01;
  }
  if (s === n) {
    s -= 0.01;
    n += 0.01;
  }
  return [w, s, e, n];
}
