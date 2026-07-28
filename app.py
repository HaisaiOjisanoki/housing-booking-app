from flask import Flask, render_template, jsonify, request, session, redirect, url_for

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

# In-memory or database store for application state
app_state = {
    "camps": ["Camp Hansen", "Camp Schwab", "Kadena AB"],
    "camp_buildings": {
        "Camp Hansen": ["5700", "5701", "5702"],
        "Camp Schwab": ["3001", "3002"]
    },
    "purposes": [
        "Check-in / In-processing",
        "Room Inspection",
        "Maintenance Request",
        "Check-out / Out-processing"
    ],
    "bookings": [],
    "staff_users": [
        {
            "username": "admin_hansen",
            "password": "password123",
            "role": "camp_admin",
            "camp": "Camp Hansen",
            "buildings": ["5700", "5701", "5702"]
        },
        {
            "username": "mgr_5700",
            "password": "password123",
            "role": "staff",
            "camp": "Camp Hansen",
            "buildings": ["5700"]
        }
    ]
}

@app.route('/dashboard')
def staff_dashboard():
    # Ensure user is logged in via session
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session.get('username')
    user_data = next((u for u in app_state["staff_users"] if u["username"] == username), {
        "role": "staff", "camp": "Camp Hansen", "buildings": ["5700"]
    })
    
    return render_template(
        'staff_dashboard.html',
        username=username,
        role=user_data.get("role"),
        camp=user_data.get("camp"),
        buildings=user_data.get("buildings", [])
    )

@app.route('/api/state', methods=['GET', 'POST'])
def handle_state():
    global app_state
    if request.method == 'POST':
        new_state = request.json
        if new_state:
            app_state.update(new_state)
        return jsonify({"status": "success"})
    return jsonify(app_state)

@app.route('/api/current_user', methods=['GET'])
def get_current_user():
    username = session.get('username', 'admin_hansen')
    user_data = next((u for u in app_state["staff_users"] if u["username"] == username), {
        "username": username,
        "role": "camp_admin",
        "camp": "Camp Hansen",
        "buildings": ["5700", "5701", "5702"]
    })
    return jsonify(user_data)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login')) # Adjust route as needed for your login page