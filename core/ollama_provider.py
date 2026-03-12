import requests
import json
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class OllamaProvider:
    """Interface for local Ollama LLM"""
    
    def __init__(self, model: str = "artifish/llama3.2-uncensored:latest", base_url: Optional[str] = None):
        """
        Initialize Ollama provide
        
        Args:
            model: Model name (default: mistral for balanced creative writing)
            base_url: Ollama base URL (default: http://localhost:11434)
        """
        self.model = model
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.api_endpoint = f"{self.base_url}/api/generate"
    
    def is_available(self) -> bool:
        """Check if Ollama service is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except Exception as e:
            print(f"[v0] Ollama unavailable: {e}")
            return False
    
    def get_available_models(self) -> list:
        """Get list of available models on Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            print(f"[v0] Error fetching models: {e}")
        return []
    
    def pull_model(self) -> bool:
        """Pull model if not available"""
        available = self.get_available_models()
        if any(self.model in m for m in available):
            return True
        
        print(f"[v0] Pulling {self.model}...")
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": self.model},
                timeout=300
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[v0] Error pulling model: {e}")
            return False
    
    def generate_continuation(self, prompt: str, context: str = "", max_tokens: int = 500) -> Optional[str]:
        """
        Generate story continuation using Ollama
        
        Args:
            prompt: User's story continuation prompt
            context: Previous story context for coherence
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text or None if error
        """
        if not self.is_available():
            raise ConnectionError("Ollama service is not running on localhost:11434")
        
        # Build the full prompt with context
        full_prompt = f"""{context}

User's request: {prompt}

Continue the story in a way that maintains narrative coherence, character consistency, and thematic depth. Write naturally and engagingly."""
        
        try:
            response = requests.post(
                self.api_endpoint,
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": max_tokens
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                print(f"[v0] Ollama error: {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            print("[v0] Ollama request timed out")
            return None
        except Exception as e:
            print(f"[v0] Error generating continuation: {e}")
            return None
    
    def extract_key_elements(self, text: str) -> Dict[str, Any]:
        """
        Analyze story text to extract key plot points and characters
        Uses Ollama to intelligently extract narrative elements
        
        Args:
            text: Story content to analyze
            
        Returns:
            Dictionary with extracted plot_points, characters, themes
        """
        if not self.is_available():
            return {"plot_points": [], "characters": {}, "themes": []}
        
        analysis_prompt = f"""Analyze this story excerpt and extract:
1. Key plot points (major events, turning points)
2. Main characters (name and brief description)
3. Thematic elements (recurring themes, motifs)

Story:
{text}

Provide response in JSON format:
{{"plot_points": [...], "characters": {{}}, "themes": [...]}}"""
        
        try:
            response = requests.post(
                self.api_endpoint,
                json={
                    "model": self.model,
                    "prompt": analysis_prompt,
                    "stream": False,
                    "temperature": 0.3,
                    "num_predict": 300
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "").strip()
                
                # Try to parse JSON from response
                try:
                    # Extract JSON from response
                    json_start = response_text.find('{')
                    json_end = response_text.rfind('}') + 1
                    if json_start >= 0 and json_end > json_start:
                        json_str = response_text[json_start:json_end]
                        return json.loads(json_str)
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            print(f"[v0] Error extracting elements: {e}")
        
        return {"plot_points": [], "characters": {}, "themes": []}
    
    def get_narrative_suggestions(self, story_context: str, current_section: str) -> Dict[str, str]:
        """
        Get AI suggestions for narrative improvement
        
        Args:
            story_context: Full context of the story so far
            current_section: The current section being edited
            
        Returns:
            Dictionary with suggestion types and values
        """
        if not self.is_available():
            return {
                "narrative": "Ollama service unavailable",
                "thematic": "",
                "character": ""
            }
        
        suggestion_prompt = f"""Based on this story context, provide brief suggestions for improvement:

STORY CONTEXT:
{story_context}

CURRENT SECTION:
{current_section}

Provide exactly three suggestions in JSON format:
{{"narrative": "suggestion for narrative flow", "thematic": "thematic connection", "character": "character consistency note"}}"""
        
        try:
            response = requests.post(
                self.api_endpoint,
                json={
                    "model": self.model,
                    "prompt": suggestion_prompt,
                    "stream": False,
                    "temperature": 0.6,
                    "num_predict": 200
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "").strip()
                
                try:
                    json_start = response_text.find('{')
                    json_end = response_text.rfind('}') + 1
                    if json_start >= 0 and json_end > json_start:
                        json_str = response_text[json_start:json_end]
                        return json.loads(json_str)
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            print(f"[v0] Error getting suggestions: {e}")
        
        return {
            "narrative": "Continue with clear narrative progression",
            "thematic": "Maintain consistent themes",
            "character": "Keep character voices consistent"
        }
