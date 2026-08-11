import os
from dotenv import load_dotenv

load_dotenv()

def env_item(name):
    return os.environ.get(name)

def update_item(name, value):
    os.environ[name] = value
    return True
