"""
FastAPI backend for AI NarrativeFlow Co-Writer
Wraps the existing Python core logic as REST endpoints.
Run with: uvicorn backend.main:app --reload --port 8000
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json as _json
import re as _re
import requests as _requests
import uuid

from core.database import NeonDatabase
from core.ollama_provider import OllamaProvider
from core.memory_manager import MemoryManager

app = FastAPI(title="Narratly API", version="1.0.0")

# Allow Next.js dev server and any localhost port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Models ────────────────────────────────────────────────────────────

class CreateStoryRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "drafting"
    template: Optional[str] = "custom"

class CreateChapterRequest(BaseModel):
    chapter_num: int
    title: str
    content: Optional[str] = ""

class UpdateChapterRequest(BaseModel):
    content: str

class GenerateRequest(BaseModel):
    prompt: str
    chapter_id: Optional[str] = None

class HistoryEntry(BaseModel):
    role: str   # "user" | "ai"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryEntry] = []

class SaveChatMessagesRequest(BaseModel):
    messages: list[dict]

# ─── Story Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/stories")
def get_stories():
    """Get all stories"""
    try:
        db = NeonDatabase()
        stories = db.get_all_stories()
        return {"stories": stories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stories")
def create_story(req: CreateStoryRequest):
    """Create a new story"""
    try:
        db = NeonDatabase()
        story_id = db.create_story(
            title=req.title,
            description=req.description,
            status=req.status
        )
        # Save template as metadata
        if req.template:
            db.update_story_metadata(story_id, {"template": req.template})
        story = db.get_story(story_id)
        return {"story": story}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stories/{story_id}")
def get_story(story_id: str):
    """Get a specific story"""
    try:
        db = NeonDatabase()
        story = db.get_story(story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"story": story}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/stories/{story_id}")
def delete_story(story_id: str):
    """Delete a story"""
    try:
        db = NeonDatabase()
        success = db.delete_story(story_id)
        if not success:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/stories/{story_id}/status")
def update_story_status(story_id: str, body: dict):
    """Update story status"""
    try:
        db = NeonDatabase()
        db.update_story_status(story_id, body.get("status", "drafting"))
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Chapter Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/stories/{story_id}/chapters")
def get_chapters(story_id: str):
    """Get all chapters for a story"""
    try:
        db = NeonDatabase()
        chapters = db.get_story_chapters(story_id)
        return {"chapters": chapters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stories/{story_id}/chapters")
def create_chapter(story_id: str, req: CreateChapterRequest):
    """Create a new chapter for a story"""
    try:
        db = NeonDatabase()
        chapter_id = db.create_chapter(
            story_id=story_id,
            chapter_num=req.chapter_num,
            title=req.title,
            content=req.content
        )
        chapter = db.get_chapter(chapter_id)
        return {"chapter": chapter}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/chapters/{chapter_id}")
def update_chapter(chapter_id: str, req: UpdateChapterRequest):
    """Update chapter content"""
    try:
        db = NeonDatabase()
        success = db.update_chapter(chapter_id, req.content)
        if not success:
            raise HTTPException(status_code=404, detail="Chapter not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── AI Endpoints ──────────────────────────────────────────────────────────────

@app.post("/api/stories/{story_id}/generate")
def generate_continuation(story_id: str, req: GenerateRequest):
    """Generate AI story continuation"""
    try:
        mm = MemoryManager()
        context, prompt = mm.prepare_continuation_prompt(story_id, req.prompt)
        ollama = OllamaProvider()

        if not ollama.is_available():
            raise HTTPException(status_code=503, detail="Ollama is not running. Start Ollama and try again.")

        continuation = ollama.generate_continuation(prompt, context, max_tokens=600)
        if not continuation:
            raise HTTPException(status_code=500, detail="Failed to generate continuation")

        return {"continuation": continuation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Off-topic keyword detector (runs BEFORE hitting the LLM) ──────────────────
_OFF_TOPIC_PATTERNS = _re.compile(
    r"\b(python|javascript|java|code|coding|program|algorithm|function\s*\(|def\s+"
    r"|sql|database\s+query|html|css|react|api\s+endpoint"
    r"|\bmath\b|equation|calcul|integral|derivative"
    r"|politics|election|democrat|republican|congress|parliament"
    r"|\bnsfw\b|\bporn|\bsex(?:ual)?\b|\bnude|explicit\s+content|erotic)",
    _re.IGNORECASE,
)

def _is_off_topic(text: str) -> bool:
    return bool(_OFF_TOPIC_PATTERNS.search(text))


@app.post("/api/stories/{story_id}/chat")
def narrative_chat(story_id: str, req: ChatRequest):
    """
    Chat with the Narrative Strategist AI.
    Uses Ollama's /api/chat with proper system + user roles so the model
    treats guardrails as authoritative system-level instructions.
    """
    try:
        # ── Fast guardrail: reject obviously off-topic prompts ─────────────────
        if _is_off_topic(req.message):
            return {
                "response": (
                    "I appreciate your curiosity, but I'm specifically designed to help "
                    "with creative writing and storytelling only! Let's get back to your "
                    "story — what scene or moment should we work on next?"
                ),
                "suggested_prose": "",
                "thematic_note": "Tip: Try asking me to write a scene, develop a character, or continue from where your chapter left off.",
            }

        mm = MemoryManager()
        story_context = mm.build_story_context(story_id)
        ollama = OllamaProvider()

        if not ollama.is_available():
            raise HTTPException(status_code=503, detail="Ollama is not running.")

        # ── Build Ollama /api/chat messages array ──────────────────────────────
        system_msg = {
            "role": "system",
            "content": (
                "You are the Narrative Strategist — an expert creative-writing co-pilot.\n\n"
                "ABSOLUTE RULES (never break these):\n"
                "1. You ONLY help with creative writing, fiction, and storytelling.\n"
                "2. If the user asks about coding, programming, math, science homework, real-world politics, "
                "news, or ANY topic that is NOT creative writing — you MUST refuse politely and redirect them "
                "back to their story. Do NOT attempt to answer the off-topic question even partially.\n"
                "3. You MUST NOT generate explicit, NSFW, highly violent, or controversial content. "
                "If asked, gently decline and suggest a different story direction.\n"
                "4. Always format your reply using EXACTLY these three tags — never use JSON. Do not add text outside the tags.\n\n"
                f"STORY CONTEXT:\n{story_context[:1200] if story_context else 'A new story — no chapters yet.'}\n\n"
                "RESPONSE FORMAT (Use these exact tags):\n"
                "<response>\none friendly sentence acknowledging the author's request\n</response>\n\n"
                "<prose>\n3-6 sentences of story prose the author can paste into their chapter\n</prose>\n\n"
                "<note>\n1-2 sentence structural or thematic insight\n</note>\n\n"
                "If the user's request is off-topic, leave the <prose> and <note> tags empty "
                "and use the <response> tag to politely redirect them to their story."
            ),
        }

        # Build conversation messages from history
        chat_messages = [system_msg]
        for entry in req.history[-10:]:
            role = "user" if entry.role == "user" else "assistant"
            chat_messages.append({"role": role, "content": entry.content})
        chat_messages.append({"role": "user", "content": req.message})

        # ── Call Ollama /api/chat (not /api/generate) ──────────────────────────
        ollama_base = ollama.base_url
        resp = _requests.post(
            f"{ollama_base}/api/chat",
            json={
                "model": ollama.model,
                "messages": chat_messages,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": 700,
                },
            },
            timeout=90,
        )

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Ollama returned {resp.status_code}")

        raw = resp.json().get("message", {}).get("content", "")
        if not raw:
            raise HTTPException(status_code=500, detail="Empty response from Ollama")

        # ── Parse Tags ─────────────────────────────────────────────────────────
        def extract_tag(text: str, tag: str) -> str:
            start = text.find(f"<{tag}>")
            end = text.find(f"</{tag}>")
            if start != -1 and end != -1:
                return text[start + len(tag) + 2:end].strip()
            return ""

        response_text = extract_tag(raw, "response")
        prose_text = extract_tag(raw, "prose")
        note_text = extract_tag(raw, "note")

        if response_text or prose_text:
            return {
                "response": response_text or "Here's what I came up with:",
                "suggested_prose": prose_text,
                "thematic_note": note_text,
            }

        # ── Fallback ───────────────────────────────────────────────────────────
        blocks = [b.strip() for b in raw.strip().split("\n\n") if b.strip()]
        return {
            "response":        blocks[0] if blocks else "Here's my suggestion:",
            "suggested_prose": "\n\n".join(blocks[1:]) if len(blocks) > 1 else raw.strip(),
            "thematic_note":   "",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chat Messages Persistence ─────────────────────────────────────────────────

@app.get("/api/stories/{story_id}/chat-messages")
def get_chat_messages(story_id: str):
    """Retrieve persisted chat messages for a story."""
    try:
        db = NeonDatabase()
        with db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """CREATE TABLE IF NOT EXISTS chat_messages (
                        id UUID PRIMARY KEY,
                        story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                        messages JSONB DEFAULT '[]'::jsonb,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )"""
                )
                conn.commit()
                cur.execute(
                    "SELECT messages FROM chat_messages WHERE story_id = %s",
                    (story_id,),
                )
                row = cur.fetchone()
                return {"messages": row[0] if row else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/stories/{story_id}/chat-messages")
def save_chat_messages(story_id: str, req: SaveChatMessagesRequest):
    """Save / overwrite chat messages for a story."""
    import json as json_mod
    try:
        db = NeonDatabase()
        with db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """CREATE TABLE IF NOT EXISTS chat_messages (
                        id UUID PRIMARY KEY,
                        story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                        messages JSONB DEFAULT '[]'::jsonb,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )"""
                )
                # Upsert
                cur.execute(
                    "SELECT id FROM chat_messages WHERE story_id = %s", (story_id,)
                )
                row = cur.fetchone()
                msgs_json = json_mod.dumps(req.messages)
                if row:
                    cur.execute(
                        "UPDATE chat_messages SET messages = %s::jsonb, updated_at = CURRENT_TIMESTAMP WHERE story_id = %s",
                        (msgs_json, story_id),
                    )
                else:
                    cur.execute(
                        "INSERT INTO chat_messages (id, story_id, messages) VALUES (%s, %s, %s::jsonb)",
                        (str(uuid.uuid4()), story_id, msgs_json),
                    )
                conn.commit()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stories/{story_id}/analyze")
def analyze_story(story_id: str):
    """Analyze story and update narrative context"""
    try:
        mm = MemoryManager()
        success = mm.update_narrative_memory(story_id)
        
        # Return updated context
        db = NeonDatabase()
        narrative = db.get_narrative_context(story_id)
        return {
            "success": success,
            "narrative": narrative
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stories/{story_id}/narrative")
def get_narrative_context(story_id: str):
    """Get current narrative context for a story"""
    try:
        db = NeonDatabase()
        narrative = db.get_narrative_context(story_id)
        return {"narrative": narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── System Endpoints ──────────────────────────────────────────────────────────

@app.get("/api/ollama/status")
def ollama_status():
    """Check if Ollama is running"""
    try:
        ollama = OllamaProvider()
        available = ollama.is_available()
        models = ollama.get_available_models() if available else []
        return {
            "online": available,
            "models": models,
            "current_model": ollama.model
        }
    except Exception as e:
        return {"online": False, "models": [], "current_model": "unknown"}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Narratly API"}
