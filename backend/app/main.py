from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import data_store
from app.routers import actors, export, graph, infra, posts, search

app = FastAPI(title="Rynex API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(actors.router)
app.include_router(search.router)
app.include_router(graph.router)
app.include_router(posts.router)
app.include_router(infra.router)
app.include_router(export.router)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "actors_loaded": len(data_store.get_all_actors()),
    }
