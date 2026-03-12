# Troubleshooting Guide - AI NarrativeFlow

## Installation Issues

### "ModuleNotFoundError: No module named 'streamlit'"

**Problem:** Python packages not installed

**Solution:**
```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install streamlit==1.32.0
pip install psycopg[binary]==3.1.14
pip install python-dotenv==1.0.0
pip install requests==2.31.0
```

### "Python version not compatible"

**Problem:** Using Python < 3.9

**Solution:**
```bash
# Check your Python version
python --version

# Install Python 3.9+
# Windows: https://www.python.org/downloads/
# macOS: brew install python@3.11
# Linux: sudo apt-get install python3.11
```

### "Permission denied" when installing

**Problem:** Trying to install globally without permissions

**Solution:**
```bash
# Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

## Environment Configuration

### "NEON_DB_URL environment variable not set"

**Problem:** Missing or incorrect `.env` file

**Solution:**
```bash
# Check .env exists
ls -la .env

# Check it has the correct content
cat .env

# Should contain:
# NEON_DB_URL=postgresql://user:password@ep-xxx.neon.tech/dbname
```

**If .env doesn't exist:**
```bash
cp .env.example .env
# Edit .env with your Neon connection string
```

### "Cannot connect to Neon database"

**Problem:** Invalid connection string or network issues

**Troubleshooting steps:**

1. **Verify connection string format:**
   ```
   postgresql://username:password@hostname:5432/dbname
   ```
   - Get from Neon console (should look like: `ep-xxx.us-east-1.neon.tech`)

2. **Test connection manually:**
   ```bash
   psql "postgresql://user:password@ep-xxx.neon.tech/dbname"
   # If this works, the connection is valid
   ```

3. **Check internet connection:**
   ```bash
   ping google.com
   ```

4. **Verify Neon project is active:**
   - Go to https://console.neon.tech
   - Check your project status (should be "Available")

5. **Check for special characters in password:**
   - Password with `@`, `!`, `#` etc. may need URL encoding
   - Example: `pass@word` → `pass%40word`

### "Connection timeout after X seconds"

**Problem:** Slow network or Neon service latency

**Solution:**
```python
# In core/database.py, increase timeout:
conn = psycopg.connect(
    self.connection_string,
    timeout=10  # Increase from default
)
```

## Ollama Issues

### "Ollama service is not running on localhost:11434"

**Problem:** Ollama not running or not accessible

**Solution:**

1. **Download Ollama:**
   - Go to https://ollama.ai
   - Download for your OS (Windows, macOS, Linux)

2. **Install and run:**
   - **macOS/Windows:** Run the installed app
   - **Linux:** Run `ollama serve` in terminal

3. **Verify it's running:**
   ```bash
   curl http://localhost:11434/api/tags
   # Should return JSON with available models
   ```

4. **If connection refused:**
   - Check if Ollama process is running
   - Try restarting Ollama
   - Check port 11434 is not blocked by firewall

5. **If on different machine:**
   ```bash
   # In .env, use the actual IP/hostname:
   OLLAMA_BASE_URL=http://192.168.1.100:11434
   ```

### "No models found in Ollama"

**Problem:** Ollama running but no models installed

**Solution:**
```bash
# Pull the Mistral model
ollama pull mistral

# Or other models:
ollama pull llama2
ollama pull neural-chat

# List available models
ollama list
```

**Downloading takes time:**
- Mistral: ~4GB (takes 5-10 minutes on typical connection)
- Llama2: ~7GB or 13GB
- Plan accordingly for first time setup

### "Model not found or invalid"

**Problem:** Wrong model name specified

**Solution:**
```bash
# List available models
ollama list

# Output should show:
# mistral     4.1 GB
# llama2      7.4 GB

# Use exact name from list (case-sensitive)
# In core/ollama_provider.py:
self.model = "mistral"  # Not "Mistral" or "mistral:latest"
```

### "Generation timeout or taking too long"

**Problem:** Slow Ollama response

**Causes and solutions:**

1. **Insufficient RAM:**
   - Check available memory: `free -h` (Linux) or Task Manager (Windows)
   - Mistral needs 4-5GB, Llama2 needs 8GB+
   - Reduce `max_tokens` in `core/ollama_provider.py`

2. **GPU not being used:**
   - Check if NVIDIA/AMD GPU acceleration is working
   - On macOS, Metal acceleration should auto-enable
   - Reinstall Ollama with GPU drivers if needed

3. **System under load:**
   - Check CPU/memory usage
   - Close other applications
   - Restart Ollama

4. **Reduce generation length:**
   ```python
   # In core/ollama_provider.py:
   "num_predict": 250  # Reduced from 500
   ```

### "Ollama running but AI suggestions are poor quality"

**Problem:** Model not optimized for current use case

**Solution:**
Try different models:

```bash
# Try more capable model
ollama pull llama2:13b

# In core/ollama_provider.py:
self.model = "llama2:13b"
```

Or adjust generation parameters:
```python
# In core/ollama_provider.py:
"temperature": 0.8,  # More creative (increase from 0.7)
"top_p": 0.95,      # More variety (increase from 0.9)
```

## Database Issues

### "DatabaseError: relation 'stories' does not exist"

**Problem:** Database tables not created

**Solution:**
```bash
# Initialize database schema
python scripts/init_database.py

# You should see:
# ✓ Created stories table
# ✓ Created chapters table
# ✓ Created narrative_context table
```

### "Unique constraint violation: duplicate story title"

**Problem:** Trying to create a story with same title as existing

**Solution:**
```python
# Story titles must be unique per user
# Use slightly different title:
# "My Story v2"
# "My Story - Draft 2"
# etc.
```

Or modify in database:
```sql
-- In Neon console:
DELETE FROM stories WHERE title = 'My Story' AND user_id = 'default_user';
```

### "Connection pool exhausted"

**Problem:** Too many concurrent database connections

**Cause:** Neon free tier limits to 20 concurrent connections

**Solution:**
```python
# The code handles this, but if issues persist:
# Use connection pooling URL from Neon:
# postgresql://user:password@ep-xxx-pooler.neon.tech/dbname
```

### "Foreign key constraint violation"

**Problem:** Trying to delete story with chapters

**Solution:**
- This shouldn't happen - cascading deletes are configured
- If error occurs, it's likely a schema issue
- Re-initialize database:
  ```bash
  python scripts/init_database.py
  ```

## Streamlit Issues

### "Page not found" or routing errors

**Problem:** Multi-page setup issue

**Solution:**
```bash
# Make sure pages directory exists
mkdir -p pages

# Files should be:
# app.py              # Main page
# pages/editor.py     # Editor page
```

### "Module import errors"

**Problem:** Can't import from views or core

**Solution:**
```bash
# Make sure __init__.py files exist in directories:
# core/__init__.py
# views/__init__.py
# pages/__init__.py (optional)

# Create if missing:
touch core/__init__.py
touch views/__init__.py
```

### "CSS not loading / styling looks broken"

**Problem:** Custom CSS not being applied

**Solution:**
```bash
# Check CSS file exists
ls styles/style.css

# Clear Streamlit cache
streamlit cache clear
```

If still broken, CSS may have errors. Check browser console for errors.

### "Session state issues / page reset"

**Problem:** Data lost when switching pages or refreshing

**Solution:**
- This is normal in Streamlit
- Initialize session state in app.py (already done)
- Consider using database for persistent storage instead of `st.session_state`

### "Port already in use (port 8501)"

**Problem:** Streamlit default port is occupied

**Solution:**
```bash
# Run on different port
streamlit run app.py --server.port 8502

# Or change in .streamlit/config.toml:
# [server]
# port = 8502
```

## Story Editing Issues

### "Chapter not saving"

**Problem:** Save button not working

**Solution:**
1. Check database connection (see above)
2. Ensure chapter has content
3. Check browser console for errors
4. Try saving to database directly:
   ```python
   from core.database import NeonDatabase
   db = NeonDatabase()
   db.update_chapter(chapter_id, new_content)
   ```

### "AI continuation generation fails or times out"

**Problem:** Ollama request timing out

**Troubleshooting:**

1. **Is Ollama running?**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Reduce generation length:**
   - Edit `core/ollama_provider.py`
   - Change `num_predict` from 500 to 300

3. **Check system resources:**
   - Monitor RAM usage
   - Ensure sufficient disk space
   - Check CPU usage isn't maxed

4. **Try simpler prompt:**
   - Instead of: "Continue the epic battle scene with dramatic descriptions"
   - Try: "Continue the story"

### "Story context seems incomplete"

**Problem:** AI generation ignores previous chapters

**Solution:**
1. Click "Analyze Story" in editor
2. This updates narrative context (plot points, characters)
3. Check that story chapters are saved properly
4. Verify chapters appear in the chapter list

## Performance Issues

### "App is slow / loading takes forever"

**Problem:** Slow database or Ollama queries

**Solution:**

1. **Check database performance:**
   ```bash
   # Monitor from Neon console
   # Settings → Monitoring
   ```

2. **Optimize story queries:**
   - Close and reopen Streamlit
   - Clear cache: `streamlit cache clear`

3. **Reduce context size:**
   ```python
   # In core/memory_manager.py:
   self.max_context_chapters = 2  # Reduced from 3
   ```

4. **Use lighter Ollama model:**
   ```bash
   ollama pull orca-mini  # Very lightweight
   ```

### "High memory usage"

**Problem:** App consuming too much RAM

**Solution:**

1. **Restart Ollama:**
   - Close Ollama app
   - Restart it
   - Try generation again

2. **Use smaller model:**
   ```bash
   ollama pull orca-mini  # ~3.5GB total
   ```

3. **Reduce context:**
   - Set `max_context_chapters = 1`
   - Reduce `max_tokens = 250`

## Debugging Steps

### Enable Debug Logging

1. **Edit .streamlit/config.toml:**
   ```toml
   [logger]
   level = "debug"
   ```

2. **Check browser console:**
   - Press F12 in browser
   - Look for error messages
   - Copy full error for reference

3. **Check Streamlit logs:**
   ```bash
   # When running:
   streamlit run app.py
   # Errors will print in terminal
   ```

### Test Components Individually

```python
# Test database
from core.database import NeonDatabase
db = NeonDatabase()
stories = db.get_all_stories()
print(f"Stories: {len(stories)}")

# Test Ollama
from core.ollama_provider import OllamaProvider
ollama = OllamaProvider()
is_available = ollama.is_available()
print(f"Ollama available: {is_available}")

# Test memory manager
from core.memory_manager import MemoryManager
mm = MemoryManager()
context = mm.build_story_context(story_id)
print(f"Context length: {len(context)}")
```

## Getting Help

1. **Check the documentation:**
   - README.md - Full documentation
   - CONFIG.md - Configuration options
   - QUICKSTART.md - Quick setup guide
   - PROJECT_SUMMARY.md - Project overview

2. **Check the logs:**
   - Terminal output when running `streamlit run app.py`
   - Browser console (F12)
   - Database logs in Neon console

3. **Verify your setup:**
   ```bash
   # Run the setup wizard
   python scripts/setup.py
   ```

4. **Test connections:**
   ```bash
   # Test Neon
   psql "your_connection_string"
   
   # Test Ollama
   curl http://localhost:11434/api/tags
   ```

5. **Check official docs:**
   - Neon: https://neon.tech/docs
   - Ollama: https://ollama.ai
   - Streamlit: https://docs.streamlit.io

## Still Having Issues?

If you've tried the above steps:

1. **Collect information:**
   - Python version: `python --version`
   - System info: `uname -a` (macOS/Linux) or System Info (Windows)
   - Error messages from terminal or browser console
   - .env configuration (without passwords)

2. **Review the error:**
   - Read full error message
   - Check which component failed (database, Ollama, Streamlit)
   - Note the exact steps to reproduce

3. **Search for similar issues:**
   - GitHub issues in relevant repos
   - Stack Overflow
   - Project documentation

4. **Create a minimal test case:**
   - Test one component at a time
   - Isolate the problem
   - Verify with simple data

---

Remember: Most issues are configuration-related. Double-check your `.env` file and that Ollama is running before assuming there's a code problem!

**Happy debugging!** 🐛
