from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
import pandas as pd
from backend import image_helper
from backend.cluster_helper import SearchCluster_Helper
from backend import Directory_Helper

def get_outlier_values(values):
    Q1 = values.quantile(0.25)
    Q3 = values.quantile(0.75)
    IQR = Q3 - Q1

    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers = ((values < lower_bound) |
            (values > upper_bound))
    print(f"Number of outliers from Quantiles: {outliers.sum()}/{len(values)}")
    return outliers

postcard_df = pd.read_json(Directory_Helper.POSTCARDS_PATH)
postcard_df = postcard_df.sort_values("name").reset_index(drop=True)
postcard_df["numerical_index"] = postcard_df.index

image_helper.init_image_path(Directory_Helper.POSTCARDS_IMAGE_PATH, Directory_Helper.POSTCARDS_THUMBNAIL_PATH)

app = FastAPI()
search_cluster_helper = SearchCluster_Helper()
cluster_data_df = search_cluster_helper.getClusterData()[["id", "label"]].rename(
    columns={"id": "numerical_index"}
)
label_count = cluster_data_df["label"].nunique()
print(f"Number of unique labels: {label_count}")
postcard_df = postcard_df.merge(
    cluster_data_df,
    on="numerical_index",
    how="left"
)

# Add Outliers
postcard_df['outlier'] = get_outlier_values(postcard_df['time'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/thumbnails", StaticFiles(directory=Directory_Helper.POSTCARDS_THUMBNAIL_PATH), name="thumbnails")
app.mount("/images", StaticFiles(directory=Directory_Helper.POSTCARDS_IMAGE_PATH), name="images")

def get_filtered_ids(
    min_distance: int = Query(None),
    max_distance: int = Query(None),
    min_time: int = Query(None),
    max_time: int = Query(None),
    search_query: str = Query(None),
    receiving_country: str = Query(None),
    origin_country: str = Query(None),
    outlier: bool = Query(None)
):
    df = postcard_df.copy()

    if receiving_country is not None:
        df = df[(df["receiving_country"] == receiving_country)]

    if origin_country is not None:
        df = df[(df["origin_country"] == origin_country)]

    search_results = None
    if search_query is not None:
        search_results = search_cluster_helper.search(search_query)
        result_ids = [r["id"] for r in search_results]
        df = df[df["numerical_index"].isin(result_ids)]

    if min_distance is not None:
        df = df[df["distance"] >= min_distance]

    if max_distance is not None:
        df = df[df["distance"] <= max_distance]

    if min_time is not None:
        df = df[df["time"] >= min_time]

    if max_time is not None:
        df = df[df["time"] <= max_time]

    if outlier is not None and outlier:
        df = df[df["outlier"] | (df["label"] == -1)]

    return df["numerical_index"].tolist(), search_results

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/postcard_coordinates")
def get_postcard_coordinates():
    if Directory_Helper.COORDINATES_PATH.exists():
        with open(Directory_Helper.COORDINATES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.get("/postcards")
def get_postcards(
    min_distance: int = Query(None),
    max_distance: int = Query(None),
    min_time: int = Query(None),
    max_time: int = Query(None),
    search_query: str = Query(None),
    outlier: bool = Query(None),
    receiving_country: str = Query(None),
    origin_country: str = Query(None),
):
    filtered_ids, search_results = get_filtered_ids(
        min_distance,
        max_distance,
        min_time,
        max_time,
        search_query,
        receiving_country,
        origin_country,
        outlier
    )

    df = postcard_df[
        postcard_df["numerical_index"].isin(filtered_ids)
    ].copy()

    if search_query and search_results is not None:
        score_map = {
            r["id"]: r["score"]
            for r in search_results
        }

        df["similarity_score"] = (
            df["numerical_index"].map(score_map)
        )

        df = df.sort_values(
            by="similarity_score",
            ascending=False
        )

    receiving_countries = df["receiving_country"].unique().tolist()
    receiving_countries.sort()
    origin_country = df["origin_country"].unique().tolist()
    origin_country.sort()

    return {
        "postcards": df.to_dict(orient="records"),
        "origin_countries": origin_country,
        "receiving_countries": receiving_countries,
        "min_distance": int(postcard_df["distance"].min()),
        "max_distance": int(postcard_df["distance"].max()),
        "min_time": int(postcard_df["time"].min()),
        "max_time": int(postcard_df["time"].max()),
        "size": int(len(df)),
    }

@app.get("/clusters")
def get_clusters(
    min_distance: int = Query(None),
    max_distance: int = Query(None),
    min_time: int = Query(None),
    max_time: int = Query(None),
    search_query: str = Query(None),
    outlier: bool = Query(None),
    receiving_country: str = Query(None),
    origin_country: str = Query(None),
):
    filtered_ids, search_results = get_filtered_ids(
        min_distance,
        max_distance,
        min_time,
        max_time,
        search_query,
        receiving_country,
        origin_country,
        outlier,
    )
    
    cluster_data = (search_cluster_helper.getClusterData())
    cluster_data = cluster_data[
        cluster_data["id"].isin(filtered_ids)
    ]

    return {
        "points": cluster_data[["id", "file_name", "label", "x", "y"]].to_dict(orient="records"),
        "num_labels": int(cluster_data["label"].nunique())
    }