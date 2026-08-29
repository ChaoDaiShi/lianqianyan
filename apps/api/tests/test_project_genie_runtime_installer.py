from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts" / "install-project-genie-runtime.ps1"
RUNTIME_README = ROOT / "runtime" / "genie-tts" / "README.md"


def test_project_runtime_installer_has_isolated_allowlisted_contract() -> None:
    content = SCRIPT.read_text(encoding="utf-8")

    assert "runtime\\genie-tts" in content
    assert "$EnginePackageRoot" in content
    assert "apps\\api\\.venv\\Lib\\site-packages\\genie_tts" in content
    assert "Assert-AbsoluteDirectory" in content
    assert "Assert-ChildPath" in content
    assert "src" in content
    assert "GenieData" in content
    assert "Output\\昔涟AI-GPT-SOVITS--V2proplus" in content
    assert "Reference\\cyrene-reference.wav" in content
    assert "RUNTIME_MANIFEST.json" in content
    assert "cyrene-reference-clean.wav" in content
    assert "C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6" not in content
    assert "EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1" in content
    assert "Move-Item" in content
    assert "Remove-Item -LiteralPath $Source" not in content


def test_runtime_readme_documents_git_and_release_boundaries() -> None:
    content = RUNTIME_README.read_text(encoding="utf-8")

    assert "项目内隔离" in content
    assert "不进入 Git" in content
    assert "Windows-Full" in content
    assert "Genie-TTS 2.0.2" in content
