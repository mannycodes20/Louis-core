"""Louis's brain: the local model, his personality, memory and tools."""

import asyncio
from datetime import datetime

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_ollama import ChatOllama

from . import config, memory
from .tools import ALL_TOOLS, TOOLS_BY_NAME

PERSONALITY = f"""You are {config.BOT_NAME}, the personal AI assistant of {config.USER_NAME}, running privately on their PC.
You are calm, capable and quietly witty, like a trusted chief of staff. Answer first, then add detail only if it helps.
You are strong at research and programming.

How to work:
- For anything current or factual you aren't sure of (news, weather, prices, recent events), use web_search, then read_webpage for detail. Mention your sources briefly.
- When {config.USER_NAME} tells you something worth keeping (a preference, project, goal, person), save it with remember.
- To tidy the Desktop: call scan_desktop, explain the plan, and wait. Only call tidy_desktop after {config.USER_NAME} says yes.
- Never invent tool results. If something fails, say so.
- Your replies may be read aloud, so keep spoken answers short and natural: no tables, no long lists unless asked.
- Address {config.USER_NAME} by name now and then, not in every reply."""


class Brain:
    def __init__(self):
        self.model_name = config.OLLAMA_MODEL
        self.temperature = config.TEMPERATURE
        self.lock = asyncio.Lock()
        self._build()
        saved = memory.load_history()
        self.history = [HumanMessage(m["text"]) if m["role"] == "user" else AIMessage(m["text"]) for m in saved][-20:]

    def _build(self):
        self.llm = ChatOllama(
            model=self.model_name,
            base_url=config.OLLAMA_BASE_URL,
            temperature=self.temperature,
            num_ctx=8192,
            keep_alive=-1,    # keep the model loaded in the GPU so replies start instantly
            reasoning=False,  # skip "thinking" mode for speed
        ).bind_tools(ALL_TOOLS)

    def set_model(self, name: str | None = None, temperature: float | None = None):
        if name:
            self.model_name = name
        if temperature is not None:
            self.temperature = temperature
        self._build()

    async def warm_up(self):
        """Load the model into the GPU at startup so the first reply isn't slow."""
        try:
            await self.llm.ainvoke([HumanMessage("Reply with: ready")])
        except Exception as err:
            print(f"[louis] Warm-up failed (is Ollama running and is {self.model_name} pulled?): {err}")

    def clear(self):
        self.history = []
        memory.save_history([])

    async def respond(self, text: str, on_token, on_tool=None) -> str:
        """Answer one message. Streams text through on_token(str); reports tool use through on_tool(name, args)."""
        async with self.lock:
            now = datetime.now().strftime("%A %d %B %Y, %H:%M")
            system = SystemMessage(
                f"{PERSONALITY}\n\nThe current date and time is {now}.\n\n"
                f"What you remember about {config.USER_NAME}:\n{memory.memories_for_prompt()}"
            )
            messages = [system, *self.history[-20:], HumanMessage(text)]
            reply_text = ""

            for _ in range(6):  # allow a few rounds of tool use
                full = None
                async for chunk in self.llm.astream(messages):
                    full = chunk if full is None else full + chunk
                    if chunk.content:
                        reply_text += chunk.content
                        await on_token(chunk.content)
                if full is None or not full.tool_calls:
                    break
                messages.append(full)
                for call in full.tool_calls:
                    if on_tool:
                        await on_tool(call["name"], call["args"])
                    tool = TOOLS_BY_NAME.get(call["name"])
                    try:
                        result = await asyncio.to_thread(tool.invoke, call["args"]) if tool else "Unknown tool."
                    except Exception as err:
                        result = f"Tool error: {err}"
                    messages.append(ToolMessage(str(result), tool_call_id=call["id"]))
                if reply_text and not reply_text.endswith((" ", "\n")):
                    reply_text += " "
                    await on_token(" ")

            reply_text = reply_text.strip() or "Sorry, I didn't manage an answer to that."
            self.history += [HumanMessage(text), AIMessage(reply_text)]
            memory.save_history(
                [{"role": "user" if isinstance(m, HumanMessage) else "ai", "text": m.content} for m in self.history]
            )
            return reply_text
