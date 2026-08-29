from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def test_release_builder_uses_allowlisted_staging_and_ziparchive() -> None:
    content = (ROOT / "scripts" / "build-platform-release.ps1").read_text(
        encoding="utf-8"
    )
    assert "System.IO.Compression.ZipArchive" in content
    assert "EducationMind-Platform-FullSource" in content
    assert "EducationMind-Platform-Web" in content
    assert "EducationMind-Windows-Full" in content
    assert "Copy-TreeContents" in content
    assert "education.db" not in content
    assert "*.db" not in content
    assert "F:\\gpt sovites 轻量级\\Genie-TTS" not in content


def test_platform_source_package_allowlists_frontend_backend_and_runtime_assets() -> None:
    content = (ROOT / "scripts" / "build-platform-release.ps1").read_text(
        encoding="utf-8"
    )

    assert "src" in content
    assert "public" in content
    assert "apps\\api\\app" in content
    assert "apps\\api\\scripts" in content
    assert "mcp" in content
    assert "packages" in content
    assert "'skills'" in content
    assert "pnpm-lock.yaml" in content
    assert ".local\\live2d" in content
    assert (
        "Copy-RequiredFile -Source (Join-Path $projectRoot "
        "'.local\\voice\\cyrene-reference-clean.wav') -Destination "
        "(Join-Path $sourceStage '.local\\voice\\cyrene-reference.wav')"
        in content
    )
    assert "PLATFORM_SOURCE_README.md" in content
    assert "Copy-SourceTreeContents" in content
    assert "__pycache__" in content
    assert ".pytest_cache" in content
    assert "'.pyc'" in content
    assert "*.db" not in content


def test_platform_source_readme_has_full_stack_deployment_contract() -> None:
    readme = (ROOT / "deploy" / "platform-source" / "README.md").read_text(
        encoding="utf-8"
    )

    assert "pnpm install" in readme
    assert "pnpm build" in readme
    assert "uv sync" in readme
    assert "uv run uvicorn app.main:app" in readme
    assert "前端" in readme
    assert "后端" in readme
    assert "SQLite" in readme
    assert "不包含" in readme


def test_embedded_genie_guides_never_recommend_uvicorn_reload() -> None:
    root_readme = (ROOT / "README.md").read_text(encoding="utf-8")
    api_readme = (ROOT / "apps" / "api" / "README.md").read_text(
        encoding="utf-8"
    )

    for readme in (root_readme, api_readme):
        assert "uv run uvicorn app.main:app --reload" not in readme
        assert "不要使用 `--reload`" in readme
        assert "--workers 1" in readme


def test_windows_package_has_install_and_start_contracts() -> None:
    builder = (ROOT / "scripts" / "build-platform-release.ps1").read_text(
        encoding="utf-8"
    )
    installer = (ROOT / "deploy" / "windows" / "install.ps1").read_text(
        encoding="utf-8"
    )
    launcher = (ROOT / "deploy" / "windows" / "start.ps1").read_text(
        encoding="utf-8"
    )
    readme = (ROOT / "deploy" / "windows" / "README.md").read_text(
        encoding="utf-8"
    )

    assert (
        "Copy-SourceTreeContents -Source (Join-Path $projectRoot 'apps\\api\\app')"
        in builder
    )
    assert (
        "Join-Path $projectRoot 'runtime\\genie-tts'"
        in builder
    )
    assert "EDUCATION_TTS_GENIE_ROOT" in launcher
    assert "runtime\\Genie-TTS" in installer
    assert "pip" in installer
    assert "$genieEnvironment" not in installer
    assert "$geniePython" not in installer
    assert "EDUCATION_WEB_DIST_DIR" in launcher
    assert "EDUCATION_DATABASE_URL" in launcher
    assert "EDUCATION_TTS_MODEL_DIR" in launcher
    assert "EDUCATION_TTS_GENIE_DATA_DIR" in launcher
    assert "$sidecar" not in launcher
    assert "SidecarPort" not in launcher
    assert "9881" not in launcher
    assert "127.0.0.1" in launcher
    assert "GPT-SOVITS项目作者为花儿不哭" in readme
