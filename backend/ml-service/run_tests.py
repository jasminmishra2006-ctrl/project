"""Run the backend unittest suite from any current working directory."""
import sys
import unittest
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))

suite = unittest.defaultTestLoader.discover(str(SERVICE_DIR / "tests"))
result = unittest.TextTestRunner(verbosity=2).run(suite)
raise SystemExit(not result.wasSuccessful())
