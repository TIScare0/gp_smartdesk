import webview

from tools import Model


class Main:
    def __init__(self) -> None:
        self.model = Model()

    def _port_to_js(self, func):
        return func

    def _funcs(self):
        return {
            name: self._port_to_js(getattr(self, name))
            for name in (
                "hello"
            )
        }

    def hello(self, msg):
        print(f'printef {msg}')
        return True

class API:
    def __init__(self) -> None:
        self.model = Model()
        self.func_names = set()

    def _port_to_js(self, func):
        return func

    def _funcs(self):
        return {name: self._port_to_js(getattr(self, name)) for name in self.func_names}

    def _add_func(self, name):
        self.func_names.add(name)

    def main(self):
        self._add_func('avaliable_models')
        
if __name__ == "__main__":
    api = Main()

    window = webview.create_window(
        "GP SmartDesk",
        "index.html",
        js_api=api._funcs(),
    )

    webview.start()
