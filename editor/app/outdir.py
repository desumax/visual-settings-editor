"""Output folders the visual editor's generators may replace.

A generator only deletes a folder it made itself (it holds the MARKER file) or an empty one. Any
other existing folder is left alone and the run stops, so pointing a generator at, say, a folder
that holds a published preview never erases it.
"""
import os
import shutil
import sys
from pathlib import Path

MARKER = ".made-by-visual-editor"


def _rmtree(path: Path):
    def onerror(func, p, _):
        os.chmod(p, 0o700)
        func(p)
    shutil.rmtree(path, onerror=onerror)


def owned(path: Path) -> bool:
    """True if the folder is missing, empty, or was made by one of these tools."""
    path = Path(path)
    return not path.exists() or (path.is_dir() and (not any(path.iterdir()) or (path / MARKER).exists()))


def clear(path: Path):
    """Deletes a folder these tools made (or an empty one); stops on any other existing folder."""
    path = Path(path)
    if not owned(path):
        sys.exit(f"{path} exists and was not made by this tool: pick a new or empty folder.")
    if path.exists():
        _rmtree(path)


def mark(path: Path):
    """Marks a folder as made by these tools, so a later run may replace it."""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    (path / MARKER).write_text("Made by the visual editor's build tools; safe for them to replace.\n")


def fresh(path: Path) -> Path:
    """An empty folder at path, marked as ours (replacing an earlier one these tools made)."""
    clear(path)
    mark(path)
    return Path(path)
