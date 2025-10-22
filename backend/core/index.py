import time
import json
import pandas as pd
from fastapi import UploadFile
from qdrant_client import models
from typing import List
from pydantic import BaseModel
from typing import Optional, List, Dict

# from core import es_client  # <-- remove
from core import qdrant_client, sentence_model


# ---------- List indexes (Qdrant collections only) ----------
async def get_indexes() -> dict:
    try:
        resp = qdrant_client.get_collections()
        names = [c.name for c in resp.collections]
        return {"status": "success", "indexes": names}
    except Exception as e:
        return {"status": "fail", "message": str(e)}




# ---------- Create index (Qdrant collection) ----------
async def create_index(index_name: str) -> dict:
    try:
        if qdrant_client.collection_exists(collection_name=index_name):
            return {"status": "fail", "message": "index already exists"}

        qdrant_client.recreate_collection(
            collection_name=index_name,
            vectors_config=models.VectorParams(
                size=sentence_model.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE,
            ),
            # (Optional) enable payload indexing if you plan to filter by fields
            # optimizers_config=models.OptimizersConfigDiff(indexing_threshold=0)
        )
        return {"status": "success"}

    except Exception as e:
        return {"status": "fail", "message": str(e)}


class UpsertRow(BaseModel):
    table: Optional[str] = None
    column: Optional[str] = None
    dirty_value: Optional[str] = None
    clean_value: Optional[str] = None

class UpsertRequest(BaseModel):
    index_name: str
    rows: List[UpsertRow]

async def upsert_rows(req: UpsertRequest) -> dict:
    index_name = req.index_name
    rows = [r.dict() for r in req.rows]

    # create collection if missing
    if not qdrant_client.collection_exists(collection_name=index_name):
        qdrant_client.recreate_collection(
            collection_name=index_name,
            vectors_config=models.VectorParams(
                size=sentence_model.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE,
            ),
        )

    points = []
    next_id = int(time.time() * 1e9)

    lines = [row_to_sentence(r) for r in rows]
    vecs = [sentence_model.encode(t).tolist() for t in lines]

    for i, (row, vec, line) in enumerate(zip(rows, vecs, lines)):
        doc_type = "rule" if (row.get("domain_rule") or row.get("rule")) else "log"
        payload = {
            "values": line,
            "row": row,
            "doc_type": doc_type,
            "table": row.get("table"),
            "column": row.get("column"),
            "dirty_value": row.get("dirty_value"),
            "clean_value": row.get("clean_value"),
            "table_name": index_name,
            "row_number": i,
        }
        points.append(models.PointStruct(id=next_id, vector=vec, payload=payload))
        next_id += 1

    if points:
        qdrant_client.upsert(collection_name=index_name, points=points)

    return {"status": "success", "upserted": len(points)}






# --- Build one consistent sentence for both KB rules and logs ---
def row_to_sentence(row: dict) -> str:
    table  = row.get("table", "")
    column = row.get("column", "")
    dirty  = row.get("dirty_value")
    clean  = row.get("clean_value")
    rule   = row.get("domain_rule") or row.get("rule")
    if rule:  # knowledge-base rule
        return f"column: {column} | KB rule: {rule}"

    if dirty is not None or clean is not None:  # history log / mapping
        return f"Repair log | table: {table} | column: {column} | change '{dirty}' -> '{clean}'"
    # fallback: minimal structured line
    return f"Record | table: {table} | column: {column}"

# --- Normalize file content to list[dict] ---
def parse_json_text(fname: str, text: str) -> List[dict]:
    fname = (fname or "").lower()
    if fname.endswith(".jsonl"):
        return [json.loads(ln) for ln in text.splitlines() if ln.strip()]
    # .json (object or array)
    data = json.loads(text)
    return data if isinstance(data, list) else [data]

# ---------- Upsert data from JSON / JSONL into Qdrant ----------
async def update_index(index_name: str, files: List[UploadFile]) -> dict:
    try:
        if not qdrant_client.collection_exists(collection_name=index_name):
            return {"status": "fail", "message": "index does not exist"}

        points: List[models.PointStruct] = []
        next_id = int(time.time() * 1e9)  # unique-ish base

        for f in files:
            fname = f.filename or "upload.json"
            if not (fname.lower().endswith(".json") or fname.lower().endswith(".jsonl")):
                return {"status": "fail", "message": f"Only .json/.jsonl allowed: {fname}"}

            text = (await f.read()).decode("utf-8")
            rows = parse_json_text(fname, text)

            # ensure dicts
            if not all(isinstance(r, dict) for r in rows):
                return {"status": "fail", "message": f"{fname} must contain JSON objects"}

            # embed one-liners
            lines = [row_to_sentence(r) for r in rows]
            vecs  = [sentence_model.encode(t).tolist() for t in lines]

            for i, (row, vec, line) in enumerate(zip(rows, vecs, lines)):
                # Detect doc type once and surface in payload
                doc_type = "rule" if ("domain_rule" in row or "rule" in row) else (
                           "log" if ("dirty_value" in row or "clean_value" in row) else "record")

                points.append(
                    models.PointStruct(
                        id=next_id,
                        vector=vec,
                        payload={
                            # unified payload (same keys for rules & logs)
                            "values": line,                # the one-liner
                            "row": row,                    # original JSON
                            "doc_type": doc_type,          # 'rule' | 'log' | 'record'
                            "table": row.get("table"),
                            "column": row.get("column"),
                            "dirty_value": row.get("dirty_value"),
                            "clean_value": row.get("clean_value"),
                            "rule": row.get("domain_rule") or row.get("rule"),
                            "table_name": fname,
                            "row_number": i,
                        },
                    )
                )
                next_id += 1

        if points:
            qdrant_client.upsert(collection_name=index_name, points=points)

        return {"status": "success"}
    except Exception as e:
        print("ERROR in update_index:", e)
        return {"status": "fail", "message": str(e)}
# # ---------- Upsert data from CSV/JSON into Qdrant ----------
# async def update_index(index_name: str, files: list[UploadFile]) -> dict:
#     try:
#         if not qdrant_client.collection_exists(collection_name=index_name):
#             return {"status": "fail", "message": "index does not exist"}

#         points: list[models.PointStruct] = []
#         ts = int(time.time() * 1e9)  # ns to reduce id collision chance

#         for f in files:
#             name = (f.filename or "").lower()

#             # ----- load rows as list[dict] -----
#             if name.endswith(".csv"):
#                 import io
#                 raw = await f.read()
#                 df = pd.read_csv(io.BytesIO(raw))
#                 row_dicts = json.loads(df.to_json(orient="records"))

#             elif name.endswith(".jsonl"):
#                 # newline-delimited JSON: one JSON object per line
#                 raw = (await f.read()).decode("utf-8")
#                 row_dicts = [json.loads(line) for line in raw.splitlines() if line.strip()]

#             elif name.endswith(".json"):
#                 raw = (await f.read()).decode("utf-8")
#                 data = json.loads(raw)
#                 if isinstance(data, dict):
#                     row_dicts = [data]
#                 elif isinstance(data, list):
#                     row_dicts = data
#                 else:
#                     return {"status": "fail", "message": f"Unsupported JSON structure in {f.filename}"}
#             else:
#                 return {"status": "fail", "message": f"Unsupported file type: {f.filename}"}

#             # ----- build payloads & vectors -----
#             def stringify_row(d: dict) -> str:
#                 return ", ".join(f"{k}: {v}" for k, v in d.items())

#             texts = [json.dumps(r, ensure_ascii=False) for r in row_dicts]
#             embeddings = [sentence_model.encode(t).tolist() for t in texts]

#             for i, (row, emb) in enumerate(zip(row_dicts, embeddings)):
#                 points.append(
#                     models.PointStruct(
#                         id=ts + i,
#                         vector=emb,
#                         payload={
#                             "values": stringify_row(row),
#                             "row": row,                       # full JSON row
#                             "table_name": f.filename,         # original filename
#                             "row_number": i,
#                         },
#                     )
#                 )

#         if points:
#             qdrant_client.upsert(collection_name=index_name, points=points)

#         return {"status": "success"}

#     except Exception as e:
#         print("ERROR in update_index:", e)
#         return {"status": "fail", "message": str(e)}


# # ---------- Upsert data from CSVs into Qdrant ----------
# async def update_index(index_name: str, files: list[UploadFile]) -> dict:
#     try:
#         if not qdrant_client.collection_exists(collection_name=index_name):
#             return {"status": "fail", "message": "index does not exist"}

#         points: list[models.PointStruct] = []
#         ts = int(time.time() * 1e9)  # ns to reduce id collision chance

#         for csv_file in files:
#             df = pd.read_csv(csv_file.file)

#             # Each row → JSON dict (DON'T use eval)
#             row_dicts = json.loads(
#                 df.to_json(orient="records")  # list[dict]
#             )

#             # Build serialization string if you want a concatenated "values" view
#             def stringify_row(d: dict) -> str:
#                 # "col1: v1, col2: v2, ..."
#                 return ", ".join(f"{k}: {v}" for k, v in d.items())

#             # Create embeddings (per-row)
#             # If your sentence_model accepts JSON strings, encode the stringified rows
#             texts = [json.dumps(r, ensure_ascii=False) for r in row_dicts]
#             embeddings = [sentence_model.encode(t).tolist() for t in texts]

#             # Build Qdrant points
#             for i, (row, emb) in enumerate(zip(row_dicts, embeddings)):
#                 points.append(
#                     models.PointStruct(
#                         id=ts + i,  # mostly-unique; or use uuid/int
#                         vector=emb,
#                         payload={
#                             # Store both dict and string view, so you can filter or display
#                             "values": stringify_row(row),
#                             "row": row,  # full JSON row (handy for filtering)
#                             "table_name": csv_file.filename,
#                             "row_number": i,
#                         },
#                     )
#                 )

#         if points:
#             qdrant_client.upsert(collection_name=index_name, points=points)

#         return {"status": "success"}

#     except Exception as e:
#         print("ERROR in update_index", str(e))
#         return {"status": "fail", "message": str(e)}


# ---------- Delete collection ----------
async def delete_index(index_name: str) -> dict:
    try:
        if not qdrant_client.collection_exists(collection_name=index_name):
            return {"status": "fail", "message": "index does not exist"}

        qdrant_client.delete_collection(collection_name=index_name)
        return {"status": "success"}

    except Exception as e:
        return {"status": "fail", "message": str(e)}


# import time
# import pandas as pd
# from fastapi import UploadFile
# from qdrant_client import models
# from elasticsearch import helpers
# from core import es_client, qdrant_client, sentence_model


# async def get_indexes() -> dict:
#     es_index_names = []
#     qdrant_index_names = []
#     try:
#         es_indices_response = es_client.cat.indices(format="json")
#         es_index_names.extend(
#             [
#                 index["index"]
#                 for index in es_indices_response
#                 if not index["index"].startswith(".")
#             ]
#         )
#         qdrant_indices_response = qdrant_client.get_collections()
#         qdrant_index_names.extend(
#             [collection.name for collection in qdrant_indices_response.collections]
#         )

#     except Exception as e:
#         return {"status": "fail", "message": str(e)}

#     index_names = list(set(es_index_names) & set(qdrant_index_names))
#     return {"status": "success", "indexes": index_names}


# async def create_index(index_name: str) -> dict:
#     if es_client.indices.exists(index=index_name) or qdrant_client.collection_exists(
#         collection_name=index_name
#     ):
#         return {"status": "fail", "message": "index already exists"}

#     try:
#         es_client.create(
#             id=index_name,
#             index=index_name,
#             body={
#                 "mappings": {
#                     "properties": {
#                         "values": {"type": "text"},
#                         "table_name": {"type": "text"},
#                         "row_number": {"type": "integer"},
#                     }
#                 },
#             },
#         )

#         qdrant_client.recreate_collection(
#             collection_name=index_name,
#             vectors_config=models.VectorParams(
#                 size=sentence_model.get_sentence_embedding_dimension(),
#                 distance=models.Distance.COSINE,
#             ),
#         )

#     except Exception as e:
#         print("ERROR in create_index", e)
#         return {"status": "fail", "message": str(e)}

#     return {"status": "success"}


# async def update_index(index_name: str, files: list[UploadFile]) -> dict:
#     if not (
#         es_client.indices.exists(index=index_name)
#         and qdrant_client.collection_exists(collection_name=index_name)
#     ):
#         return {"status": "fail", "message": "index does not exist"}

#     try:
#         points = []
#         actions = []
#         current_time = int(time.time() * 1e3)  # Get the timestamp once

#         for csv_file in files:
#             df = pd.read_csv(csv_file.file)
#             row_jsons = df.apply(lambda row: row.to_json(), axis=1)

#             embeddings = [
#                 sentence_model.encode(row_str).tolist() for row_str in row_jsons
#             ]

#             points.extend(
#                 models.PointStruct(
#                     id=current_time + i,  # Use incremental IDs to avoid collisions
#                     vector=embedding,
#                     payload={
#                         "values": row_json,
#                         "table_name": csv_file.filename,
#                         "row_number": i,
#                     },
#                 )
#                 for i, (row_json, embedding) in enumerate(zip(row_jsons, embeddings))
#             )

#             for i, row_json in enumerate(row_jsons):

#                 row_json_as_dict = eval(
#                     row_json.replace("null", "None")
#                     .replace("true", "True")
#                     .replace("false", "False")
#                 )

#                 stringified_row_json = ""
#                 for key, value in row_json_as_dict.items():
#                     stringified_row_json += str(key) + " : " + str(value) + " , "

#                 actions.append(
#                     {
#                         "_op_type": "index",
#                         "_index": index_name,
#                         "_source": {
#                             "values": stringified_row_json,
#                             "table_name": csv_file.filename,
#                             "row_number": i,
#                         },
#                     }
#                 )

#         # Perform bulk operations
#         helpers.bulk(es_client, actions)
#         qdrant_client.upsert(collection_name=index_name, points=points)

#     except Exception as e:
#         print("ERROR in update_index", str(e))
#         return {"status": "fail", "message": str(e)}

#     return {"status": "success"}


# async def delete_index(index_name: str) -> dict:
#     if not (
#         es_client.indices.exists(index=index_name)
#         and qdrant_client.collection_exists(collection_name=index_name)
#     ):
#         return {"status": "fail", "message": "index does not exist"}

#     try:
#         es_client.indices.delete(index=index_name)
#         qdrant_client.delete_collection(collection_name=index_name)

#     except Exception as e:
#         return {"status": "fail", "message": str(e)}

#     return {"status": "success"}
