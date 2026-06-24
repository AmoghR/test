import { NavLink } from "react-router-dom";
import { usePostcards } from "./Postcards";

export default function Navigator() {
    const postcardStorage = usePostcards();
    const base = "rounded-md px-3 py-2 text-sm font-medium transition-colors";
    const active = "bg-gray-950/50 text-white";
    const inactive = "text-gray-300 hover:bg-white/5 hover:text-white transition";

    return (
        <nav className="relative bg-blue-500 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10">
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">

                    <div className="flex flex-col mt-2 mb-2 gap-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search..."
                                onChange={(e) => postcardStorage.setSearchFilter(e.target.value)}
                                className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 outline-none focus:bg-white/15"
                            />

                            <div className="flex flex-col">
                                <label className="text-xs text-white/70">
                                    Minimum Distance: {postcardStorage.distanceFilter} km
                                </label>

                                <input
                                    type="range"
                                    min={postcardStorage.min_distance}
                                    max={postcardStorage.max_distance}
                                    value={postcardStorage.distanceFilter}
                                    onChange={(e) => postcardStorage.setDistanceFilter(Number(e.target.value))}
                                    className="w-40 accent-white"
                                />

                                <div className="flex justify-between text-[10px] text-white/50">
                                    <span>{postcardStorage.min_distance} km</span>
                                    <span>{postcardStorage.max_distance} km</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-white/70">
                                    Minimum Time: {postcardStorage.timeFilter} {postcardStorage.timeFilter <= 1 ? 'day' : 'days'}
                                </label>

                                <input
                                    type="range"
                                    min={postcardStorage.min_time}
                                    max={postcardStorage.max_time}
                                    value={postcardStorage.timeFilter}
                                    onChange={(e) => postcardStorage.setTimeFilter(Number(e.target.value))}
                                    className="w-40 accent-white"
                                />

                                <div className="flex justify-between text-[10px] text-white/50">
                                    <span>{postcardStorage.min_time} {postcardStorage.min_time <= 1 ? 'day' : 'days'}</span>
                                    <span>{postcardStorage.max_time} days</span>
                                </div>
                            </div>
                            <div className="flex">
                                <label className="flex items-center gap-2 cursor-pointer"
                                title="Shows postcards with outlier label or statistical outlier based on time">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4"
                                        checked={postcardStorage.showOutliers}
                                        onChange={(e) => postcardStorage.setShowOutliers(e.target.checked)}/>
                                    <span className="text-xs text-white/70">Show Only Outliers</span>
                                </label>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-white/70">
                                    Origin Country
                                </label>
                                <select className="w-40 accent-white text-white"
                                onChange={(e) => postcardStorage.setSelectedOriginCountry(e.target.value)}>
                                    <option style={{ backgroundColor: "#fff", color: "#000" }}>All</option>
                                    {postcardStorage.origin_countries.map((country) => (
                                        <option style={{ backgroundColor: "#fff", color: "#000" }} key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-white/70">
                                    Receiving Country
                                </label>
                                <select className="w-40 accent-white text-white" 
                                onChange={(e) => postcardStorage.setSelectedReceivingCountry(e.target.value)}>
                                    <option style={{ backgroundColor: "#fff", color: "#000" }}>All</option>
                                    {postcardStorage.receiving_countries.map((country) => (
                                        <option style={{ backgroundColor: "#fff", color: "#000" }} key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex space-x-4">
                            <NavLink
                                    to="/" 
                                    className="px-3 py-2 text-white font-semibold text-center"
                                >
                                    Postcard Explorer
                            </NavLink>
                            <NavLink
                                to="/"
                                className={({ isActive }) =>
                                    `${base} ${isActive ? active : inactive} text-center`
                                }
                            >
                                Metadata Explorer
                            </NavLink>

                            <NavLink
                                to="/clustering"
                                className={({ isActive }) =>
                                    `${base} ${isActive ? active : inactive} text-center`
                                }
                            >
                                Topic Clustering
                            </NavLink>

                            <NavLink
                                to="/worldmap"
                                className={({ isActive }) =>
                                    `${base} ${isActive ? active : inactive} text-center`
                                }
                            >
                                World Map
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}