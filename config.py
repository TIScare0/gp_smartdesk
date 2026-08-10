import os
from dotenv import dotenv_values

globals().update(dotenv_values('.env'))

def env_item(name):
    return os.environ.get(name)

def update_item(name, value):
    os.environ[name] = value
    return True