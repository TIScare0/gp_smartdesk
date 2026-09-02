from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

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

        def download_one(index, url):

            filename = Path(
                urlparse(url).path
            ).name

            file_path = path / filename

            if file_path.exists():
                return index, file_path

            response = self.request.request(
                url,
                stream=True,
                timeout=60,
            )

            response.raise_for_status()

            with file_path.open("wb") as file:
                for chunk in response.iter_content(8 * 1024 * 1024):
                    if chunk:
                        file.write(chunk)

            return index, file_path

        with ThreadPoolExecutor(
            max_workers=min(8, total_urls)
        ) as executor:

            futures = [
                executor.submit(
                    download_one,
                    index,
                    url,
                )
                for index, url in enumerate(urls)
            ]

            completed = 0

            for future in as_completed(futures):

                _, file_path = future.result()

                completed += 1

                yield {
                    "progress": int(
                        completed * 100 / total_urls
                    ),
                    "path": str(file_path),
                }

        return {
            "progress": 100,
            "path": str(path),
        }