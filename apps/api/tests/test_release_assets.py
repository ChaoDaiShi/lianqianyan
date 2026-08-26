from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def test_release_builder_uses_allowlisted_staging_and_ziparchive() -> None:
    content = (ROOT / "scripts" / "build-platform-release.ps1").read_text(
        encoding="utf-8"
    )
    assert "System.IO.Compression.ZipArchive" in content
    assert "EducationMind-Platform-Web" in content
    assert "EducationMind-Windows-Full" in content
    assert "Copy-TreeContents" in content
    assert "education.db" not in content
    assert "*.db" not in content


def test_windows_package_has_install_and_start_contracts() -> None:
    installer = (ROOT / "deploy" / "windows" / "install.ps1").read_text(
        encoding="utf-8"
    )
    launcher = (ROOT / "deploy" / "windows" / "start.ps1").read_text(
        encoding="utf-8"
    )
    readme = (ROOT / "deploy" / "windows" / "README.md").read_text(
        encoding="utf-8"
    )

    assert "runtime\\Genie-TTS" in installer
    assert "pip" in installer
    assert "EDUCATION_WEB_DIST_DIR" in launcher
    assert "EDUCATION_DATABASE_URL" in launcher
    assert "127.0.0.1" in launcher
    assert "GPT-SOVITS项目作者为花儿不哭" in readme
