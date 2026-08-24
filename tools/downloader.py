from pathlib import Path
from urllib.parse import urlparse

from network import Request


class Downloader:
    def __init__(self):
        self.request = Request()

    def download(self, url_or_urls, path):

        urls = (
            (url_or_urls,)
            if isinstance(url_or_urls, str)
            else tuple(url_or_urls)
        )

        path.mkdir(parents=True, exist_ok=True)

        total_urls = len(urls)

        for index, url in enumerate(urls):

            filename = Path(
                urlparse(url).path
            ).name

            file_path = path / filename

            if file_path.exists():
                yield {
                    "progress": int(
                        ((index + 1) / total_urls) * 100
                    ),
                    "path": str(file_path),
                }
                continue

            response = self.request.request(
                url,
                stream=True,
                timeout=30,
            )

            total = int(response.headers.get("content-length", 0)) #type: ignore

            downloaded = 0

            with file_path.open("wb") as file:

                for chunk in response.iter_content(1024 * 1024): #type: ignore
                    if not chunk:
                        continue

                    file.write(chunk)
                    downloaded += len(chunk)

                    file_progress = (
                        downloaded * 100 / total
                        if total
                        else 0
                    )

                    progress = int(
                        (
                            index * 100
                            + file_progress
                        ) / total_urls
                    )

                    yield {
                        "progress": progress,
                        "path": str(file_path),
                    }

        return {
            "progress": 100,
            "path": str(path),
        }
