from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os
import random

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
            "email": "john.doe@usmc.mil",
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

# Public Booking Page
@app.route('/')
def booking_page():
    return render_template('booking.html')

# Staff Login Page
@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if 'username' in session:
        if session['role'] == 'superadmin':
            return redirect(url_for('superadmin_dashboard'))
        else:
            return redirect(url_for('staff_dashboard'))
            
    if request.method == 'POST':
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
        
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('booking_page'))

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

@app.route('/api/book', methods=['POST'])
def api_book():
    data = request.get_json()
    state = load_state()
    
    code = f"UH-{random.randint(1000, 9999)}"
    while any(b.get('confirmationCode') == code for b in state.get('bookings', [])):
        code = f"UH-{random.randint(1000, 9999)}"
        
    new_booking = {
        "confirmationCode": code,
        "firstName": data.get('firstName'),
        "lastName": data.get('lastName'),
        "email": data.get('email'),
        "branch": data.get('branch'),
        "camp": data.get('camp'),
        "building": data.get('building'),
        "date": data.get('date'),
        "time": data.get('time'),
        "purpose": data.get('purpose'),
        "status": "Pending",
        "staffNotes": ""
    }
    
    if 'bookings' not in state:
        state['bookings'] = []
    state['bookings'].append(new_booking)
    save_state(state)
    
    return jsonify({"status": "success", "confirmationCode": code})

if __name__ == '__main__':
    app.run(debug=True, port=5000)