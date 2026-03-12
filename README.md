# AI NarrativeFlow Co-Writer

Transform collaborative storytelling with memory-driven AI. A Streamlit-based application that enables real-time creative collaboration between users and an AI narrative strategist.

## 🎯 Project Goals

**AI NarrativeFlow** is a memory-driven storytelling assistant that:
- ✨ Enables real-time collaborative storytelling between user and AI
- 🧠 Maintains contextual memory across multiple interactions
- 📖 Ensures coherence in plot, tone, and character development
- 💡 Provides an intuitive interface for seamless user engagement

In simple terms: **Transform AI from a content generator into a creative partner that thinks along with the user.**

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Neon PostgreSQL account (free tier available)
- Ollama installed and running locally
- pip or pip (Python package manager)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repo-url>
cd AI-Narrative-Co-Writer

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Setup Neon Database

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** (free tier available)
3. **Copy the connection string**
4. **Create `.env` file** in project root:

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your Neon connection string
NEON_DB_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Initialize Database Schema

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

### 4. Setup Ollama (Local LLM)

Ollama runs LLMs locally on your machine. No API keys needed!

1. **Download Ollama** from [ollama.ai](https://ollama.ai)
2. **Install and run** Ollama application
3. **Pull the Mistral model** (recommended for creative writing):

```bash
ollama pull mistral
```

Verify it's running:
```bash
curl http://localhost:11434/api/tags
```

### 5. Run the Application

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`

## 📖 Usage Guide

### Dashboard (Home Page)
- **Start Writing**: Choose from story templates (Hero's Journey, Mystery Box, Three-Act, Custom Flow)
- **Active Stories**: View all your ongoing stories in grid or list view
- **Create Story**: Click "+ New Story" to start from scratch

### Story Editor
- **Split Layout**: 
  - Left: Story editor with chapters
  - Right: AI Narrative Strategist panel
- **Write & Continue**: Add chapters and request AI continuations
- **AI Suggestions**: Get real-time narrative, thematic, and character consistency advice
- **Story Analysis**: Click "Analyze Story" to extract key plot points and characters

## 🏗️ Project Structure

```
AI Narrative Co-Writer/
├── app.py                    # Main Streamlit app entry point
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .streamlit/
│   └── config.toml          # Streamlit configuration
├── scripts/
│   └── init_database.py      # Database schema initialization
├── core/
│   ├── __init__.py
│   ├── database.py           # Neon PostgreSQL operations
│   ├── ollama_provider.py    # Ollama LLM integration
│   └── memory_manager.py     # Smart context extraction
├── views/
│   ├── __init__.py
│   ├── home.py               # Dashboard/home page
│   └── editor.py             # Story editor page
└── styles/
    └── style.css             # Custom CSS styling
```

## 🔌 Integration Details

### Database (Neon PostgreSQL)

**Tables:**
- `stories`: Story metadata (title, description, status, timestamps)
- `chapters`: Individual chapters with content
- `narrative_context`: Plot points, character arcs, thematic elements

**Operations:**
- Create/read/update/delete stories and chapters
- Store narrative metadata (JSONB format)
- Track story evolution over time

### LLM (Ollama)

**Model:** Mistral (balanced for creative writing)
**Capabilities:**
- Story continuation generation
- Plot point extraction
- Character arc analysis
- Narrative suggestions
- Thematic connection detection

**Local Operation:** Runs entirely on your machine, no API calls needed!

### Memory System

**Smart Context Extraction:**
- Retrieves last N chapters (default: 3)
- Extracts key plot points from narrative metadata
- Builds character profiles
- Creates focused context window for Ollama

## 🎨 Features

### Story Management
- ✅ Create stories from templates
- ✅ Create multiple chapters
- ✅ Edit and save chapters
- ✅ Track story status (drafting, outlining, editing)
- ✅ View story history

### AI Collaboration
- ✅ Generate story continuations with AI
- ✅ Get narrative suggestions and improvements
- ✅ Identify thematic elements
- ✅ Track character consistency
- ✅ Smart context-aware generation

### UI/UX
- ✅ Responsive split-pane editor
- ✅ Story card templates
- ✅ Grid and list view options
- ✅ Real-time chapter editing
- ✅ AI panel with suggestions

## 🛠️ Troubleshooting

### "NEON_DB_URL environment variable not set"
- Ensure `.env` file exists in project root
- Check that `NEON_DB_URL` is correctly formatted
- Verify the connection string from Neon dashboard

### "Ollama service is not running"
- Make sure Ollama application is open
- Verify localhost:11434 is accessible
- Check: `curl http://localhost:11434/api/tags`

### "Failed to connect to Neon"
- Check internet connection
- Verify database is active in Neon dashboard
- Try resetting your database connection

### Slow story generation
- Check your internet connection
- Reduce `max_tokens` in generation
- Ensure Ollama has sufficient resources

## 📝 Configuration

### Streamlit Config (`.streamlit/config.toml`)
- Theme colors and fonts
- Server settings
- Logger configuration

### Environment Variables
- `NEON_DB_URL`: PostgreSQL connection string
- `OLLAMA_BASE_URL`: Local Ollama service URL (default: localhost:11434)

## 🚀 Performance Tips

1. **Chunk Large Stories**: Split long stories into chapters for better context
2. **Analyze Regularly**: Click "Analyze Story" to update character/theme tracking
3. **Optimize Prompts**: Clear, specific user directions generate better continuations
4. **Use Templates**: Story templates provide structure for better AI generation

## 🔮 Future Enhancements

- [ ] Multi-user collaboration
- [ ] Story branching (multiple endings)
- [ ] Export to PDF/Word
- [ ] Advanced narrative analytics
- [ ] Custom model fine-tuning
- [ ] Voice narration support
- [ ] Web-based collaboration

## 📄 License

This project is open source. Feel free to fork, modify, and use!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 💬 Support

For issues or questions:
- Check the Troubleshooting section
- Review Neon documentation: https://neon.tech/docs
- Check Ollama documentation: https://ollama.ai
- Review Streamlit docs: https://docs.streamlit.io

---

**Made with ✨ for creative writers who collaborate with AI**
