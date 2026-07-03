"""
Cliente TMDB API — búsqueda y obtención de datos de películas reales.
"""
import os
from typing import Optional
import requests

BASE_URL = "https://api.themoviedb.org/3"


def _api_key() -> str:
    return os.environ.get("TMDB_API_KEY", "")


def _get(endpoint: str, params: Optional[dict] = None) -> dict:
    if params is None:
        params = {}
    params["api_key"] = _api_key()
    if "language" not in params:
        params["language"] = "es-MX"
    resp = requests.get(f"{BASE_URL}{endpoint}", params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _poster_url(path: Optional[str]) -> str:
    """Construye URL de poster desde path de TMDB."""
    if not path:
        return ""
    return f"https://image.tmdb.org/t/p/w500{path}"


def search_movies(query: str, page: int = 1) -> list[dict]:
    """Buscar películas en TMDB. Retorna lista de dicts con datos básicos."""
    data = _get("/search/movie", {"query": query, "page": page})
    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item.get("id"),
            "title": item.get("title"),
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
            "poster_url": _poster_url(item.get("poster_path")),
            "overview": item.get("overview"),
        })
    return results


def get_movie_detail(tmdb_id: int) -> Optional[dict]:
    """Obtener detalle completo de una película por TMDB ID."""
    try:
        data = _get(f"/movie/{tmdb_id}")
    except requests.HTTPError:
        return None

    return {
        "tmdb_id": data.get("id"),
        "title": data.get("title"),
        "description": data.get("overview", ""),
        "poster_url": _poster_url(data.get("poster_path")),
        "duration_min": data.get("runtime") or 0,
        "genre": data["genres"][0]["name"] if data.get("genres") else "",
        "rating": data.get("vote_average", 0),
        "release_date": data.get("release_date"),
        "year": data.get("release_date", "")[:4] if data.get("release_date") else "",
    }


def get_now_playing(page: int = 1) -> list[dict]:
    """Obtener películas en cartelera (now_playing)."""
    data = _get("/movie/now_playing", {"page": page, "language": "es-MX"})
    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item.get("id"),
            "title": item.get("title"),
            "description": item.get("overview", ""),
            "poster_url": _poster_url(item.get("poster_path")),
            "duration_min": 0,  # now_playing no incluye runtime
            "genre": "",
            "rating": item.get("vote_average", 0),
            "release_date": item.get("release_date"),
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
        })
    return results


def get_popular(page: int = 1) -> list[dict]:
    """Obtener películas populares."""
    data = _get("/movie/popular", {"page": page, "language": "es-MX"})
    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item.get("id"),
            "title": item.get("title"),
            "description": item.get("overview", ""),
            "poster_url": _poster_url(item.get("poster_path")),
            "duration_min": 0,
            "genre": "",
            "rating": item.get("vote_average", 0),
            "release_date": item.get("release_date"),
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
        })
    return results
