"""
CarePulse / Healthcare Knowledge Navigator - RAG Retrieval Engine
Extracts, chunks, embeds, and ranks clinical documents using TF-IDF vector space and cosine similarity.
Supports both database-backed KB indexing and standalone local medical guidelines indexing.
"""

import io
import os
import re
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

logger = logging.getLogger(__name__)

def extract_text_from_file(filename: str, content_bytes: bytes) -> str:
    """Extract raw text from uploaded .txt, .md, or .pdf files."""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext in ["txt", "md"]:
        try:
            return content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return content_bytes.decode("latin-1", errors="ignore")
    elif ext == "pdf":
        if not PdfReader:
            logger.warning("pypdf is not installed. Unable to parse PDF.")
            return ""
        try:
            pdf_reader = PdfReader(io.BytesIO(content_bytes))
            text_parts = []
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(f"Error reading PDF {filename}: {e}")
            return ""
    else:
        try:
            return content_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
    """Split text into overlapping character chunks cleanly with section heading extraction."""
    text = text.strip()
    if not text:
        return []
    
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    chunk_list = []
    
    current_section = "General Overview"
    current_chunk = ""
    
    for para in paragraphs:
        # Heading detection heuristic
        if len(para) < 80 and (para.startswith("#") or para.isupper() or re.match(r'^(SECTION|CHAPTER|\d+\.)', para, re.IGNORECASE)):
            current_section = para.lstrip("#").strip()

        if len(current_chunk) + len(para) + 1 <= chunk_size:
            current_chunk = f"{current_chunk}\n{para}".strip()
        else:
            if current_chunk:
                chunk_list.append({"content": current_chunk, "section": current_section})
            if len(para) > chunk_size:
                sentences = re.split(r'(?<=[.?!])\s+', para)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}".strip()
                    else:
                        if sub_chunk:
                            chunk_list.append({"content": sub_chunk, "section": current_section})
                        sub_chunk = s
                if sub_chunk:
                    chunk_list.append({"content": sub_chunk, "section": current_section})
                current_chunk = ""
            else:
                current_chunk = para
                
    if current_chunk:
        chunk_list.append({"content": current_chunk, "section": current_section})
        
    return chunk_list

def rewrite_query_for_rag(user_query: str, patient_context_str: str) -> str:
    """Enhance user query with patient symptoms/duration for optimal TF-IDF vector retrieval."""
    clean_query = user_query.strip()
    if patient_context_str and "No specific patient profile" not in patient_context_str:
        return f"{clean_query} {patient_context_str}"
    return clean_query

class RAGEngine:
    def __init__(self):
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self.chunk_ids: List[int] = []
        self.chunk_texts: List[str] = []
        self.chunk_metadata: List[Dict[str, Any]] = []
        self.is_dirty: bool = True

    def load_from_directory(self, data_dir: Optional[str] = None):
        """Index all markdown and text medical guideline files in data_dir into vector space."""
        if not data_dir:
            base_dir = Path(__file__).resolve().parent
            data_dir = str(base_dir / "data" / "medical_kb")

        if not os.path.exists(data_dir):
            logger.warning(f"Medical KB directory {data_dir} does not exist.")
            return

        self.chunk_ids = []
        self.chunk_texts = []
        self.chunk_metadata = []

        files = sorted(os.listdir(data_dir))
        chunk_counter = 1

        for fname in files:
            if not fname.endswith(".md") and not fname.endswith(".txt"):
                continue

            fpath = os.path.join(data_dir, fname)
            with open(fpath, "rb") as f:
                raw_text = extract_text_from_file(fname, f.read())

            if not raw_text.strip():
                continue

            chunks = chunk_text(raw_text)
            source_type = "Clinical Guideline"
            if "laboratory" in fname.lower() or "reference" in fname.lower():
                source_type = "Health Authority"
            elif "pharmacology" in fname.lower():
                source_type = "Clinical Reference"

            for idx, c in enumerate(chunks):
                self.chunk_ids.append(chunk_counter)
                self.chunk_texts.append(c["content"])
                self.chunk_metadata.append({
                    "chunk_id": chunk_counter,
                    "document_name": fname,
                    "source_type": source_type,
                    "section_name": c.get("section", "General Overview")
                })
                chunk_counter += 1

        if self.chunk_texts:
            self.vectorizer = TfidfVectorizer(
                stop_words='english',
                token_pattern=r'(?u)\b\w+\b',
                ngram_range=(1, 2)
            )
            self.tfidf_matrix = self.vectorizer.fit_transform(self.chunk_texts)
            self.is_dirty = False
            logger.info(f"RAG Engine loaded {len(self.chunk_texts)} chunks from {data_dir}")

    def rebuild_index(self, db: Optional[Any] = None):
        """Rebuild vector index from database session if provided, or fallback to directory files."""
        if db is not None:
            try:
                from app.models import KBChunk
                chunks = db.query(KBChunk).all()
                if chunks:
                    self.chunk_ids = [c.id for c in chunks]
                    self.chunk_texts = [c.content for c in chunks]
                    self.chunk_metadata = []
                    for c in chunks:
                        doc = getattr(c, "document", None)
                        self.chunk_metadata.append({
                            "chunk_id": c.id,
                            "document_name": doc.filename if doc else "Medical Knowledge Base",
                            "source_type": doc.source_type if doc else "Clinical Reference",
                            "section_name": c.section_name or "General"
                        })
                    self.vectorizer = TfidfVectorizer(
                        stop_words='english',
                        token_pattern=r'(?u)\b\w+\b',
                        ngram_range=(1, 2)
                    )
                    self.tfidf_matrix = self.vectorizer.fit_transform(self.chunk_texts)
                    self.is_dirty = False
                    return
            except Exception as e:
                logger.debug(f"DB rebuild fallback to directory: {e}")

        # Default: load from package data directory
        self.load_from_directory()

    def search(self, query: str, db: Optional[Any] = None, top_k: int = 4) -> Tuple[List[Dict[str, Any]], float]:
        """Search query against TF-IDF vector index with metadata enrichment."""
        if self.is_dirty or self.vectorizer is None or self.tfidf_matrix is None:
            self.rebuild_index(db)

        if not self.vectorizer or not self.chunk_texts or self.tfidf_matrix is None:
            return [], 0.0

        query_clean = query.strip()
        if not query_clean:
            return [], 0.0

        try:
            query_vec = self.vectorizer.transform([query_clean])
            similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            
            if len(similarities) == 0:
                return [], 0.0

            top_indices = np.argsort(similarities)[::-1][:top_k]
            top_score = float(similarities[top_indices[0]]) if len(top_indices) > 0 else 0.0

            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                if score > 0.001:
                    meta = self.chunk_metadata[idx] if idx < len(self.chunk_metadata) else {}
                    results.append({
                        "chunk_id": self.chunk_ids[idx] if idx < len(self.chunk_ids) else idx,
                        "content": self.chunk_texts[idx],
                        "score": round(score, 4),
                        "document_name": meta.get("document_name", "Medical Knowledge Base"),
                        "source_type": meta.get("source_type", "Clinical Reference"),
                        "section_name": meta.get("section_name", "General Overview")
                    })

            return results, round(top_score, 4)
        except Exception as e:
            logger.error(f"Error during RAG search: {e}")
            return [], 0.0

rag_engine = RAGEngine()
