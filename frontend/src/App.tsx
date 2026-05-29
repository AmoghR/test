import { Routes, Route } from "react-router-dom";
import MetadataExplorer from "./MetadataExplorer";
import Clustering from "./Clustering";
import WorldMap from "./WorldMap";
import { PostcardProvider } from "./Postcards";
import Navigator from './Navigator.tsx'

export default function App() {
  return (
    <PostcardProvider>
      <Navigator />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<MetadataExplorer />} />
          <Route path="/clustering" element={<Clustering />} />
          <Route path="/worldmap" element={<WorldMap />} />
        </Routes>
      </div>
    </PostcardProvider>
  );
}