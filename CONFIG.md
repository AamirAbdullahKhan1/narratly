# Configuration Guide - AI NarrativeFlow

Advanced configuration options for power users.

## Environment Variables

### Required Variables

```
NEON_DB_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname
```
- Source: Neon console (https://console.neon.tech)
- Format: PostgreSQL connection string
- Must be set for app to run

### Optional Variables

```
OLLAMA_BASE_URL=http://localhost:11434
```
- Default: `http://localhost:11434`
- Change if Ollama runs on different host/port
- Example: `http://192.168.1.100:11434`

```
OLLAMA_MODEL=mistral
```
- Default: `mistral`
- Other options: `llama2`, `neural-chat`, `orca`, `openchat`
- Recommend: `mistral` (best for creative writing)

```
MAX_CONTEXT_CHAPTERS=3
```
- Default: 3 (in memory_manager.py)
- How many recent chapters to include in context
- Higher = more context but slower generation

```
MAX_TOKENS=500
```
- Default: 500 (in ollama_provider.py)
- Maximum tokens in AI generation
- Higher = longer responses but slower

## Streamlit Configuration

File: `.streamlit/config.toml`

### Theme Colors

```toml
[theme]
primaryColor = "#2563EB"      # Main brand color (blue)
backgroundColor = "#FFFFFF"   # Page background
secondaryBackgroundColor = "#F3F4F6"  # Card backgrounds
textColor = "#1F2937"        # Primary text
```

### Custom Colors
Edit CSS variables in `styles/style.css`:

```css
:root {
    --primary-color: #2563EB;
    --secondary-color: #7C3AED;
    --success-color: #10B981;
    --warning-color: #F59E0B;
    --danger-color: #EF4444;
}
```

### Server Settings

```toml
[server]
port = 8501                  # Change to run on different port
headless = true              # Run without browser window
runOnSave = true             # Auto-reload on file changes
maxUploadSize = 200          # Max file upload (MB)
```

### Logger Configuration

```toml
[logger]
level = "info"               # Options: debug, info, warning, error
```

## Database Configuration

### Neon Connection Options

**Connection Pooling** (auto-enabled):
- Neon uses connection pooling by default
- No additional configuration needed
- Limits: Free tier = 20 concurrent connections

**Timezone:**
```sql
-- Run in Neon console to set timezone
SET timezone TO 'UTC';
```

**Advanced Pooling:**
For high-traffic deployments, use Neon's connection pooler:
```
postgresql://user:password@ep-xxx-pooler.us-east-1.neon.tech/dbname
```

### Custom Database Name

To use a non-default database:
```
postgresql://user:password@ep-xxx.neon.tech/custom_db_name
```

## Ollama Configuration

### Models

**Recommended for Creative Writing:**
```bash
ollama pull mistral      # 7B, balanced creativity/speed
```

**Other Options:**
```bash
ollama pull llama2       # 7B or 13B, very capable
ollama pull neural-chat  # 7B, good for conversation
ollama pull orca         # 13B, excellent reasoning
ollama pull openchat     # 3.5B, lightweight
```

### Local Model Path

By default, Ollama stores models in:
- **macOS**: `~/.ollama/models`
- **Linux**: `~/.ollama/models`
- **Windows**: `%USERPROFILE%\.ollama\models`

Change location:
```bash
export OLLAMA_MODELS=/path/to/models
ollama serve
```

### Performance Tuning

**Use GPU Acceleration:**
```bash
# Ollama automatically uses GPU if available
# For NVIDIA: Install CUDA
# For AMD: Install ROCm
# For Apple: Automatic with Metal support
```

**RAM and Context Window:**
- Mistral 7B needs ~4-5GB RAM
- Llama2 13B needs ~8-10GB RAM
- Adjust context window in ollama_provider.py:
  ```python
  "num_predict": 500  # Change this value
  ```

**Reduce Memory Usage:**
```python
# In ollama_provider.py, reduce num_predict
"num_predict": 250  # Lower = less RAM, faster
```

## Memory Manager Configuration

File: `core/memory_manager.py`

### Context Window Size

```python
class MemoryManager:
    def __init__(self):
        self.max_context_chapters = 3  # Change this
```

**Recommended Values:**
- `1-2`: Very focused context, fast generation
- `3-5`: Balanced approach (default)
- `5+`: Full story context, slower generation

### Temperature & Sampling

In `core/ollama_provider.py`:

```python
"temperature": 0.7,  # 0.0-1.0, higher = more creative
"top_p": 0.9,        # Nucleus sampling (0.0-1.0)
```

## Database Schema Customization

### Add Custom Story Metadata

Modify `scripts/init_database.py`:

```sql
-- Add custom metadata fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_audience TEXT;
```

Then update Python model in `core/database.py`.

### Create Story Templates Table

```sql
CREATE TABLE story_templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    initial_chapters JSONB,
    structure_guidelines JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Optimization

### Database Optimization

**Add Indexes:**
```sql
-- Already created by init script, but can add more:
CREATE INDEX idx_chapters_created ON chapters(created_at);
CREATE INDEX idx_stories_status ON stories(status);
```

**Enable Query Logging:**
```sql
-- In Neon console:
ALTER SYSTEM SET log_statement = 'all';
```

### Streamlit Cache

Add caching to expensive operations in `core/database.py`:

```python
import streamlit as st

@st.cache_resource
def get_db_connection():
    return NeonDatabase()
```

### API Response Optimization

Cache Ollama responses:

```python
@st.cache_data(ttl=3600)
def cached_continuation(prompt, context):
    return ollama.generate_continuation(prompt, context)
```

## Security Best Practices

### Environment Variables

**Never commit `.env` file:**
```bash
echo ".env" >> .gitignore
```

**Use strong database passwords:**
- Neon auto-generates strong passwords
- Don't share your connection string

### Database Security

**Limit User Access:**
```sql
-- Create read-only role
CREATE ROLE app_read NOLOGIN;
GRANT USAGE ON SCHEMA public TO app_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;

-- For story editing, use proper user roles
```

**Backup Your Data:**
```bash
# Neon provides automatic daily backups
# Access through Neon console
```

### API Security

**Rate Limiting** (future enhancement):
```python
from functools import wraps
import time

def rate_limit(calls_per_minute=30):
    min_interval = 60.0 / calls_per_minute
    last_called = [0.0]
    
    def decorator(func):
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator
```

## Logging and Debugging

### Enable Debug Mode

Edit `.streamlit/config.toml`:
```toml
[logger]
level = "debug"
```

### Application Logging

In `core/database.py` and `core/ollama_provider.py`:
```python
import logging

logger = logging.getLogger(__name__)
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message")
```

## Deployment Configuration

### Streamlit Cloud

For deploying on Streamlit Cloud:
1. Push to GitHub
2. Add secrets in Streamlit Cloud dashboard:
   - `NEON_DB_URL`
   - `OLLAMA_BASE_URL`

**Note:** You'll need to run Ollama separately or use cloud LLM provider

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["streamlit", "run", "app.py"]
```

### Environment-Specific Configs

Create separate `.env` files:
- `.env.development` - Local development
- `.env.staging` - Staging server
- `.env.production` - Production

Load in `app.py`:
```python
import os
env = os.getenv("APP_ENV", "development")
load_dotenv(f".env.{env}")
```

## Troubleshooting Configuration Issues

### Database Connection Issues

```python
# Test connection manually
from core.database import NeonDatabase
db = NeonDatabase()
stories = db.get_all_stories()
print(f"Successfully retrieved {len(stories)} stories")
```

### Ollama Configuration Issues

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Check model availability
ollama list

# Test generation
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello"
}'
```

### Performance Issues

1. **Slow Database Queries:**
   - Check indexes are created
   - Monitor query logs
   - Profile with: `EXPLAIN ANALYZE SELECT ...`

2. **Slow AI Generation:**
   - Reduce `max_tokens`
   - Reduce `max_context_chapters`
   - Check CPU/GPU utilization
   - Ensure model is on GPU

3. **High Memory Usage:**
   - Use smaller Ollama model
   - Reduce context window
   - Clear cache regularly

## Advanced Usage

### Custom AI Models

Replace Mistral with your fine-tuned model:

```python
class OllamaProvider:
    def __init__(self, model: str = "your-custom-model"):
        self.model = model
        # Rest of code...
```

### Multi-Language Support

Add i18n to the UI:
```python
# Create localization dictionary
TRANSLATIONS = {
    "en": {"title": "AI NarrativeFlow"},
    "es": {"title": "Flujo Narrativo IA"},
}

lang = os.getenv("APP_LANG", "en")
```

### Analytics Integration

Track user interactions:
```python
def log_interaction(event_type, metadata):
    # Send to analytics service
    # Google Analytics, Mixpanel, etc.
    pass
```

---

For questions, refer to individual service documentation:
- Neon: https://neon.tech/docs
- Ollama: https://ollama.ai
- Streamlit: https://docs.streamlit.io
