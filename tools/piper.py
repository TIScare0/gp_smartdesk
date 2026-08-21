from pathlib import Path
import wave

from network import Request
from piper import PiperVoice


class Piper:
    def __init__(self) -> None:
        self.request = Request()

    def download_voice(
        self,
        voice_name: str = "amy",
        lang: str = "en_US",
        output_path: str | None = None,
    ) -> dict:
        try:
            output_dir = Path(output_path or "voices")
            output_dir.mkdir(parents=True, exist_ok=True)

            model = f"{lang}-{voice_name}-medium"

            files = (
                f"{model}.onnx",
                f"{model}.onnx.json",
            )

            base_url = (
                "https://huggingface.co/rhasspy/piper-voices/"
                f"resolve/v1.0.0/{lang.replace('_', '/')}/"
                f"{voice_name}/medium/"
            )

            for filename in files:
                path = output_dir / filename

                if path.exists():
                    continue

                response = self.request.request(
                    base_url + filename,
                    stream=True,
                    timeout=30,
                )

                with path.open("wb") as file:
                    for chunk in response.iter_content(1024 * 1024): #type: ignore
                        if chunk:
                            file.write(chunk)

            self.voice = str(output_dir / files[0])

            return {
                "status": True,
                "progress": 100,
                "path": self.voice,
            }

        except Exception as e:
            return {
                "status": False,
                "progress": 0,
                "path": None,
                "error": str(e),
            }

    def load_voice(self) -> dict | None:
        if self.voice is None:
            return {'error': 'Model does not exists'}
        self.piper = PiperVoice.load(self.voice)

    def txt2audio(
        self,
        text: str,
        output_path: str | None = None,
    ) -> dict:
        try:
            if self.piper is None:
                return {'error': 'Piper voice is not loaded'}

            path = output_path or "audio_testing.wav"

            with wave.open(path, "wb") as wav_file:
                first = True

                for chunk in self.piper.synthesize(text):
                    if first:
                        wav_file.setframerate(chunk.sample_rate)
                        wav_file.setsampwidth(chunk.sample_width)
                        wav_file.setnchannels(chunk.sample_channels)
                        first = False

                    wav_file.writeframes(chunk.audio_int16_bytes)

            return {
                "status": True,
                "response": path,
            }

        except Exception as e:
            return {
                "status": False,
                "error": f"Unable to convert text to voice; Error: {e}",
            }
