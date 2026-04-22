from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Any
import pandas as pd
import io
from core.domain_kb.construct import stratified_sample, generate_rules_with_llm, save_rules, load_rules
from core.llm import call_llm  # Assume a unified LLM calling interface is available
import os

router = APIRouter()

@router.post("/domain_kb/sample")
def sample_data(
    file: UploadFile = File(...),
    frac: float = Form(0.1),
    min_rows: int = Form(100),
    stratify_cols: str = Form(None)
):
    """
    Upload a clean data file and return stratified sampling results (frontend preview).
    """
    try:
        df = pd.read_csv(file.file)
        cols = stratify_cols.split(',') if stratify_cols else None
        sample = stratified_sample(df, frac=frac, min_rows=min_rows, stratify_cols=cols)
        return {"columns": sample.columns.tolist(), "rows": sample.head(100).to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/domain_kb/generate_rules")
def generate_rules(
    file: UploadFile = File(...)
):
    """
    Input CSV file and directly generate rules.
    """
    try:
        df = pd.read_csv(file.file)
        # Extract table name from filename (remove .csv extension)
        table_name = file.filename.replace('.csv', '').replace('.CSV', '')
        rules = generate_rules_with_llm(df, call_llm, table=table_name)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/domain_kb/save_rules")
def save_rules_api(
    rules: str = Form(...),
    dataset: str = Form(...)
):
    """
    Save reviewed rules in JSONL format.
    """
    try:
        import json
        # Parse rules from JSON string
        rules_list = json.loads(rules)
        if not isinstance(rules_list, list):
            raise ValueError("Rules must be an array")
        
        path = f"testdata/knowledge_base/domain_kb_{dataset}.jsonl"
        save_rules(rules_list, path)
        return {"status": "ok", "path": path, "count": len(rules_list)}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for rules")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/domain_kb/get_rules")
def get_rules(dataset: str):
    """
    Get saved rules.
    """
    try:
        path = f"testdata/knowledge_base/domain_kb_{dataset}.jsonl"
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Rules not found")
        rules = load_rules(path)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
