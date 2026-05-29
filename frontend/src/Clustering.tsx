import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { usePostcards } from "./Postcards";

type ClusterPoint = {
  id: number;
  file_name: string;
  label: number;
  x: number;
  y: number;
};

type ClusterData = {
  points: ClusterPoint[];
  num_labels: number;
};

export default function Clustering() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ClusterData | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<number | null>(null);
  const postcardStorage = usePostcards();
  const distanceFilter = postcardStorage.distanceFilter;
  const timeFilter = postcardStorage.timeFilter;
  const searchFilter = postcardStorage.searchFilter;
  const selectedCountry = postcardStorage.selectedCountry;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();

      if (distanceFilter > 0) {
        params.append("min_distance", String(distanceFilter));
      }

      if (timeFilter > 0) {
        params.append("min_time", String(timeFilter));
      }

      if (searchFilter.length > 0) {
        params.append("search_query", String(searchFilter));
      }

      if (selectedCountry) {
        params.append("country", selectedCountry);
      }

      fetch(`http://localhost:8000/clusters?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Failed to fetch clusters:", err));
    }, 150);
    return () => clearTimeout(timeout);
  }, [postcardStorage.searchFilter, postcardStorage.distanceFilter, postcardStorage.timeFilter, postcardStorage.selectedCountry]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const color = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(Array.from({ length: data.num_labels }, (_, i) => String(i)));

    const xScale = d3.scaleLinear()
      .domain([d3.min(data.points, (d) => d.x)!, d3.max(data.points, (d) => d.x)!])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(data.points, (d) => d.y)!, d3.max(data.points, (d) => d.y)!])
      .range([height - margin.bottom, margin.top]);

    svg.selectAll("circle")
      .data(data.points)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 3)
      .attr("fill", (d) => color(String(d.label)))
      .attr("opacity", (d) =>
        selectedLabel === null || d.label === selectedLabel ? 0.7 : 0.1
      )
      .on("mouseover", function () {
        d3.select(this).attr("r", 6).attr("opacity", 1);
      })
      .on("mouseout", function (_, d) {
        d3.select(this)
          .attr("r", 3)
          .attr("opacity",
            selectedLabel === null || d.label === selectedLabel ? 0.7 : 0.1
          );
      });

  }, [data, selectedLabel]);

  const labels = data
    ? Array.from(new Set(data.points.map((p) => p.label))).sort((a, b) => a - b)
    : [];

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(Array.from({ length: data?.num_labels ?? 0 }, (_, i) => String(i)));

  return (
    <div className="h-full flex flex-col px-5 py-5">
      <h1 className="text-4xl font-semibold mb-5 shrink-0">
        Clustering Map
      </h1>

      {!data && <p className="text-gray-500">Loading cluster data...</p>}

      {data && (
        <div className="flex h-full gap-4 overflow-hidden">
          <div className="flex-1 border rounded bg-white">
            <svg ref={svgRef} className="w-full h-full" />
          </div>
          <div className="w-40 shrink-0 overflow-y-auto">
            <p className="font-semibold mb-2 text-sm">Clusters</p>
            <button
              className="text-xs text-blue-600 mb-2 underline"
              onClick={() => setSelectedLabel(null)}
            >
              Show all
            </button>
            {labels.map((label) => (
              <div
                key={label}
                className="flex items-center gap-2 mb-1 cursor-pointer"
                onClick={() => setSelectedLabel(label)}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color(String(label)) }}
                />
                <span className="text-xs">Cluster {label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}