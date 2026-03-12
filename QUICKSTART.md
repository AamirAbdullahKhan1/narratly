# Quick Start Guide - AI NarrativeFlow

Get up and running in 5 minutes!

## Prerequisites Checklist

- [ ] Python 3.9+ installed
- [ ] Neon account created (free at neon.tech)
- [ ] Ollama downloaded and installed (from ollama.ai)

## 5-Minute Setup

### 1. Get Your Neon Connection String (2 min)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy your connection string (looks like: `postgresql://user:password@ep-xxx.neon.tech/dbname`)

### 2. Clone and Install (1 min)

```bash
cd AI-Narrative-Co-Writer
pip install -r requirements.txt
```

### 3. Configure Environment (1 min)

```bash
cp .env.example .env
# Edit .env and paste your Neon URL
```

Or run the interactive setup:
```bash
python scripts/setup.py
```

### 4. Initialize Database (30 sec)

```bash
python scripts/init_database.py
```

You should see:
```
✓ Created stories table
✓ Created chapters table
✓ Created narrative_context table
✓ Created indices

✅ Database initialized successfully!
```

### 5. Start Ollama and Run App (30 sec)

**In one terminal:**
```bash
ollama pull mistral  # First time only
# Ollama runs in background
```

**In another terminal:**
```bash
streamlit run app.py
```

Open `http://localhost:8501` and start writing!

## First Story: Hero's Journey

1. **Click "Start Writing"** → Select "Hero's Journey" template
2. **Title your story** → Enter your story details
3. **Write first chapter** → Add your opening scene
4. **Click "+ New Chapter"** → Continue your story
5. **Use "Generate Continuation"** → Let AI help with the next section
6. **Review & Edit** → AI suggests narrative improvements

## Keyboard Shortcuts

- `Ctrl+S` or `Cmd+S` - Save chapter (or use button)
- `Tab` - Move to next input field
- `Shift+Enter` - New line in text area

## Troubleshooting

### "Module not found" error
```bash
pip install -r requirements.txt
```

### "Cannot connect to Neon"
- Check your `.env` file has correct `NEON_DB_URL`
- Verify you're connected to the internet
- Check Neon project is active in dashboard

### "Ollama not responding"
- Ensure Ollama app is running on your machine
- Check `curl http://localhost:11434/api/tags` returns data
- Reinstall Ollama if needed

### Slow story generation
- Ensure Ollama has 8GB+ RAM available
- Try shorter story contexts
- Check your CPU/GPU usage

## Common Tasks

### Create New Story
Dashboard → "+ New Story" → Fill form → Create

### Edit Existing Story
Dashboard → Story card → Edit button

### Analyze Story (Extract Plot Points)
Editor → Right panel → "Analyze Story" button

### Get AI Suggestions
Editor → Right panel → "Get Suggestions"

### Change Story Status
Editor → Status dropdown (drafting → outlining → editing)

### View Multiple Chapters
Editor → "Select Chapter" dropdown

## Pro Tips

1. **Use Templates**: They provide structure for better AI suggestions
2. **Short Chapters**: Keep chapters 500-2000 words for best AI context
3. **Clear Prompts**: "Continue with a dramatic reveal" works better than "continue"
4. **Regular Analysis**: Click "Analyze Story" to keep character/theme tracking updated
5. **Save Often**: Click "Save Chapter" after each edit

## Project Structure Overview

```
app.py              - Main app (start here)
core/
  database.py       - Neon database operations
  ollama_provider.py - AI story generation
  memory_manager.py - Smart context extraction
views/
  home.py           - Dashboard
  editor.py         - Story editor
styles/
  style.css         - UI styling
scripts/
  init_database.py  - Schema setup
  setup.py          - Interactive setup
```

## Next Steps

- Read the full [README.md](README.md) for detailed docs
- Explore the `.env.example` for more configuration options
- Check the Ollama models: `ollama list`
- Try different story templates

## Getting Help

- Check [README.md](README.md) troubleshooting section
- See [Ollama documentation](https://ollama.ai)
- Check [Neon documentation](https://neon.tech/docs)
- Review [Streamlit docs](https://docs.streamlit.io)

## System Requirements

- **CPU**: 2+ cores
- **RAM**: 8GB+ (for Ollama)
- **Disk**: 10GB+ (for Ollama models)
- **Network**: Internet for Neon database
- **OS**: Windows, macOS, or Linux

---

**You're all set! Happy writing with AI!** ✨
