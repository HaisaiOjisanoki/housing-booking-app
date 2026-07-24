import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for, session

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'housing_portal_secure_key_2026')

STATE_FILE = 'state.json'

def load_state():
    default_state = {
        "camps": ["Camp Hansen", "Camp Schwab", "Camp Courtney", "Camp Foster", "Kadena AB"],
        "camp_buildings": {
            "Camp Hansen": ["1001", "1002", "1003"],
            "Camp Schwab": ["2001", "2002"],
            "Camp Courtney": ["3001", "3002"],
            "Camp Foster": ["4001", "4002"],
            "Kadena AB": ["5001", "5002"]
        },
        "bookings": [],
        "staff_users": [
            {"username": "hansen_manager", "password": "password123", "camp": "Camp Hansen", "building": "1001"}
        ],
        "purposes": [
            "Check-in / In-processing",
            "Out-processing Inspection",
            "Maintenance Request",
            "Room Change Inquiry"
        ]
    }
    
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                data = json.load(f)
                # Ensure all required keys exist to prevent KeyError exceptions
                for key in default_state:
                    if key not in data:
                        data[key] = default_state[key]
                return data
        except Exception as e:
            print(f"Error loading state file: {e}")
            return default_state
    return default_state

def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving state file: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/superadmin')
def superadmin():
    if session.get('role') != 'superadmin':
        return redirect(url_for('login'))
    return render_template('superadmin.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Superadmin check
        if username == 'superadmin' and password == 'admin123':
            session['role'] = 'superadmin'
            return redirect(url_for('superadmin'))
            
        # Staff check
        state = load_state()
        for staff in state.get('staff_users', []):
            if staff.get('username') == username and staff.get('password') == password:
                session['role'] = 'staff'
                session['username'] = username
                session['camp'] = staff.get('camp')
                session['building'] = staff.get('building')
                return redirect(url_for('dashboard'))
                
        return render_template('login.html', error='Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/api/state', methods=['GET', 'POST'])
def api_state():
    if request.method == 'GET':
        return jsonify(load_state())
    
    incoming_state = request.json
    if not incoming_state:
        return jsonify({"error": "Invalid state payload"}), 400
    
    # Server-side validation: Restrict appointments during lunch hours (11:30 - 13:00)
    for booking in incoming_state.get('bookings', []):
        time_val = booking.get('time', '')
        status = booking.get('status', 'Pending')
        if status != 'Cancelled' and time_val:
            if '11:30' <= time_val <= '13:00':
                return jsonify({"error": "Appointments are strictly restricted during lunch hours (11:30 - 13:00)."}), 400

    if save_state(incoming_state):
        return jsonify({"success": True})
    return jsonify({"error": "Failed to save state"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)