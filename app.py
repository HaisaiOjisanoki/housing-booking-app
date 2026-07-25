import os
import json
import random
import string
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

def generate_confirmation_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

@app.route('/')
def index():
    data = load_data()
    return render_template('index.html', camp_buildings=data.get('camp_buildings', {}))

@app.route('/api/book', methods=['POST'])
def api_book():
    data = load_data()
    req = request.json
    
    code = generate_confirmation_code()
    while any(b.get('confirmationCode') == code for b in data.get('bookings', [])):
        code = generate_confirmation_code()
        
    new_booking = {
        "confirmationCode": code,
        "firstName": req.get('firstName'),
        "lastName": req.get('lastName'),
        "branch": req.get('branch'),
        "email": req.get('email'),
        "camp": req.get('camp'),
        "building": str(req.get('building')),
        "date": req.get('date'),
        "time": req.get('time'),
        "purpose": req.get('purpose', 'Check-in / Inspection'),
        "staffNotes": ""
    }
    
    if 'bookings' not in data:
        data['bookings'] = []
    data['bookings'].append(new_booking)
    save_data(data)
    
    return jsonify({"status": "success", "confirmationCode": code})

@app.route('/api/lookup-booking', methods=['POST'])
def api_lookup_booking():
    data = load_data()
    code = request.json.get('confirmationCode', '').strip().upper()
    booking = next((b for b in data.get('bookings', []) if b.get('confirmationCode') == code), None)
    if booking:
        return jsonify({"status": "success", "booking": booking})
    return jsonify({"status": "error", "message": "Confirmation code not found."}), 404

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