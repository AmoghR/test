import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { usePostcards } from "./Postcards";

const COUNTRY_ZOOM = 3;
const INDIVIDUAL_ZOOM = 7;
const IMAGE_ZOOM = 12;
const THUMBNAIL_BASE = "http://localhost:8000/thumbnails/";

// ISO 3166-1 alpha-2 codes are standardized and won't have name-matching issues
const ISO_CONTINENT: Record<string, string> = {
  // Europe
  DE: "Europe", FR: "Europe", GB: "Europe", IT: "Europe", ES: "Europe",
  NL: "Europe", BE: "Europe", AT: "Europe", CH: "Europe", PL: "Europe",
  SE: "Europe", NO: "Europe", DK: "Europe", FI: "Europe", PT: "Europe",
  CZ: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", GR: "Europe",
  HR: "Europe", SK: "Europe", SI: "Europe", RS: "Europe", UA: "Europe",
  RU: "Europe", BY: "Europe", LT: "Europe", LV: "Europe", EE: "Europe",
  LU: "Europe", IE: "Europe", IS: "Europe", MT: "Europe", MC: "Europe",
  AD: "Europe", SM: "Europe", VA: "Europe", LI: "Europe", MD: "Europe",
  MK: "Europe", AL: "Europe", BA: "Europe", XK: "Europe", ME: "Europe",
  CY: "Europe",
  // North America
  US: "North America", CA: "North America", MX: "North America",
  CU: "North America", JM: "North America", HT: "North America",
  DO: "North America", GT: "North America", HN: "North America",
  SV: "North America", NI: "North America", CR: "North America",
  PA: "North America", TT: "North America", PR: "North America",
  GL: "North America",
  // South America
  BR: "South America", AR: "South America", CL: "South America",
  CO: "South America", PE: "South America", VE: "South America",
  EC: "South America", BO: "South America", PY: "South America",
  UY: "South America", GY: "South America", SR: "South America",
  // Asia
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", ID: "Asia",
  TH: "Asia", VN: "Asia", PH: "Asia", MY: "Asia", SG: "Asia",
  BD: "Asia", PK: "Asia", LK: "Asia", NP: "Asia", MM: "Asia",
  KH: "Asia", MN: "Asia", TW: "Asia", HK: "Asia", KZ: "Asia",
  UZ: "Asia", KG: "Asia", TJ: "Asia", TM: "Asia", AZ: "Asia",
  AM: "Asia", GE: "Asia", TR: "Asia", IL: "Asia", PS: "Asia",
  JO: "Asia", LB: "Asia", SY: "Asia", IQ: "Asia", IR: "Asia",
  SA: "Asia", AE: "Asia", KW: "Asia", QA: "Asia", BH: "Asia",
  OM: "Asia", YE: "Asia", AF: "Asia", MV: "Asia", BT: "Asia",
  LA: "Asia", TL: "Asia",
  // Africa
  ZA: "Africa", NG: "Africa", KE: "Africa", EG: "Africa", MA: "Africa",
  ET: "Africa", GH: "Africa", TZ: "Africa", UG: "Africa", DZ: "Africa",
  TN: "Africa", LY: "Africa", SD: "Africa", CM: "Africa", ZW: "Africa",
  MZ: "Africa", MG: "Africa", ZM: "Africa", SN: "Africa", RW: "Africa",
  ML: "Africa", NE: "Africa", AO: "Africa", BW: "Africa", NA: "Africa",
  MW: "Africa", BF: "Africa", GN: "Africa", BJ: "Africa", CG: "Africa",
  CD: "Africa", CI: "Africa", SO: "Africa", ER: "Africa", TG: "Africa",
  MR: "Africa", GA: "Africa", SL: "Africa", LR: "Africa", SC: "Africa",
  MU: "Africa", CV: "Africa", SS: "Africa", LS: "Africa", SZ: "Africa",
  DJ: "Africa", BI: "Africa", GQ: "Africa", ST: "Africa", KM: "Africa",
  // Oceania
  AU: "Oceania", NZ: "Oceania", PG: "Oceania", FJ: "Oceania",
  SB: "Oceania", VU: "Oceania", WS: "Oceania", TO: "Oceania",
};

// Fixed geographic centers per continent [lng, lat]
const CONTINENT_CENTERS: Record<string, [number, number]> = {
  "Europe": [15.0, 54.0],
  "North America": [-100.0, 45.0],
  "South America": [-58.0, -15.0],
  "Asia": [90.0, 35.0],
  "Africa": [20.0, 5.0],
  "Oceania": [140.0, -25.0],
  "Other": [0.0, 0.0],
};

const getContinent = (iso: string) => ISO_CONTINENT[iso.toUpperCase()] ?? "Other";
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

type Coords = {
  origin_lat: number;
  origin_lng: number;
  receiving_lat: number;
  receiving_lng: number;
};

type CoordsMap = {
  [key: string]: Coords;
};

export default function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const postcardStorage = usePostcards();
  const { postcards, selectedCountry, setSelectedCountry } = postcardStorage;

  const [geoData, setGeoData] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<CoordsMap>({});
  const [loading, setLoading] = useState(true);
  const [opacity, setOpacity] = useState(0.4);
  const [hiddenClusters, setHiddenClusters] = useState<Set<number>>(new Set());
  const [tooltip, setTooltip] = useState<{ x: number, y: number, postcard: typeof postcards[0] } | null>(null);
  const [clusterPanel, setClusterPanel] = useState<{
    x: number; y: number;
    endpoints: { postcard: (typeof postcards)[0]; loc: "origin" | "receiving" }[];
  } | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);

  // Fetch GeoJSON and coordinates
  useEffect(() => {
    Promise.all([
      fetch("https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson").then((r) => r.json()),
      fetch("http://localhost:8000/postcard_coordinates").then((r) => r.json()),
    ])
      .then(([geoJson, coords]) => {
        setGeoData(geoJson);
        setCoordinates(coords);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load map assets:", err);
        setLoading(false);
      });
  }, []);

  // Set up D3 visualization
  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Use Natural Earth projection
    const projection = d3.geoNaturalEarth1()
      .fitSize([width, height], geoData);

    const pathGenerator = d3.geoPath().projection(projection);
    const sortedDomain = Array.from(new Set(postcards.map(p => p.label))).sort((a, b) => a - b).map(String);
    const clusterColor = d3.scaleOrdinal(d3.schemeTableau10).domain(sortedDomain);

    // Group elements
    const gMap = svg.append("g").attr("class", "map-group");
    const gContinent = svg.append("g").attr("class", "continent-group");
    const gCountry = svg.append("g").attr("class", "country-group");
    const gArcs = svg.append("g").attr("class", "arcs-group");
    const gNames = svg.append("g").attr("class", "names-group");

    // Standardize country name to match database
    const normalizeCountryName = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes("united states") || lower === "usa") return "U.S.A.";
      if (lower.includes("united kingdom") || lower === "uk" || lower === "england") return "U.K.";
      if (lower === "russian federation") return "Russia";
      if (lower === "holy see" || lower === "vatican city") return "Vatican";
      return name;
    };

    // Draw countries
    gMap.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", pathGenerator as any)
      .attr("fill", (d: any) => {
        const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
        return countryName === selectedCountry ? "#2563eb" : "#e2e8f0";
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.7)
      .attr("cursor", "pointer")
      .on("mouseover", function () {
        d3.select(this).attr("fill", (d: any) => {
          const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
          return countryName === selectedCountry ? "#1d4ed8" : "#cbd5e1";
        });
      })
      .on("mouseout", function (_, d: any) {
        d3.select(this).attr("fill", () => {
          const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
          return countryName === selectedCountry ? "#2563eb" : "#e2e8f0";
        });
      })
      .on("click", (_, d: any) => {
        const name = normalizeCountryName(d.properties.name || d.properties.NAME || "");
        setSelectedCountry(selectedCountry === name ? null : name);
      });

    // --- Continent tier: lines between fixed geographic continent centers ---
    // Key: `${originContinent}→${destContinent}|${label}` — one entry per (pair, cluster)
    const continentAcc = new Map<string, number>();
    postcards.forEach(p => {
      if (!coordinates[p.id] || hiddenClusters.has(p.label)) return;
      const key = `${getContinent(p.origin_iso)}→${getContinent(p.receiving_iso)}|${p.label}`;
      continentAcc.set(key, (continentAcc.get(key) ?? 0) + 1);
    });

    continentAcc.forEach((count, key) => {
      const [pairPart, labelStr] = key.split("|");
      const [originContinent, destContinent] = pairPart.split("→");
      const o = projection(CONTINENT_CENTERS[originContinent] ?? [0, 0]);
      const d = projection(CONTINENT_CENTERS[destContinent] ?? [0, 0]);
      if (!o || !d) return;
      const baseWidth = Math.max(1.2, Math.log(count + 1) * 1.4);
      gContinent.append("path")
        .datum({ baseWidth })
        .attr("d", `M${o[0]},${o[1]} L${d[0]},${d[1]}`)
        .attr("fill", "none")
        .attr("stroke", clusterColor(labelStr))
        .attr("stroke-width", baseWidth)
        .attr("opacity", opacity)
        .attr("pointer-events", "none");
    });

    // --- Country tier: lines between per-country centroids (all postcards, not per-pair) ---
    // Pre-compute one centroid per country from all its postcard coordinates
    const originCentroids = new Map<string, { lats: number[]; lngs: number[] }>();
    const destCentroids = new Map<string, { lats: number[]; lngs: number[] }>();
    postcards.forEach(p => {
      const c = coordinates[p.id];
      if (!c) return;
      if (!originCentroids.has(p.origin_country)) originCentroids.set(p.origin_country, { lats: [], lngs: [] });
      originCentroids.get(p.origin_country)!.lats.push(c.origin_lat);
      originCentroids.get(p.origin_country)!.lngs.push(c.origin_lng);
      if (!destCentroids.has(p.receiving_country)) destCentroids.set(p.receiving_country, { lats: [], lngs: [] });
      destCentroids.get(p.receiving_country)!.lats.push(c.receiving_lat);
      destCentroids.get(p.receiving_country)!.lngs.push(c.receiving_lng);
    });

    // Key: `${originCountry}→${destCountry}|${label}` — one entry per (pair, cluster)
    const countryAcc = new Map<string, number>();
    postcards.forEach(p => {
      if (!coordinates[p.id] || hiddenClusters.has(p.label)) return;
      const key = `${p.origin_country}→${p.receiving_country}|${p.label}`;
      countryAcc.set(key, (countryAcc.get(key) ?? 0) + 1);
    });

    countryAcc.forEach((count, key) => {
      const [pairPart, labelStr] = key.split("|");
      const [oc, dc] = pairPart.split("→");
      const oData = originCentroids.get(oc);
      const dData = destCentroids.get(dc);
      if (!oData || !dData) return;
      const o = projection([avg(oData.lngs), avg(oData.lats)]);
      const d = projection([avg(dData.lngs), avg(dData.lats)]);
      if (!o || !d) return;
      const baseWidth = Math.max(0.5, Math.sqrt(count) * 0.35);
      gCountry.append("path")
        .datum({ baseWidth })
        .attr("d", `M${o[0]},${o[1]} L${d[0]},${d[1]}`)
        .attr("fill", "none")
        .attr("stroke", clusterColor(labelStr))
        .attr("stroke-width", baseWidth)
        .attr("opacity", opacity)
        .attr("pointer-events", "none");
    });

    // --- Individual tier (viewport-culled, rebuilt on zoom) ---
    const rebuildIndividual = (t: d3.ZoomTransform) => {
      const pad = 60;
      const x0 = (-t.x - pad) / t.k, y0 = (-t.y - pad) / t.k;
      const x1 = (width - t.x + pad) / t.k, y1 = (height - t.y + pad) / t.k;

      const inBounds = (pt: [number, number] | null) =>
        pt !== null && pt[0] >= x0 && pt[0] <= x1 && pt[1] >= y0 && pt[1] <= y1;

      const visible = postcards.filter(p => {
        const c = coordinates[p.id];
        if (!c || hiddenClusters.has(p.label)) return false;
        return inBounds(projection([c.origin_lng, c.origin_lat])) ||
          inBounds(projection([c.receiving_lng, c.receiving_lat]));
      });

      const arcSel = gArcs.selectAll<SVGPathElement, typeof postcards[0]>("path")
        .data(visible, d => d.id);
      arcSel.enter().append("path")
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .merge(arcSel)
        .attr("d", p => {
          const c = coordinates[p.id];
          const o = projection([c.origin_lng, c.origin_lat]);
          const d = projection([c.receiving_lng, c.receiving_lat]);
          return o && d ? `M${o[0]},${o[1]} L${d[0]},${d[1]}` : "";
        })
        .attr("stroke", p => clusterColor(String(p.label)))
        .attr("stroke-width", 1.5 / t.k)
        .attr("opacity", opacity);
      arcSel.exit().remove();

      // Cluster dots: group nearby postcards into screen-space grid cells (origin + receiving unified)
      type ClusterEndpoint = { postcard: (typeof postcards)[0]; loc: "origin" | "receiving" };
      type ClusterItem = {
        projX: number; projY: number;
        endpoints: ClusterEndpoint[];
        uniqueCount: number;
        dominantLabel: number;
        id: string;
      };
      const clusterItems: ClusterItem[] = [];

      if (t.k >= IMAGE_ZOOM) {
        const CELL_PX = 30;
        const cells = new Map<string, { endpoints: ClusterEndpoint[]; sumPX: number; sumPY: number }>();

        visible.forEach(p => {
          const c = coordinates[p.id];
          const pts: [number, number, "origin" | "receiving"][] = [
            [c.origin_lng, c.origin_lat, "origin"],
            [c.receiving_lng, c.receiving_lat, "receiving"],
          ];
          for (const [lng, lat, loc] of pts) {
            const proj = projection([lng, lat]);
            if (!proj) continue;
            const screenX = proj[0] * t.k + t.x;
            const screenY = proj[1] * t.k + t.y;
            const key = `${Math.floor(screenX / CELL_PX)},${Math.floor(screenY / CELL_PX)}`;
            if (!cells.has(key)) cells.set(key, { endpoints: [], sumPX: 0, sumPY: 0 });
            const cell = cells.get(key)!;
            cell.endpoints.push({ postcard: p, loc });
            cell.sumPX += proj[0];
            cell.sumPY += proj[1];
          }
        });

        cells.forEach((cell, key) => {
          const n = cell.endpoints.length;
          const uniqueCount = new Set(cell.endpoints.map(e => e.postcard.id)).size;
          const labelCounts = new Map<number, number>();
          cell.endpoints.forEach(e => labelCounts.set(e.postcard.label, (labelCounts.get(e.postcard.label) ?? 0) + 1));
          const dominantLabel = [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
          clusterItems.push({ projX: cell.sumPX / n, projY: cell.sumPY / n, endpoints: cell.endpoints, uniqueCount, dominantLabel, id: key });
        });
      }

      const clusterSel = gNames.selectAll<SVGGElement, ClusterItem>("g.cluster")
        .data(clusterItems, d => d.id);

      const clusterEnter = clusterSel.enter().append("g").attr("class", "cluster");
      clusterEnter.append("circle");
      clusterEnter.append("text");

      const clusterAll = clusterEnter.merge(clusterSel);

      clusterAll
        .attr("transform", d => `translate(${d.projX},${d.projY})`)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          event.stopPropagation();
          setClusterPanel({ x: event.clientX, y: event.clientY, endpoints: d.endpoints });
        })
        .on("mouseover", function (event, d) {
          if (d.uniqueCount === 1) {
            setTooltip({ x: event.clientX, y: event.clientY, postcard: d.endpoints[0].postcard });
          }
        })
        .on("mouseout", function () {
          setTooltip(null);
        });

      clusterAll.select<SVGCircleElement>("circle")
        .attr("r", d => (d.uniqueCount === 1 ? 4 : Math.min(12, 5 + Math.log2(d.uniqueCount) * 2.5)) / t.k)
        .attr("fill", "#3b82f6")
        .attr("fill-opacity", 0.85)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5 / t.k);

      clusterAll.select<SVGTextElement>("text")
        .text(d => d.uniqueCount > 1 ? String(d.uniqueCount) : d.endpoints[0].postcard.name)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", d => d.uniqueCount > 1 ? "central" : "auto")
        .attr("dy", d => d.uniqueCount > 1 ? 0 : -(7 / t.k))
        .attr("fill", d => d.uniqueCount > 1 ? "white" : "#1e293b")
        .attr("font-size", d => (d.uniqueCount > 1 ? 8 : 10) / t.k)
        .style("pointer-events", "none");

      clusterSel.exit().remove();
    };

    // --- Zoom handler ---
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

    const applyTransform = (t: d3.ZoomTransform) => {
      const k = t.k;
      const ts = t.toString();
      gMap.attr("transform", ts);
      gContinent.attr("transform", ts);
      gCountry.attr("transform", ts);
      gArcs.attr("transform", ts);
      gNames.attr("transform", ts);

      gContinent.attr("display", k < COUNTRY_ZOOM ? null : "none");
      gCountry.attr("display", k >= COUNTRY_ZOOM && k < INDIVIDUAL_ZOOM ? null : "none");
      gArcs.attr("display", k >= INDIVIDUAL_ZOOM ? null : "none");
      gNames.attr("display", k >= IMAGE_ZOOM ? null : "none");

      // Counter-scale stroke widths so lines keep visual thickness
      if (k < COUNTRY_ZOOM) {
        gContinent.selectAll("path").attr("stroke-width", (d: any) => d.baseWidth / k);
      } else if (k < INDIVIDUAL_ZOOM) {
        gCountry.selectAll("path").attr("stroke-width", (d: any) => d.baseWidth / k);
      }

      if (k >= INDIVIDUAL_ZOOM) {
        if (rebuildTimer) clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => rebuildIndividual(t), 120);
      }
    };

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 50])
      .on("zoom", event => {
        currentTransformRef.current = event.transform;
        applyTransform(event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.transform, currentTransformRef.current);
    applyTransform(currentTransformRef.current);

    return () => { if (rebuildTimer) clearTimeout(rebuildTimer); };
  }, [geoData, coordinates, postcards, selectedCountry, opacity, hiddenClusters]);

  const uniqueLabels = Array.from(
    new Set(postcards.map((p) => p.label).filter((l) => l !== undefined))
  ).sort((a, b) => a - b);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueLabels.map(String));

  const toggleCluster = (label: number) => {
    const updated = new Set(hiddenClusters);
    if (updated.has(label)) {
      updated.delete(label);
    } else {
      updated.add(label);
    }
    setHiddenClusters(updated);
  };

  return (
    <div className="h-full flex flex-col px-5 py-5">
      <h1 className="text-4xl font-semibold mb-5 shrink-0">
        Postcard Paths Map
      </h1>
      <div className="flex justify-between items-center shrink-0">
        {selectedCountry && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Filtering by: <span className="font-bold text-blue-700">{selectedCountry}</span>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-xs text-slate-400 hover:text-slate-600 ml-2 transition"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Loading map coordinates...</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-5 overflow-hidden">
          {/* Map canvas */}
          <div className="flex-1 relative border border-slate-200 rounded-2xl bg-sky-50/50 shadow-inner overflow-hidden">
            <svg ref={svgRef} className="w-full h-full" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-slate-400 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-100 pointer-events-none select-none">
              <span>Scroll to zoom</span>
              <span className="text-slate-200">|</span>
              <span>1×–3×</span><span>continent</span>
              <span className="text-slate-200">·</span>
              <span>3×–7×</span><span>country</span>
              <span className="text-slate-200">·</span>
              <span>7×+</span><span>individual</span>
              <span className="text-slate-200">·</span>
              <span>12×+</span><span>names</span>
            </div>
            {clusterPanel && (
              <div
                className="fixed bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-xl p-3 z-[60] flex flex-col gap-2"
                style={{ left: clusterPanel.x, top: clusterPanel.y, transform: "translate(-50%, calc(-100% - 16px))" }}
              >
                {(() => {
                  const byId = new Map<string, { postcard: (typeof postcards)[0]; locs: ("origin" | "receiving")[] }>();
                  for (const e of clusterPanel.endpoints) {
                    if (!byId.has(e.postcard.id)) byId.set(e.postcard.id, { postcard: e.postcard, locs: [] });
                    byId.get(e.postcard.id)!.locs.push(e.loc);
                  }
                  const entries = [...byId.values()];
                  return (
                    <>
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-semibold text-sm text-slate-700">
                          {entries.length} postcard{entries.length > 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => setClusterPanel(null)}
                          className="text-slate-400 hover:text-slate-600 transition text-xs shrink-0"
                        >
                          close
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                        {entries.map(({ postcard, locs }) => {
                          const locLabel = locs.includes("origin") && locs.includes("receiving")
                            ? "sent + received"
                            : locs[0] === "origin" ? "sent" : "received";
                          return (
                            <div
                              key={postcard.id}
                              className="text-xs text-slate-700 hover:bg-blue-50 rounded px-2 py-1 cursor-default flex justify-between gap-2"
                              onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, postcard })}
                              onMouseMove={e => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <span className="truncate">{postcard.name}</span>
                              <span className="text-slate-400 shrink-0">{locLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            {tooltip && (
              <div
                className="fixed bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-xl p-3 flex flex-col gap-2 items-center z-[70] pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+16px)]"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                <img
                  src={`${THUMBNAIL_BASE}${tooltip.postcard.name}`}
                  alt={tooltip.postcard.name}
                  className="w-32 h-32 object-cover rounded-lg bg-slate-100"
                />
                <div className="flex flex-col gap-1 w-full text-left">
                  <div className="font-semibold text-slate-800 text-sm text-center mb-1">
                    {tooltip.postcard.name}
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                    <span className="font-medium text-slate-400 text-right">Origin:</span>
                    <span className="truncate">{tooltip.postcard.origin_country}</span>

                    <span className="font-medium text-slate-400 text-right">Receiving:</span>
                    <span className="truncate">{tooltip.postcard.receiving_country}</span>

                    <span className="font-medium text-slate-400 text-right">Distance:</span>
                    <span>{tooltip.postcard.distance ? `${Math.round(tooltip.postcard.distance)} km` : 'N/A'}</span>

                    <span className="font-medium text-slate-400 text-right">Sent:</span>
                    <span>{tooltip.postcard.date_sent ? new Date(tooltip.postcard.date_sent).toLocaleDateString() : 'N/A'}</span>

                    <span className="font-medium text-slate-400 text-right">Received:</span>
                    <span>{tooltip.postcard.date_received ? new Date(tooltip.postcard.date_received).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium text-center mt-1 pt-1 border-t border-slate-100">
                    Cluster: {tooltip.postcard.label === -1 ? 'Outlier' : tooltip.postcard.label}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar controls */}
          <div className="w-64 shrink-0 flex flex-col gap-4 border border-slate-200 rounded-2xl p-4 bg-white shadow-sm overflow-y-auto">
            <div>
              <h2 className="font-semibold text-sm mb-3 text-slate-700">Map Configuration</h2>

              {/* Opacity slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Arc Opacity</span>
                  <span>{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-sm text-slate-700">Filter Clusters</h2>
                <button
                  onClick={() => setHiddenClusters(
                    hiddenClusters.size === 0 ? new Set(uniqueLabels) : new Set()
                  )}
                  className="text-xs text-blue-600 hover:text-blue-700 transition"
                >
                  {hiddenClusters.size === 0 ? "Hide all" : "Show all"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {uniqueLabels.map((label) => {
                  const isHidden = hiddenClusters.has(label);
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer transition"
                      onClick={() => toggleCluster(label)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: colorScale(String(label)),
                            opacity: isHidden ? 0.3 : 1,
                          }}
                        />
                        <span className={`text-xs ${isHidden ? "text-slate-400 line-through" : "text-slate-700"}`}>
                          {label === -1 ? "Outliers" : `Cluster ${label}`}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        readOnly
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
