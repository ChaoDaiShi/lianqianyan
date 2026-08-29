#!/usr/bin/env python3
"""校验通过后打包技能为 ZIP 文件。

自动排除：__pycache__、.git、.claude（除 skills/）、临时文件。

Usage:
    python package_skills.py                    # 打包到 ../xiaolian-skills.zip
    python package_skills.py --output out.zip   # 指定输出路径
"""

import os
import sys
import zipfile
import subprocess

EXCLUDE_PATTERNS = [
    "__pycache__",
    ".git",
    ".DS_Store",
    "*.pyc",
    "*.pyo",
    "*.swp",
    "*~",
    ".claude/",
]

EXCLUDE_DIRS = {
    ".claude",
    "__pycache__",
    ".git",
}


def should_exclude(name):
    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith("*"):
            if name.endswith(pattern[1:]):
                return True
        elif name == pattern or name.startswith(pattern):
            return True
    return False


def package(output_path):
    project_root = os.path.join(os.path.dirname(__file__), "..")
    project_root = os.path.abspath(project_root)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_root):
            # Filter directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for f in files:
                if should_exclude(f):
                    continue

                file_path = os.path.join(root, f)
                arcname = os.path.relpath(file_path, project_root)

                # Skip hidden files in root (but keep hidden skills dirs)
                if arcname.startswith(".") and not arcname.startswith(".claude/skills"):
                    continue

                zf.write(file_path, arcname)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Packaged to {output_path} ({size_kb:.1f} KB)")

    # List contents
    with zipfile.ZipFile(output_path, "r") as zf:
        print(f"\nContents ({len(zf.namelist())} files):")
        for name in sorted(zf.namelist()):
            print(f"  {name}")


def main():
    output = "../xiaolian-skills.zip"
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--output" and i + 1 < len(sys.argv) - 1:
            output = sys.argv[i + 2]
            break
        elif arg.startswith("--output="):
            output = arg.split("=", 1)[1]
            break

    output = os.path.join(os.path.dirname(__file__), output)
    output = os.path.abspath(output)

    package(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
