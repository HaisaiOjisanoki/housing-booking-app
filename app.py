import json
import os
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Change this to a secure random key

STATE_FILE = "state.json"

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "users": [
            {
                "username": "superadmin",
                "password": "Password123!",
                "role": "Super Admin",
                "recoveryEmail": "admin@example.com",
                "assignedBuildings": []
            }
        ],
        "camps": [],
        "camp_buildings": {},
        "bookings": []
    }

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=4)

@app.route("/")
def index():
    # Renders the public visitor booking page (ensure your template is named index.html)
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json() if request.is_json else request.form
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        state = load_state()
        users = state.get("users", [])

        user = next((u for u in users if u["username"] == username and u["password"] == password), None)

        if user:
            session["username"] = user["username"]
            session["role"] = user["role"]
            return jsonify({
                "success": True, 
                "role": user["role"], 
                "username": user["username"],
                "firstLogin": user.get("firstLogin", False)
            })
        else:
            return jsonify({"success": False, "message": "Invalid username or password"}), 401

    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/api/state", methods=["GET", "POST"])
def api_state():
    state = load_state()
    if request.method == "POST":
        new_data = request.get_json()
        if new_data:
            state.update(new_data)
            save_state(state)
            return jsonify({"success": True})
    return jsonify(state)

if __name__ == "__main__":
    app.run(debug=True, port=5000)