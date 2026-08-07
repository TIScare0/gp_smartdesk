from curl_cffi import requests, get_fingerprint

_IMPERSONATE = 'chrome131'
print(get_fingerprint("chrome"))
_DEFAULT_HEADERS = {}
_USER_AGENT = _DEFAULT_HEADERS.get('user-agent')

class Request:
    def __init__(self):
        self.session = None
        self._create_session()
    def _create_session(self):
        if not self.session:
            self.session = requests.Session(impersonate='chrome131')
        return self.session




Request()
print(_DEFAULT_HEADERS)