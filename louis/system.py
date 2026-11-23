"""Live stats about your PC for the dashboard's monitor panel."""

import shutil
import subprocess
import time

import psutil

_BOOT = psutil.boot_time()
psutil.cpu_percent()  # first call primes the counter
_last_net = (psutil.net_io_counters(), time.time())


def _gpu() -> dict | None:
    """Ask nvidia-smi for GPU load, memory and temperature (None if no NVIDIA GPU)."""
    if not shutil.which("nvidia-smi"):
        return None
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        ).stdout.strip().splitlines()[0]
        name, util, used, total, temp = [x.strip() for x in out.split(",")]
        return {"name": name, "util": float(util), "mem_used": float(used),
                "mem_total": float(total), "temp": float(temp)}
    except Exception:
        return None


def snapshot() -> dict:
    global _last_net
    now = time.time()
    net = psutil.net_io_counters()
    prev, prev_t = _last_net
    mbps = ((net.bytes_recv - prev.bytes_recv) + (net.bytes_sent - prev.bytes_sent)) / max(now - prev_t, 0.1) / 1e6
    _last_net = (net, now)

    procs = []
    for p in psutil.process_iter(["name", "cpu_percent", "memory_info"]):
        try:
            procs.append({"name": p.info["name"] or "?",
                          "cpu": round((p.info["cpu_percent"] or 0) / psutil.cpu_count(), 1),
                          "mem": round((p.info["memory_info"].rss if p.info["memory_info"] else 0) / 1e6)})
        except (psutil.Error, AttributeError):
            pass
    procs = [p for p in procs if p["name"] not in ("System Idle Process", "Idle")]
    procs.sort(key=lambda p: p["mem"], reverse=True)

    vm = psutil.virtual_memory()
    return {
        "cpu": psutil.cpu_percent(),
        "ram": vm.percent,
        "ram_used_gb": round(vm.used / 1e9, 1),
        "ram_total_gb": round(vm.total / 1e9, 1),
        "net_mbps": round(mbps, 2),
        "gpu": _gpu(),
        "uptime_s": int(now - _BOOT),
        "processes": procs[:4],
    }


def summary() -> str:
    s = snapshot()
    gpu = s["gpu"]
    gpu_text = (f"GPU {gpu['name']} at {gpu['util']:.0f}% load, {gpu['mem_used']:.0f}/{gpu['mem_total']:.0f} MB VRAM, {gpu['temp']:.0f}°C"
                if gpu else "GPU stats unavailable")
    return (f"CPU {s['cpu']:.0f}%, RAM {s['ram_used_gb']}/{s['ram_total_gb']} GB ({s['ram']:.0f}%), {gpu_text}, "
            f"network {s['net_mbps']} MB/s, up {s['uptime_s'] // 3600}h {(s['uptime_s'] % 3600) // 60}m. "
            f"Top memory users: " + ", ".join(f"{p['name']} {p['mem']} MB" for p in s["processes"]))
