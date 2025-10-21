# Prodly
A productivity agent

- ## Backend (FastAPI)
- **Install dependencies**
  - `python3 -m venv .venv`
  - `source .venv/bin/activate`
  - `pip install -r backend/requirements.txt`
- **Run server**
  - `python backend/app.py`
  - or `uvicorn backend.app:app --reload --host 0.0.0.0 --port 5001`

- ## Frontend (React)
- **Install dependencies**
  - `cd frontend`
  - `npm install`
- **Run dev server**
  - `npm run dev`
- The dev server proxies `/api/*` requests to the FastAPI backend running on `http://127.0.0.1:5001` as configured in `frontend/vite.config.js`.

- ## API check
- Visit `http://127.0.0.1:5001/api/status` to confirm the backend is responding.
- The React app fetches the same endpoint on load to display the backend status.
