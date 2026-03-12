#!/usr/bin/env python3
"""
Initialize Neon database schema for AI NarrativeFlow
Run this once to set up all required tables
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    """Create all necessary tables in Neon"""
    connection_string = os.getenv("NEON_DB_URL")
    
    if not connection_string:
        print("ERROR: NEON_DB_URL environment variable not set")
        return False
    
    try:
        with psycopg.connect(connection_string) as conn:
            with conn.cursor() as cur:
                # Create stories table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS stories (
                        id UUID PRIMARY KEY,
                        title TEXT NOT NULL,
                        description TEXT,
                        status TEXT CHECK (status IN ('drafting', 'outlining', 'editing')) DEFAULT 'drafting',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        user_id TEXT NOT NULL DEFAULT 'default_user',
                        metadata JSONB DEFAULT '{}'::jsonb,
                        UNIQUE(user_id, title)
                    );
                """)
                print("✓ Created stories table")
                
                # Create chapters table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS chapters (
                        id UUID PRIMARY KEY,
                        story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                        chapter_num INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(story_id, chapter_num)
                    );
                """)
                print("✓ Created chapters table")
                
                # Create narrative_context table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS narrative_context (
                        id UUID PRIMARY KEY,
                        story_id UUID NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,
                        key_plot_points JSONB DEFAULT '[]'::jsonb,
                        character_arcs JSONB DEFAULT '{}'::jsonb,
                        thematic_elements JSONB DEFAULT '[]'::jsonb,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                print("✓ Created narrative_context table")
                
                # Create indices for better performance
                cur.execute("CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_narrative_context_story_id ON narrative_context(story_id);")
                print("✓ Created indices")
                
                conn.commit()
                print("\n✅ Database initialized successfully!")
                return True
                
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

if __name__ == "__main__":
    init_database()
