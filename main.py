import os
import sys

# Add apps/api to sys.path so app module is discoverable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "apps", "api"))

from app.main import app
