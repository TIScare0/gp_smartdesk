from __future__ import annotations

from typing import Any

from curl_cffi import CurlOpt, requests
from curl_cffi.requests.exceptions import HTTPError

_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'


class Request:
    def __init__(self, session=None):
        self.session = session
        if not self.session:
            self._create_session()

    def _create_session(self):
        if not self.session:
            self.session = requests.Session(impersonate='chrome131')
        return self.session

    @staticmethod
    def _is_valid_status(code: int):
        return 100 <= code <= 599

    def request(
        self,
        url,
        /,
        *,
        method: str = 'GET',
        headers: dict[str, str] | None = None,
        cookies: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        timeout: float = 20,
        allow_status_codes: int | tuple[int, ...] | None = None,
        **kwargs: Any,
    ):

        method = method.upper()
        headers = {
            str(x): str(y)
            for x, y in (headers or {}).items()
        }

        allow_status_codes = allow_status_codes or ()
        if allow_status_codes and isinstance(allow_status_codes, int):
            allow_status_codes = (allow_status_codes, )

        for code in allow_status_codes:
            if not self._is_valid_status(code):
                raise RuntimeError(f'{code} is an invalid status code')

        if (data or kwargs.get('json')) and method == 'GET':
            method = 'POST'

        try:
            req = self.session.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=data,
                cookies=cookies,
                timeout=timeout,
                allow_redirects=True,
                **kwargs
            )
            req.raise_for_status()
            return req
        except requests.exceptions.RequestException as e:
            if e.response is not None and e.response.status_code in allow_status_codes:
                return e.response
            raise

    def download_webpage(
        self,
        url,
        /,
        *,
        headers: dict[str, str] | None = None,
        cookies: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        timeout: int = 20,
        allow_status_codes: int | tuple[int, ...] | None = None,
        **kwargs: Any,
    ):
        return self.request(
            url,
            headers=headers,
            params=params,
            data=data,
            timeout=timeout,
            allow_status_codes=allow_status_codes,
            cookies=cookies,
            **kwargs
        ).text

    def download_json(
        self,
        url,
        /,
        *,
        headers: dict[str, str] | None = None,
        cookies: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        timeout: int = 20,
        allow_status_codes: int | tuple[int, ...] | None = None,
        **kwargs: Any,
    ):
        return self.request(
            url,
            headers=headers,
            params=params,
            data=data,
            timeout=timeout,
            cookies=cookies,
            allow_status_codes=allow_status_codes,
            **kwargs
        ).json()

    def start_verbose(self):
        self.session.curl_options[CurlOpt.VERBOSE] = 1


class AppError(HTTPError):
    headers: dict[str, str] | None
    status_code: int | None
    body: Any

    def __init__(
        self,
        *,
        headers: dict[str, str] | None = None,
        status_code: int | None = None,
        body: Any = None,
    ) -> None:
        self.headers = headers
        self.status_code = status_code
        self.body = body

    def __str__(self) -> str:
        return f"headers: {self.headers}, status_code: {self.status_code}, body: {self.body}"
