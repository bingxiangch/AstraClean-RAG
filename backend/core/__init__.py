import os
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch
from qdrant_client import QdrantClient
from language_models import MODEL_MAP


from dotenv import load_dotenv
load_dotenv()

# Initialize models and clients
# qdrant_client = QdrantClient(url=os.getenv("QDRANT_URL"))
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

qdrant_client = QdrantClient(
    url=QDRANT_URL,          # e.g., "https://<cluster>.<region>.cloud.qdrant.io:6333"
    api_key=QDRANT_API_KEY,  # required for cloud
    timeout=30.0,            # optional
)
sentence_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

initialized_models = {}
for name, model_class in MODEL_MAP.items():
    model = model_class()
    initialized_models[name] = model
