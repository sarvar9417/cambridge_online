"""CI regression check: Chapter 8's illustrated SQL must execute."""
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class Chapter8DisplayedSqlTest(unittest.TestCase):
    def test_worked_sql_stays_executable(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "verify-chapter8-sql.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)

if __name__ == "__main__":
    unittest.main()
