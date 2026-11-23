"""A local chatbot that runs on your own PC with Ollama, LangChain and Streamlit."""

import os

import ollama
import streamlit as st
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:12b")
BOT_NAME = os.getenv("BOT_NAME", "Louis")
USER_NAME = os.getenv("USER_NAME", "Emmanuel")
DEFAULT_SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    f"You are {BOT_NAME}, the personal AI assistant of {USER_NAME}. "
    "You run privately on their own PC. You are calm, capable and quietly witty, "
    "like a trusted chief of staff. Get to the point: answer first, then give detail "
    "only if it helps. You are strong at programming and explain code clearly. "
    f"Address {USER_NAME} by name now and then, not in every reply. "
    "If you are unsure or don't know something, say so plainly instead of guessing.",
)

st.set_page_config(page_title=BOT_NAME, page_icon="🤖", layout="centered")


@st.cache_data(ttl=30, show_spinner=False)
def installed_models(base_url: str) -> list[str]:
    """Names of the models already pulled into Ollama, or [] if Ollama isn't reachable."""
    try:
        response = ollama.Client(host=base_url).list()
    except Exception:
        return []
    return sorted(m.model for m in response.models)


# ---------- Sidebar settings ----------
with st.sidebar:
    st.title("⚙️ Settings")

    models = installed_models(OLLAMA_BASE_URL)
    if not models:
        st.error(
            f"Can't reach Ollama at {OLLAMA_BASE_URL}, or no models are installed.\n\n"
            "Start the Ollama app, then run for example:\n\n"
            f"`ollama pull {DEFAULT_MODEL}`"
        )
        if st.button("Check again"):
            installed_models.clear()
            st.rerun()
        st.stop()

    model = st.selectbox(
        "Model",
        models,
        index=models.index(DEFAULT_MODEL) if DEFAULT_MODEL in models else 0,
    )
    temperature = st.slider(
        "Creativity (temperature)", 0.0, 1.5, 0.7, 0.1,
        help="Lower is more focused and factual, higher is more creative.",
    )
    system_prompt = st.text_area(
        "Personality (system prompt)", DEFAULT_SYSTEM_PROMPT, height=150
    )
    if st.button("🗑️ New chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# ---------- Chat ----------
st.title(f"🤖 {BOT_NAME}")
st.caption(f"Running locally on **{model}** with Ollama. Nothing leaves your PC.")

if "messages" not in st.session_state:
    st.session_state.messages = []  # list of HumanMessage / AIMessage

for msg in st.session_state.messages:
    role = "user" if isinstance(msg, HumanMessage) else "assistant"
    with st.chat_message(role):
        st.markdown(msg.content)

if prompt := st.chat_input(f"Ask {BOT_NAME} anything..."):
    st.session_state.messages.append(HumanMessage(prompt))
    with st.chat_message("user"):
        st.markdown(prompt)

    llm = ChatOllama(
        model=model,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
        num_ctx=8192,  # how much of the conversation the model can remember
    )
    history = [SystemMessage(system_prompt), *st.session_state.messages]

    with st.chat_message("assistant"):
        try:
            reply = st.write_stream(chunk.content for chunk in llm.stream(history))
        except Exception as err:
            st.session_state.messages.pop()  # let the user retry the same message
            st.error(f"The model failed to answer: {err}")
            st.stop()

    st.session_state.messages.append(AIMessage(reply))
