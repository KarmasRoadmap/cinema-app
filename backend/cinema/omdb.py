"""
Cliente OMDb API — búsqueda y obtención de datos de películas reales.
"""
import os
import re
from datetime import datetime
from typing import Optional
import requests

OMDB_BASE = "https://www.omdbapi.com/"

POPULAR_MOVIES = [
    "tt0816692",  # Interstellar
    "tt1375666",  # Inception
    "tt0068646",  # The Godfather
    "tt0111161",  # Shawshank Redemption
    "tt0133093",  # The Matrix
    "tt0468569",  # The Dark Knight
    "tt0167260",  # Return of the King
    "tt0120737",  # Fellowship of the Ring
    "tt0137523",  # Fight Club
    "tt0109830",  # Forrest Gump
    "tt0110912",  # Pulp Fiction
    "tt0080684",  # Empire Strikes Back
]


def _api_key() -> str:
    return os.environ.get("OMDB_API_KEY", "")


def _get(params: dict) -> dict:
    params["apikey"] = _api_key()
    resp = requests.get(OMDB_BASE, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _parse_runtime(runtime_str: str) -> int:
    """'148 min' → 148"""
    match = re.search(r"(\d+)", runtime_str)
    return int(match.group(1)) if match else 0


def _parse_date(date_str: str) -> Optional[str]:
    """'21 Jun 2014' → '2014-06-21'"""
    try:
        return datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def search_omdb(query: str, page: int = 1) -> list[dict]:
    """Buscar películas en OMDb. Retorna lista de dicts con datos básicos."""
    data = _get({"s": query, "page": page, "type": "movie"})
    results = []
    if data.get("Response") == "True":
        for item in data.get("Search", []):
            results.append({
                "imdb_id": item.get("imdbID"),
                "title": item.get("Title"),
                "year": item.get("Year"),
                "poster_url": item.get("Poster") if item.get("Poster") != "N/A" else "",
                "type": item.get("Type"),
            })
    return results


def get_by_imdb_id(imdb_id: str) -> Optional[dict]:
    """Obtener detalle completo de una película por IMDb ID."""
    data = _get({"i": imdb_id, "plot": "full"})
    if data.get("Response") != "True":
        return None

    return {
        "imdb_id": data.get("imdbID"),
        "title": data.get("Title"),
        "description": data.get("Plot"),
        "poster_url": data.get("Poster") if data.get("Poster") != "N/A" else "",
        "duration_min": _parse_runtime(data.get("Runtime", "0")),
        "genre": data.get("Genre", "").split(",")[0].strip(),
        "rating": float(data.get("imdbRating", 0) or 0),
        "release_date": _parse_date(data.get("Released", "")),
        "director": data.get("Director"),
        "year": data.get("Year"),
    }


def get_popular_movies() -> list[dict]:
    """Obtener películas populares por IMDb ID."""
    movies = []
    for imdb_id in POPULAR_MOVIES:
        movie = get_by_imdb_id(imdb_id)
        if movie:
            movies.append(movie)
    return movies
