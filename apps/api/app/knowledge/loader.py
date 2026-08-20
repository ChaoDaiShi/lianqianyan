from __future__ import annotations

import re
from pathlib import Path

from app.knowledge.models import KnowledgeChunk, KnowledgeDocument, KnowledgeSection

MATERIALS_DIR = Path(__file__).parent / "materials"
CHUNK_MAX_CHARS = 800
CHUNK_OVERLAP = 80


def load_documents(root: Path = MATERIALS_DIR) -> list[KnowledgeDocument]:
    documents = [parse_document(path) for path in sorted(root.glob("*/*.md"))]
    return sorted(documents, key=lambda item: item.id)


def parse_document(path: Path) -> KnowledgeDocument:
    text = path.read_text(encoding="utf-8")
    metadata, content = _split_frontmatter(text)
    course_id = metadata.get("course_id") or path.parent.name
    knowledge_point_id = metadata["knowledge_point_id"]
    title = metadata["title"]
    return KnowledgeDocument(
        id=f"{course_id}:{path.stem}",
        course_id=course_id,
        knowledge_point_id=knowledge_point_id,
        title=title,
        content=content.strip(),
    )


def document_sections(document: KnowledgeDocument) -> list[KnowledgeSection]:
    sections: list[KnowledgeSection] = []
    current_title = document.title
    lines: list[str] = []
    for line in document.content.splitlines():
        match = re.match(r"^#{1,3}\s+(.+)$", line.strip())
        if match:
            _append_section(sections, current_title, lines)
            current_title = match.group(1).strip()
            lines = []
        else:
            lines.append(line)
    _append_section(sections, current_title, lines)
    return sections


def chunk_document(document: KnowledgeDocument) -> list[KnowledgeChunk]:
    chunks: list[KnowledgeChunk] = []
    index = 0
    for section in document_sections(document):
        for piece in _chunk_text(section.content):
            chunks.append(
                KnowledgeChunk(
                    id=f"{document.id}:{index:03d}",
                    document_id=document.id,
                    course_id=document.course_id,
                    knowledge_point_id=document.knowledge_point_id,
                    title=document.title,
                    section=section.title,
                    content=piece,
                    chunk_index=index,
                    source=document.source,
                )
            )
            index += 1
    return chunks


def _split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        raise ValueError("knowledge document requires frontmatter")
    _, raw_metadata, content = text.split("---", 2)
    metadata: dict[str, str] = {}
    for line in raw_metadata.strip().splitlines():
        key, separator, value = line.partition(":")
        if separator:
            metadata[key.strip()] = value.strip()
    for required in ("course_id", "knowledge_point_id", "title"):
        if not metadata.get(required):
            raise ValueError(f"knowledge document missing {required}")
    return metadata, content


def _append_section(output: list[KnowledgeSection], title: str, lines: list[str]) -> None:
    content = "\n".join(lines).strip()
    if content:
        output.append(KnowledgeSection(title=title, content=content))


def _chunk_text(text: str) -> list[str]:
    compact = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(compact) <= CHUNK_MAX_CHARS:
        return [compact] if compact else []
    chunks: list[str] = []
    start = 0
    while start < len(compact):
        end = min(start + CHUNK_MAX_CHARS, len(compact))
        if end < len(compact):
            boundary = max(compact.rfind("。", start, end), compact.rfind("\n", start, end))
            if boundary > start + 300:
                end = boundary + 1
        chunks.append(compact[start:end].strip())
        if end >= len(compact):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks
