@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe py -m venv .venv
if not exist .venv\Scripts\streamlit.exe (
  echo Installing Louis for the first time...
  .venv\Scripts\python -m pip install -r requirements.txt
)
.venv\Scripts\streamlit run app.py
