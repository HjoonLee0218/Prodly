from flask import Flask, jsonify
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.get("/api/status")
    def status() -> tuple[dict[str, str], int]:
        return jsonify({"status": "ok", "message": "Flask backend is running"}), 200

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)
