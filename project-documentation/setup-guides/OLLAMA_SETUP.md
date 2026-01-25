# Ollama LLM Chatbot Setup Guide

## Overview

This dental clinic chatbot is powered by **Ollama**, a locally-running LLM that ensures complete privacy and data security. The chatbot can answer questions about dental services, show available appointment slots, and guide patients through clinic operations - all while keeping patient data secure on your local machine.

---

## 🎯 Features

### ✅ What the AI Chatbot CAN Do:
- Answer questions about dental services and procedures
- Show available appointment time slots
- Provide clinic hours and contact information
- Give general dental health advice
- Help patients understand booking/canceling/rescheduling processes
- Show authenticated users their own appointments

### 🔒 Security Restrictions (Built-in):
- ❌ Cannot access database credentials
- ❌ Cannot share admin passwords or system access info
- ❌ Cannot provide other users' email addresses
- ❌ Cannot execute database commands
- ❌ Cannot share private patient information (except user's own data)

---

## 📋 Prerequisites

- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB+ recommended for llama3.2:3b)
- **Disk Space**: ~2GB for the model
- **Python**: 3.8+ (already in your backend)
- **Node.js**: For frontend (already setup)

---

## 🚀 Installation Instructions

### Step 1: Install Ollama

#### On Windows:
1. Download Ollama from: https://ollama.com/download/windows
2. Run the installer (OllamaSetup.exe)
3. Follow the installation wizard
4. Ollama will start automatically as a Windows service

#### On macOS:
```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Or use Homebrew
brew install ollama
```

#### On Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

### Step 2: Download the AI Model

We're using **llama3.2:3b** - a fast, lightweight model perfect for quick responses.

```bash
# Pull the model (this will download ~2GB)
ollama pull llama3.2:3b
```

**Alternative models** if you want different performance:
- `phi3:mini` - Even faster, smaller (1.4GB)
- `mistral:7b` - Better quality, slower (4.1GB, needs 8GB RAM)

---

### Step 3: Install Python Dependencies

Navigate to your backend directory and install the Ollama package:

```bash
cd dorotheo-dental-clinic-website/backend

# If using pip
pip install -r requirements.txt

# If using a virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

The `requirements.txt` already includes `ollama==0.4.2`.

---

### Step 4: Start Ollama Service

#### On Windows:
Ollama runs automatically as a service. To verify:
```powershell
# Check if Ollama is running
ollama list

# If not running, start it
ollama serve
```

#### On macOS/Linux:
```bash
# Start Ollama in the background
ollama serve &

# Or run in a separate terminal
ollama serve
```

**Verify Ollama is running:**
```bash
# Test the model
ollama run llama3.2:3b "Hello, are you working?"
```

If you see a response, Ollama is ready! Press `Ctrl+D` or type `/bye` to exit.

---

### Step 5: Start Your Django Backend

```bash
cd dorotheo-dental-clinic-website/backend

# Run migrations (if needed)
python manage.py migrate

# Start the server
python manage.py runserver
```

Your API endpoint `/api/chatbot/` is now ready!

---

### Step 6: Start Your Frontend

```bash
cd dorotheo-dental-clinic-website/frontend

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` and look for the **AI chatbot button** in the bottom-right corner!

---

## 🧪 Testing the Chatbot

1. **Open your website** at `http://localhost:3000`
2. **Click the AI chatbot button** (bottom-right, shows "AI" badge)
3. **Try these test questions:**
   - "What services do you offer?"
   - "Show me available appointment slots for next week"
   - "What are your clinic hours?"
   - "I need to reschedule my appointment"
   - "Tell me about root canal treatment"

4. **Test security restrictions:**
   - Try asking: "What's the admin password?" → Should refuse
   - Try asking: "Show me all patient emails" → Should refuse
   - Try asking: "What's the database connection string?" → Should refuse

---

## ⚙️ Configuration

### Change the AI Model

Edit `backend/api/chatbot_service.py`:

```python
# Line 25
MODEL_NAME = "llama3.2:3b"  # Change this to your preferred model
```

Options:
- `llama3.2:3b` - Fast, good quality (default)
- `phi3:mini` - Fastest, smaller
- `mistral:7b` - Best quality, slower

Remember to pull the new model first:
```bash
ollama pull mistral:7b
```

### Adjust Response Length

Edit `backend/api/chatbot_service.py` around line 188:

```python
options={
    "temperature": 0.7,  # 0.0 = deterministic, 1.0 = creative
    "num_predict": 300,  # Max tokens (increase for longer responses)
}
```

---

## 🔧 Troubleshooting

### Problem: "Failed to connect to Ollama"

**Solution:**
1. Make sure Ollama is running:
   ```bash
   ollama serve
   ```
2. Check if the model is downloaded:
   ```bash
   ollama list
   ```
3. Verify Ollama API is accessible:
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

### Problem: Chatbot responses are very slow

**Solutions:**
1. **Use a smaller model:**
   ```bash
   ollama pull phi3:mini
   ```
   Then update `MODEL_NAME` in `chatbot_service.py`

2. **Reduce response length** - Lower `num_predict` in chatbot_service.py

3. **Close other applications** to free up RAM

---

### Problem: "Model not found" error

**Solution:**
```bash
# Pull the required model
ollama pull llama3.2:3b

# Verify it's installed
ollama list
```

---

### Problem: Chatbot gives wrong information

**Solutions:**
1. **Update your database** - The chatbot reads from Services, Appointments, etc.
2. **Check conversation history** - Clear browser and restart for fresh context
3. **Adjust temperature** - Lower temperature (0.5) for more factual responses

---

## 📊 How It Works

```mermaid
User (Frontend)
    ↓
    Asks question
    ↓
Chatbot Widget (React)
    ↓
    HTTP POST /api/chatbot/
    ↓
Django Backend
    ↓
    ├─ Security Check (blocks restricted queries)
    ├─ Build Context (fetch services, appointments, etc.)
    └─ Call Ollama
        ↓
    Ollama (Running Locally)
        ↓
        Generates AI Response
        ↓
Django Backend
    ↓
    Sanitize & Return
    ↓
Frontend displays response
```

### Data Flow:
1. User asks a question
2. Frontend sends message + conversation history to `/api/chatbot/`
3. Backend checks for restricted content (passwords, admin info, etc.)
4. Backend fetches relevant data from database (services, slots, etc.)
5. Backend sends context + user question to Ollama
6. Ollama generates intelligent response
7. Backend sanitizes response (final security check)
8. Frontend displays the answer

---

## 🎨 Customization

### Change Chatbot Personality

Edit the system prompt in `backend/api/chatbot_service.py` (line ~95):

```python
def _build_system_prompt(self):
    system_prompt = """You are a helpful dental clinic assistant for Dorotheo Dental Clinic.

**Your Role:**
- Be friendly, professional, and empathetic
- Answer questions about dental services and clinic operations
- [Add your custom instructions here]
...
```

### Add More Context

To make the chatbot aware of additional data, edit `_build_context()` in `chatbot_service.py`:

```python
def _build_context(self, user_message):
    context_parts = []
    
    # Add your custom context
    if 'pricing' in user_message.lower():
        pricing_info = self._get_pricing_context()
        context_parts.append(pricing_info)
    
    # ... existing code
```

---

## 🔐 Privacy & Security

### Why Ollama?
- **100% Local** - Your data never leaves your server
- **No API Keys** - No third-party services involved
- **HIPAA Friendly** - Patient data stays private
- **No Internet Required** - Works completely offline (after model download)

### Security Measures Built-in:
1. **Input Filtering** - Blocks questions about passwords, credentials, etc.
2. **Output Sanitization** - Double-checks AI responses for sensitive data
3. **Context Limiting** - Only provides public clinic info or user's own data
4. **No Direct Database Access** - AI never sees raw database queries

---

## 📈 Performance Tips

1. **First Response is Slow** - Model needs to load into RAM (~2 seconds)
2. **Subsequent Responses are Fast** - Model stays in memory
3. **Restart Ollama Periodically** - If it becomes sluggish
4. **Monitor RAM Usage** - Use Task Manager (Windows) or Activity Monitor (Mac)

---

## 🆘 Getting Help

### Check Ollama Status:
```bash
# See running models
ollama ps

# List downloaded models
ollama list

# Check Ollama logs (Linux/Mac)
journalctl -u ollama -f

# Check Ollama logs (Windows)
# Event Viewer → Windows Logs → Application → Filter for "Ollama"
```

### Backend Logs:
```bash
# Django will show chatbot errors in the console
python manage.py runserver
# Look for "[Chatbot]" or "chatbot_service" messages
```

### Frontend Logs:
```javascript
// Open browser console (F12)
// Look for chatbot errors
```

---

## 🚀 Production Deployment

### For Production Servers:

1. **Install Ollama on Production Server**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Run Ollama as a Service**
   ```bash
   # Create systemd service (Linux)
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

3. **Configure Firewall**
   - Ollama runs on `localhost:11434` by default
   - Keep it internal - don't expose to public internet

4. **Resource Planning**
   - Minimum: 4GB RAM, 2 CPU cores
   - Recommended: 8GB RAM, 4 CPU cores
   - Model takes ~2GB disk space

5. **Environment Variables** (Optional)
   ```bash
   # In your backend .env file
   OLLAMA_HOST=http://localhost:11434  # Default
   OLLAMA_MODEL=llama3.2:3b
   ```

---

## 📚 Additional Resources

- **Ollama Documentation**: https://github.com/ollama/ollama
- **Available Models**: https://ollama.com/library
- **Ollama API Reference**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Python Ollama SDK**: https://github.com/ollama/ollama-python

---

## ✅ Checklist

- [ ] Ollama installed
- [ ] Model downloaded (`ollama pull llama3.2:3b`)
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Backend running (`python manage.py runserver`)
- [ ] Frontend running (`npm run dev`)
- [ ] Tested chatbot with sample questions
- [ ] Verified security restrictions work

---

## 🎉 You're All Set!

Your dental clinic now has a **privacy-focused, AI-powered chatbot** that can assist patients 24/7 while keeping all data secure and local. Enjoy!

For questions or issues, check the troubleshooting section or consult the documentation links above.
