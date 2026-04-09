from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.index import router as index_router
from api.repair import router as repair_router
from api.model import router as models_router
from api.domain_kb import router as domain_kb_router
from api.domain_kb_column import router as domain_kb_column_router
import uvicorn
import core

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(index_router, prefix="/index", tags=["Index"])
app.include_router(repair_router, prefix="/repair", tags=["Repair"])
app.include_router(models_router, prefix="/model", tags=["Model"])
app.include_router(domain_kb_router, prefix="/domain_kb", tags=["DomainKB"])
app.include_router(domain_kb_column_router, prefix="/domain_kb_column", tags=["DomainKB-Column"])


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
