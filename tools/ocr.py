from pathlib import Path
from rapidocr import RapidOCR

from .paths import OCR_PATH


DOWNLOAD_URLS = [
    "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.9.2/onnx/PP-OCRv5/det/ch_PP-OCRv5_det_mobile.onnx",
    "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.9.2/onnx/PP-OCRv5/rec/en_PP-OCRv5_rec_mobile.onnx",
    "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.9.2/paddle/PP-OCRv5/rec/en_PP-OCRv5_rec_mobile/ppocrv5_en_dict.txt"
]

class Ocr:
    def __init__(self):
        self.ocr = None

    def load_model(self) -> dict:
        det_model = OCR_PATH / "ch_PP-OCRv5_det_mobile.onnx"
        rec_model = OCR_PATH / "en_PP-OCRv5_rec_mobile.onnx"
        rec_dict = OCR_PATH / "ppocrv5_en_dict.txt"

        if not det_model.is_file():
            return {
                "status": False,
                "error": "OCR detection model does not exist",
            }

        if not rec_model.is_file():
            return {
                "status": False,
                "error": "OCR recognition model does not exist",
            }

        if not rec_dict.is_file():
            return {
                "status": False,
                "error": "OCR dictionary does not exist",
            }

        try:
            self.ocr = RapidOCR(
                params={
                    "Det.model_path": str(det_model),
                    "Rec.model_path": str(rec_model),
                    "Rec.rec_keys_path": str(rec_dict),
                }
            )

            return {
                "status": True,
            }

        except Exception as e:
            return {
                "status": False,
                "error": str(e),
            }
    
    def extract_text(self, image_path: Path | str) -> dict:
        try:
            if self.ocr is None:
                return {
                    "status": False,
                    "error": "OCR model is not loaded",
                }

            image_path = Path(image_path)

            result = self.ocr(str(image_path))
            texts = result.txts #type: ignore
            return {
                "status": True,
                "response": "\n".join(texts), #type: ignore
            }

        except Exception as e:
            return {
                "status": False,
                "error": str(e),
            }
