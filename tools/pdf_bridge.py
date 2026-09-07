"""
PDF bridge for pywebview — wires the `Pdf` class to the pdf.js frontend
contract (pdf_stage / pdf_stage_info / pdf_unlock / pdf_run / pdf_export).

Usage:
    class Api:
        def __init__(self):
            self.pdf = Pdf                 # <- the class itself, as given
            self.pdf_bridge = PdfBridge(self.pdf)

        def pdf_stage(self, stage_id, paths):
            return self.pdf_bridge.pdf_stage(stage_id, paths)

        def pdf_pick_files(self, allow_multiple=True):
            return self.pdf_bridge.pdf_pick_files(allow_multiple)

        def pdf_stage_info(self, stage_id, file_name):
            return self.pdf_bridge.pdf_stage_info(stage_id, file_name)

        def pdf_unlock(self, stage_id, file_name, password):
            return self.pdf_bridge.pdf_unlock(stage_id, file_name, password)

        def pdf_run(self, stage_id, tool, options):
            return self.pdf_bridge.pdf_run(stage_id, tool, options)

        def pdf_export(self, output_path, suggested_name):
            return self.pdf_bridge.pdf_export(output_path, suggested_name)

pywebview will expose whatever methods live directly on the `Api` object
passed to `webview.create_window(..., js_api=Api())`, so the five methods
above are what you add there — each just forwards to PdfBridge.
"""

import os
import shutil
import tempfile
import uuid

import webview  # for the save-file dialog in pdf_export

from pypdf import PdfReader, PdfWriter
from pypdf.errors import WrongPasswordError


class PdfBridge:
    def __init__(self, pdf_cls):
        # `pdf_cls` is the Pdf class itself (self.pdf = Pdf), instantiated
        # once per staged file below.
        self.pdf_cls = pdf_cls

        # stage_id -> {
        #   "order": [file_name, ...],                 # staging order
        #   "files": {file_name: {"path", "size", "instance", "locked"}},
        # }
        self._stages = {}
        self._tmp_dir = tempfile.mkdtemp(prefix="aura_pdf_")

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _new_stage(self):
        stage_id = uuid.uuid4().hex
        self._stages[stage_id] = {"order": [], "files": {}}
        return stage_id

    def _stage(self, stage_id):
        stage = self._stages.get(stage_id)
        if stage is None:
            raise RuntimeError("Unknown or expired session — please re-upload.")
        return stage

    def _load_one(self, stage, path):
        name = os.path.basename(path)

        if not os.path.exists(path):
            raise RuntimeError(f'"{name}" could not be found on disk.')

        size = os.path.getsize(path)

        instance = self.pdf_cls()
        locked = False
        page_count = None

        try:
            # load_pdf(..., password=None) succeeds immediately for any
            # normal, unencrypted PDF — that's the common case, and it
            # must NOT be treated as locked.
            instance.load_pdf(path)
            locked = instance.is_pdf_locked()
            if not locked:
                page_count = len(instance.load_pages())
        except WrongPasswordError:
            # Only a password-related failure means "locked". Some
            # encrypted PDFs raise this on load before is_pdf_locked()
            # can even be checked.
            locked = True
        except Exception as e:
            # Any other failure (corrupt file, unsupported structure,
            # etc.) is a real error — don't disguise it as "locked".
            raise RuntimeError(f'Could not read "{name}": {e}') from e

        stage["files"][name] = {
            "path": path,
            "size": size,
            "instance": instance,
            "locked": locked,
            "pages": page_count,
        }
        if name not in stage["order"]:
            stage["order"].append(name)

        return {
            "name": name,
            "size": size,
            "pages": page_count,
            "locked": locked,
        }

    def _output_path(self, suffix=".pdf"):
        return os.path.join(self._tmp_dir, f"{uuid.uuid4().hex}{suffix}")

    # ------------------------------------------------------------------
    # pdf_stage
    # ------------------------------------------------------------------

    def pdf_stage(self, stage_id, paths):
        """Load one or more newly-picked PDFs into the session."""
        try:
            if not stage_id:
                stage_id = self._new_stage()
            stage = self._stage(stage_id)

            file_infos = [self._load_one(stage, p) for p in paths]

            all_files = [
                {
                    "name": name,
                    "size": stage["files"][name]["size"],
                    "pages": stage["files"][name]["pages"],
                    "locked": stage["files"][name]["locked"],
                }
                for name in stage["order"]
            ]

            return {"ok": True, "id": stage_id, "files": all_files}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ------------------------------------------------------------------
    # pdf_stage_info — used to lazily fetch page count for page-list tools
    # ------------------------------------------------------------------

    def pdf_stage_info(self, stage_id, file_name):
        try:
            stage = self._stage(stage_id)
            entry = stage["files"].get(file_name)
            if entry is None:
                raise RuntimeError("File not found in this session.")
            if entry["pages"] is None:
                entry["pages"] = len(entry["instance"].load_pages())
            return {"ok": True, "pages": entry["pages"]}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ------------------------------------------------------------------
    # pdf_unlock
    # ------------------------------------------------------------------

    def pdf_unlock(self, stage_id, file_name, password):
        try:
            stage = self._stage(stage_id)
            entry = stage["files"].get(file_name)
            if entry is None:
                raise RuntimeError("File not found in this session.")

            instance = entry["instance"]
            # Re-load with the password since pypdf needs it at read time.
            instance.load_pdf(entry["path"], password=password)

            if instance.is_pdf_locked():
                ok = instance.decrypt(password)
                if not ok:
                    return {"ok": False, "error": "Incorrect password."}

            entry["pages"] = len(instance.load_pages())
            entry["locked"] = False
            return {"ok": True}
        except WrongPasswordError:
            return {"ok": False, "error": "Incorrect password."}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ------------------------------------------------------------------
    # pdf_run — dispatches to the right Pdf method per tool
    # ------------------------------------------------------------------

    def pdf_run(self, stage_id, tool, options):
        try:
            stage = self._stage(stage_id)
            options = options or {}

            if any(f["locked"] for f in stage["files"].values()):
                return {"ok": False, "error": "Unlock every file before continuing."}

            handler = {
                "merge": self._run_merge,
                "remove_pages": self._run_remove_pages,
                "rearrange": self._run_rearrange,
                "compress": self._run_compress,
                "extract_text": self._run_extract_text,
            }.get(tool)

            if handler is None:
                return {"ok": False, "error": f"Unknown tool: {tool}"}

            return handler(stage, options)
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _run_merge(self, stage, options):
        names = stage["order"]
        if len(names) < 2:
            return {"ok": False, "error": "Merge needs at least two files."}

        first_path = stage["files"][names[0]]["path"]
        other_paths = [stage["files"][n]["path"] for n in names[1:]]

        merger = self.pdf_cls()
        merger.load_pdf(first_path)
        merger.merge_pdfs(*other_paths)

        out_path = self._output_path(".pdf")
        merger.save_pdf(out_path)

        return self._pdf_result(out_path, "merged.pdf")

    def _run_remove_pages(self, stage, options):
        name = stage["order"][0]
        entry = stage["files"][name]
        pages_to_remove = options.get("pages", [])

        worker = self.pdf_cls()
        worker.load_pdf(entry["path"])
        worker.remove_pdf_pages(pages_to_remove)

        out_path = self._output_path(".pdf")
        worker.save_pdf(out_path)

        out_name = self._suffixed_name(name, "trimmed")
        return self._pdf_result(out_path, out_name)

    def _run_rearrange(self, stage, options):
        name = stage["order"][0]
        entry = stage["files"][name]
        order = options.get("order", [])

        worker = self.pdf_cls()
        worker.load_pdf(entry["path"])
        worker.rearrange_pdf(order)

        out_path = self._output_path(".pdf")
        worker.save_pdf(out_path)

        out_name = self._suffixed_name(name, "reordered")
        return self._pdf_result(out_path, out_name)

    def _run_compress(self, stage, options):
        name = stage["order"][0]
        entry = stage["files"][name]

        # pypdf's compress_content_streams() must run on a page that is
        # already attached to a PdfWriter — calling it on a raw PdfReader
        # page (which is what Pdf.compress_pdf() does internally, before
        # the writer exists) raises "page must be part of PdfReader".
        # So we build the writer first, then compress in place on it.
        reader = PdfReader(entry["path"])
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        for page in writer.pages:
            page.compress_content_streams(9)

        out_path = self._output_path(".pdf")
        with open(out_path, "wb") as f:
            writer.write(f)

        out_name = self._suffixed_name(name, "compressed")
        return self._pdf_result(out_path, out_name)

    def _run_extract_text(self, stage, options):
        name = stage["order"][0]
        entry = stage["files"][name]

        worker = self.pdf_cls()
        worker.load_pdf(entry["path"])
        text = worker.get_content()

        out_path = self._output_path(".txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)

        out_name = self._suffixed_name(name, "extracted", ext=".txt")
        return {
            "ok": True,
            "output_path": out_path,
            "output_name": out_name,
            "output_size": os.path.getsize(out_path),
            "text": text,
        }

    # ------------------------------------------------------------------
    # pdf_pick_files — native "open" dialog, so we get real filesystem
    # paths back (a browser <input type=file> hides these on purpose).
    # ------------------------------------------------------------------

    def pdf_pick_files(self, allow_multiple=True):
        try:
            window = webview.windows[0] if webview.windows else None
            if window is None:
                raise RuntimeError("No active window to show a file dialog.")

            result = window.create_file_dialog(
                webview.FileDialog.OPEN,
                allow_multiple=allow_multiple,
                file_types=("PDF Files (*.pdf)", "All files (*.*)"),
            )

            if not result:
                return {"ok": False, "error": "cancelled"}

            paths = list(result) if isinstance(result, (list, tuple)) else [result]
            return {"ok": True, "paths": paths}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ------------------------------------------------------------------
    # pdf_export — auto-saves into <base>/GP SmartDesk/pdfs/, no dialog
    # ------------------------------------------------------------------

    def _smartdesk_pdfs_dir(self):
        # Base is the user's Documents folder; falls back to home if that
        # can't be resolved (e.g. some Linux setups).
        base = os.path.join(os.path.expanduser("~"), "Documents")
        if not os.path.isdir(base):
            base = os.path.expanduser("~")

        target = os.path.join(base, "GP SmartDesk", "pdfs")
        os.makedirs(target, exist_ok=True)
        return target

    def _unique_dest(self, folder, filename):
        name, ext = os.path.splitext(filename)
        dest = os.path.join(folder, filename)
        n = 1
        while os.path.exists(dest):
            dest = os.path.join(folder, f"{name} ({n}){ext}")
            n += 1
        return dest

    def pdf_export(self, output_path, suggested_name):
        try:
            if not output_path or not os.path.exists(output_path):
                return {"ok": False, "error": "That file is no longer available."}

            folder = self._smartdesk_pdfs_dir()
            dest = self._unique_dest(folder, suggested_name or os.path.basename(output_path))

            shutil.copyfile(output_path, dest)
            return {"ok": True, "saved_path": dest, "saved_folder": folder}
        except Exception as e:
            return {"ok": False, "error": str(e)}


    # ------------------------------------------------------------------
    # small helpers
    # ------------------------------------------------------------------

    def _pdf_result(self, out_path, out_name):
        return {
            "ok": True,
            "output_path": out_path,
            "output_name": out_name,
            "output_size": os.path.getsize(out_path),
        }

    def _suffixed_name(self, original_name, suffix, ext=".pdf"):
        base = os.path.splitext(original_name)[0]
        return f"{base}-{suffix}{ext}"

    def cleanup(self):
        shutil.rmtree(self._tmp_dir, ignore_errors=True)