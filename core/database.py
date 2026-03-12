import psycopg
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
import os
from dotenv import load_dotenv

load_dotenv()

class NeonDatabase:
    """Neon PostgreSQL database connection and operations"""
    
    def __init__(self):
        self.connection_string = os.getenv("NEON_DB_URL")
        if not self.connection_string:
            raise ValueError("NEON_DB_URL environment variable not set")
    
    def get_connection(self):
        """Get a database connection"""
        return psycopg.connect(self.connection_string)
    
    def create_story(self, title: str, description: str, status: str = "drafting") -> str:
        """Create a new story and return its ID"""
        story_id = str(uuid.uuid4())
        
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO stories (id, title, description, status, created_at, updated_at, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (story_id, title, description, status, datetime.now(), datetime.now(), "default_user"))
                conn.commit()
        
        return story_id
    
    def get_story(self, story_id: str) -> Optional[Dict[str, Any]]:
        """Get a story by ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, title, description, status, created_at, updated_at, metadata
                    FROM stories WHERE id = %s
                """, (story_id,))
                row = cur.fetchone()
                
                if row:
                    return {
                        "id": row[0],
                        "title": row[1],
                        "description": row[2],
                        "status": row[3],
                        "created_at": row[4],
                        "updated_at": row[5],
                        "metadata": row[6] or {}
                    }
        return None
    
    def get_all_stories(self) -> List[Dict[str, Any]]:
        """Get all stories for the user"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, title, description, status, created_at, updated_at, metadata
                    FROM stories WHERE user_id = %s ORDER BY updated_at DESC
                """, ("default_user",))
                rows = cur.fetchall()
                
                stories = []
                for row in rows:
                    stories.append({
                        "id": row[0],
                        "title": row[1],
                        "description": row[2],
                        "status": row[3],
                        "created_at": row[4],
                        "updated_at": row[5],
                        "metadata": row[6] or {}
                    })
        return stories
    
    def update_story_status(self, story_id: str, status: str) -> bool:
        """Update story status"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE stories SET status = %s, updated_at = %s WHERE id = %s
                """, (status, datetime.now(), story_id))
                conn.commit()
                return cur.rowcount > 0
    
    def update_story_metadata(self, story_id: str, metadata: Dict) -> bool:
        """Update story metadata (plot points, themes, etc)"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE stories SET metadata = %s, updated_at = %s WHERE id = %s
                """, (json.dumps(metadata), datetime.now(), story_id))
                conn.commit()
                return cur.rowcount > 0
    
    def delete_story(self, story_id: str) -> bool:
        """Delete a story and all its chapters"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM stories WHERE id = %s", (story_id,))
                conn.commit()
                return cur.rowcount > 0
    
    def create_chapter(self, story_id: str, chapter_num: int, title: str, content: str) -> str:
        """Create a new chapter"""
        chapter_id = str(uuid.uuid4())
        
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO chapters (id, story_id, chapter_num, title, content, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (chapter_id, story_id, chapter_num, title, content, datetime.now(), datetime.now()))
                conn.commit()
        
        return chapter_id
    
    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        """Get a chapter by ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, story_id, chapter_num, title, content, created_at, updated_at
                    FROM chapters WHERE id = %s
                """, (chapter_id,))
                row = cur.fetchone()
                
                if row:
                    return {
                        "id": row[0],
                        "story_id": row[1],
                        "chapter_num": row[2],
                        "title": row[3],
                        "content": row[4],
                        "created_at": row[5],
                        "updated_at": row[6]
                    }
        return None
    
    def get_story_chapters(self, story_id: str) -> List[Dict[str, Any]]:
        """Get all chapters for a story"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, story_id, chapter_num, title, content, created_at, updated_at
                    FROM chapters WHERE story_id = %s ORDER BY chapter_num ASC
                """, (story_id,))
                rows = cur.fetchall()
                
                chapters = []
                for row in rows:
                    chapters.append({
                        "id": row[0],
                        "story_id": row[1],
                        "chapter_num": row[2],
                        "title": row[3],
                        "content": row[4],
                        "created_at": row[5],
                        "updated_at": row[6]
                    })
        return chapters
    
    def update_chapter(self, chapter_id: str, content: str) -> bool:
        """Update chapter content"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE chapters SET content = %s, updated_at = %s WHERE id = %s
                """, (content, datetime.now(), chapter_id))
                conn.commit()
                return cur.rowcount > 0
    
    def get_narrative_context(self, story_id: str) -> Optional[Dict[str, Any]]:
        """Get narrative context for a story"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, story_id, key_plot_points, character_arcs, thematic_elements, last_updated
                    FROM narrative_context WHERE story_id = %s
                """, (story_id,))
                row = cur.fetchone()
                
                if row:
                    return {
                        "id": row[0],
                        "story_id": row[1],
                        "key_plot_points": row[2] or [],
                        "character_arcs": row[3] or {},
                        "thematic_elements": row[4] or [],
                        "last_updated": row[5]
                    }
        return None
    
    def update_narrative_context(self, story_id: str, plot_points: List, 
                                character_arcs: Dict, thematic_elements: List) -> bool:
        """Update narrative context metadata"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO narrative_context 
                    (id, story_id, key_plot_points, character_arcs, thematic_elements, last_updated)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (story_id) DO UPDATE SET
                    key_plot_points = %s,
                    character_arcs = %s,
                    thematic_elements = %s,
                    last_updated = %s
                """, (
                    str(uuid.uuid4()),
                    story_id,
                    json.dumps(plot_points),
                    json.dumps(character_arcs),
                    json.dumps(thematic_elements),
                    datetime.now(),
                    json.dumps(plot_points),
                    json.dumps(character_arcs),
                    json.dumps(thematic_elements),
                    datetime.now()
                ))
                conn.commit()
                return cur.rowcount > 0
