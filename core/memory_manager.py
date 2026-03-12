from typing import List, Dict, Any, Optional
from core.database import NeonDatabase
from core.ollama_provider import OllamaProvider

class MemoryManager:
    """Manages narrative context and smart story memory extraction"""
    
    def __init__(self):
        self.db = NeonDatabase()
        self.ollama = OllamaProvider()
        self.max_context_chapters = 3  # Last N chapters to include
    
    def build_story_context(self, story_id: str) -> str:
        """
        Build comprehensive context for story continuation
        Includes last N chapters + key plot points + character info
        
        Args:
            story_id: ID of the story
            
        Returns:
            Formatted context string for Ollama
        """
        # Get story metadata
        story = self.db.get_story(story_id)
        if not story:
            return ""
        
        context_parts = []
        
        # Add story title and description
        context_parts.append(f"STORY: {story['title']}")
        context_parts.append(f"DESCRIPTION: {story['description']}\n")
        
        # Get narrative context (plot points, characters, themes)
        narrative = self.db.get_narrative_context(story_id)
        if narrative:
            context_parts.append("KEY PLOT POINTS:")
            for point in narrative.get("key_plot_points", []):
                context_parts.append(f"  - {point}")
            
            context_parts.append("\nCHARACTERS:")
            for name, desc in narrative.get("character_arcs", {}).items():
                context_parts.append(f"  - {name}: {desc}")
            
            context_parts.append("\nTHEMES:")
            for theme in narrative.get("thematic_elements", []):
                context_parts.append(f"  - {theme}")
            context_parts.append("")
        
        # Get last N chapters
        chapters = self.db.get_story_chapters(story_id)
        if chapters:
            context_parts.append("RECENT CHAPTERS:")
            # Get last N chapters
            recent_chapters = chapters[-self.max_context_chapters:]
            for chapter in recent_chapters:
                context_parts.append(f"\n--- Chapter {chapter['chapter_num']}: {chapter['title']} ---")
                context_parts.append(chapter['content'][:1000])  # Limit chapter text
                if len(chapter['content']) > 1000:
                    context_parts.append("[... chapter continues ...]")
        
        return "\n".join(context_parts)
    
    def extract_summary(self, story_id: str) -> str:
        """
        Create a brief summary of the story for context
        
        Args:
            story_id: ID of the story
            
        Returns:
            Brief story summary
        """
        story = self.db.get_story(story_id)
        if not story:
            return ""
        
        narrative = self.db.get_narrative_context(story_id)
        
        summary_parts = [
            f"Story: {story['title']}",
            f"Status: {story['status']}",
        ]
        
        if story['description']:
            summary_parts.append(f"Overview: {story['description']}")
        
        if narrative and narrative.get("key_plot_points"):
            summary_parts.append(f"Key events: {', '.join(narrative['key_plot_points'][:3])}")
        
        return " | ".join(summary_parts)
    
    def get_character_info(self, story_id: str) -> Dict[str, str]:
        """
        Get character information for the story
        
        Args:
            story_id: ID of the story
            
        Returns:
            Dictionary of character names and descriptions
        """
        narrative = self.db.get_narrative_context(story_id)
        if narrative:
            return narrative.get("character_arcs", {})
        return {}
    
    def get_thematic_elements(self, story_id: str) -> List[str]:
        """
        Get thematic elements for the story
        
        Args:
            story_id: ID of the story
            
        Returns:
            List of themes
        """
        narrative = self.db.get_narrative_context(story_id)
        if narrative:
            return narrative.get("thematic_elements", [])
        return []
    
    def update_narrative_memory(self, story_id: str) -> bool:
        """
        Analyze story and update narrative context metadata
        Uses Ollama to intelligently extract story elements
        
        Args:
            story_id: ID of the story
            
        Returns:
            True if successful
        """
        # Get all chapters
        chapters = self.db.get_story_chapters(story_id)
        if not chapters:
            return False
        
        # Combine all chapter content for analysis
        full_text = "\n\n".join([f"Chapter {c['chapter_num']}: {c['content']}" for c in chapters])
        
        # Extract elements using Ollama
        extracted = self.ollama.extract_key_elements(full_text)
        
        # Update database
        return self.db.update_narrative_context(
            story_id,
            plot_points=extracted.get("plot_points", []),
            character_arcs=extracted.get("characters", {}),
            thematic_elements=extracted.get("themes", [])
        )
    
    def prepare_continuation_prompt(self, story_id: str, user_input: str) -> tuple[str, str]:
        """
        Prepare the full prompt for story continuation with smart context
        
        Args:
            story_id: ID of the story
            user_input: User's direction/prompt for continuation
            
        Returns:
            Tuple of (full_context, user_prompt)
        """
        context = self.build_story_context(story_id)
        prompt = f"""Based on the story context above, continue the narrative:

Direction: {user_input}

Continue with the next part of the story, maintaining character consistency, narrative flow, and thematic coherence."""
        
        return context, prompt
