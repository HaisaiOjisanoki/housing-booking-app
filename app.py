import os
import json
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = os.urandom(24)

DATA_FILE = 'app_state.json'

default_state = {
    "camps": ["Camp Foster", "Camp Hansen", "Camp Schwab", "MCAS Futenma"],
    "camp_buildings": {
        "Camp Foster": ["5679", "5680", "5700"],
        "Camp Hansen": ["2301", "2302"],
        "Camp Schwab": ["3101", "3102"],
        "MCAS Futenma": ["101", "102"]
    },
    "purposes": [
        "Check-in / In-processing",
        "Out-processing Inspection",
        "Room Maintenance Request",
        "Pre-termination Inspection"
    ],
    "staff_users": [
        {
            "username": "superadmin",
            "password": "password123",
            "role": "superadmin",
            "camp": "All",
            "buildings": [],
            "recovery_email": "admin@usmc.mil"
        },
        {
            "username": "foster_admin",
            "password": "password123",
            "role": "camp_admin",
            "camp": "Camp Foster",
            "buildings": ["5679", "5680", "5700"],
            "recovery_email": "foster.admin@usmc.mil"
        },
        {
            "username": "bldg5679_mgr",
            "password": "password123",
            "role": "staff",
            "camp": "Camp Foster",
            "buildings": ["5679"],
            "recovery_email": "mgr5679@usmc.mil"
        }
    ],
    "bookings": []
}

def load_state():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return default_state

def save_state(state):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(state, f, indent=4)
    except Exception as e:
        print(f"Error saving state: {e}")

app_state = load_state()

@app.route('/')
def index():
    return render_template('index.html', state=app_state)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        for user in app_state.get('staff_users', []):
            if user['username'] == username and user['password'] == password:
                session['user'] = user
                if user['role'] == 'superadmin':
                    return redirect(url_for('superadmin_dashboard'))
                else:
                    return redirect(url_for('staff_dashboard'))
        
        return render_template('login.html', error="Invalid username or password.")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

@app.route('/superadmin')
def superadmin_dashboard():
    user = session.get('user')
    if not user or user.get('role') != 'superadmin':
        return redirect(url_for('login'))
    return render_template('superadmin.html')

@app.route('/staff')
def staff_dashboard():
    user = session.get('user')
    if not user or user.get('role') not in ['camp_admin', 'staff']:
        return redirect(url_for('login'))
    return render_template('staff.html')

@app.route('/api/current_user')
def api_current_user():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify(user)

@app.route('/api/state', methods=['GET', 'POST'])
def api_state():
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    global app_state
    if request.method == 'POST':
        new_state = request.json
        if new_state:
            app_state = new_state
            save_state(app_state)
        return jsonify({'status': 'success'})
        
    return jsonify(app_state)

@app.route('/api/book', methods=['POST'])
def api_book():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid data'}), 400
    
    if 'bookings' not in app_state:
        app_state['bookings'] = []
        
    app_state['bookings'].append(data)
    save_state(app_state)
    return jsonify({'status': 'success', 'confirmationCode': data.get('confirmationCode')})

if __name__ == '__main__':
    app.run(debug=True, port=5000)