from pathlib import Path
from PIL import Image
import torch
import clip
from umap import UMAP
import hdbscan
import numpy as np
import json
import matplotlib.pyplot as plt
import faiss
import pandas as pd
from backend import Directory_Helper
import collections

class SearchCluster_Helper():
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
        self.model.eval()
        if not Directory_Helper.FAISS_INDEX_DATA.exists():
            print("Creating FAISS index and Clusters")
            self.run_clip_and_clustering()
        self.faiss_index = faiss.read_index(str(Directory_Helper.FAISS_INDEX_DATA))
        self.best_k = 50
        self.cluster_data = pd.read_json(Directory_Helper.CLUSTER_DATA)

    def getClusterData(self):
        return self.cluster_data

    def search(self, query_string: str):
        query = clip.tokenize([query_string]).to(self.device)
        with torch.no_grad():
            text_embedding = self.model.encode_text(query)
            text_embedding = text_embedding / text_embedding.norm(dim=-1, keepdim=True)
            text_embedding = text_embedding.cpu().numpy().astype("float32")
        scores, indices = self.faiss_index.search(text_embedding, self.best_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            results.append({
                "id": int(idx),
                "score": float(score)
            })
        return results
    
    def get_image_features(self, image_path: Path):
        image = self.preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(self.device)
        with torch.no_grad():
            image_features = self.model.encode_image(image)
        return image_features / image_features.norm(dim=-1, keepdim=True)

    def run_clip_and_clustering(self):
        embeddings = []
        file_names = []
        for file in sorted(Directory_Helper.POSTCARDS_IMAGE_PATH.iterdir()):
            if file.is_file():
                embeddings.append(self.get_image_features(file).cpu().numpy()[0])
                file_names.append(file.stem)

        image_embeddings = np.array(embeddings)

        umap_model = UMAP(
            n_components=10,
            n_neighbors=30,
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        )

        umap_visualize = UMAP(
            n_components=2,
            metric="cosine",
            random_state=42,
        )

        X_visualize = umap_visualize.fit_transform(image_embeddings)
        X_reduced = umap_model.fit_transform(image_embeddings)

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=15,
            metric="euclidean",
            min_samples=3,
            cluster_selection_epsilon=0.3,
            cluster_selection_method="eom",
        )

        labels = clusterer.fit_predict(X_reduced)
        
        #plt.scatter(X_visualize[:,0], X_visualize[:,1], c=labels)
        #plt.show()

        n_outliers = np.sum(labels == -1)
        n_total = len(labels)
        print(f"Outliers: {n_outliers} / {n_total}")
        print(sorted(collections.Counter(labels[labels != -1]).values(), reverse=True))

        data = []
        for i, (file_name, label, xy_coord) in enumerate(zip(file_names, labels, X_visualize)):
            data.append({
                "id": i,
                "file_name": file_name,
                "label": int(label), 
                "x": float(xy_coord[0]), 
                "y": float(xy_coord[1])
                })

        with open(Directory_Helper.CLUSTER_DATA, "w") as f:
            json.dump(data, f)

        # Creating FAISS index
        image_embeddings = image_embeddings.astype("float32")
        faiss_index = faiss.IndexFlatIP(image_embeddings.shape[1])
        faiss_index.add(image_embeddings)
        faiss.write_index(faiss_index, str(Directory_Helper.FAISS_INDEX_DATA))

if __name__ == "__main__":
    seach_cluster_helper = SearchCluster_Helper()