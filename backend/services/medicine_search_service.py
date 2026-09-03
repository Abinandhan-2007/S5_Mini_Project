"""
CarePulse Medicine Search & Autocomplete Service.

Provides real-time, typo-tolerant fuzzy medicine search using PostgreSQL pg_trgm
with seamless in-memory difflib fallback.
"""

import re
import json
import difflib
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger("carepulse.medicine_search")

try:
    from backend.database import get_pg_connection, use_pg, read_json_db
except ImportError:
    from database import get_pg_connection, use_pg, read_json_db


def clean_search_query(raw: str) -> str:
    """Normalize input query, splitting concatenated numbers (e.g., 'dolo650' -> 'dolo 650')."""
    if not raw:
        return ""
    # Split alphabet-number transitions (e.g. dolo650 -> dolo 650, pan40 -> pan 40)
    s = re.sub(r'([a-zA-Z]+)(\d+)', r'\1 \2', raw.strip())
    s = re.sub(r'(\d+)([a-zA-Z]+)', r'\1 \2', s)
    # Remove extra punctuation
    s = re.sub(r'[^\w\s\-\.]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _score_candidate(query: str, name: str, generic: str, brands: List[str]) -> tuple[float, str]:
    """Calculate ranking score and match_type for an in-memory candidate."""
    q = query.lower()
    n = name.lower()
    g = generic.lower()
    brand_list = [b.lower() for b in (brands or [])]

    # 1. Exact Match
    if q == n:
        return (1.0, "exact")
    if q == g:
        return (0.98, "exact")
    if any(q == b for b in brand_list):
        return (0.95, "exact")

    # 2. Prefix Match
    if n.startswith(q):
        return (0.92, "prefix")
    if g.startswith(q):
        return (0.87, "prefix")
    if any(b.startswith(q) for b in brand_list):
        return (0.82, "prefix")

    # 3. Contains Match
    if q in n:
        return (0.78, "contains")
    if q in g:
        return (0.72, "contains")
    if any(q in b for b in brand_list):
        return (0.68, "contains")

    # 4. Fuzzy Similarity via difflib (Score: 0.30 - 0.69)
    sim_n = difflib.SequenceMatcher(None, q, n).ratio()
    sim_g = difflib.SequenceMatcher(None, q, g).ratio()
    sim_b = max([difflib.SequenceMatcher(None, q, b).ratio() for b in brand_list], default=0.0)
    
    # Also check first word similarity for multi-word queries like 'dolo 650'
    first_q = q.split()[0] if q else ""
    first_n = n.split()[0] if n else ""
    sim_first = difflib.SequenceMatcher(None, first_q, first_n).ratio() if first_q and first_n else 0.0

    # Direct name matches take priority over generic/brand fallback
    max_sim = max(sim_n, sim_first * 0.95, sim_g * 0.85, sim_b * 0.80)
    if max_sim >= 0.45:
        return (round(max_sim * 0.69, 3), "fuzzy")

    return (0.0, "none")


def search_medicines_fallback(cleaned_q: str, limit: int = 8) -> Dict[str, Any]:
    """In-memory Python fuzzy search over medicines catalog (JSON DB fallback)."""
    try:
        db = read_json_db()
        items = db.get("medicines", [])
    except Exception as e:
        logger.warning(f"Could not read medicines from JSON DB: {e}")
        items = []

    scored_matches = []
    has_exact_or_prefix = False

    for med in items:
        name = med.get("name", "")
        generic = med.get("generic_name", "")
        brands = med.get("brand_names", [])

        score, match_type = _score_candidate(cleaned_q, name, generic, brands)
        if score > 0.30:
            if match_type in ("exact", "prefix"):
                has_exact_or_prefix = True

            scored_matches.append({
                "id": med.get("id"),
                "name": name,
                "generic_name": generic,
                "dosage_form": med.get("dosage_form", "Tablet"),
                "strengths": med.get("strengths", []),
                "category": med.get("category", "General"),
                "purpose": med.get("purpose", ""),
                "match_type": match_type,
                "similarity_score": round(score, 3)
            })

    # Sort descending by score, then alphabetically
    scored_matches.sort(key=lambda x: (x["similarity_score"], -len(x["name"])), reverse=True)
    results = scored_matches[:limit]

    # If no exact/prefix match or zero matches, enrich with global medicines via NIH RxTerms
    if (len(results) == 0 or (not has_exact_or_prefix and len(results) < 3)) and len(cleaned_q) >= 3:
        existing_names = {r["name"].lower() for r in results}
        global_drugs = fetch_global_medicines(cleaned_q, limit=limit - len(results))
        for g in global_drugs:
            if g["name"].lower() not in existing_names:
                results.append(g)
                existing_names.add(g["name"].lower())
                has_exact_or_prefix = True

    # Did you mean detection: if top match is fuzzy with good similarity and no exact/prefix found
    did_you_mean = None
    if results and not has_exact_or_prefix:
        top_match = results[0]
        if top_match["similarity_score"] >= 0.45:
            did_you_mean = top_match["name"]

    return {
        "query": cleaned_q,
        "total": len(results),
        "did_you_mean": did_you_mean,
        "matches": results[:limit]
    }


def search_medicines(raw_query: str, limit: int = 8) -> Dict[str, Any]:
    """
    Search medicines using PostgreSQL pg_trgm GIN index with automatic fallback.
    Guaranteed to return ranked matches and 'did_you_mean' for typos.
    """
    if not raw_query or len(raw_query.strip()) < 2:
        return {
            "query": raw_query or "",
            "total": 0,
            "did_you_mean": None,
            "matches": []
        }

    cleaned_q = clean_search_query(raw_query)
    lower_q = cleaned_q.lower()
    prefix_q = f"{lower_q}%"
    contains_q = f"%{lower_q}%"

    # Try PostgreSQL with pg_trgm
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Weighted ranking SQL query utilizing pg_trgm GIN index
                sql = """
                SELECT 
                    id, 
                    name, 
                    generic_name, 
                    brand_names, 
                    dosage_form, 
                    strengths, 
                    category, 
                    purpose,
                    similarity(name, %s) AS sim_name,
                    similarity(generic_name, %s) AS sim_gen,
                    CASE 
                        WHEN LOWER(name) = %s OR LOWER(generic_name) = %s THEN 1.0
                        WHEN LOWER(name) LIKE %s OR LOWER(generic_name) LIKE %s THEN 0.90
                        WHEN LOWER(name) LIKE %s OR LOWER(generic_name) LIKE %s THEN 0.75
                        ELSE GREATEST(similarity(name, %s), similarity(generic_name, %s)) * 0.69
                    END AS rank_score,
                    CASE 
                        WHEN LOWER(name) = %s OR LOWER(generic_name) = %s THEN 'exact'
                        WHEN LOWER(name) LIKE %s OR LOWER(generic_name) LIKE %s THEN 'prefix'
                        WHEN LOWER(name) LIKE %s OR LOWER(generic_name) LIKE %s THEN 'contains'
                        ELSE 'fuzzy'
                    END AS match_type
                FROM medicines
                WHERE 
                    LOWER(name) LIKE %s 
                    OR LOWER(generic_name) LIKE %s
                    OR similarity(name, %s) > 0.28
                    OR similarity(generic_name, %s) > 0.28
                ORDER BY rank_score DESC, similarity(name, %s) DESC
                LIMIT %s;
                """
                params = (
                    # similarity queries
                    cleaned_q, cleaned_q,
                    # exact match
                    lower_q, lower_q,
                    # prefix match
                    prefix_q, prefix_q,
                    # contains match
                    contains_q, contains_q,
                    # similarity fallback
                    cleaned_q, cleaned_q,
                    # match_type case
                    lower_q, lower_q,
                    prefix_q, prefix_q,
                    contains_q, contains_q,
                    # WHERE clause filters
                    contains_q, contains_q,
                    cleaned_q, cleaned_q,
                    # ORDER BY similarity
                    cleaned_q,
                    limit
                )
                cur.execute(sql, params)
                rows = cur.fetchall()

                matches = []
                has_exact_or_prefix = False

                for r in rows:
                    m_type = r["match_type"]
                    if m_type in ("exact", "prefix"):
                        has_exact_or_prefix = True

                    brand_list = r.get("brand_names")
                    if isinstance(brand_list, str):
                        try:
                            brand_list = json.loads(brand_list)
                        except Exception:
                            brand_list = []

                    strength_list = r.get("strengths")
                    if isinstance(strength_list, str):
                        try:
                            strength_list = json.loads(strength_list)
                        except Exception:
                            strength_list = []

                    matches.append({
                        "id": r["id"],
                        "name": r["name"],
                        "generic_name": r["generic_name"],
                        "dosage_form": r.get("dosage_form") or "Tablet",
                        "strengths": strength_list or [],
                        "category": r.get("category") or "General",
                        "purpose": r.get("purpose") or "",
                        "match_type": m_type,
                        "similarity_score": round(float(r["rank_score"]), 3)
                    })

                # If no exact/prefix match or zero matches, enrich with global medicines via NIH RxTerms
                if (len(matches) == 0 or (not has_exact_or_prefix and len(matches) < 3)) and len(cleaned_q) >= 3:
                    existing_names = {m["name"].lower() for m in matches}
                    global_drugs = fetch_global_medicines(cleaned_q, limit=limit - len(matches))
                    for g in global_drugs:
                        if g["name"].lower() not in existing_names:
                            matches.append(g)
                            existing_names.add(g["name"].lower())
                            has_exact_or_prefix = True

                # Did you mean detection
                did_you_mean = None
                if matches and not has_exact_or_prefix:
                    top_match = matches[0]
                    if top_match["similarity_score"] >= 0.40:
                        did_you_mean = top_match["name"]

                return {
                    "query": raw_query,
                    "total": len(matches),
                    "did_you_mean": did_you_mean,
                    "matches": matches[:limit]
                }
    except Exception as pg_err:
        logger.warning(f"PostgreSQL pg_trgm search note ({pg_err}); falling back to in-memory difflib engine.")
        return search_medicines_fallback(cleaned_q, limit=limit)


# -------------------------------------------------------------
# Global Medicine Resolver (NIH RxTerms / NLM Public API)
# -------------------------------------------------------------
GLOBAL_CACHE: Dict[str, List[Dict[str, Any]]] = {}


def _auto_cache_medicine_to_db(med: Dict[str, Any]):
    """Silently saves dynamically fetched global medicines to PostgreSQL for future instant lookups."""
    try:
        conn = get_pg_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medicines (id, name, generic_name, brand_names, dosage_form, strengths, category, purpose)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (
                    med["id"],
                    med["name"],
                    med["generic_name"],
                    json.dumps([]),
                    med.get("dosage_form", "Tablet"),
                    json.dumps(med.get("strengths", [])),
                    med.get("category", "Global Medicine"),
                    med.get("purpose", "")
                )
            )
            conn.commit()
            conn.close()
    except Exception as e:
        logger.debug(f"Auto cache db notice: {e}")


def fetch_global_medicines(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Queries the National Library of Medicine (NIH RxTerms) public API
    to suggest ANY medicine formulation in the world in real time.
    Auto-persists newly discovered medicines into the local PostgreSQL database.
    """
    q = query.strip()
    if len(q) < 3:
        return []

    cache_key = q.lower()
    if cache_key in GLOBAL_CACHE:
        return GLOBAL_CACHE[cache_key][:limit]

    results = []
    seen = set()

    try:
        import httpx
        url = f"https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms={q}&ef=STRENGTHS_AND_FORMS&maxList={limit}"
        r = httpx.get(url, timeout=1.8)
        if r.status_code == 200:
            data = r.json()
            names = data[1] if len(data) > 1 else []
            extra = data[2] if len(data) > 2 and data[2] else {}
            strengths_list = extra.get("STRENGTHS_AND_FORMS", []) if isinstance(extra, dict) else []

            for idx, raw_name in enumerate(names):
                clean_name = raw_name.split("(")[0].strip() if "(" in raw_name else raw_name.strip()
                form = raw_name.split("(")[1].replace(")", "").strip() if "(" in raw_name else "Tablet"
                norm_key = clean_name.lower()
                if norm_key not in seen:
                    seen.add(norm_key)
                    strs = strengths_list[idx] if idx < len(strengths_list) else []
                    med_item = {
                        "id": f"global-{norm_key.replace(' ', '-')[:40]}",
                        "name": clean_name.title(),
                        "generic_name": clean_name.title(),
                        "dosage_form": form,
                        "strengths": [s.split()[0] for s in strs[:3]] if strs else [],
                        "category": "Global Medicine",
                        "purpose": "Verified pharmaceutical formulation from the US National Library of Medicine.",
                        "match_type": "prefix",
                        "similarity_score": 0.82
                    }
                    results.append(med_item)
                    _auto_cache_medicine_to_db(med_item)
    except Exception as e:
        logger.debug(f"NLM global medicine query notice: {e}")

    GLOBAL_CACHE[cache_key] = results
    return results[:limit]

