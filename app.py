import json
import os
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Change this to a secure random key

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATE_FILE = os.path.join(BASE_DIR, "state.json")

def load_state():
    # Base default state
    state = {
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

    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                disk_data = json.load(f)
                if isinstance(disk_data, dict):
                    state.update(disk_data)
        except Exception as e:
            print(f"[DEBUG] Error loading state.json: {e}")

    # GUARANTEE: Ensure superadmin always exists in the user list
    users = state.get("users", [])
    if not any(u.get("username") == "superadmin" for u in users):
        users.insert(0, {
            "username": "superadmin",
            "password": "Password123!",
            "role": "Super Admin",
            "recoveryEmail": "admin@example.com",
            "assignedBuildings": []
        })
        state["users"] = users

    return state

def save_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=4)
        print(f"[DEBUG] Successfully saved state. Total users: {len(state.get('users', []))}")
    except Exception as e:
        print(f"[DEBUG] ERROR saving state.json: {e}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json() if request.is_json else request.form
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()

        state = load_state()
        users = state.get("users", [])

        print(f"[DEBUG] Login attempt -> Username: '{username}'")
        user = next((u for u in users if u.get("username") == username and u.get("password") == password), None)

        if user:
            print(f"[DEBUG] Login SUCCESS for {username}")
            session["username"] = user["username"]
            session["role"] = user["role"]
            return jsonify({
                "success": True, 
                "role": user["role"], 
                "username": user["username"],
                "assignedBuildings": user.get("assignedBuildings", []),
                "firstLogin": user.get("firstLogin", False)
            })
        else:
            print(f"[DEBUG] Login FAILED for {username}")
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
            if "users" in new_data:
                state["users"] = new_data["users"]
            if "camps" in new_data:
                state["camps"] = new_data["camps"]
            if "camp_buildings" in new_data:
                state["camp_buildings"] = new_data["camp_buildings"]
            if "bookings" in new_data:
                state["bookings"] = new_data["bookings"]
            
            save_state(state)
            return jsonify({"success": True})
    return jsonify(state)

if __name__ == "__main__":
    app.run(debug=True, port=5000)