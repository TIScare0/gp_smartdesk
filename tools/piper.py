from pathlib import Path
import wave

from piper import PiperVoice
from .paths import PIPER_PATH
from utils import file_url

DOWNLOAD_URLS = lambda lang='en_US', voice_name='amy': [
    f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang[:2]}/{lang}/{voice_name}/medium/{lang}-{voice_name}-medium.{file}"
    for file in ('onnx', 'onnx.json')
]


class Piper:
    def load_voice(self) -> dict | None:
        file = next((f for f in Path(PIPER_PATH).glob("*.onnx") if f.is_file()), None)
        if file is None:
            return {
                "status": False,
                "error": "Model does not exist"
            }
        self.piper = PiperVoice.load(file)
        return {'status': True}

    def txt2audio(
        self,
        text: str,
        output_path: Path | None = None,
    ) -> dict:
        try:
            if self.piper is None:
                return {
                    "status": False,
                    "error": "Piper voice is not loaded",
                }

            if output_path is None:
                return {
                    "status": False,
                    "error": "Output path is required",
                }

            path = Path(output_path)

            with wave.open(str(path), "wb") as wav_file:
                first = True

                for chunk in self.piper.synthesize(text):
                    if first:
                        wav_file.setframerate(chunk.sample_rate)
                        wav_file.setsampwidth(chunk.sample_width)
                        wav_file.setnchannels(chunk.sample_channels)
                        first = False

                    wav_file.writeframes(
                        chunk.audio_int16_bytes
                    )

            if first:
                return {
                    "status": False,
                    "error": "Piper produced no audio data",
                }

            return {
                "status": True,
                "response": file_url(path),
            }

        except Exception as e:
            return {
                "status": False,
                "error": f"Unable to convert text to voice; Error: {str(e)}",
            }
