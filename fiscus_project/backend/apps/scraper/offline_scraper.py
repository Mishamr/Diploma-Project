"""
Offline HTML Scraper
====================
Reads local ``.html`` files from a directory, extracts structured data
(title, price, description) via BeautifulSoup, and writes the results
to ``output_data.json``.  Parsing failures are logged to
``scraping_errors.log`` without stopping the whole run.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

# ── Logging setup ─────────────────────────────────────────────────────
# Errors go to a dedicated file; info-level progress goes to the console.
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("offline_scraper")

_error_handler = logging.FileHandler("scraping_errors.log", encoding="utf-8")
_error_handler.setLevel(logging.WARNING)
_error_handler.setFormatter(
    logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
)
logger.addHandler(_error_handler)

# ── Constants ─────────────────────────────────────────────────────────
DEFAULT_INPUT_DIR = Path("./downloaded_pages")
DEFAULT_OUTPUT_FILE = Path("output_data.json")
FALLBACK = "N/A"


# ── Helpers ───────────────────────────────────────────────────────────
def _safe_text(element: Tag | None) -> str:
    """Return stripped text of a BS4 element, or FALLBACK if element is None.

    This is the central safety check: every extraction calls this helper
    so we never hit an AttributeError on a missing tag.
    """
    if element is None:
        return FALLBACK
    return element.get_text(strip=True) or FALLBACK


def parse_html_file(filepath: Path) -> dict[str, str]:
    """Parse a single HTML file and return extracted data.

    Raises on truly unexpected errors (corrupt encoding, OS errors, etc.)
    so the caller can log them per-file without killing the batch.
    """
    html = filepath.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")

    # Safety: each find() may return None; _safe_text handles that.
    title: str = _safe_text(soup.find("h1"))
    price: str = _safe_text(soup.find(class_="price-class"))
    description: str = _safe_text(soup.find(id="desc"))

    return {
        "source_file": filepath.name,
        "title": title,
        "price": price,
        "description": description,
    }


def scrape_directory(
    input_dir: Path = DEFAULT_INPUT_DIR,
    output_file: Path = DEFAULT_OUTPUT_FILE,
) -> list[dict[str, str]]:
    """Iterate over all .html files, parse each, and save results to JSON.

    Parameters
    ----------
    input_dir:
        Directory containing raw HTML files.
    output_file:
        Destination for the aggregated JSON output.

    Returns
    -------
    list[dict[str, str]]
        The collected records (also written to *output_file*).
    """
    html_files: list[Path] = sorted(input_dir.glob("*.html"))

    if not html_files:
        logger.warning("No .html files found in %s", input_dir)
        return []

    logger.info("Found %d HTML file(s) in %s", len(html_files), input_dir)

    results: list[dict[str, str]] = []

    for filepath in html_files:
        try:
            record = parse_html_file(filepath)
            results.append(record)
            logger.info("  ✔ %s", filepath.name)
        except Exception as exc:
            # Log the filename + error, then continue to the next file.
            logger.warning("File '%s' failed: %s", filepath.name, exc)

    # ── Write output ──────────────────────────────────────────────────
    output_file.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info(
        "Done. %d / %d file(s) parsed → %s",
        len(results),
        len(html_files),
        output_file,
    )
    return results


# ── Entrypoint ────────────────────────────────────────────────────────
if __name__ == "__main__":
    scrape_directory()
