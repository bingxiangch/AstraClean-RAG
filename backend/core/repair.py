from typing import Optional
from core.search import search_data
from core.llm import prompt_with_data


async def repair_data(
    entity_description: str,
    target_name: str,
    target_data: list[dict],
    pivot_names: list[str],
    pivot_data: list[dict],
    reasoner_name: str,
    index_name: list[str],
    index_type: Optional[str],
    reranker_type: Optional[str],
) -> dict:

    retrieved_list = []
 
    if index_name is not None:
        if len(index_name) == 1:
            # only one index → just use [0]
            search_results = await search_data(
                entity_description,
                index_name[0],
                index_type,
                target_name,
                target_data,
                pivot_names,
                pivot_data,
                reranker_type is not None,
            )
            if search_results["status"] == "fail":
                return search_results
            retrieved_list = search_results["results"]

        else:
            # multiple indices → accumulate results
            for idx_name in index_name:
                search_results = await search_data(
                    entity_description,
                    idx_name,
                    index_type,
                    target_name,
                    target_data,
                    pivot_names,
                    pivot_data,
                    reranker_type is not None,
                )
                if search_results["status"] == "fail":
                    return search_results
                retrieved_list.extend(search_results["results"])

            # merge results into retrieved_list itself
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

    # print("search_result: ", search_results)
    # Call model giving it nearest tuples and target tuple
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
    print("results: ", results)
    # Return final results to frontend
    # print("*"*50)
    # print("FINAL RETURNED RESULTS: ", results)
    return {"status": "success", "results": results}
