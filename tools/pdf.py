from typing import Any, Sequence, Callable
from pypdf import PageObject, PdfReader, PdfWriter
from pypdf.errors import WrongPasswordError


class PasswordError(WrongPasswordError):
    pass


class Pdf:
    def __init__(self):
        self.pdf_path: str | None = None
        self.current_pdf: PdfReader | None = None
        self._operations: list[Callable[[list[PageObject]], list[PageObject]]] = []

    def load_pdf(self, pdf_path: str, password: Any = None):
        self.pdf_path = pdf_path
        self.current_pdf = PdfReader(pdf_path, password=password)
        self._operations.clear()
        return self

    def is_pdf_locked(self):
        if self.current_pdf is None:
            raise RuntimeError("No PDF loaded")

        return self.current_pdf.is_encrypted

    def load_pages(self) -> Sequence[PageObject]:
        if self.current_pdf is None:
            raise RuntimeError("No PDF loaded")

        return self.current_pdf.pages

    def load_page(self, page: int):
        return self.load_pages()[page]

    def get_content(self, page: int | None = None):
        if page is None:
            return "".join(
                _page.extract_text() or ""
                for _page in self.load_pages()
            )

        return self.load_page(page).extract_text()

    def decrypt(self, password: Any):
        if self.current_pdf is None:
            raise RuntimeError("No PDF loaded")

        return self.current_pdf.decrypt(password)

    def rearrange_pdf(self, order: Sequence[int]):
        def operation(pages):
            return [pages[index] for index in order]

        self._operations.append(operation)
        return self

    def merge_pdfs(self, *pdfs: str):
        def operation(pages):
            merged = list(pages)

            for pdf_path in pdfs:
                reader = PdfReader(pdf_path)
                merged.extend(reader.pages)

            return merged

        self._operations.append(operation)
        return self

    def remove_pdf_pages(self, pages: Sequence[int]):
        remove = set(pages)

        def operation(current):
            return [
                page
                for index, page in enumerate(current)
                if index not in remove
            ]

        self._operations.append(operation)
        return self

    def compress_pdf(self):
        def operation(pages):
            for page in pages:
                page.compress_content_streams(9)

            return pages

        self._operations.append(operation)
        return self

    def _build_pages(self):
        pages = list(self.load_pages())

        for operation in self._operations:
            pages = operation(pages)

        return pages

    def save_pdf(self, path: str | None = None):
        pages = self._build_pages()

        writer = PdfWriter()

        for page in pages:
            writer.add_page(page)

        output_path = path or self.pdf_path

        if output_path is None:
            raise ValueError("No output path specified")

        with open(output_path, "wb") as f:
            writer.write(f)

        self._operations.clear()

        return output_path

    def get_unlocked_pdf(self):
        return self.save_pdf()