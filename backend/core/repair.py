from typing import Optional
from core.search import search_data
from core.llm import prompt_with_data, call_llm
import json


def format_evidence(source_info: dict) -> str:
    """
    Format evidence information from a single source.
    
    Args:
        source_info: {"value": str, "score": float, "table": str}
    
    Returns:
        Formatted evidence string
    """
    return f"Value: {source_info['value']}, Score: {source_info['score']:.3f}, Source: {source_info['table']}"


def mediate_conflict_with_llm(sources_info: dict, dirty_value: str = None) -> dict:
    """
    Use LLM to mediate and reconcile conflicts.
    
    Args:
        sources_info: {source_type: {"value": str, "score": float, "table": str}}
        dirty_value: Original dirty value (optional)
    
    Returns:
        {
            "mode": "aligned" | "conflict",
            "decision": str,  # Suggested value or conflict summary
            "reasoning": str,  # LLM reasoning process
            "severity": "high" | "medium" | "low" | "none",
            "sources": sources_info
        }
    """
    if len(sources_info) <= 1:
        # Only one source, return directly
        source = list(sources_info.values())[0] if sources_info else {}
        return {
            "mode": "aligned",
            "decision": source.get("value", ""),
            "reasoning": "Single source, no conflict",
            "severity": "none",
            "sources": sources_info
        }
    
    # Format evidence from multiple sources
    evidence_parts = []
    for source_type, info in sources_info.items():
        evidence_parts.append(f"- {source_type.upper()}: {format_evidence(info)}")
    
    evidence_context = "\n".join(evidence_parts)
    dirty_context = f"Original dirty value: {dirty_value}" if dirty_value else ""
    
    # Build mediation prompt
    mediation_prompt = f"""You are a data cleaning mediator. Analyze these different repair suggestions from multiple sources and determine if they are aligned or conflicting.

{evidence_context}
{dirty_context}

Analyze:
1. Are the suggested values semantically equivalent or referring to the same thing?
2. Consider:
   - Exact matches
   - Semantic similarity (e.g., "John" vs "Jon", different date formats)
   - Data quality indicators (trust scores)
   - Source reliability (History Log vs Domain KB)

3. If there is a CONFLICT:
   - Identify which source is more likely correct based on scores and plausibility
   - Explain why the conflicting value might be an outlier or error
   - Provide a practical suggestion for the user

Provide your response in JSON format:
{{
    "mode": "aligned" or "conflict",
    "decision": "the suggested value" or "detailed conflict summary",
    "reasoning": "For conflicts: explain if this might be an outlier/error, which value is more plausible and why. For aligned: brief confirmation.",
    "confidence": 0.0 to 1.0
}}

Only respond with valid JSON, no additional text."""

    try:
        # Call LLM
        response_text = call_llm(mediation_prompt)
        
        # Parse JSON response
        response_data = json.loads(response_text)
        
        # Extract results
        mode = response_data.get("mode", "conflict")
        decision = response_data.get("decision", "")
        reasoning = response_data.get("reasoning", "")
        confidence = response_data.get("confidence", 0.5)
        
        # Calculate severity based on confidence and mode
        if mode == "aligned":
            severity = "none"
        else:
            # Conflict mode: calculate severity based on score difference
            scores = [info["score"] for info in sources_info.values()]
            score_diff = max(scores) - min(scores) if scores else 0
            
            if score_diff > 0.5:
                severity = "high"
            elif score_diff > 0.2:
                severity = "medium"
            else:
                severity = "low"
        
        return {
            "mode": mode,
            "decision": decision,
            "reasoning": reasoning,
            "severity": severity,
            "confidence": confidence,
            "sources": sources_info
        }
    
    except json.JSONDecodeError:
        # LLM returned invalid JSON, fall back to simple logic
        return _fallback_conflict_analysis(sources_info)
    except Exception as e:
        print(f"LLM mediation error: {e}, falling back to simple analysis")
        return _fallback_conflict_analysis(sources_info)


def _fallback_conflict_analysis(sources_info: dict) -> dict:
    """
    Simple conflict analysis (fallback when LLM is unavailable).
    """
    source_values = {source: info["value"] for source, info in sources_info.items()}
    unique_values = set(source_values.values())
    
    if len(unique_values) == 1:
        # All sources agree
        summary = "All sources agree"
        mode = "aligned"
        severity = "none"
    else:
        # Conflict exists
        mode = "conflict"
        summary_parts = []
        for source, info in sources_info.items():
            summary_parts.append(f"{source} → {info['value']} ({info['score']:.3f})")
        summary = " | ".join(summary_parts)
        
        # Calculate severity
        scores = [info["score"] for info in sources_info.values()]
        score_diff = max(scores) - min(scores) if scores else 0
        
        if score_diff > 0.5:
            severity = "high"
        elif score_diff > 0.2:
            severity = "medium"
        else:
            severity = "low"
    
    return {
        "mode": mode,
        "decision": next(iter(source_values.values())) if mode == "aligned" else summary,
        "reasoning": "Fallback simple analysis",
        "severity": severity,
        "confidence": 0.5,
        "sources": sources_info
    }



def analyze_conflict(retrieved_list: list, dirty_value: str = None) -> dict:
    """
    Use LLM mediation to analyze if suggestions from different indices have conflicts.
    
    Args:
        retrieved_list: List of retrieval results
        dirty_value: Original dirty value (optional, for context)
    
    Returns:
        {
            "has_conflict": bool,
            "mode": "aligned" | "conflict",
            "summary": str,  # Decision or conflict summary
            "sources": {source_name: {"value": str, "score": float}},
            "severity": "high" | "medium" | "low" | "none",
            "reasoning": str,  # LLM reasoning process
            "confidence": float
        }
    """
    if not retrieved_list or len(retrieved_list) == 0:
        return {
            "has_conflict": False,
            "mode": "aligned",
            "summary": "No evidence available",
            "sources": {},
            "severity": "none",
            "reasoning": "No retrieval results",
            "confidence": 1.0
        }
    
    # Parse suggestions from different sources
    sources_info = {}
    
    for idx, retrieval in enumerate(retrieved_list):
        if idx >= len(retrieval) or len(retrieval) == 0:
            continue
            
        first_result = retrieval[0]
        values_str = first_result.get("values", "")
        tables_str = first_result.get("table_name", "")
        score_str = first_result.get("score", "")
        
        # Parse "value1 || value2" format
        if " || " in values_str:
            values_list = [v.strip() for v in values_str.split(" || ")]
            tables_list = [t.strip() for t in tables_str.split(" || ")] if tables_str else []
            scores_list = [float(s.strip()) for s in score_str.split(" || ") if s.strip()]
            
            # Assign information for each source
            for i, (value, table) in enumerate(zip(values_list, tables_list)):
                score = scores_list[i] if i < len(scores_list) else 0.0
                
                # Infer source type from table name
                if "history" in table.lower():
                    source_type = "history_log"
                elif "domain" in table.lower() or "kb" in table.lower():
                    source_type = "domain_kb"
                else:
                    source_type = table
                
                sources_info[source_type] = {
                    "value": value,
                    "score": score,
                    "table": table
                }
        else:
            # Single source
            if tables_str:
                if "history" in tables_str.lower():
                    source_type = "history_log"
                elif "domain" in tables_str.lower() or "kb" in tables_str.lower():
                    source_type = "domain_kb"
                else:
                    source_type = tables_str
                
                try:
                    score = float(score_str) if score_str else 0.0
                except:
                    score = 0.0
                
                sources_info[source_type] = {
                    "value": values_str,
                    "score": score,
                    "table": tables_str
                }
    
    # Call LLM mediation for conflict analysis
    mediation_result = mediate_conflict_with_llm(sources_info, dirty_value)
    
    return {
        "has_conflict": mediation_result["mode"] == "conflict",
        "mode": mediation_result["mode"],
        "summary": mediation_result["decision"],
        "sources": sources_info,
        "severity": mediation_result["severity"],
        "reasoning": mediation_result["reasoning"],
        "confidence": mediation_result["confidence"]
    }


async def repair_data(
    entity_description: str,
    target_name: str,
    target_data: list[dict],
    pivot_names: list[str],
    pivot_data: list[dict],
    reasoner_name: str,
    index_name: list[str],
    index_type: Optional[str],
) -> dict:

    retrieved_list = []
 
    if index_name is not None:
        if len(index_name) == 1:
            # Only one index → just use [0]
            search_results = await search_data(
                entity_description,
                index_name[0],
                index_type,
                target_name,
                target_data,
                pivot_names,
                pivot_data,
                False,
            )
            if search_results["status"] == "fail":
                return search_results
            retrieved_list = search_results["results"]

        else:
            # Multiple indices → accumulate results
            for idx_name in index_name:
                search_results = await search_data(
                    entity_description,
                    idx_name,
                    index_type,
                    target_name,
                    target_data,
                    pivot_names,
                    pivot_data,
                    False,
                )
                if search_results["status"] == "fail":
                    return search_results
                retrieved_list.extend(search_results["results"])

            # Merge results into retrieved_list itself
            if len(retrieved_list) > 1:
                half = len(retrieved_list) // 2
                first_half = retrieved_list[:half]
                second_half = retrieved_list[half:]

                retrieved_list = [
                    [
                        {
                            "values": f"{f[0]['values']} || {s[0]['values']}",
                            "table_name": f"{f[0]['table_name']} || {s[0]['table_name']}",
                            "score": f"{f[0]['score']} || {s[0]['score']}",
                        }
                    ]
                    for f, s in zip(first_half, second_half)
                ]

    # Call model with nearest tuples and target tuple
    prompt_results = await prompt_with_data(
        reasoner_name,
        entity_description,
        target_name,
        target_data,
        pivot_names,
        pivot_data,
        retrieved_list,
    )


    if prompt_results["status"] == "fail":
        return prompt_results
    else:
        results = prompt_results["results"]
    
    # Analyze conflict - using LLM mediation
    # Get a sample dirty value for LLM context
    sample_dirty_value = target_data[0] if target_data else None
    conflict_info = analyze_conflict(retrieved_list, sample_dirty_value)
    
    # Add conflict information to each result
    for i, result in enumerate(results):
        result["conflict"] = {
            "has_conflict": conflict_info["has_conflict"],
            "mode": conflict_info.get("mode", "aligned"),
            "summary": conflict_info["summary"],
            "severity": conflict_info["severity"],
            "sources": conflict_info.get("sources", {}),
            "reasoning": conflict_info.get("reasoning", ""),
            "confidence": conflict_info.get("confidence", 0.5)
        }
    
    # Return final results to frontend
    return {"status": "success", "results": results}
