# Architecture - AI NarrativeFlow Co-Writer

Complete system architecture, data flow, and design decisions.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Streamlit Web Application                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    app.py (Entry Point)                  │   │
│  │         Session Management & CSS Loading                 │   │
│  └───────────────────┬─────────────────────────────────────┘   │
│                      │                                           │
│  ┌──────────────────┴──────────────────────┐                    │
│  │                                          │                    │
│  v                                          v                    │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │  views/home.py      │     │  views/editor.py             │   │
│  │  (Dashboard Page)   │     │  (Story Editor Page)         │   │
│  │                     │     │                              │   │
│  │ - Templates         │     │ - Chapter Manager            │   │
│  │ - Story List        │     │ - Story Content Editor       │   │
│  │ - Create Story      │     │ - AI Suggestions Panel       │   │
│  │ - Grid/List Toggle  │     │ - Generate Continuations     │   │
│  └──────────┬──────────┘     └────────────┬─────────────────┘   │
│             │                             │                      │
└─────────────┼─────────────────────────────┼──────────────────────┘
              │                             │
              └─────────────────┬───────────┘
                                │
                    ┌───────────v────────────┐
                    │   Core Modules         │
                    ├───────────────────────┤
                    │ core/database.py      │ ← Database Operations
                    │ core/ollama_provider  │ ← AI Generation
                    │ core/memory_manager   │ ← Smart Context
                    └───────────┬─────┬────┘
                                │     │
                    ┌───────────┘     └──────────┐
                    │                            │
        ┌───────────v──────────────┐  ┌────────v─────────────┐
        │   Neon PostgreSQL        │  │  Ollama LLM          │
        │   (Cloud Database)       │  │  (Local AI)          │
        │                          │  │                      │
        │ - stories table          │  │ - Mistral 7B Model   │
        │ - chapters table         │  │ - Story Generation   │
        │ - narrative_context      │  │ - Analysis & Parsing │
        │                          │  │                      │
        │ Connection: NEON_DB_URL  │  │ URL: localhost:11434 │
        └──────────────────────────┘  └──────────────────────┘
```

## Data Flow Diagram

### Story Creation Flow
```
User Input (Dashboard)
  ↓
views/home.py (render_new_story_modal)
  ↓
core/database.py (create_story)
  ↓
INSERT into stories table
  ↓
Return story_id
  ↓
Session state updated → Navigate to editor
```

### Story Continuation Flow
```
User Input (Editor)
  ┌─────────────────────────────────────────────┐
  │ User describes next scene                   │
  └──────────────────┬──────────────────────────┘
                     ↓
  ┌──────────────────────────────────────────────────┐
  │ core/memory_manager.py                          │
  │ build_story_context(story_id)                    │
  └──────────┬───────────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Fetch from Neon:                             │
  │ - Story metadata                             │
  │ - Last 3 chapters                            │
  │ - Plot points, characters, themes            │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Build comprehensive context string           │
  │ Combine with user prompt                     │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────────┐
  │ core/ollama_provider.py                          │
  │ generate_continuation(context + prompt)          │
  └──────────┬────────────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Send HTTP request to Ollama API              │
  │ localhost:11434/api/generate                 │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Ollama processes with Mistral model          │
  │ (5-10 seconds typical)                       │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Return generated text                        │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Display in Streamlit UI                      │
  │ User can accept/edit/add to chapter          │
  └──────────┬──────────────────────────────────┘
             ↓
  ┌──────────────────────────────────────────────┐
  │ Save updated chapter to Neon                 │
  │ UPDATE chapters SET content = ...            │
  └──────────────────────────────────────────────┘
```

### Memory & Context Extraction Flow
```
Story Analysis Request
  ↓
core/memory_manager.py (update_narrative_memory)
  ↓
Fetch all chapters for story
  ↓
Send full text to Ollama (extract_key_elements)
  ↓
Ollama analyzes:
  ├─ Plot points and major events
  ├─ Characters and descriptions
  └─ Thematic elements
  ↓
Parse AI response (JSON extraction)
  ↓
Update narrative_context table in Neon
  ├─ key_plot_points (JSONB array)
  ├─ character_arcs (JSONB object)
  └─ thematic_elements (JSONB array)
  ↓
Next AI generation uses this metadata
```

## Module Responsibilities

### `app.py` - Application Entry Point
**Responsibilities:**
- Initialize Streamlit page configuration
- Initialize session state variables
- Load custom CSS styling
- Route between pages (home/editor)
- Handle global error management

**Key Functions:**
- `load_custom_css()` - Loads styles/style.css

**Dependencies:**
- streamlit
- views.home
- dotenv

---

### `core/database.py` - Database Layer
**Responsibilities:**
- Manage all database operations
- Handle Neon connection pooling
- Implement CRUD operations
- Manage schema and data integrity

**Key Classes:**
- `NeonDatabase` - Main database interface

**Key Methods:**
- `create_story()` - Add new story
- `get_story()` - Fetch single story
- `get_all_stories()` - Fetch user's stories
- `create_chapter()` - Add new chapter
- `get_story_chapters()` - Fetch all chapters for story
- `update_narrative_context()` - Save plot/character/theme data

**Database Tables:**
- `stories` - Story metadata
- `chapters` - Story content
- `narrative_context` - Extracted story elements

**Dependencies:**
- psycopg (PostgreSQL)
- uuid
- json
- datetime

---

### `core/ollama_provider.py` - AI Integration
**Responsibilities:**
- Manage Ollama LLM connections
- Generate story continuations
- Extract story elements (plot, characters, themes)
- Provide narrative suggestions
- Handle model availability and pulling

**Key Classes:**
- `OllamaProvider` - Ollama API interface

**Key Methods:**
- `is_available()` - Check if Ollama is running
- `generate_continuation()` - Generate story text
- `extract_key_elements()` - Analyze story for metadata
- `get_narrative_suggestions()` - Provide improvement suggestions
- `get_available_models()` - List installed models
- `pull_model()` - Download model from Ollama registry

**API Endpoints Used:**
- `GET /api/tags` - List available models
- `POST /api/generate` - Generate text
- `POST /api/pull` - Download models

**Configuration:**
- Model: Mistral 7B (default)
- Temperature: 0.7 (balanced creativity)
- Max tokens: 500 (generation length)

**Dependencies:**
- requests (HTTP)
- json (parsing)
- os, dotenv (configuration)

---

### `core/memory_manager.py` - Context Management
**Responsibilities:**
- Extract smart context from stories
- Build comprehensive prompts for AI
- Manage narrative metadata
- Implement memory optimization

**Key Classes:**
- `MemoryManager` - Context extraction and management

**Key Methods:**
- `build_story_context()` - Create full context window
- `extract_summary()` - Create brief story summary
- `get_character_info()` - Retrieve character details
- `get_thematic_elements()` - Get story themes
- `update_narrative_memory()` - Analyze and cache story metadata
- `prepare_continuation_prompt()` - Format prompt with context

**Context Components:**
1. Story title and description
2. Plot points (from narrative_context)
3. Characters and arcs (from narrative_context)
4. Thematic elements (from narrative_context)
5. Last 3 chapters (configurable)

**Dependencies:**
- core.database
- core.ollama_provider
- typing (type hints)

---

### `views/home.py` - Dashboard Page
**Responsibilities:**
- Display story templates
- Show user's stories
- Manage story creation
- Provide story management interface

**Key Functions:**
- `render_home()` - Main dashboard render
- `render_story_card_grid()` - Grid view card
- `render_story_card_list()` - List view card
- `render_new_story_modal()` - Creation form
- `create_story_from_template()` - Template initialization

**Features:**
- 4 story templates (Hero's Journey, Mystery Box, Three-Act, Custom)
- Grid and list view toggle
- Story search/filter (ready)
- Quick edit/delete actions
- Story metadata display

**Dependencies:**
- streamlit
- core.database
- datetime

---

### `views/editor.py` - Story Editor Page
**Responsibilities:**
- Display and edit story chapters
- Manage story continuation
- Show AI suggestions
- Handle chapter management

**Key Functions:**
- `render_editor()` - Main editor interface
- `generate_story_continuation()` - Call AI generation

**Features:**
- Split-pane layout (content + AI panel)
- Chapter selector
- Chapter editor with save
- Chapter creation
- Status management
- AI suggestion panel
- Story analysis button
- Character tracking
- Theme tracking

**Dependencies:**
- streamlit
- core.database
- core.ollama_provider
- core.memory_manager
- datetime

---

### `styles/style.css` - Styling
**Responsibilities:**
- Define color scheme and theme
- Style all UI components
- Ensure responsive design
- Implement animations

**Color System:**
- Primary: #2563EB (blue)
- Secondary: #7C3AED (purple)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Danger: #EF4444 (red)

**Key Style Classes:**
- `.story-card` - Story display cards
- `.ai-panel` - AI suggestion panel
- `.editor-container` - Split pane layout
- `.status-badge` - Story status indicators
- `.template-card` - Story template cards

---

## Database Schema Details

### Stories Table
```sql
Column              Type        Constraints
─────────────────────────────────────────────
id                  UUID        PRIMARY KEY
title               TEXT        NOT NULL
description         TEXT        
status              TEXT        CHECK (drafting|outlining|editing)
created_at          TIMESTAMP   DEFAULT now()
updated_at          TIMESTAMP   DEFAULT now()
user_id             TEXT        NOT NULL (DEFAULT 'default_user')
metadata            JSONB       DEFAULT {}
─────────────────────────────────────────────
Indexes: user_id
```

### Chapters Table
```sql
Column              Type        Constraints
─────────────────────────────────────────────
id                  UUID        PRIMARY KEY
story_id            UUID        FK → stories(id) CASCADE
chapter_num         INTEGER     NOT NULL
title               TEXT        NOT NULL
content             TEXT        
created_at          TIMESTAMP   DEFAULT now()
updated_at          TIMESTAMP   DEFAULT now()
─────────────────────────────────────────────
Indexes: story_id
Constraints: UNIQUE(story_id, chapter_num)
```

### Narrative Context Table
```sql
Column              Type        Constraints
─────────────────────────────────────────────
id                  UUID        PRIMARY KEY
story_id            UUID        FK → stories(id) CASCADE UNIQUE
key_plot_points     JSONB       DEFAULT []
character_arcs      JSONB       DEFAULT {}
thematic_elements   JSONB       DEFAULT []
last_updated        TIMESTAMP   DEFAULT now()
─────────────────────────────────────────────
Constraints: UNIQUE(story_id)
```

## API Call Sequence Diagrams

### Normal Story Generation Flow
```
1. User Input
   └─> Streamlit captures text input

2. Context Building
   └─> Memory Manager queries Neon
       ├─> SELECT FROM stories
       ├─> SELECT FROM chapters
       └─> SELECT FROM narrative_context

3. Prompt Preparation
   └─> Combine context + user input + system instructions

4. AI Generation
   └─> HTTP POST to Ollama
       └─> Ollama processes with Mistral
           └─> Returns generated text

5. Display & Save
   └─> Show in Streamlit UI
   └─> Save to database if accepted

6. Memory Update (Optional)
   └─> Re-analyze story if "Analyze" clicked
   └─> Update narrative_context table
```

## Performance Considerations

### Database Performance
- **Connection Pooling**: Neon handles connection pooling (20 max free tier)
- **Indexed Queries**: Indexes on user_id and story_id for fast lookups
- **JSONB Storage**: Efficient storage and querying of metadata
- **Cascade Deletes**: Automatic cleanup when stories deleted

### AI Performance
- **Model Size**: Mistral 7B ~4GB, runs on CPU or GPU
- **Context Window**: Limited to last 3 chapters to manage token count
- **Temperature**: 0.7 for balanced creativity and coherence
- **Token Limit**: 500 tokens (~350 words) per generation

### Streamlit Performance
- **Session State**: Caches data between reruns
- **Lazy Loading**: Data fetched only when needed
- **CSS Optimization**: Single compiled stylesheet
- **Minimal Reruns**: Structured data flow to avoid unnecessary reruns

## Configuration & Customization Points

### Easy Customizations
```python
# Change AI Model (ollama_provider.py)
self.model = "llama2"

# Adjust context size (memory_manager.py)
self.max_context_chapters = 5

# Modify generation parameters (ollama_provider.py)
"temperature": 0.8
"top_p": 0.95
```

### Database Customizations
```sql
-- Add new story metadata fields
ALTER TABLE stories ADD COLUMN genre TEXT;

-- Add new narrative tracking
ALTER TABLE narrative_context ADD COLUMN tone JSONB;
```

### UI Customizations
```css
/* Change colors in style.css */
--primary-color: #FF6B6B;
--secondary-color: #4ECDC4;
```

## Error Handling Strategy

### Database Errors
- Graceful connection failure messages
- Automatic retry with backoff
- Clear instructions for configuration issues

### Ollama Errors
- Check availability before requests
- Timeout handling (30-60 second timeouts)
- Fallback to simple suggestions if generation fails
- Clear instructions for starting Ollama

### Streamlit Errors
- Try-except in main render functions
- User-friendly error messages
- Links to troubleshooting guide
- Session state recovery

## Security Architecture

### Data Protection
- Connection strings via environment variables
- No hardcoded secrets in code
- User isolation via user_id field
- SQL injection prevention (parameterized queries)

### Access Control
- Default user isolation
- Ready for multi-user authentication
- Database-level constraints
- Foreign key integrity

### Privacy
- All data stays in user's infrastructure
- No third-party API calls (except Neon)
- Local Ollama runs on user's machine
- No analytics or tracking

## Future Architecture Enhancements

### Potential Additions
1. **Authentication Layer**
   - User login system
   - Permission management
   - Multi-user support

2. **Caching Layer**
   - Redis for prompt caching
   - Faster suggestion generation
   - Response caching

3. **Queue System**
   - Async generation
   - Background processing
   - Multiple users support

4. **Analytics**
   - Writing statistics
   - Model performance metrics
   - Usage patterns

5. **Export System**
   - PDF/Word export
   - Markdown export
   - Story sharing

## Deployment Architecture

### Local Development
```
Laptop/Desktop
├─ Python + Streamlit
├─ Ollama (local)
├─ Neon connection (cloud)
└─ Browser
```

### Docker Deployment
```
Container
├─ Python environment
├─ Streamlit app
├─ (Optional) Local Ollama
└─ Neon connection
```

### Streamlit Cloud
```
Streamlit Cloud Servers
├─ Python runtime
├─ Streamlit app
├─ External Ollama connection
└─ Neon connection
```

## Summary

The architecture is:
- **Modular** - Easy to understand and modify
- **Scalable** - Database can grow with data
- **Performant** - Indexes and smart caching
- **Secure** - Environment variables and SQL parameterization
- **Extensible** - Ready for new features
- **Well-documented** - Clear code and comprehensive guides

The system successfully combines:
- Streamlit's ease of use
- PostgreSQL's reliability
- Ollama's privacy and control
- Smart context management for coherent AI

---

For questions about architecture, see CONFIG.md and TROUBLESHOOTING.md
