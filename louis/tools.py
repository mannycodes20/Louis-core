"""Things Louis can do besides talk. The model decides when to use each one."""

import re
import webbrowser
from html.parser import HTMLParser

import httpx
from ddgs import DDGS
from langchain_core.tools import tool

from . import memory, system, tidy
from .config import PORT

# The server sets this so tools can update the dashboard (e.g. show a tidy plan).
notify_ui = lambda event: None  # noqa: E731


def search_web(query: str, max_results: int = 6) -> list[dict]:
    results = DDGS().text(query, max_results=max_results)
    return [{"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")} for r in results]


@tool
def web_search(query: str) -> str:
    """Search the web for current information, news, facts, prices or research. Returns titles, links and snippets."""
    try:
        results = search_web(query)
    except Exception as err:
        return f"Search failed: {err}"
    notify_ui({"type": "search_results", "query": query, "results": results})
    if not results:
        return "No results found."
    return "\n\n".join(f"[{i + 1}] {r['title']}\n{r['url']}\n{r['snippet']}" for i, r in enumerate(results))


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts, self._skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "nav", "footer", "header", "noscript", "svg"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "nav", "footer", "header", "noscript", "svg") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip and data.strip():
            self.parts.append(data.strip())


@tool
def read_webpage(url: str) -> str:
    """Read the main text of a web page. Use after web_search to read a result in detail."""
    try:
        r = httpx.get(url, timeout=12, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (Louis assistant)"})
        r.raise_for_status()
    except Exception as err:
        return f"Couldn't open the page: {err}"
    parser = _TextExtractor()
    parser.feed(r.text)
    text = re.sub(r"\s+", " ", " ".join(parser.parts))
    return text[:6000] or "The page had no readable text."


@tool
def remember(fact: str, tags: list[str] | None = None) -> str:
    """Save an important fact about the user (preferences, projects, people, goals) to long-term memory."""
    item = memory.add_memory(fact, tags or [])
    notify_ui({"type": "memories_changed"})
    return f"Saved to memory: {item['content']}"


@tool
def system_status() -> str:
    """Get the PC's current CPU, RAM, GPU and network usage and the top programs using memory."""
    return system.summary()


@tool
def scan_desktop() -> str:
    """Look at the user's Desktop and propose how to sort loose files into folders. Moves NOTHING."""
    result = tidy.scan()
    notify_ui({"type": "tidy_plan", "plan": result})
    return result["summary"] + " Ask the user if they want you to go ahead."


@tool
def tidy_desktop(user_confirmed: bool) -> str:
    """Move the Desktop files according to the last scan_desktop plan.
    ONLY call this after the user has clearly said yes to the plan in their latest message."""
    if not user_confirmed:
        return "Not done. Ask the user to confirm first."
    result = tidy.apply()
    notify_ui({"type": "tidy_done", "result": result})
    return result["summary"]


@tool
def undo_tidy() -> str:
    """Undo the last Desktop tidy and put every file back where it was."""
    result = tidy.undo()
    notify_ui({"type": "tidy_done", "result": result})
    return result["summary"]


@tool
def open_website(url: str) -> str:
    """Open a website in the user's browser (e.g. YouTube, GitHub, a search result)."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Opened {url}"


@tool
def open_dashboard() -> str:
    """Open Louis's own dashboard in the browser."""
    webbrowser.open(f"http://localhost:{PORT}")
    return "Dashboard opened."


ALL_TOOLS = [web_search, read_webpage, remember, system_status, scan_desktop,
             tidy_desktop, undo_tidy, open_website, open_dashboard]
TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}
