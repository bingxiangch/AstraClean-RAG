from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from core.index import get_indexes, create_index, update_index, delete_index, upsert_rows, UpsertRequest

router = APIRouter()


@router.get("/")
async def get_indexes_endpoint():
    response = await get_indexes()
    if response["status"] == "fail":
        raise HTTPException(status_code=400, detail=response["message"])
    return response


@router.post("/")
async def create_index_endpoint(
    index_name=Form(...), files: list[UploadFile] = File(...)
):
    response = await create_index(index_name)
    if response["status"] == "fail":
        raise HTTPException(status_code=400, detail=response["message"])
    response = await update_index(index_name, files)
    if response["status"] == "fail":
        raise HTTPException(status_code=400, detail=response["message"])
    return response


@router.put("/")
async def update_index_endpoint(
    index_name=Form(...), files: list[UploadFile] = File(...)
):
    response = await update_index(index_name, files)
    if response["status"] == "fail":
        raise HTTPException(status_code=400, detail=response["message"])
    return response


@router.delete("/{index_name}")
async def delete_index_endpoint(index_name: str):
    response = await delete_index(index_name)
    if response["status"] == "fail":
        raise HTTPException(status_code=400, detail=response["message"])
    return response

# NEW ENDPOINT for direct JSON rows
@router.post("/upsert_rows")
async def upsert_rows_endpoint(req: UpsertRequest):
    try:
        response = await upsert_rows(req)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))