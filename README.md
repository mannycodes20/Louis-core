# Louis

Your personal AI assistant. A private chatbot that runs entirely on your own PC. It uses
[Ollama](https://ollama.com) to run the AI model on your GPU,
[LangChain](https://python.langchain.com) to talk to it, and
[Streamlit](https://streamlit.io) for the chat window.

Based on [Chatbot-Using-Langchain](https://github.com/KalyanM45/Chatbot-Using-Langchain),
rebuilt on current libraries with chat history, streaming replies and local models.

## Features

- Chat window that remembers the conversation
- Replies stream in word by word
- Pick any model you've installed in Ollama from the sidebar
- Change the bot's personality (system prompt) and creativity live
- No API keys, no cost, nothing leaves your machine

## Setup (Windows)

1. **Install Ollama** from https://ollama.com/download and start it (it runs in the system tray).
2. **Download a model.** Open a terminal (PowerShell) and run:
   ```
   ollama pull gemma3:12b
   ```
3. **Install Python 3.11 or newer** from https://www.python.org/downloads/ (tick "Add python.exe to PATH").
4. **Start the chatbot:** double-click `start.bat`. The first run installs everything,
   then your browser opens at http://localhost:8501.

Manual alternative to step 4:
```
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

## Which model?

Your RTX 5070 has 12 GB of video memory. These fit fully on the GPU and run fast:

| Model | Command | Good for |
|---|---|---|
| Gemma 3 12B (default) | `ollama pull gemma3:12b` | Best all-rounder at this size |
| Llama 3.1 8B | `ollama pull llama3.1:8b` | Fast, solid general chat |
| Qwen 2.5 Coder 7B | `ollama pull qwen2.5-coder:7b` | Programming help |

Bigger models (20B+) will still run using your 32 GB of RAM, just much slower.
Every model you pull shows up in the sidebar.

## Customising

Copy `.env.example` to `.env` to change the assistant's name, what he calls you, the default model or his personality.
