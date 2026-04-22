import pandas as pd
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from core.llm import call_llm

router = APIRouter()

@router.post("/domain_kb/generate_column_rules")
def generate_column_rules(
    file: UploadFile = File(...),
    table: str = Form(...),
    columns: str = Form(...),  # Comma-separated column names
    n_rows: int = Form(100)
):
    """
    Upload a clean CSV file and selected columns, sample 100 rows, automatically generate domain rules for each column, return in JSONL format.
    """
    try:
        df = pd.read_csv(file.file)
        col_list = [c.strip() for c in columns.split(",") if c.strip() in df.columns]
        sample = df[col_list].dropna().head(n_rows)
        rules = []
        for idx, col in enumerate(col_list, 1):
            values = sample[col].tolist()
            prompt = (
                f"Analyze the following sample values for the column '{col}' in the '{table}' table. "
                f"Based on these examples, write a single, concise English rule sentence for data cleaning and normalization of this column. "
                f"The rule should describe value format, units, valid ranges, canonical representation, and any domain-specific constraints. "
                f"Do NOT output a value or example, only output a rule sentence in English for data cleaning. Values: {values}"
            )
              # For debugging
            rule = call_llm(prompt)
            rules.append({
                "id": str(idx),
                "table": table,
                "column": col,
                "domain_rule": rule
            })
        # Return JSONL string
        jsonl = "\n".join([json.dumps(r, ensure_ascii=False) for r in rules])
        return {"jsonl": jsonl, "rules": rules}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
