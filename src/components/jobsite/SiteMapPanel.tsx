import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Download,
  Eraser,
  LocateFixed,
  MapPinned,
  Pentagon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { geocodePlace } from "@/lib/jobsite/free-weather";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type { SiteGeo } from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

type MapMode = "pan" | "pin" | "draw";

const US_CENTER: [number, number] = [-98.35, 39.5];
const US_ZOOM = 3.4;

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
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function SiteMapPanel({ className }: { className?: string }) {
  const site = useJobsiteStore((s) => s.project.site);
  const setSitePin = useJobsiteStore((s) => s.setSitePin);
  const clearSitePin = useJobsiteStore((s) => s.clearSitePin);
  const pushBoundaryVertex = useJobsiteStore((s) => s.pushBoundaryVertex);
  const clearBoundary = useJobsiteStore((s) => s.clearBoundary);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibRef = useRef<any>(null);
  const modeRef = useRef<MapMode>("pan");
  const siteRef = useRef<SiteGeo>(site);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("pan");
  const [locateBusy, setLocateBusy] = useState(false);
  const [addr, setAddr] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);

  siteRef.current = site;
  modeRef.current = mode;

  const applyGeo = useCallback((geo: SiteGeo) => {
    const map = mapRef.current;
    if (!map) return;

    const pinFc = {
      type: "FeatureCollection" as const,
      features: geo.pin
        ? [
            {
              type: "Feature" as const,
              properties: { label: geo.pin.label ?? "Pin" },
              geometry: {
                type: "Point" as const,
                coordinates: [geo.pin.lon, geo.pin.lat],
              },
            },
          ]
        : [],
    };

    const ring = geo.boundaryRing ?? [];
    const closed = ring.length >= 3 ? [...ring, ring[0]!] : [];
    const polyFc = {
      type: "FeatureCollection" as const,
      features:
        closed.length >= 4
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "Polygon" as const,
                  coordinates: [closed],
                },
              },
            ]
          : [],
    };
    const lineFc = {
      type: "FeatureCollection" as const,
      features:
        ring.length >= 2
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: ring,
                },
              },
            ]
          : [],
    };
    const vertsFc = {
      type: "FeatureCollection" as const,
      features: ring.map((c, i) => ({
        type: "Feature" as const,
        properties: { i },
        geometry: { type: "Point" as const, coordinates: c },
      })),
    };

    const ensure = (
      id: string,
      sourceData: object,
      layers: Array<{ id: string; type: string; paint: object }>,
    ) => {
      if (map.getSource(id)) {
        map.getSource(id).setData(sourceData);
      } else {
        map.addSource(id, { type: "geojson", data: sourceData });
        for (const L of layers) {
          if (!map.getLayer(L.id)) {
            map.addLayer({
              id: L.id,
              type: L.type,
              source: id,
              paint: L.paint,
            });
          }
        }
      }
    };

    ensure("lpin-pin", pinFc, [
      {
        id: "lpin-pin-circle",
        type: "circle",
        paint: {
          "circle-radius": 9,
          "circle-color": "#f08a5a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f7f1e6",
        },
      },
    ]);
    ensure("lpin-poly", polyFc, [
      {
        id: "lpin-poly-fill",
        type: "fill",
        paint: { "fill-color": "#f0c45c", "fill-opacity": 0.18 },
      },
    ]);
    ensure("lpin-line", lineFc, [
      {
        id: "lpin-line-stroke",
        type: "line",
        paint: { "line-color": "#f0c45c", "line-width": 2.5 },
      },
    ]);
    ensure("lpin-verts", vertsFc, [
      {
        id: "lpin-vert-circle",
        type: "circle",
        paint: {
          "circle-radius": 4,
          "circle-color": "#f0c45c",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#060e16",
        },
      },
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    async function boot() {
      if (!containerRef.current) return;
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !containerRef.current) return;
        maplibRef.current = maplibregl;

        const initial = siteRef.current;
        const center: [number, number] = initial.pin
          ? [initial.pin.lon, initial.pin.lat]
          : US_CENTER;
        const zoom = initial.pin ? 15.5 : US_ZOOM;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: BASE_STYLE as never,
          center,
          zoom,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: false }),
          "top-right",
        );

        map.on("load", () => {
          if (cancelled) return;
          applyGeo(siteRef.current);
          setReady(true);
          setFailed(null);
          requestAnimationFrame(() => mapRef.current?.resize());
        });

        map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
          const m = modeRef.current;
          if (m === "pan") return;
          const { lng, lat } = e.lngLat;
          if (m === "pin") {
            setSitePin(lat, lng, siteRef.current.pin?.label ?? "Site pin");
            toast.message("Pin set on this device");
          } else if (m === "draw") {
            pushBoundaryVertex(lng, lat);
          }
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed("Map failed to load. Check network / tiles.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
      try {
        map?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyGeo(site);
  }, [site, ready, applyGeo]);

  const fitSite = () => {
    const map = mapRef.current;
    const ml = maplibRef.current;
    if (!map || !ml) return;
    const ring = site.boundaryRing ?? [];
    if (ring.length >= 2) {
      const b = new ml.LngLatBounds(ring[0], ring[0]);
      for (const c of ring) b.extend(c);
      map.fitBounds(b, { padding: 48, maxZoom: 17 });
      return;
    }
    if (site.pin) {
      map.easeTo({ center: [site.pin.lon, site.pin.lat], zoom: 16 });
    } else {
      map.easeTo({ center: US_CENTER, zoom: US_ZOOM });
    }
  };

  const onLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not available");
      return;
    }
    setLocateBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocateBusy(false);
        const { latitude, longitude } = pos.coords;
        setSitePin(latitude, longitude, "Device location");
        mapRef.current?.easeTo({ center: [longitude, latitude], zoom: 16 });
        toast.message("Located — pin set on this device");
      },
      () => {
        setLocateBusy(false);
        toast.error("Could not get location");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const onGeocode = async () => {
    setGeoBusy(true);
    const hit = await geocodePlace(addr);
    setGeoBusy(false);
    if (!hit) {
      toast.error("No place found — try city + state freeform");
      return;
    }
    setSitePin(hit.lat, hit.lon, hit.label);
    mapRef.current?.easeTo({ center: [hit.lon, hit.lat], zoom: 14 });
    toast.message(`Pinned near ${hit.label}`);
  };

  const exportGeoJson = () => {
    const features: object[] = [];
    if (site.pin) {
      features.push({
        type: "Feature",
        properties: { kind: "pin", label: site.pin.label },
        geometry: {
          type: "Point",
          coordinates: [site.pin.lon, site.pin.lat],
        },
      });
    }
    const ring = site.boundaryRing ?? [];
    if (ring.length >= 3) {
      const closed = [...ring, ring[0]!];
      features.push({
        type: "Feature",
        properties: { kind: "boundary" },
        geometry: { type: "Polygon", coordinates: [closed] },
      });
    }
    const pack = { type: "FeatureCollection", features };
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lpin-site-pack.geojson";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Site pack exported");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-fg-muted text-pretty">
        Live OpenStreetMap basemap. Geometry stays on this device. Export for
        GIS handoff — never overrides AHJ / code packs.
      </p>

      <div className="chip-scroll gap-2 pb-1">
        {(
          [
            ["pan", "Pan", Crosshair],
            ["pin", "Drop pin", MapPinned],
            ["draw", "Draw", Pentagon],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            key={id}
            size="sm"
            variant={mode === id ? "default" : "secondary"}
            onClick={() => setMode(id)}
          >
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
      </div>

      <div className="relative h-[min(58dvh,440px)] w-full overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-gold)_28%,var(--color-border))] bg-surface-1">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {!ready && !failed ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70 text-sm text-fg-muted">
            Loading map…
          </div>
        ) : null}
        {failed ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/80 p-4 text-center text-sm text-disputed">
            {failed}
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-bg/80 px-2 py-1 text-[10px] uppercase tracking-wider text-gold backdrop-blur">
          {mode === "pan"
            ? "Pan / zoom"
            : mode === "pin"
              ? "Tap map to drop pin"
              : "Tap map to add vertices"}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Locate from address (city, state freeform)"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onGeocode();
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={geoBusy || !addr.trim()}
            onClick={() => void onGeocode()}
          >
            Go
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onLocate} disabled={locateBusy}>
            <LocateFixed className="size-3.5" />
            {locateBusy ? "Locating…" : "Use device GPS"}
          </Button>
          <Button size="sm" variant="outline" onClick={fitSite}>
            Fit site
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearSitePin();
              toast.message("Pin cleared");
            }}
          >
            <Eraser className="size-3.5" />
            Clear pin
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearBoundary();
              toast.message("Boundary cleared");
            }}
          >
            Clear boundary
          </Button>
          <Button size="sm" variant="secondary" onClick={exportGeoJson}>
            <Download className="size-3.5" />
            Export GeoJSON
          </Button>
        </div>
      </div>

      {site.pin ? (
        <p className="text-xs text-fg-subtle tabular-nums">
          Pin: {site.pin.lat.toFixed(5)}, {site.pin.lon.toFixed(5)}
          {site.pin.label ? ` · ${site.pin.label}` : ""}
          {site.boundaryRing?.length
            ? ` · boundary ${site.boundaryRing.length} verts`
            : ""}
        </p>
      ) : (
        <p className="text-xs text-fg-subtle">No pin yet — drop one for the crew.</p>
      )}
      {site.note ? (
        <p className="text-xs text-fg-subtle text-pretty">{site.note}</p>
      ) : null}
    </div>
  );
}
