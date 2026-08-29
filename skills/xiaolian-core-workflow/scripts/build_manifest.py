#!/usr/bin/env python3
"""自动扫描 skills/*/SKILL.md，生成 skills-manifest.json。

从各 Skill 的 YAML frontmatter 中提取 name 和 description 字段，
自动填充 id、path、display_name、trigger_mode、scope 和 description。

Usage:
    python build_manifest.py              # 输出到 stdout
    python build_manifest.py --write     # 写入 skills-manifest.json
"""

import os
import sys
import json
import re

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "..", "skills-manifest.json")

# Default trigger modes based on skill ID patterns
DEFAULT_MODES = {
    "qa-checker": "always_final",
    "evidence-citation-guard": "conditional",
    "artifact-version-manager": "conditional",
}

# Default scope based on skill ID patterns
DEVELOPMENT_SKILLS = {"skill-creator", "skill-developer", "skill-evaluator"}


def parse_frontmatter(filepath):
    """Simple regex-based YAML frontmatter parser."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return None, str(e)

    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, "no frontmatter found"

    fm_text = match.group(1)
    fm = {}
    lines = fm_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.strip().startswith("#"):
            i += 1
            continue
        m = re.match(r"^(\w[\w-]*)\s*:\s*>(.*)", line)
        if m:
            key = m.group(1)
            value = m.group(2).strip()
            i += 1
            while i < len(lines) and (lines[i].startswith("  ") or lines[i].startswith("\t")):
                value += " " + lines[i].strip()
                i += 1
            fm[key] = value.strip()
            continue
        m = re.match(r"^(\w[\w-]*)\s*:\s*(.*)", line)
        if m:
            fm[m.group(1)] = m.group(2).strip().strip('"').strip("'")
        i += 1

    return fm, None


def build_manifest():
    skills = []

    if not os.path.isdir(SKILLS_DIR):
        print(f"Error: skills directory not found: {SKILLS_DIR}", file=sys.stderr)
        return None

    for dirname in sorted(os.listdir(SKILLS_DIR)):
        skill_path = os.path.join(SKILLS_DIR, dirname, "SKILL.md")
        if not os.path.isfile(skill_path):
            continue

        fm, err = parse_frontmatter(skill_path)
        if err or fm is None:
            print(f"Warning: skipping {dirname}: {err}", file=sys.stderr)
            continue

        name = fm.get("name", dirname)
        description = fm.get("description", "")

        # Determine trigger_mode
        trigger_mode = DEFAULT_MODES.get(name, "orchestrated")

        # Determine scope
        scope = "development" if name in DEVELOPMENT_SKILLS else "runtime"

        # Generate display_name
        display_name_map = {
            "task-executor": "任务执行",
            "document-workflow": "长文档工作流",
            "code-review": "代码审查",
            "academic-review": "论文评审",
            "project-workflow": "项目工作流",
            "socratic-tutor": "苏格拉底式教学",
            "deliverable-generator": "智能交付",
            "qa-checker": "质量检查",
            "evidence-citation-guard": "证据与引用守护",
            "artifact-version-manager": "成果版本管理",
            "skill-creator": "Skill 创建与优化",
            "skill-developer": "Skill 内容开发",
        }
        display_name = display_name_map.get(name, name)

        # Truncate description for manifest
        short_desc = description[:80] + "..." if len(description) > 80 else description
        # Use first line of description if multiline
        if "\n" in short_desc:
            short_desc = short_desc.split("\n")[0].strip()

        skills.append({
            "id": name,
            "path": f"skills/{dirname}/SKILL.md",
            "display_name": display_name,
            "trigger_mode": trigger_mode,
            "scope": scope,
            "description": short_desc,
        })

    manifest = {
        "entrypoint": "SKILL.md",
        "orchestrator": "xiaolian-core-workflow",
        "skills": skills,
    }

    return manifest


def main():
    write_mode = "--write" in sys.argv

    manifest = build_manifest()
    if manifest is None:
        return 1

    json_str = json.dumps(manifest, ensure_ascii=False, indent=2)

    if write_mode:
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            f.write(json_str + "\n")
        print(f"Written {len(manifest['skills'])} skills to {MANIFEST_PATH}")
    else:
        print(json_str)

    return 0


if __name__ == "__main__":
    sys.exit(main())
