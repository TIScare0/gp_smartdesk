import os
from cache import (
    save_secure,
    load_secure,
)

def env_item(name):
    return os.environ.get(name)

def update_env_item(name, value):
    os.environ[name] = value
    return True

KEYS_CACHE_KEY = 'user_keys'

def update_key(name, key):
    cached_data = load_secure(KEYS_CACHE_KEY, default={}) 
    cached_data.update({name: key})
    save_secure(KEYS_CACHE_KEY, cached_data)

def get_key(name, default=None):
    cached = load_secure(KEYS_CACHE_KEY, default=default)
    return cached.get(name) if cached else cached

NVIDIA_API_KEY = get_key('NVIDIA') or '$ADD_YOUR_KEY_HERE'

OPENROUTER_API_KEY = get_key('OPENROUTER') or '$ADD_YOUR_KEY_HERE'

GEMINI_API_KEY = get_key('GEMINI') or '$ADD_YOUR_KEY_HERE'

MISTRAL_API_KEY = get_key('MISTRAL') or '$ADD_YOUR_KEY_HERE'

COHERE_API_KEY = get_key('COHERE') or '$ADD_YOUR_KEY_HERE'
