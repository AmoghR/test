import { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePostcards } from "./Postcards";

export default function MetadataExplorer() {
  const postcardStorage = usePostcards();
  const postcards = postcardStorage.postcards;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const IMAGE_BASE = "http://localhost:8000/thumbnails/";
  const FULL_RES_IMAGE_BASE = "http://localhost:8000/images/";
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: postcardStorage.size,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80 + 10,
    overscan: 10,
  });

  useEffect(() => {
    rowVirtualizer.measure();
    rowVirtualizer.scrollToIndex(0);
  }, [postcardStorage.postcards, rowVirtualizer]);

  return (
    <div className="h-full flex flex-col px-5 py-5">
      <h1 className="text-4xl font-semibold mb-5 shrink-0">
        Metadata Explorer
      </h1>
      

      <div ref={parentRef} className="h-full overflow-y-auto">
        <div 
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const p = postcards[virtualRow.index];
            if (!p) return null;

            return (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center gap-3 bg-blue-500 rounded-xl p-2 h-[80px] cursor-pointer hover:bg-blue-400 transition"
                    onClick={() => setSelectedItem(p.name)}>
                  <img
                    src={IMAGE_BASE + p.name}
                    alt="Postcard"
                    className="h-15 w-25 object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-white/70">
                      ID: {p.id}
                    </span>
                    <span className="font-medium text-white">
                      {p.origin_city}, {p.origin_country} {"->"}{" "}
                      {p.receiving_city}, {p.receiving_country}
                    </span>
                    <span className="text-xs text-white">
                      {p.distance?.toFixed?.(0)} km • {p.time?.toFixed?.(0)} days
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.label !== undefined && (
                      p.label == -1 ?
                      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                        Outlier
                      </span>:
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        Cluster {p.label}
                      </span>
                    )}
                    {p.similarity_score !== undefined && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700">
                        Score {p.similarity_score.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedItem && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}>
        <img
          src={FULL_RES_IMAGE_BASE + selectedItem}
          alt="Full Resolution Postcard"
          className="max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      )}
    </div>
  );
}