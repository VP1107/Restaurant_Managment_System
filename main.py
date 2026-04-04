import uvicorn
from dotenv import load_dotenv

load_dotenv()  # Loads SECRET_KEY, DATABASE_URL etc. from .env

if __name__ == "__main__":
    uvicorn.run("src.app:app",
    host="localhost",
    port=5173,
    reload=True,
)