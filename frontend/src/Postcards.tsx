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
};

type PostcardStorage = {
    postcards: Postcard[];
    min_distance: number;
    max_distance: number;
    min_time: number;
    max_time: number;
    size: number;

    searchFilter: string;
    distanceFilter: number;
    timeFilter: number;
    selectedCountry: string | null;
    setSearchFilter: (v: string) => void;
    setDistanceFilter: (v: number) => void;
    setTimeFilter: (v: number) => void;
    setSelectedCountry: (v: string | null) => void;
}

const PostcardContext = createContext<PostcardStorage | undefined>(undefined);

export function PostcardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [postcardStorage, setPostcardStorage] = useState<PostcardStorage>({
        postcards: [],
        min_distance: 0,
        max_distance: 0,
        min_time: 0,
        max_time: 0,
        size: 0,
        searchFilter: "",
        distanceFilter: 0,
        timeFilter: 0,
        selectedCountry: null,
        setSearchFilter: () => {},
        setDistanceFilter: () => {},
        setTimeFilter: () => {},
        setSelectedCountry: () => {},
  });
    const [distanceFilter, setDistanceFilter] = useState(0);
    const [timeFilter, setTimeFilter] = useState(0);
    const [searchFilter, setSearchFilter] = useState("");
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

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

        fetch(`http://localhost:8000/postcards?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
            setPostcardStorage(data);
        });
    }, 150);

    return () => clearTimeout(timeout);
  }, [distanceFilter, timeFilter, searchFilter, selectedCountry]);

  return (
    <PostcardContext.Provider value={{
  ...postcardStorage,
  searchFilter,
  distanceFilter,
  timeFilter,
  selectedCountry,
  setSearchFilter,
  setDistanceFilter,
  setTimeFilter,
  setSelectedCountry,
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