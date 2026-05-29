import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { usePostcards } from "./Postcards";

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
  const [isBundled, setIsBundled] = useState(true);
  const [opacity, setOpacity] = useState(0.4);
  const [hiddenClusters, setHiddenClusters] = useState<Set<number>>(new Set());

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

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Group elements
    const gMap = svg.append("g").attr("class", "map-group");
    const gArcs = svg.append("g").attr("class", "arcs-group");

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
      .attr("class", "country-path")
      .attr("fill", (d: any) => {
        const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
        return countryName === selectedCountry ? "#1d4ed8" : "#1e293b";
      })
      .attr("stroke", "#475569")
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer")
      .on("mouseover", function () {
        d3.select(this).attr("fill", (d: any) => {
          const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
          return countryName === selectedCountry ? "#2563eb" : "#334155";
        });
      })
      .on("mouseout", function (_, d: any) {
        d3.select(this).attr("fill", () => {
          const countryName = normalizeCountryName(d.properties.name || d.properties.NAME || "");
          return countryName === selectedCountry ? "#1d4ed8" : "#1e293b";
        });
      })
      .on("click", (_, d: any) => {
        const rawName = d.properties.name || d.properties.NAME || "";
        const countryName = normalizeCountryName(rawName);
        if (selectedCountry === countryName) {
          setSelectedCountry(null); // Deselect if clicked again
        } else {
          setSelectedCountry(countryName);
        }
      });

    // Draw paths/arcs
    postcards.forEach((p) => {
      const coords = coordinates[p.id];
      if (!coords) return;

      // Skip if cluster is toggled off
      if (hiddenClusters.has(p.label)) return;

      const pStart = projection([coords.origin_lng, coords.origin_lat]);
      const pEnd = projection([coords.receiving_lng, coords.receiving_lat]);

      if (!pStart || !pEnd) return;

      const [x1, y1] = pStart;
      const [x2, y2] = pEnd;

      let dPath = "";
      if (isBundled) {
        // Curve path pulled towards a center point to bundle them
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const mapCenterX = width / 2;
        const mapCenterY = height / 2;

        // Pull the control point slightly towards the center of the projection
        const bundleFactor = 0.35;
        const ctrlX = midX + (mapCenterX - midX) * bundleFactor;
        const ctrlY = midY + (mapCenterY - midY) * bundleFactor;

        dPath = `M${x1},${y1} Q${ctrlX},${ctrlY} ${x2},${y2}`;
      } else {
        // Simple curved arc
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
        dPath = `M${x1},${y1} A${dr},${dr} 0 0,1 ${x2},${y2}`;
      }

      gArcs.append("path")
        .attr("d", dPath)
        .attr("fill", "none")
        .attr("stroke", color(String(p.label)))
        .attr("stroke-width", 1.5)
        .attr("opacity", opacity)
        .attr("pointer-events", "none");
    });

  }, [geoData, coordinates, postcards, selectedCountry, isBundled, opacity, hiddenClusters]);

  const uniqueLabels = Array.from(
    new Set(postcards.map((p) => p.label).filter((l) => l !== undefined))
  ).sort((a, b) => a - b);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

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
    <div className="h-full flex flex-col px-5 py-5 bg-gray-950 text-white">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h1 className="text-4xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Postcard Paths Map
        </h1>
        {selectedCountry && (
          <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Filtering by: <span className="font-bold text-blue-300">{selectedCountry}</span>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-xs text-white/50 hover:text-white ml-2 transition"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading map coordinates...</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-5 overflow-hidden">
          {/* Map canvas */}
          <div className="flex-1 relative border border-white/10 rounded-2xl bg-slate-900/40 backdrop-blur-md overflow-hidden">
            <svg ref={svgRef} className="w-full h-full" />
          </div>

          {/* Sidebar controls */}
          <div className="w-64 shrink-0 flex flex-col gap-4 border border-white/10 rounded-2xl p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
            <div>
              <h2 className="font-semibold text-sm mb-3 text-white/80">Map Configuration</h2>
              
              {/* Opacity slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-white/60 mb-1">
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
                  className="w-full accent-blue-500 bg-white/10 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>

              {/* Bundling toggle */}
              <div className="flex items-center justify-between text-sm py-1.5 border-t border-white/5">
                <span className="text-white/80">Bundle Arcs</span>
                <button
                  onClick={() => setIsBundled(!isBundled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    isBundled ? "bg-blue-600" : "bg-gray-800"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      isBundled ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-sm text-white/80">Filter Clusters</h2>
                <button
                  onClick={() => setHiddenClusters(new Set())}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Show all
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                {uniqueLabels.map((label) => {
                  const isHidden = hiddenClusters.has(label);
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-white/5 cursor-pointer transition"
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
                        <span className={`text-xs ${isHidden ? "text-white/40 line-through" : "text-white/80"}`}>
                          {label === -1 ? "Outliers" : `Cluster ${label}`}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        readOnly
                        className="rounded border-white/20 text-blue-600 focus:ring-0 w-3.5 h-3.5"
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