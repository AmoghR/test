from pathlib import Path

DATA_DIRECTORY = Path(__file__).parent / ".." / "data"

# Assets
POSTCARDS_IMAGE_PATH = DATA_DIRECTORY /  "images_full_res"
POSTCARDS_THUMBNAIL_PATH = DATA_DIRECTORY /  "thumbnails"

# Files
POSTCARDS_PATH = DATA_DIRECTORY /  "data.json"
CLUSTER_DATA = DATA_DIRECTORY / "cluster_data.json"
FAISS_INDEX_DATA = DATA_DIRECTORY / "faiss_index.faiss"
COORDINATES_PATH = DATA_DIRECTORY / "postcard_coordinates.json"