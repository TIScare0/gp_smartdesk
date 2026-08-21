from pathlib import Path

from network import Request

class Downloader:
    def __init__(self):
        self.request = Request()

    def download(self, url: str, path: Path, callback=None) -> dict:
        try:
            if path.exists():
                if callback:
                    callback(100)

                return {
                    "status": True,
                    "progress": 100,
                    "path": str(path),
                }

            response = self.request.request(
                url,
                stream=True,
                timeout=30,
            )

            total = int(response.headers.get("content-length", 0)) #type: ignore
            downloaded = 0

            with path.open("wb") as file:
                for chunk in response.iter_content(1024 * 1024): #type: ignore
                    if not chunk:
                        continue

                    file.write(chunk)
                    downloaded += len(chunk)

                    progress = (
                        int(downloaded * 100 / total)
                        if total
                        else 0
                    )

                    if callback:
                        callback(progress)

            return {
                "status": True,
                "progress": 100,
                "path": str(path),
            }

        except Exception as e:
            return {
                "status": False,
                "progress": 0,
                "path": None,
                "error": str(e),
            }
