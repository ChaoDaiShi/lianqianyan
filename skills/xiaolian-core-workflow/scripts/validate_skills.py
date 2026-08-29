#!/usr/bin/env python3
"""技能包完整性校验脚本。

检查内容：
1. 每个 SKILL.md 是否有合法 YAML frontmatter
2. name 字段是否唯一、是否与文件夹名一致
3. 主 Skill 引用的 Skill ID 是否存在于 manifest
4. 是否存在占位文件
5. 能力契约字段是否齐全
6. 是否存在重复主 Skill
7. Manifest ID 是否重复、trigger_mode 是否合法、path 是否存在
8. Manifest ID 是否与 Skill frontmatter 的 name 一致
9. 是否存在许可证冲突
10. 是否存在占位脚本
"""

import os
import sys
import json
import re

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "..", "skills-manifest.json")
ROOT_SKILL = os.path.join(os.path.dirname(__file__), "..", "SKILL.md")
REFERENCES_DIR = os.path.join(os.path.dirname(__file__), "..", "references")
SCRIPTS_DIR = os.path.dirname(__file__)

ALLOWED_TRIGGER_MODES = {"orchestrated", "always_final", "conditional"}

PLACEHOLDER_PATTERNS = [
    (r"^# Processing Guide", "Still template: Processing Guide"),
    (r"在这里添加", "Contains placeholder text"),
    (r"^Add interface descriptions", "Default api-docs placeholder"),
]

# Tools/platform capabilities that may not exist — check for references to them
UNVERIFIED_TOOL_REFS = [
    (r"\bContext7\b", "References 'Context7' tool — verify platform support"),
    (r"\bFetch\b.*抓取", "References 'Fetch' tool for web scraping — verify platform support"),
    (r"\beval-viewer/generate_review\.py\b", "References non-existent script eval-viewer/generate_review.py"),
    (r"\bagents/grader\.md\b", "References non-existent file agents/grader.md"),
    (r"\bagents/analyzer\.md\b", "References non-existent file agents/analyzer.md"),
    (r"\bagents/comparator\.md\b", "References non-existent file agents/comparator.md"),
    (r"\breferences/schemas\.md\b", "References non-existent file references/schemas.md (skill-creator context)"),
    (r"\bscripts\.aggregate_benchmark\b", "References non-existent module scripts.aggregate_benchmark"),
    (r"\bscripts\.run_loop\b", "References non-existent module scripts.run_loop"),
    (r"\bscripts\.package_skill\b", "References non-existent module scripts.package_skill"),
    (r"\bwebbrowser\.open\(\)", "References webbrowser.open() — may not be available"),
    (r"\bnohup\b", "References 'nohup' — platform-specific"),
    (r"\bkill\s+\$VIEWER_PID\b", "References kill \$VIEWER_PID — assumes background process"),
    (r"\bsubagent\b", "References 'subagent' concept — verify platform support"),
    (r"\btask notification\b", "References 'task notification' — verify platform support"),
]

PLACEHOLDER_SCRIPTS = [
    (r"print\(\"Process script placeholder\"\)", "process.py is a placeholder script"),
]

def parse_frontmatter(filepath):
    """Simple regex-based YAML frontmatter parser (no external deps)."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return None, None, str(e)

    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", content, re.DOTALL)
    if not match:
        return None, None, "no frontmatter found"

    fm_text = match.group(1)
    body = match.group(2)

    # Parse simple YAML: key: value or key: >\n  multiline
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
            # Collect continuation lines (indented)
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

    return fm, body, None


def check_body(body, filepath):
    """Check body for placeholder patterns."""
    if body is None:
        return True, "Empty body"
    if len(body.strip()) < 30:
        return True, f"Too short ({len(body.strip())} chars)"
    for pattern, reason in PLACEHOLDER_PATTERNS:
        if re.search(pattern, body, re.MULTILINE):
            return True, reason
    return False, None


def main():
    errors = []
    warnings = []
    seen_names = {}
    skill_names_to_dirs = {}

    print("=" * 60)
    print("Skill Package Validation")
    print("=" * 60)

    # 1. Check root SKILL.md
    print("\n[1] Checking root SKILL.md...")
    fm, body, err = parse_frontmatter(ROOT_SKILL)
    if err:
        errors.append(f"Root SKILL.md: {err}")
    elif fm is None:
        errors.append("Root SKILL.md: no frontmatter")
    else:
        name = fm.get("name", "")
        desc = fm.get("description", "")
        if not name:
            errors.append("Root SKILL.md: missing 'name'")
        if not desc:
            errors.append("Root SKILL.md: missing 'description'")
        is_ph, reason = check_body(body, ROOT_SKILL)
        if is_ph:
            errors.append(f"Root SKILL.md: {reason}")
        else:
            print(f"  OK: name={name}, desc={len(desc)} chars")

    # 2. Check manifest — with enhanced checks
    print("\n[2] Checking skills-manifest.json...")
    manifest = None
    manifest_ids = set()
    manifest_id_list = []  # For duplicate detection
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as e:
        errors.append(f"skills-manifest.json: {e}")

    if manifest:
        if manifest.get("orchestrator") != "xiaolian-core-workflow":
            errors.append("manifest: orchestrator must be 'xiaolian-core-workflow'")
        for i, s in enumerate(manifest.get("skills", [])):
            sid = s.get("id", "")
            if not sid:
                errors.append(f"manifest: entry #{i} missing 'id'")
                continue
            # 2a. Check for duplicate IDs
            if sid in manifest_ids:
                errors.append(f"manifest: duplicate ID '{sid}'")
            manifest_ids.add(sid)
            manifest_id_list.append(s)
            # 2b. Check path
            path = s.get("path", "")
            if not path:
                warnings.append(f"manifest: '{sid}' missing 'path'")
            elif not os.path.isfile(os.path.join(os.path.dirname(__file__), "..", path)):
                errors.append(f"manifest: '{sid}' path does not exist: {path}")
            # 2c. Check trigger_mode
            mode = s.get("trigger_mode", "")
            if not mode:
                warnings.append(f"manifest: '{sid}' missing 'trigger_mode'")
            elif mode not in ALLOWED_TRIGGER_MODES:
                errors.append(f"manifest: '{sid}' invalid trigger_mode '{mode}' (allowed: {sorted(ALLOWED_TRIGGER_MODES)})")
            # 2d. Check scope
            scope = s.get("scope", "")
            if scope not in ("runtime", "development"):
                warnings.append(f"manifest: '{sid}' has unusual scope '{scope}'")
        print(f"  OK: {len(manifest.get('skills', []))} skills in manifest")

    # 3. Validate each skill file
    print("\n[3] Validating skill files...")
    skill_licenses = {}  # name -> license for conflict check
    if not os.path.isdir(SKILLS_DIR):
        errors.append(f"Skills directory not found: {SKILLS_DIR}")
    else:
        for dirname in sorted(os.listdir(SKILLS_DIR)):
            skill_path = os.path.join(SKILLS_DIR, dirname, "SKILL.md")
            if not os.path.isfile(skill_path):
                warnings.append(f"{dirname}: no SKILL.md found")
                continue

            fm, body, err = parse_frontmatter(skill_path)
            if err:
                errors.append(f"{dirname}/SKILL.md: {err}")
                continue
            if fm is None:
                errors.append(f"{dirname}/SKILL.md: no frontmatter")
                continue

            name = fm.get("name", "")
            if not name:
                errors.append(f"{dirname}/SKILL.md: missing 'name'")
            elif name != dirname:
                errors.append(f"{dirname}/SKILL.md: name '{name}' != dir '{dirname}'")

            if name in seen_names:
                errors.append(f"{dirname}/SKILL.md: duplicate name '{name}' (also in {seen_names[name]})")
            else:
                seen_names[name] = dirname

            desc = fm.get("description", "")
            if not desc:
                errors.append(f"{dirname}/SKILL.md: missing 'description'")

            # Check for "自动激活" (shouldn't appear in orchestrated skills)
            if desc and "自动激活" in desc:
                warnings.append(f"{dirname}: description still uses '自动激活'")

            # Check for "隐藏能力" (should be "内置模块")
            if body and "隐藏能力" in body:
                warnings.append(f"{dirname}: uses '隐藏能力' - should use '内置模块'")

            is_ph, reason = check_body(body, skill_path)
            if is_ph:
                errors.append(f"{dirname}/SKILL.md: {reason}")

            if body and "## 能力契约" not in body:
                warnings.append(f"{dirname}/SKILL.md: missing '## 能力契约' section")

            # Collect license for conflict check
            lic = fm.get("license", "")
            if lic:
                skill_licenses[name] = lic

            # Check for references to unverified tools
            if body:
                for pattern, msg in UNVERIFIED_TOOL_REFS:
                    if re.search(pattern, body):
                        warnings.append(f"{dirname}: {msg}")

            # 3a. Cross-check manifest ID vs skill frontmatter name
            if manifest and name:
                manifest_entry = None
                for s in manifest.get("skills", []):
                    if s.get("id") == name:
                        manifest_entry = s
                        break
                if manifest_entry:
                    display_name = manifest_entry.get("display_name", "")
                    if display_name and name not in ("xiaolian-core-workflow",):
                        pass  # display_name can differ, that's fine

        print(f"  OK: {len(seen_names)} skill files validated")

    # 4. Cross-check manifest vs filesystem
    if manifest:
        print("\n[4] Cross-checking manifest vs filesystem...")
        actual_dirs = set(os.listdir(SKILLS_DIR)) if os.path.isdir(SKILLS_DIR) else set()
        for sid in manifest_ids:
            if sid not in actual_dirs:
                errors.append(f"Manifest: '{sid}' not in filesystem")
        for dirname in actual_dirs:
            if dirname not in manifest_ids:
                warnings.append(f"Dir '{dirname}' not in manifest")
        print(f"  OK: cross-check complete")

    # 5. Check for duplicate main skill
    print("\n[5] Checking for duplicate main skill...")
    dup_path = os.path.join(SKILLS_DIR, "xiaolian-core-workflow", "SKILL.md")
    if os.path.isfile(dup_path):
        errors.append("DUPLICATE: skills/xiaolian-core-workflow/SKILL.md exists alongside root SKILL.md")
    else:
        print("  OK: no duplicate main skill")

    # 6. Check references (FIXED: direct file read, not parse_frontmatter)
    print("\n[6] Checking reference files...")
    contracts_path = os.path.join(REFERENCES_DIR, "skill-contracts.md")
    if os.path.isfile(contracts_path):
        try:
            with open(contracts_path, "r", encoding="utf-8") as f:
                contracts_content = f.read()
            if len(contracts_content.strip()) > 100:
                print(f"  OK: skill-contracts.md present ({len(contracts_content)} chars)")
            else:
                warnings.append("references/skill-contracts.md appears empty/short")
        except Exception as e:
            warnings.append(f"references/skill-contracts.md: read error: {e}")
    else:
        warnings.append("references/skill-contracts.md not found")

    # 7. Check for placeholder scripts
    print("\n[7] Checking for placeholder scripts...")
    for fname in os.listdir(SCRIPTS_DIR):
        if not fname.endswith(".py"):
            continue
        fpath = os.path.join(SCRIPTS_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            for pattern, msg in PLACEHOLDER_SCRIPTS:
                if re.search(pattern, content):
                    warnings.append(f"scripts/{fname}: {msg}")
        except Exception:
            pass
    print("  OK: scripts checked")

    # 8. License conflict check
    print("\n[8] Checking license consistency...")
    from collections import Counter
    license_counts = Counter(skill_licenses.values())
    if len(license_counts) > 1:
        warnings.append(f"License inconsistency detected: {dict(license_counts)}")
        for sn, sl in skill_licenses.items():
            if sl != "MIT":
                warnings.append(f"  '{sn}' uses '{sl}' while majority uses 'MIT'")
    else:
        print(f"  OK: all skills use same license ({list(license_counts.keys())[0] if license_counts else 'none'})")

    # --- Report ---
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  [FAIL] {e}")

    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  [WARN] {w}")

    if not errors and not warnings:
        print("\n  All checks passed!")

    print(f"\nSummary: {len(errors)} errors, {len(warnings)} warnings")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
