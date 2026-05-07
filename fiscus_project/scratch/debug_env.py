import os
from pathlib import Path
from dotenv import load_dotenv

# Try root .env
load_dotenv(Path('.') / '.env')
print(f"ROOT USER: {os.getenv('POSTGRES_USER')}")
print(f"ROOT HOST: {os.getenv('POSTGRES_HOST')}")

# Try backend .env
load_dotenv(Path('backend') / '.env')
print(f"BACKEND USER: {os.getenv('POSTGRES_USER')}")
print(f"BACKEND HOST: {os.getenv('POSTGRES_HOST')}")
