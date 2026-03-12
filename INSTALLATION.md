# Installation & Setup Guide - AI NarrativeFlow

Complete step-by-step installation instructions for all operating systems.

## System Requirements

Before starting, ensure your system meets these requirements:

- **Python:** 3.9 or higher
- **RAM:** 8GB minimum (16GB+ recommended for Ollama)
- **Disk Space:** 15GB (5GB for Ollama models)
- **Internet:** Required for Neon database and initial setup
- **OS:** Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Browser:** Modern browser (Chrome, Firefox, Safari, Edge)

## Step-by-Step Installation

### Step 1: Install Python (if needed)

**Windows:**
1. Download Python from https://www.python.org/downloads/
2. Run the installer
3. Check "Add Python to PATH"
4. Click "Install Now"

**macOS:**
```bash
# Using Homebrew (recommended)
brew install python@3.11

# Or download from python.org
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install python3.11 python3.11-venv python3-pip
```

**Verify installation:**
```bash
python --version  # Should show Python 3.9+
pip --version     # Should show pip version
```

### Step 2: Download/Clone the Project

**Option A: Download ZIP**
1. Download the project ZIP file
2. Extract to desired location
3. Open terminal/command prompt in that folder

**Option B: Clone from Git**
```bash
git clone https://github.com/yourusername/ai-narrative-cowriter.git
cd ai-narrative-cowriter
```

### Step 3: Create Virtual Environment

A virtual environment isolates project dependencies from system Python.

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` at the start of your terminal prompt.

### Step 4: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**What this installs:**
- `streamlit` - Web app framework
- `psycopg[binary]` - PostgreSQL adapter
- `python-dotenv` - Environment configuration
- `requests` - HTTP library

Wait for installation to complete (1-2 minutes typical).

### Step 5: Setup Neon Database

1. **Create Neon Account:**
   - Go to https://neon.tech
   - Sign up (free account available)
   - Create a new project

2. **Get Connection String:**
   - In Neon dashboard, go to Connection Pooling
   - Copy the connection string
   - It looks like: `postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname`

3. **Create `.env` File:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` File:**
   - Open `.env` in a text editor
   - Replace the example `NEON_DB_URL` with your actual connection string
   - Save the file

   **Example `.env` file:**
   ```
   NEON_DB_URL=postgresql://myuser:mypassword@ep-xyz123.us-east-1.neon.tech/mydb
   OLLAMA_BASE_URL=http://localhost:11434
   ```

5. **Initialize Database:**
   ```bash
   python scripts/init_database.py
   ```

   **Expected output:**
   ```
   ✓ Created stories table
   ✓ Created chapters table
   ✓ Created narrative_context table
   ✓ Created indices

   ✅ Database initialized successfully!
   ```

### Step 6: Install and Setup Ollama

1. **Download Ollama:**
   - Go to https://ollama.ai
   - Download for your operating system
   - Run the installer and complete installation

2. **Start Ollama:**
   - **macOS/Windows:** Open the Ollama app
   - **Linux:** Run `ollama serve` in terminal

3. **Pull Mistral Model:**
   ```bash
   ollama pull mistral
   ```
   - First pull takes 5-10 minutes (downloading ~4GB)
   - Subsequent pulls are instant

4. **Verify Ollama is Running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

   **Expected output:** JSON with available models
   ```json
   {
     "models": [
       {
         "name": "mistral:latest",
         "modified_at": "2024-01-01T00:00:00Z",
         "size": 4289505280,
         "digest": "..."
       }
     ]
   }
   ```

### Step 7: Run the Application

You'll need two terminal windows/tabs:

**Terminal 1 - Ollama (keep running):**
- macOS/Windows: Ollama app should stay open in background
- Linux: Keep `ollama serve` running in terminal

**Terminal 2 - Streamlit App:**
```bash
# Make sure venv is activated
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Run the app
streamlit run app.py
```

**Expected output:**
```
  You can now view your Streamlit app in your browser.

  Local URL: http://localhost:8501
  Network URL: http://192.168.1.x:8501
```

3. **Open in Browser:**
   - Click the URL or manually go to `http://localhost:8501`
   - You should see the AI NarrativeFlow dashboard

## Troubleshooting Installation

### "Python not found" after installation

**Windows:**
- Close and reopen Command Prompt/PowerShell
- Or add Python to PATH manually in System Environment Variables

**macOS:**
```bash
# Use python3 instead of python
python3 --version
```

### "pip: command not found"

```bash
# Use Python's pip module directly
python -m pip install -r requirements.txt
```

### "Permission denied" when running scripts

**macOS/Linux:**
```bash
chmod +x scripts/init_database.py
python scripts/init_database.py
```

### "Module not found" errors

- Ensure virtual environment is activated (you should see `(venv)` in prompt)
- Reinstall dependencies:
  ```bash
  pip install --upgrade -r requirements.txt
  ```

### "Cannot connect to Neon"

1. Check `.env` file has correct connection string
2. Verify connection string is in quotes if it contains special characters
3. Restart the application
4. Check Neon project is active in dashboard

### "Ollama service is not running"

- macOS/Windows: Open Ollama app from Applications
- Linux: Run `ollama serve` in separate terminal
- Wait 5 seconds before starting Streamlit

### Mistral model download stuck

- Check internet connection
- Try pulling again: `ollama pull mistral`
- Check disk space (need 5GB minimum)

## Using Interactive Setup

Skip manual setup and use the interactive wizard:

```bash
# Activate venv first
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Run setup wizard
python scripts/setup.py
```

The wizard will:
- Guide you through environment configuration
- Verify all dependencies are installed
- Test database connection
- Test Ollama connection
- Initialize database schema
- Provide next steps

## Post-Installation Verification

After installation, verify everything works:

### 1. Test Database Connection
```bash
python
>>> from core.database import NeonDatabase
>>> db = NeonDatabase()
>>> stories = db.get_all_stories()
>>> print(f"Database OK: {len(stories)} stories")
>>> exit()
```

### 2. Test Ollama Connection
```bash
python
>>> from core.ollama_provider import OllamaProvider
>>> ollama = OllamaProvider()
>>> print(f"Ollama available: {ollama.is_available()}")
>>> exit()
```

### 3. Test Memory Manager
```bash
python
>>> from core.memory_manager import MemoryManager
>>> mm = MemoryManager()
>>> print("Memory manager OK")
>>> exit()
```

### 4. Test Streamlit UI
```bash
streamlit run app.py
# Open http://localhost:8501 in browser
# Should see dashboard with story templates
```

## File Structure After Installation

```
AI Narrative Co-Writer/
├── app.py                    # Main app
├── requirements.txt          # Dependencies
├── .env                      # Your configuration (created)
├── .env.example              # Example config
│
├── .streamlit/
│   └── config.toml           # Streamlit settings
│
├── core/
│   ├── database.py           # Database operations
│   ├── ollama_provider.py    # AI integration
│   └── memory_manager.py     # Context management
│
├── views/
│   ├── home.py               # Dashboard
│   └── editor.py             # Story editor
│
├── pages/
│   └── editor.py             # Multi-page support
│
├── scripts/
│   ├── init_database.py      # Setup database
│   └── setup.py              # Interactive setup
│
├── styles/
│   └── style.css             # UI styling
│
└── docs/
    ├── README.md             # Full documentation
    ├── QUICKSTART.md         # Quick start
    ├── CONFIG.md             # Configuration
    ├── TROUBLESHOOTING.md    # Troubleshooting
    └── INSTALLATION.md       # This file
```

## Environment-Specific Setup

### For Windows Users

1. **Use PowerShell or Command Prompt (Admin)**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Create batch file to automate startup:**
   Create `run.bat`:
   ```batch
   @echo off
   venv\Scripts\activate
   streamlit run app.py
   ```
   Then double-click `run.bat` to start

### For macOS Users

1. **Create shell script to automate startup:**
   Create `run.sh`:
   ```bash
   #!/bin/bash
   source venv/bin/activate
   streamlit run app.py
   ```
   
2. **Make executable:**
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

### For Linux Users

1. **Install system dependencies:**
   ```bash
   sudo apt-get install build-essential python3-dev
   ```

2. **Create systemd service (optional):**
   ```bash
   sudo nano /etc/systemd/system/narrative-flow.service
   ```

## Upgrading Installation

To update to the latest version:

```bash
# Activate venv
source venv/bin/activate

# Update dependencies
pip install --upgrade -r requirements.txt

# Pull latest Ollama models
ollama pull mistral
```

## Uninstalling

To remove the application:

**Keep data (safe):**
```bash
# Deactivate venv
deactivate

# Remove only Python packages, keep .env and data
rm -rf venv
```

**Remove everything:**
```bash
# Deactivate venv
deactivate

# Remove entire project directory (deletes .env and all data)
rm -rf AI-Narrative-CoWriter/
```

**Note:** Database data stays in Neon until you delete the project in Neon console.

## Next Steps After Installation

1. **Create your first story:**
   - Go to http://localhost:8501
   - Click "Start Writing"
   - Choose a story template

2. **Read the documentation:**
   - See QUICKSTART.md for 5-minute tutorial
   - See README.md for full feature documentation

3. **Configure (optional):**
   - See CONFIG.md for advanced settings
   - Adjust Ollama model for better results

4. **Get help:**
   - See TROUBLESHOOTING.md for common issues
   - Check Neon docs: https://neon.tech/docs
   - Check Ollama docs: https://ollama.ai
   - Check Streamlit docs: https://docs.streamlit.io

## Getting Support

If you encounter issues during installation:

1. **Check TROUBLESHOOTING.md** - Most issues are covered
2. **Verify requirements are met** - Python 3.9+, 8GB RAM, internet
3. **Run `python scripts/setup.py`** - Interactive setup can diagnose issues
4. **Check the logs** - Terminal output usually shows the problem
5. **Seek community help** - GitHub issues, Stack Overflow, etc.

---

**Congratulations!** Your AI NarrativeFlow installation is complete. Happy writing! ✨

For questions, refer to:
- **Quick questions:** QUICKSTART.md
- **How to use:** README.md
- **Configuration:** CONFIG.md
- **Problems:** TROUBLESHOOTING.md
