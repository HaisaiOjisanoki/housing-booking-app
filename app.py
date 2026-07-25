import os
import json
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = 'uh_management_dashboard_secret_key'

DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {
        "bookings": [],
        "staff_users": [
            {
                "username": "admin_hansen",
                "password": "password123",
                "recovery_email": "admin@okinawa.mil",
                "role": "camp_admin",
                "camp": "Camp Hansen",
                "buildings": ["1001", "1002", "1003"],
                "must_change_password": False
            }
        ],
        "camp_buildings": {
            "Camp Hansen": ["1001", "1002", "1003"],
            "Camp Schwab": ["2001", "2002"],
            "Camp Courtney": ["3001", "3002"]
        }
    }

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    data = load_data()
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = next((u for u in data.get('staff_users', []) if u['username'] == username and u['password'] == password), None)
        if user:
            session['username'] = user['username']
            session['role'] = user['role']
            session['camp'] = user['camp']
            session['buildings'] = user['buildings']
            return redirect(url_for('staff_dashboard'))
        else:
            error = 'Invalid username or password.'
            
    return render_template('login.html', error=error)

@app.route('/staff')
def staff_dashboard():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('staff_dashboard.html', 
                           username=session['username'], 
                           role=session.get('role'), 
                           camp=session.get('camp'), 
                           buildings=session.get('buildings', []))

@app.route('/api/state', methods=['GET', 'POST'])
def api_state():
    data = load_data()
    if request.method == 'POST':
        new_state = request.json
        save_data(new_state)
        return jsonify({"status": "success"})
    return jsonify(data)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)