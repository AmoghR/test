import { createContext, useEffect, useState, useContext } from "react";
import type { ReactNode } from 'react';

type Postcard = {
  id: string;
  name: string;
  origin_country: string;
  receiving_country: string;
  time: number;
  distance: number;
  date_sent: Date;
  date_received: Date;
  origina_region: string;
  receiving_region: string;
  origin_city: string;
  receiving_city: string;
  origin_iso: string;
  receiving_iso: string;
  numerical_index: number;
  label: number;
  similarity_score: number;
  outlier: boolean;
};

type PostcardStorage = {
    postcards: Postcard[];
    origin_countries: string[];
    receiving_countries: string[];
    min_distance: number;
    max_distance: number;
    min_time: number;
    max_time: number;
    size: number;

    searchFilter: string;
    distanceFilter: number;
    timeFilter: number;
    selectedReceivingCountry: string | null;
    selectedOriginCountry: string | null;
    showOutliers: boolean;
    setSearchFilter: (v: string) => void;
    setDistanceFilter: (v: number) => void;
    setTimeFilter: (v: number) => void;
    setSelectedReceivingCountry: (v: string | null) => void;
    setSelectedOriginCountry: (v: string | null) => void;
    setShowOutliers: (v: boolean) => void;
}

const PostcardContext = createContext<PostcardStorage | undefined>(undefined);

export function PostcardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [postcardStorage, setPostcardStorage] = useState<PostcardStorage>({
        postcards: [],
        origin_countries: [],
        receiving_countries: [],
        min_distance: 0,
        max_distance: 0,
        min_time: 0,
        max_time: 0,
        size: 0,
        searchFilter: "",
        distanceFilter: 0,
        timeFilter: 0,
        selectedReceivingCountry: null,
        selectedOriginCountry: null,
        showOutliers: false,
        setSearchFilter: () => {},
        setDistanceFilter: () => {},
        setTimeFilter: () => {},
        setSelectedReceivingCountry: () => {},
        setSelectedOriginCountry: () => {},
        setShowOutliers: () => {},
  });
    const [distanceFilter, setDistanceFilter] = useState(0);
    const [timeFilter, setTimeFilter] = useState(0);
    const [searchFilter, setSearchFilter] = useState("");
    const [selectedReceivingCountry, setSelectedReceivingCountry] = useState<string | null>(null);
    const [selectedOriginCountry, setSelectedOriginCountry] = useState<string | null>(null);
    const [showOutliers, setShowOutliers] = useState(false);

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

        if (selectedOriginCountry && selectedOriginCountry != "All") {
          params.append("origin_country", selectedOriginCountry);
        }

        if (selectedReceivingCountry&& selectedReceivingCountry != "All") {
          params.append("receiving_country", selectedReceivingCountry);
        }

        if (showOutliers) {
          params.append("outlier", String(showOutliers));
        }

        fetch(`http://localhost:8000/postcards?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
            setPostcardStorage(data);
        });
    }, 150);

    return () => clearTimeout(timeout);
  }, [distanceFilter, timeFilter, searchFilter, selectedOriginCountry, selectedReceivingCountry, showOutliers]);

  return (
    <PostcardContext.Provider value={{
  ...postcardStorage,
  searchFilter,
  distanceFilter,
  timeFilter,
  selectedReceivingCountry,
  selectedOriginCountry,
  showOutliers,
  setSearchFilter,
  setDistanceFilter,
  setTimeFilter,
  setSelectedReceivingCountry,
  setSelectedOriginCountry,
  setShowOutliers,
}}>
      {children}
    </PostcardContext.Provider>
  );
}

export function usePostcards() {
  const context = useContext(PostcardContext);

  if (!context) {
    throw new Error("usePostcards must be used inside PostcardProvider");
  }

  return context;
}