"""
Snowflake client for RAG: separate schema (RAG) under the same database.
Uses REST API with token auth to match existing getCanvas.js setup.
"""
from __future__ import annotations

import json
import time
import uuid
from typing import Any

import requests

from config import (
    SNOWFLAKE_DATABASE,
    SNOWFLAKE_HOST,
    SNOWFLAKE_RAG_SCHEMA,
    SNOWFLAKE_ROLE,
    SNOWFLAKE_TOKEN,
    SNOWFLAKE_TOKEN_TYPE,
    SNOWFLAKE_WAREHOUSE,
)

ENDPOINT = f"https://{SNOWFLAKE_HOST}/api/v2/statements" if SNOWFLAKE_HOST else ""


def _headers() -> dict[str, str]:
    h = {
        "Authorization": f"Bearer {SNOWFLAKE_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if SNOWFLAKE_TOKEN_TYPE:
        h["X-Snowflake-Authorization-Token-Type"] = SNOWFLAKE_TOKEN_TYPE
    return h


def _body(
    statement: str,
    bindings: dict | None = None,
    timeout: int = 120,
    include_database: bool = True,
    include_schema: bool = True,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "statement": statement,
        "timeout": timeout,
        "warehouse": SNOWFLAKE_WAREHOUSE,
    }
    if include_database:
        body["database"] = SNOWFLAKE_DATABASE
    if include_schema:
        body["schema"] = SNOWFLAKE_RAG_SCHEMA
    if SNOWFLAKE_ROLE:
        body["role"] = SNOWFLAKE_ROLE
    if bindings:
        body["bindings"] = bindings
    return body


def execute(
    statement: str,
    bindings: dict | None = None,
    timeout: int = 120,
    include_database: bool = True,
    include_schema: bool = True,
) -> dict[str, Any]:
    resp = requests.post(
        ENDPOINT,
        headers=_headers(),
        json=_body(statement, bindings, timeout, include_database, include_schema),
    )
    raw = resp.text
    try:
        data = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        data = {}
    if not resp.ok:
        raise RuntimeError(f"Snowflake error ({resp.status_code}): {raw}")
    return data


def ensure_rag_schema() -> None:
    """Create database if needed, then RAG schema and RAG tables."""
    execute(
        "CREATE DATABASE IF NOT EXISTS " + SNOWFLAKE_DATABASE,
        timeout=60,
        include_database=False,
        include_schema=False,
    )
    execute(
        f"CREATE SCHEMA IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}",
        timeout=60,
        include_schema=False,
    )

    execute(
        f"""
        CREATE TABLE IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.courses (
            course_id STRING PRIMARY KEY,
            course_name STRING,
            created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """,
        timeout=60,
    )
    execute(
        f"""
        CREATE TABLE IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.modules (
            module_id STRING PRIMARY KEY,
            course_id STRING,
            module_name STRING,
            created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
    )
    execute(
        f"""
        CREATE TABLE IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.documents (
            document_id STRING PRIMARY KEY,
            course_id STRING,
            module_id STRING,
            document_type STRING,
            title STRING,
            raw_text STRING,
            created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            updated_at TIMESTAMP_NTZ
        )
        """
    )
    execute(
        f"""
        CREATE TABLE IF NOT EXISTS {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks (
            chunk_id STRING PRIMARY KEY,
            document_id STRING,
            course_id STRING,
            module_id STRING,
            text STRING,
            embedding VECTOR(FLOAT, 768),
            trust_score FLOAT DEFAULT 1.0,
            created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            updated_at TIMESTAMP_NTZ,
            document_title STRING,
            course_name STRING,
            module_name STRING
        )
        """
    )
    _add_chunk_traceability_columns_if_missing()


def _add_chunk_traceability_columns_if_missing() -> None:
    """Add human-readable source columns to document_chunks if table existed from before."""
    for col in ("document_title", "course_name", "module_name"):
        try:
            execute(
                f"ALTER TABLE {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks ADD COLUMN {col} STRING"
            )
        except RuntimeError as e:
            if "already exists" not in str(e).lower():
                raise


def _bind(index: int, value: str | None) -> dict:
    v = "" if value is None else str(value)
    return {str(index): {"type": "TEXT", "value": v}}


def insert_course(course_id: str, course_name: str) -> None:
    bind = {**_bind(1, course_id), **_bind(2, course_name)}
    execute(
        f"""
        MERGE INTO {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.courses t
        USING (SELECT ? AS course_id, ? AS course_name) s ON t.course_id = s.course_id
        WHEN MATCHED THEN UPDATE SET t.course_name = s.course_name
        WHEN NOT MATCHED THEN INSERT (course_id, course_name) VALUES (s.course_id, s.course_name)
        """,
        bindings=bind,
    )


def insert_module(module_id: str, course_id: str, module_name: str) -> None:
    bind = {**_bind(1, module_id), **_bind(2, course_id), **_bind(3, module_name)}
    execute(
        f"""
        MERGE INTO {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.modules t
        USING (SELECT ? AS module_id, ? AS course_id, ? AS module_name) s ON t.module_id = s.module_id
        WHEN MATCHED THEN UPDATE SET t.module_name = s.module_name, t.course_id = s.course_id
        WHEN NOT MATCHED THEN INSERT (module_id, course_id, module_name) VALUES (s.module_id, s.course_id, s.module_name)
        """,
        bindings=bind,
    )


def insert_document(
    document_id: str,
    course_id: str,
    module_id: str,
    document_type: str,
    title: str,
    raw_text: str,
) -> None:
    bind = {
        **_bind(1, document_id),
        **_bind(2, course_id),
        **_bind(3, module_id),
        **_bind(4, document_type),
        **_bind(5, title),
        **_bind(6, raw_text),
    }
    execute(
        f"""
        MERGE INTO {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.documents t
        USING (SELECT ? AS document_id, ? AS course_id, ? AS module_id, ? AS document_type, ? AS title, ? AS raw_text) s
        ON t.document_id = s.document_id
        WHEN MATCHED THEN UPDATE SET t.raw_text = s.raw_text, t.title = s.title, t.module_id = s.module_id
        WHEN NOT MATCHED THEN INSERT (document_id, course_id, module_id, document_type, title, raw_text) VALUES (s.document_id, s.course_id, s.module_id, s.document_type, s.title, s.raw_text)
        """,
        bindings=bind,
    )


def delete_chunks_by_document_id(document_id: str) -> None:
    bind = _bind(1, document_id)
    execute(
        f"""
        DELETE FROM {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks
        WHERE document_id = ?
        """,
        bindings=bind,
    )


def insert_chunk(
    chunk_id: str,
    document_id: str,
    course_id: str,
    module_id: str,
    text: str,
    embedding: list[float],
    document_title: str = "",
    course_name: str = "",
    module_name: str = "",
) -> None:
    # Snowflake: pass vector as JSON array string; PARSE_JSON gives VARIANT, cast to VECTOR
    emb_str = json.dumps(embedding)
    bind = {
        "1": {"type": "TEXT", "value": chunk_id},
        "2": {"type": "TEXT", "value": document_id},
        "3": {"type": "TEXT", "value": course_id},
        "4": {"type": "TEXT", "value": module_id},
        "5": {"type": "TEXT", "value": text},
        "6": {"type": "TEXT", "value": emb_str},
        "7": {"type": "TEXT", "value": (document_title or "")[:65535]},
        "8": {"type": "TEXT", "value": (course_name or "")[:65535]},
        "9": {"type": "TEXT", "value": (module_name or "")[:65535]},
    }
    execute(
        f"""
        INSERT INTO {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks
        (chunk_id, document_id, course_id, module_id, text, embedding, document_title, course_name, module_name)
        SELECT ?, ?, ?, ?, ?, PARSE_JSON(?)::VECTOR(FLOAT, 768), ?, ?, ?
        """,
        bindings=bind,
    )


def generate_chunk_id() -> str:
    return str(uuid.uuid4())


def list_units(course_id: str) -> list[dict[str, Any]]:
    """
    Return the course's units (modules) with human-readable names and document/chunk counts.
    Each row: module_id, module_name, document_count, chunk_count.
    """
    sql = f"""
    SELECT m.module_id, COALESCE(m.module_name, '') AS module_name,
           COUNT(DISTINCT d.document_id) AS document_count,
           COUNT(c.chunk_id) AS chunk_count
    FROM {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.modules m
    LEFT JOIN {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.documents d
      ON d.course_id = m.course_id AND d.module_id = m.module_id
    LEFT JOIN {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks c
      ON c.document_id = d.document_id
    WHERE m.course_id = ?
    GROUP BY m.module_id, m.module_name, m.course_id
    ORDER BY m.module_id
    """
    bind = _bind(1, course_id)
    data = _execute_and_fetch(sql, bind)
    columns = ["module_id", "module_name", "document_count", "chunk_count"]
    return [_row_to_dict(columns, row) for row in data]


def retrieve_chunks(
    course_id: str,
    query_embedding: list[float],
    top_k: int = 8,
    similarity_threshold: float = 0.25,
) -> list[dict[str, Any]]:
    """
    Return list of chunks with chunk_id, text, document_title, course_name, module_name, score.
    Requires at least 2 chunks above threshold for useful RAG; caller can check len >= 2.
    """
    emb_str = json.dumps(query_embedding)
    bind = {
        "1": {"type": "TEXT", "value": emb_str},
        "2": {"type": "TEXT", "value": course_id},
    }
    sql = f"""
    SELECT * FROM (
        SELECT chunk_id, document_id, course_id, module_id, text,
               COALESCE(document_title, '') AS document_title,
               COALESCE(course_name, '') AS course_name,
               COALESCE(module_name, '') AS module_name,
               VECTOR_COSINE_SIMILARITY(embedding, PARSE_JSON(?)::VECTOR(FLOAT, 768)) AS score
        FROM {SNOWFLAKE_DATABASE}.{SNOWFLAKE_RAG_SCHEMA}.document_chunks
        WHERE course_id = ?
    ) WHERE score >= {similarity_threshold}
    ORDER BY score DESC
    LIMIT {top_k}
    """
    data = _execute_and_fetch(sql, bind)
    columns = ["chunk_id", "document_id", "course_id", "module_id", "text", "document_title", "course_name", "module_name", "score"]
    return [_row_to_dict(columns, row) for row in data]


def _row_to_dict(columns: list[str], row: list[Any]) -> dict[str, Any]:
    return dict(zip(columns, row)) if len(row) >= len(columns) else {}


def _execute_and_fetch(statement: str, bindings: dict | None = None) -> list[list[Any]]:
    """Submit statement and return result rows (poll if async)."""
    resp = requests.post(
        ENDPOINT,
        headers=_headers(),
        json=_body(statement, bindings, timeout=60),
    )
    raw = resp.text
    try:
        data = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        data = {}
    if not resp.ok:
        raise RuntimeError(f"Snowflake error ({resp.status_code}): {raw}")

    # Inline result
    if data.get("data") is not None:
        return data["data"]
    handle = data.get("statementHandle")
    if not handle:
        return []

    # Poll for result
    for _ in range(60):
        time.sleep(0.5)
        r2 = requests.get(f"{ENDPOINT}/{handle}", headers=_headers())
        r2.raise_for_status()
        d = r2.json()
        if d.get("status") == "SUCCESS" and "data" in d:
            return d.get("data", [])
        if d.get("status") in ("FAILED", "ABORTED"):
            raise RuntimeError(d.get("message", str(d)))
    return []
