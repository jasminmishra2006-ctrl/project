"""Idempotently import the repository's bundled history CSV into the API DB."""
import argparse
from pathlib import Path

from water_api import import_csv


def main():
    default_csv = Path(__file__).parent.parent / "src" / "data" / "waterQualityHistory.csv"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="?", type=Path, default=default_csv)
    args = parser.parse_args()
    if not args.csv.is_file():
        parser.error(f"CSV file not found: {args.csv}")
    print(import_csv(args.csv.read_text(encoding="utf-8-sig")))


if __name__ == "__main__":
    main()
