import importlib.util
import io
import tarfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("minimax-async-tts.py")
SPEC = importlib.util.spec_from_file_location("minimax_async_tts", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ExtractDownloadUrlTests(unittest.TestCase):
    def test_extracts_signed_url_from_file_metadata(self):
        payload = {
            "file": {"download_url": "https://example.invalid/audio.mp3"},
            "base_resp": {"status_code": 0, "status_msg": "success"},
        }
        self.assertEqual(
            MODULE.extract_download_url(payload),
            "https://example.invalid/audio.mp3",
        )

    def test_rejects_missing_download_url(self):
        payload = {
            "file": {"file_id": 123},
            "base_resp": {"status_code": 0, "status_msg": "success"},
        }
        with self.assertRaisesRegex(RuntimeError, "download_url"):
            MODULE.extract_download_url(payload)


class NormalizeAudioPayloadTests(unittest.TestCase):
    def test_accepts_raw_mp3(self):
        audio = b"ID3" + b"x" * 2048
        self.assertEqual(MODULE.normalize_audio_payload(audio, "audio/mpeg"), audio)

    def test_extracts_single_safe_mp3_from_tar(self):
        audio = b"ID3" + b"a" * 2048
        payload = io.BytesIO()
        with tarfile.open(fileobj=payload, mode="w") as archive:
            info = tarfile.TarInfo("narration.mp3")
            info.size = len(audio)
            archive.addfile(info, io.BytesIO(audio))
        self.assertEqual(
            MODULE.normalize_audio_payload(payload.getvalue(), "application/x-tar"),
            audio,
        )

    def test_accepts_nested_tar_member_because_extraction_stays_in_memory(self):
        audio = b"ID3" + b"a" * 2048
        payload = io.BytesIO()
        with tarfile.open(fileobj=payload, mode="w") as archive:
            info = tarfile.TarInfo("nested/narration.mp3")
            info.size = len(audio)
            archive.addfile(info, io.BytesIO(audio))
        self.assertEqual(
            MODULE.normalize_audio_payload(payload.getvalue(), "application/x-tar"),
            audio,
        )


if __name__ == "__main__":
    unittest.main()
