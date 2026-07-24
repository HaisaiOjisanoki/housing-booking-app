from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os

app = Flask(__name__)
app.secret_key = 'unaccompanied_housing_secret_key'

DATA_FILE = 'state.json'

DEFAULT_STATE = {
    "camps": ["Camp Foster", "Camp Hansen", "Camp Schwab"],
    "camp_buildings": {
        "Camp Foster": ["1001", "1002", "1003"],
        "Camp Hansen": ["2001", "2002"],
        "Camp Schwab": ["3001"]
    },
    "staff_users": [
        {
            "username": "campadmin_foster",
            "password": "password123",
            "role": "camp_admin",
            "camp": "Camp Foster",
            "buildings": ["1001", "1002", "1003"]
        },
        {
            "username": "manager_1001",
            "password": "password123",
            "role": "staff",
            "camp": "Camp Foster",
            "buildings": ["1001"]
        }
    ],
    "bookings": [
        {
            "confirmationCode": "UH-8821",
            "firstName": "John",
            "lastName": "Doe",
            "branch": "USMC",
            "camp": "Camp Foster",
            "building": "1001",
            "date": "2026-06-15",
            "time": "09:00",
            "purpose": "Check-in / In-processing",
            "status": "Confirmed",
            "staffNotes": ""
        }
    ],
    "purposes": ["Check-in / In-processing", "Out-processing Inspection", "Maintenance Request"]
}

def load_state():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return DEFAULT_STATE
    return DEFAULT_STATE

def save_state(state):
    with open(DATA_FILE, 'w') as f:
        json.dump(state, f, indent=4)

@app.route('/')
def login_page():
    if 'username' in session:
        if session['role'] == 'superadmin':
            return redirect(url_for('superadmin_dashboard'))
        else:
            return redirect(url_for('staff_dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    if username == 'superadmin' and password == 'admin123':
        session['username'] = 'superadmin'
        session['role'] = 'superadmin'
        return redirect(url_for('superadmin_dashboard'))

    state = load_state()
    for user in state.get('staff_users', []):
        if user['username'] == username and user['password'] == password:
            session['username'] = user['username']
            session['role'] = user['role']
            session['camp'] = user['camp']
            session['buildings'] = user.get('buildings', [user.get('building')] if user.get('building') else [])
            return redirect(url_for('staff_dashboard'))

    return render_template('login.html', error='Invalid username or password.')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))

@app.route('/superadmin')
def superadmin_dashboard():
    if session.get('role') != 'superadmin':
        return redirect(url_for('login_page'))
    return render_template('superadmin.html')

@app.route('/dashboard')
def staff_dashboard():
    if session.get('role') not in ['camp_admin', 'staff']:
        return redirect(url_for('login_page'))
    return render_template(
        'dashboard.html',
        username=session.get('username'),
        role=session.get('role'),
        camp=session.get('camp'),
        buildings=session.get('buildings', [])
    )

@app.route('/api/state', methods=['GET', 'POST'])
def api_state():
    if request.method == 'POST':
        new_state = request.get_json()
        if new_state:
            save_state(new_state)
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    else:
        return jsonify(load_state())

if __name__ == '__main__':
    app.run(debug=True, port=5000)