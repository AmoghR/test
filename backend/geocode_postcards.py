import json
from pathlib import Path
import geonamescache

DATA_DIR = Path(__file__).parent.parent / "data"
POSTCARDS_PATH = DATA_DIR / "data.json"
OUTPUT_PATH = DATA_DIR / "postcard_coordinates.json"

def main():
    print("Initializing GeonamesCache...")
    gc = geonamescache.GeonamesCache()
    
    # Index cities by (city_name_lower, country_code)
    # geonamescache returns cities as a dict mapping geonameid -> city dictionary
    cities = gc.get_cities()
    countries = gc.get_countries()
    
    city_map = {}
    for gid, city in cities.items():
        name = city['name'].lower()
        cc = city['countrycode']
        # Store by name and code
        city_map[(name, cc)] = (float(city['latitude']), float(city['longitude']))
        # Also store alternate names or stripped names if any
        if 'alternatenames' in city:
            for alt in city['alternatenames']:
                if alt:
                    city_map[(alt.lower(), cc)] = (float(city['latitude']), float(city['longitude']))

    print(f"Loaded {len(city_map)} city entries (including alternates).")
    
    with open(POSTCARDS_PATH, "r", encoding="utf-8") as f:
        postcards = json.load(f)
        
    coordinates = {}
    
    resolved_count = 0
    fallback_count = 0
    total_postcards = len(postcards)
    
    for idx, p in enumerate(postcards):
        pid = p["id"]
        
        # Origin
        o_city = p.get("origin_city", "").strip()
        o_iso = p.get("origin_iso", "").strip().upper()
        o_coords = lookup_location(o_city, o_iso, city_map, countries)
        
        # Receiving
        r_city = p.get("receiving_city", "").strip()
        r_iso = p.get("receiving_iso", "").strip().upper()
        r_coords = lookup_location(r_city, r_iso, city_map, countries)
        
        coordinates[pid] = {
            "origin_lat": o_coords[0],
            "origin_lng": o_coords[1],
            "receiving_lat": r_coords[0],
            "receiving_lng": r_coords[1]
        }
        
        if o_city.lower() in [c[0] for c in city_map if c[1] == o_iso]:
            resolved_count += 0.5
        else:
            fallback_count += 0.5
            
        if r_city.lower() in [c[0] for c in city_map if c[1] == r_iso]:
            resolved_count += 0.5
        else:
            fallback_count += 0.5

    print(f"Geocoding complete: {resolved_count:.1f} exact matches, {fallback_count:.1f} fallbacks out of {total_postcards * 2} locations.")
    
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(coordinates, f, indent=2)
        
    print(f"Saved coordinates mapping to {OUTPUT_PATH}")

def lookup_location(city_name, country_iso, city_map, countries):
    # Try exact match first
    city_name_lower = city_name.lower()
    
    # Clean city name (e.g. remove "city", "(general)", etc.)
    cleaned_name = city_name_lower.replace("city", "").strip()
    
    candidates = [
        city_name_lower,
        cleaned_name,
        city_name_lower.split("/")[0].strip(),
        city_name_lower.split("(")[0].strip()
    ]
    
    for cand in candidates:
        if not cand or cand == "(general)":
            continue
        if (cand, country_iso) in city_map:
            return city_map[(cand, country_iso)]
            
    # Try finding any city in the country that starts with or contains our search term
    if country_iso in countries:
        for (name, cc), coords in city_map.items():
            if cc == country_iso and (city_name_lower in name or name in city_name_lower):
                return coords
                
    # Fallback to country's capital or capital city coords
    if country_iso in countries:
        country_info = countries[country_iso]
        capital = country_info.get("capital", "").lower()
        if (capital, country_iso) in city_map:
            return city_map[(capital, country_iso)]
            
        # Hardcoded fallback centroids if country capital lookup failed
        # Or look up any city in that country to get a decent coordinate
        for (name, cc), coords in city_map.items():
            if cc == country_iso:
                return coords
                
    # Absolute fallback (0, 0)
    return (0.0, 0.0)

if __name__ == "__main__":
    main()
