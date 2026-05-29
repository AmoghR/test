<div align="center">
<h1>
  <img src="frontend/public/favicon.svg" alt="Postcards Icon" width="40" style="vertical-align: middle;"/>
  VA: T1 - Postcards
</h1>

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
</div>

## Current State
- [x] Basic FastAPI setup with mock data
- [x] Basic Vue/React/Typescript setup
- [x] Use TailwindCSS for styling
- [x] Show Basic Metadata

| Progress | Feature | Info |
| --- | --- | --- |
| ![100%](https://progress-bar.xyz/100) | **[M1](#m1--scrollable-postcard-explorer)** | Done |
| ![100%](https://progress-bar.xyz/100) | **[M2](#m2--postcard-clustering)** | Visualization missing, all data available |
| ![0%](https://progress-bar.xyz/0)     | **[M3](#m3--postcard-path-visualization)** | Not started |
| ![100%](https://progress-bar.xyz/100) | **[E1](#e1--semantic-search)** | Done |
| ![90%](https://progress-bar.xyz/90)   | **[E2](#e2--outlier-detection)** | Add additional boxplot based outliers |
| ![0%](https://progress-bar.xyz/0)     | **[E3](#e3--semantic-zooming)** | Not started, depends on M3 |

## Setup
### Backend
```bash
pip install -r requirements.txt
```
### Frontend
```bash
cd frontend
npm install
```

## Running
### Application
The whole application can be run with:
```bash
npm run dev
```

### Backend
Run just the backend with:
```bash
npm run backend
```

### Frontend
Run just the frontend with:
```bash
npm run frontend
```

## Walkthrough
> Coming soon!!!

# Project Plan

## Project Overview
This project focuses on building an interactive visual analytics system for exploring postcard data. The application will support metadata exploration, clustering, geographic visualization, search functionality, outlier analysis, and semantic zooming interactions.

The system will be implemented using:
- **Frontend:** React, TypeScript, D3.js/Leaflet.js, TailwindCSS
- **Backend:** FastAPI (Python)
- **ML/Data Processing:** CLIP (ViT-B/32), UMAP/t-SNE, HDBSCAN
- **Design/Planning:** [Figma](https://www.figma.com/make/qwynTVlOvbtaTqaZolBbOG/Postcard-Visualization-Project?fullscreen=1)
- **Dataset:** [T1 - Postcards](https://tc.tugraz.at/main/mod/resource/view.php?id=551948)
---

## 1. Objectives

### Mandatory Requirements
#### M1 — Scrollable Postcard Explorer
- Display all postcards in a virtualized scrollable list
- Load data from Python backend
- Implement basic filtering
- Allow row click for postcard overview/details
- Optimize rendering using virtual lists

#### M2 — Postcard Clustering
- Extract semantic features using CLIP ViT-B/32
- Reduce dimensionality using UMAP or t-SNE
- Perform clustering using HDBSCAN
- Visualize clusters using D3.js

#### M3 — Postcard Path Visualization
- Display postcard travel paths on a world map
- Use Natural Earth projection
- Color arcs according to clusters
- Support filtering by country
- Minimize clutter with opacity/bundling

---

### Extended Requirements
#### E1 — Semantic Search
- Implement search using metadata and clusters
- Synchronize filters across all visualizations

#### E2 — Outlier Detection
- Detect statistical outliers using boxplots
- Mark unusual postcards (e.g. “Slow” postcards)
- Use DBSCAN/HDBSCAN noise cluster detection
- Cross-filter outliers across all views

#### E3 — Semantic Zooming
- Interactive zoomable world map
- Cluster postcards geographically based on zoom level
- Reveal detailed postcards on deep zoom
- Precompute geographic aggregation levels

---