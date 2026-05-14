import argparse
import os
import re
import sys
import unicodedata

import yaml
from pypdf import PdfReader


PARA_RE = re.compile(r"^(\d{1,4})\s+(.*)")


def extract_text(pdf_path):
    reader = PdfReader(pdf_path)
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            print(f"Warning: failed to read page {index}: {exc}", file=sys.stderr)
            text = ""
        pages.append(text)
    return unicodedata.normalize("NFC", "\n".join(pages))


def parse_paragraphs(text):
    paragraphs = {}
    current_id = None
    current_lines = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = PARA_RE.match(line)
        if match:
            if current_id is not None:
                paragraphs[current_id] = "\n".join(current_lines).strip()
            current_id = int(match.group(1))
            current_lines = [match.group(2).strip()]
            continue

        if current_id is not None:
            current_lines.append(line)

    if current_id is not None:
        paragraphs[current_id] = "\n".join(current_lines).strip()

    return paragraphs


def build_yaml(paragraphs, title):
    if not paragraphs:
        raise ValueError("No numbered paragraphs found in PDF")

    ordered_ids = sorted(paragraphs.keys())
    nodes = {}
    for pid in ordered_ids:
        nodes[pid] = {
            "text": paragraphs[pid],
            "choices": [],
        }

    return {
        "title": title,
        "stats": {"endurance": 20, "habilete": 10, "chance": 10},
        "inventory": [],
        "flags": {},
        "start": 1,
        "nodes": nodes,
    }


def main():
    parser = argparse.ArgumentParser(description="Convert PDF to YAML adventure.")
    parser.add_argument("pdf", help="Path to PDF file")
    parser.add_argument("output", help="Path to output YAML")
    args = parser.parse_args()

    pdf_path = os.path.abspath(args.pdf)
    if not os.path.exists(pdf_path):
        print("PDF file not found", file=sys.stderr)
        sys.exit(1)

    text = extract_text(pdf_path)
    paragraphs = parse_paragraphs(text)

    title = os.path.splitext(os.path.basename(pdf_path))[0]
    data = build_yaml(paragraphs, title)

    with open(args.output, "w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, sort_keys=False, allow_unicode=True)


if __name__ == "__main__":
    main()
