"""Existing embedded recordings must survive a rebuild byte for byte."""
import base64, importlib.util, json, subprocess, tempfile, unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('prepare_media', Path(__file__).resolve().parents[1] / 'scripts/prepare_media.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class MediaPreservation(unittest.TestCase):
    def test_rebuilding_preserves_recorded_audio_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'content').mkdir()
            source = root / 'source.mp3'
            subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.5', '-ac', '1', '-ar', '24000', '-b:a', '64k', str(source)], check=True)
            original = source.read_bytes()
            uri = lambda mime, value: 'data:' + mime + ';base64,' + base64.b64encode(value).decode()
            media = {'video': uri('video/mp4', b'video'), 'poster': uri('image/jpeg', b'poster'), 'effects': {}, 'audio': {'intro': {'src': uri('audio/mpeg', original), 'transcript': 'ترحيب'}}}
            (root / 'khaled-nahw-interactive.html').write_text('<script id="media-data" type="application/json">' + json.dumps(media) + '</script>')
            (root / 'content/media.json').write_text(json.dumps({'video': 'assets/video.mp4', 'poster': 'assets/poster.jpg', 'effects': {}}))
            (root / 'content/narration-manifest.json').write_text(json.dumps({'clips': [{'id': 'intro', 'transcript': 'ترحيب'}]}))
            old_root, old_assets = module.ROOT, module.ASSETS
            module.ROOT, module.ASSETS = root, root / 'assets/audio'
            try:
                module.prepare()
                self.assertEqual((module.ASSETS / 'intro.mp3').read_bytes(), original, 'A rebuild must not re-encode an existing recording')
            finally:
                module.ROOT, module.ASSETS = old_root, old_assets

if __name__ == '__main__':
    unittest.main()
