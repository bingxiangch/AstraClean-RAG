import json

def search_preprocess(
    index_type, pivot_names, pivot_row_values, target_name, target_row_value
):
    if index_type == "semantic":
        search_query = {}
        for p, v in zip(pivot_names, pivot_row_values):
            search_query[p] = v
        search_query[target_name] = ""
        search = str(search_query)
    elif index_type == "syntactic":
        search_query = []
        for p, v in zip(pivot_names, pivot_row_values):
            search_query.append(p)
            search_query.append(v)
        search_query.append(target_name)
        search = " ".join(search_query)
    return search



def prompt_preprocess(description, target_name, target_row_value,
                      pivot_names, pivot_row_values, context):
    # """
    # Return a very simple prompt with 'value' and 'guidance'.
    # """
    # val = target_row_value.get("value") if isinstance(target_row_value, dict) else target_row_value
    # guidance = description or "Clean/transform the value appropriately."
    # return f'{{"value": "{val}", "guidance": "{guidance}"}}'


    """
    Build a minimal user prompt with only: context, value, guidance.
    - context: pass through as-is (list of dicts/strings). Keep it small.
    - value: raw cell value (stringified).
    - guidance: short, imperative rule.
    """
    val = target_row_value.get("value") if isinstance(target_row_value, dict) else target_row_value
    payload = {
        "value": "" if val is None else str(val),
        "guidance": description or "Clean or impute the value according to the rule.",
    }
    # simple + safe: keep only the 'values' strings, first 3
    if context:
        payload["context"] = [c["values"] for c in context if isinstance(c, dict) and "values" in c][:3]
    # if context:
    #     payload["context"] = context  # keep minimal; you control what you put here
        # payload["context"] = "dirty: 13 hrs and 8 min → clean: 788"
    return json.dumps(payload, ensure_ascii=False)