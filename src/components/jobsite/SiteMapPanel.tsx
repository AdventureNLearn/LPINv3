/**
 * Client-only MapLibre site map — pin, boundary draw, GeoJSON I/O.
 * Geometry never drives AHJ pack resolution (state-only).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Download,
  Eraser,
  MapPinned,
  Pentagon,
  Upload,
  LocateFixed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useJobsiteStore } from "@/lib/jobsite/store";
import {
  addImportedLayer,
  clearAllSiteGeo,
  clearBoundary,
  clearPin,
  setPin,
  siteGeoBounds,
  upsertBoundaryLayer,
} from "@/lib/jobsite/site-geo";
import {
  downloadSiteGeoJson,
  downloadSitePack,
  parseSitePackJson,
} from "@/lib/jobsite/site-pack";
import { geocodePlace } from "@/lib/jobsite/free-weather";
import { normalizeFeatureCollection } from "@/lib/jobsite/site-geo";
import type { SiteGeo } from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

type MapMode = "pan" | "pin" | "draw";

const US_CENTER: [number, number] = [-98.35, 39.5];
const US_ZOOM = 3.2;

/** Open basemap — no API key; not a city-catalog product. */
const BASE_STYLE = {
  version: 8 as const,
  name: "lpin-open-raster",
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
    },
  ],
};

export function SiteMapPanel() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const setSiteGeo = useJobsiteStore((s) => s.setSiteGeo);
  const siteGeo = jobsite.siteGeo;

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const drawPtsRef = useRef<[number, number][]>([]);
  const modeRef = useRef<MapMode>("pan");
  const siteGeoRef = useRef<SiteGeo | undefined>(siteGeo);
  const geoInputRef = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("pan");
  const [drawCount, setDrawCount] = useState(0);
  const [locateBusy, setLocateBusy] = useState(false);

  siteGeoRef.current = siteGeo;
  modeRef.current = mode;

  const applyMapData = useCallback((geo: SiteGeo | undefined) => {
    const map = mapRef.current;
    if (!map) return;

    const pinFc = {
      type: "FeatureCollection" as const,
      features: geo?.pin
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "Point" as const,
                coordinates: [geo.pin.lon, geo.pin.lat],
              },
            },
          ]
        : [],
    };

    const layerFeatures = (geo?.layers ?? []).flatMap((L) =>
      L.geojson.features.map((f) => ({
        ...f,
        properties: { ...(f.properties ?? {}), __kind: L.kind },
      })),
    );
    const layersFc = {
      type: "FeatureCollection" as const,
      features: layerFeatures,
    };

    const draftFc = {
      type: "FeatureCollection" as const,
      features:
        drawPtsRef.current.length > 0
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: drawPtsRef.current,
                },
              },
            ]
          : [],
    };

    const setSrc = (id: string, data: object) => {
      const src = map.getSource(id);
      if (src) src.setData(data);
    };
    setSrc("lpin-pin", pinFc);
    setSrc("lpin-layers", layersFc);
    setSrc("lpin-draft", draftFc);
  }, []);

  // Init map once
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !containerRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MapCtor: any = (maplibre as any).Map ?? (maplibre as any).default?.Map;
        const initial = siteGeoRef.current;
        const center: [number, number] = initial?.pin
          ? [initial.pin.lon, initial.pin.lat]
          : US_CENTER;
        const zoom = initial?.pin ? (initial.zoom ?? 15) : US_ZOOM;

        map = new MapCtor({
          container: containerRef.current,
          style: BASE_STYLE as never,
          center,
          zoom,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        map.on("load", () => {
          if (cancelled) return;
          const m = mapRef.current;
          if (!m) return;

          m.addSource("lpin-pin", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          m.addSource("lpin-layers", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          m.addSource("lpin-draft", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          m.addLayer({
            id: "lpin-layers-fill",
            type: "fill",
            source: "lpin-layers",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "fill-color": "#c9a227",
              "fill-opacity": 0.22,
            },
          });
          m.addLayer({
            id: "lpin-layers-line",
            type: "line",
            source: "lpin-layers",
            paint: {
              "line-color": "#c9a227",
              "line-width": 2.5,
            },
          });
          m.addLayer({
            id: "lpin-layers-pt",
            type: "circle",
            source: "lpin-layers",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": 6,
              "circle-color": "#c9a227",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#060e16",
            },
          });
          m.addLayer({
            id: "lpin-draft-line",
            type: "line",
            source: "lpin-draft",
            paint: {
              "line-color": "#e8c547",
              "line-width": 2,
              "line-dasharray": [2, 1],
            },
          });
          m.addLayer({
            id: "lpin-pin-circle",
            type: "circle",
            source: "lpin-pin",
            paint: {
              "circle-radius": 9,
              "circle-color": "#f0d060",
              "circle-stroke-width": 3,
              "circle-stroke-color": "#060e16",
            },
          });

          applyMapData(siteGeoRef.current);
          const b = siteGeoBounds(siteGeoRef.current);
          if (b) {
            try {
              m.fitBounds(
                [
                  [b[0], b[1]],
                  [b[2], b[3]],
                ],
                { padding: 48, maxZoom: 17, duration: 0 },
              );
            } catch {
              /* ignore */
            }
          }
          setReady(true);
        });

        map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
          const m = modeRef.current;
          const { lng, lat } = e.lngLat;
          if (m === "pin") {
            const next = setPin(siteGeoRef.current, lat, lng, mapRef.current?.getZoom?.());
            setSiteGeo(next);
            toast.success("Pin saved on this device.");
            setMode("pan");
            return;
          }
          if (m === "draw") {
            drawPtsRef.current = [...drawPtsRef.current, [lng, lat]];
            setDrawCount(drawPtsRef.current.length);
            applyMapData(siteGeoRef.current);
          }
        });
      } catch (err) {
        console.error("[site-map]", err);
        if (!cancelled) {
          setFailed(
            "Map could not load in this browser. You can still import/export GeoJSON below.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        map?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
    // mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store → map when siteGeo changes
  useEffect(() => {
    if (!ready) return;
    applyMapData(siteGeo);
  }, [siteGeo, ready, applyMapData]);

  const finishDraw = () => {
    if (drawPtsRef.current.length < 3) {
      toast.error("Add at least 3 points, then finish the boundary.");
      return;
    }
    const next = upsertBoundaryLayer(siteGeoRef.current, drawPtsRef.current);
    drawPtsRef.current = [];
    setDrawCount(0);
    setSiteGeo(next);
    setMode("pan");
    toast.success("Site boundary saved on this device.");
  };

  const cancelDraw = () => {
    drawPtsRef.current = [];
    setDrawCount(0);
    setMode("pan");
    applyMapData(siteGeoRef.current);
  };

  const onLocate = async () => {
    const q =
      jobsite.cityState?.trim() ||
      jobsite.location?.trim() ||
      "";
    if (!q || q === "United States") {
      toast.error("Type a city/county or site address first, then locate.");
      return;
    }
    setLocateBusy(true);
    try {
      const hit = await geocodePlace(q);
      if (!hit) {
        toast.error("Could not locate that text. Try a clearer place name.");
        return;
      }
      const next = setPin(siteGeoRef.current, hit.lat, hit.lon, 14);
      next.locateQuery = q.slice(0, 120);
      setSiteGeo(next);
      const map = mapRef.current;
      if (map) {
        map.flyTo({ center: [hit.lon, hit.lat], zoom: 14 });
      }
      toast.success(`Pin set near ${hit.label}. Confirm it on the map.`);
    } finally {
      setLocateBusy(false);
    }
  };

  const onImportGeo = async (file: File) => {
    try {
      const text = await file.text();
      // Try site pack / geojson parsers
      const parsed = parseSitePackJson(text);
      if (parsed.ok) {
        setSiteGeo(parsed.siteGeo);
        toast.success("Site geometry imported on this device.");
        const b = siteGeoBounds(parsed.siteGeo);
        if (b && mapRef.current) {
          mapRef.current.fitBounds(
            [
              [b[0], b[1]],
              [b[2], b[3]],
            ],
            { padding: 48, maxZoom: 17 },
          );
        }
        return;
      }
      // Fallback: merge as layer onto existing
      const data = JSON.parse(text) as unknown;
      const fc = normalizeFeatureCollection(data);
      if (!fc) {
        toast.error(parsed.error || "Could not read that file.");
        return;
      }
      const result = addImportedLayer(
        siteGeoRef.current,
        fc,
        file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Imported layer",
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSiteGeo(result.siteGeo);
      toast.success("Layer imported on this device.");
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const pinLabel = siteGeo?.pin
    ? `${siteGeo.pin.lat.toFixed(5)}, ${siteGeo.pin.lon.toFixed(5)}`
    : "No pin yet";

  return (
    <section
      className="card-lpin space-y-3 rounded-2xl p-4 sm:p-6"
      data-testid="site-map-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-medium text-fg">
            <MapPinned className="size-4 shrink-0 text-gold" />
            Site map (on this device)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted text-pretty">
            Your pin and layers stay on this device. Codes and AHJ guidance still
            follow <strong className="font-medium text-fg">state only</strong> —
            not a building-department login, not legal advice.
          </p>
        </div>
      </div>

      {failed ? (
        <p className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-xs text-fg-muted">
          {failed}
        </p>
      ) : null}

      <div
        ref={containerRef}
        className={cn(
          "relative h-64 w-full overflow-hidden rounded-xl border border-border bg-surface-1 sm:h-80",
          mode === "pin" && "cursor-crosshair",
          mode === "draw" && "cursor-crosshair",
        )}
        role="img"
        aria-label="Jobsite site map"
      />

      {!ready && !failed ? (
        <p className="text-[11px] text-fg-subtle">Loading map…</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "pin" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => {
            cancelDraw();
            setMode(mode === "pin" ? "pan" : "pin");
            if (mode !== "pin") toast.message("Tap the map to place the pin.");
          }}
        >
          <Crosshair className="size-4" />
          {mode === "pin" ? "Tap map…" : "Drop pin"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "draw" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => {
            if (mode === "draw") {
              cancelDraw();
              return;
            }
            drawPtsRef.current = [];
            setDrawCount(0);
            setMode("draw");
            toast.message("Tap corners of the site boundary.");
          }}
        >
          <Pentagon className="size-4" />
          Draw boundary
        </Button>
        {mode === "draw" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={finishDraw}
              disabled={drawCount < 3}
            >
              Finish ({drawCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11"
              onClick={cancelDraw}
            >
              Cancel
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={locateBusy}
          onClick={() => void onLocate()}
        >
          <LocateFixed className="size-4" />
          {locateBusy ? "Locating…" : "Locate from address"}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            setSiteGeo(clearPin(siteGeo));
            toast.message("Pin cleared.");
          }}
          disabled={!siteGeo?.pin}
        >
          <Eraser className="size-4" />
          Clear pin
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            setSiteGeo(clearBoundary(siteGeo));
            toast.message("Boundary cleared.");
          }}
          disabled={!siteGeo?.layers.some((l) => l.kind === "site_boundary")}
        >
          <Eraser className="size-4" />
          Clear boundary
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-[11px] text-fg-subtle">
        <p>
          Pin: <span className="text-fg-muted">{pinLabel}</span>
          {siteGeo?.layers?.length
            ? ` · ${siteGeo.layers.length} layer${siteGeo.layers.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-fg-muted">
          Site pack · GeoLibre handoff
        </p>
        <p className="text-[11px] leading-relaxed text-fg-subtle text-pretty">
          Export GeoJSON for GeoLibre (or any GIS). Import a site pack, GeoJSON,
          or a project pack that already includes map data. State AHJ packs are
          separate.
        </p>
        <p className="text-[10px] leading-relaxed text-fg-subtle text-pretty">
          Map: MapLibre GL JS · basemap © OpenStreetMap contributors · optional
          locate via Open-Meteo. Open-source credits in the project README.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-11"
            onClick={() => {
              if (!downloadSiteGeoJson(jobsite)) {
                toast.error("Nothing to export yet — drop a pin or draw a boundary.");
                return;
              }
              toast.success("GeoJSON downloaded.");
            }}
          >
            <Download className="size-4" />
            Export GeoJSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-11"
            onClick={() => {
              if (!downloadSitePack(jobsite)) {
                toast.error("Nothing to export yet — add a pin or layer first.");
                return;
              }
              toast.success("Site pack downloaded.");
            }}
          >
            <Download className="size-4" />
            Export site pack
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 sm:col-span-2"
            onClick={() => geoInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Import GeoJSON / site pack
          </Button>
          <input
            ref={geoInputRef}
            type="file"
            accept=".json,.geojson,application/json,application/geo+json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportGeo(f);
              e.target.value = "";
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 w-full text-fg-muted"
          onClick={() => {
            setSiteGeo(clearAllSiteGeo());
            drawPtsRef.current = [];
            setDrawCount(0);
            setMode("pan");
            toast.message("Site map cleared on this device.");
          }}
          disabled={!siteGeo}
        >
          Clear all site map data
        </Button>
      </div>
    </section>
  );
}
