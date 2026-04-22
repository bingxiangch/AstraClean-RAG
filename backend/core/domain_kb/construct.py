import pandas as pd
import numpy as np
from typing import List, Dict, Any
import random

# Step 1: Stratified Sampling
def stratified_sample(df: pd.DataFrame, frac: float = 0.1, min_rows: int = 100, stratify_cols: List[str] = None) -> pd.DataFrame:
    """
    Perform stratified sampling on the dataframe.
    Args:
        df: Clean dataframe.
        frac: Fraction to sample (default 0.1).
        min_rows: Minimum number of rows (default 100).
        stratify_cols: Columns to stratify on (categorical columns by default).
    Returns:
        Sampled dataframe.
    """
    if stratify_cols is None:
        # Auto-detect categorical columns for stratification
        stratify_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        if not stratify_cols:
            # If no categorical columns, fallback to random sample
            n = max(int(len(df) * frac), min_rows)
            return df.sample(n=n, random_state=42)
    # Use pandas groupby sample
    grouped = df.groupby(stratify_cols, group_keys=False)
    n = max(int(len(df) * frac), min_rows)
    sampled = grouped.apply(lambda x: x.sample(max(1, int(np.ceil(len(x) * frac))), random_state=42))
    if len(sampled) < min_rows:
        # If not enough, upsample randomly
        sampled = pd.concat([sampled, df.drop(sampled.index).sample(n=min_rows-len(sampled), random_state=42)])
    return sampled.head(n)

# Step 2: LLM-driven Rule Generation
def generate_rules_with_llm(sample: pd.DataFrame, llm_func, table: str = "data") -> List[Dict[str, Any]]:
    """
    Use LLM to generate rules for each column.
    Args:
        sample: Sampled dataframe.
        llm_func: Function to call LLM, should accept prompt and return result.
        table: Table name for the rules.
    Returns:
        List of rule dicts with format: {"id", "table", "column", "domain_rule"}
    """
    rules = []
    rule_id = 1
    for col in sample.columns:
        prompt = f"Analyze the following values for column '{col}' and generate a concise domain rule for format, units, valid ranges, canonical forms, and domain constraints. Values: {sample[col].dropna().head(10).tolist()}"
        try:
            domain_rule = llm_func(prompt)
        except:
            domain_rule = f"Column '{col}' requires valid data in appropriate format"
        
        rules.append({
            "id": str(rule_id),
            "table": table,
            "column": col,
            "domain_rule": domain_rule
        })
        rule_id += 1
    return rules

# Step 3: Human Review is handled via API/frontend, not in backend logic

# Utility: Save rules to JSONL file
def save_rules(rules: List[Dict[str, Any]], path: str):
    """
    Save rules as JSONL format (each line is a JSON object).
    Args:
        rules: List of rule dictionaries
        path: File path to save (should end with .jsonl)
    """
    import json
    # Create directory if not exists
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, 'w') as f:
        for rule in rules:
            f.write(json.dumps(rule, ensure_ascii=False) + '\n')

# Utility: Load rules from JSONL file
def load_rules(path: str) -> List[Dict[str, Any]]:
    """
    Load rules from JSONL format file.
    Args:
        path: File path to load from (should end with .jsonl)
    Returns:
        List of rule dictionaries
    """
    import json
    rules = []
    with open(path, 'r') as f:
        for line in f:
            if line.strip():
                rules.append(json.loads(line))
    return rules
