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

# Step 2: LLM-driven Rule Generation (stub)
def generate_rules_with_llm(sample: pd.DataFrame, llm_func) -> Dict[str, Any]:
    """
    Use LLM to generate rules for each column.
    Args:
        sample: Sampled dataframe.
        llm_func: Function to call LLM, should accept prompt and return result.
    Returns:
        Dict of column: rules.
    """
    rules = {}
    for col in sample.columns:
        prompt = f"Analyze the following values for column '{col}' and generate rules for format, units, valid ranges, canonical forms, and domain constraints. Values: {sample[col].dropna().tolist()}"
        rules[col] = llm_func(prompt)
    return rules

# Step 3: Human Review is handled via API/frontend, not in backend logic

# Utility: Save rules to file
def save_rules(rules: Dict[str, Any], path: str):
    import json
    with open(path, 'w') as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

# Utility: Load rules from file
def load_rules(path: str) -> Dict[str, Any]:
    import json
    with open(path, 'r') as f:
        return json.load(f)
