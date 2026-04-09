from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Any
import pandas as pd
import io
from core.domain_kb.construct import stratified_sample, generate_rules_with_llm, save_rules, load_rules
from core.llm import call_llm  # 假设已有统一的LLM调用接口
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
    上传干净数据文件，返回分层采样结果（前端可预览）。
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
    sample: List[Dict[str, Any]]
):
    """
    输入采样数据，调用LLM生成规则。
    """
    try:
        df = pd.DataFrame(sample)
        rules = generate_rules_with_llm(df, call_llm)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/domain_kb/save_rules")
def save_rules_api(
    rules: Dict[str, Any],
    dataset: str = Form(...)
):
    """
    保存审核通过的规则。
    """
    try:
        path = f"testdata/knowledge_base/domain_kb_{dataset}.jsonl"
        save_rules(rules, path)
        return {"status": "ok", "path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/domain_kb/get_rules")
def get_rules(dataset: str):
    """
    获取已保存的规则。
    """
    try:
        path = f"testdata/knowledge_base/domain_kb_{dataset}.jsonl"
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Rules not found")
        rules = load_rules(path)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
