import os
import json
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default-secure-secret-key')

DATA_FILE = 'data.json'

def load_data():
    if not os.path.exists(DATA_FILE):
        return {
            "appointments": [],
            "camps": [],
            "buildings": [],
            "purposes": [],
            "users": []
        }
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {"appointments": [], "camps": [], "buildings": [], "purposes": [], "users": []}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/booking', methods=['GET', 'POST'])
def booking():
    data = load_data()
    if request.method == 'POST':
        req_data = request.form if request.form else request.get_json()
        appointments = data.get('appointments', [])
        
        confirmation_code = f"UH-{datetime.now().strftime('%Y%m%d')}-{os.urandom(2).hex().upper()}"
        
        new_appointment = {
            "confirmation_code": confirmation_code,
            "camp": req_data.get('camp'),
            "building": req_data.get('building'),
            "purpose": req_data.get('purpose'),
            "date": req_data.get('date'),
            "time": req_data.get('time'),
            "name": req_data.get('name'),
            "email": req_data.get('email'),
            "phone": req_data.get('phone'),
            "status": "Scheduled",
            "created_at": datetime.now().isoformat()
        }
        
        appointments.append(new_appointment)
        data['appointments'] = appointments
        save_data(data)
        
        if request.is_json:
            return jsonify({"success": True, "confirmation_code": confirmation_code})
        return render_template('booking.html', success=True, confirmation_code=confirmation_code, camps=data.get('camps', []), buildings=data.get('buildings', []), purposes=data.get('purposes', []))
        
    return render_template('booking.html', camps=data.get('camps', []), buildings=data.get('buildings', []), purposes=data.get('purposes', []))

@app.route('/public', methods=['GET', 'POST'])
def public_portal():
    data = load_data()
    appointment = None
    error = None
    
    if request.method == 'POST':
        code = request.form.get('confirmation_code', '').strip()
        action = request.form.get('action')
        appointments = data.get('appointments', [])
        
        if action == 'lookup':
            appointment = next((a for a in appointments if a.get('confirmation_code') == code), None)
            if not appointment:
                error = "Appointment not found with that confirmation code."
                
    return render_template('public.html', appointment=appointment, error=error)

@app.route('/api/book', methods=['POST'])
def api_book():
    data = load_data()
    req_data = request.get_json() or request.form
    appointments = data.get('appointments', [])
    
    confirmation_code = f"UH-{datetime.now().strftime('%Y%m%d')}-{os.urandom(2).hex().upper()}"
    
    new_appointment = {
        "confirmation_code": confirmation_code,
        "camp": req_data.get('camp'),
        "building": req_data.get('building'),
        "purpose": req_data.get('purpose'),
        "date": req_data.get('date'),
        "time": req_data.get('time'),
        "name": req_data.get('name'),
        "email": req_data.get('email'),
        "phone": req_data.get('phone'),
        "status": "Scheduled",
        "created_at": datetime.now().isoformat()
    }
    
    appointments.append(new_appointment)
    data['appointments'] = appointments
    save_data(data)
    
    return jsonify({"success": True, "confirmation_code": confirmation_code}), 200

@app.route('/api/appointments/manage', methods=['POST'])
def api_manage_appointment():
    allowed_roles = ['superadmin', 'Camp Admin', 'UH Building Managers', 'camp_admin', 'staff']
    user_role = session.get('role')
    
    if 'user' not in session or (user_role and user_role not in allowed_roles and user_role not in ['superadmin', 'Camp Admin', 'UH Building Managers']):
        return jsonify({"success": False, "message": "Unauthorized. Please log in with a valid management role."}), 401

    req_data = request.get_json() or request.form
    confirmation_code = req_data.get('confirmation_code')
    new_status = req_data.get('status')
    
    data = load_data()
    appointments = data.get('appointments', [])
    updated = False
    
    for appt in appointments:
        if appt.get('confirmation_code') == confirmation_code:
            appt['status'] = new_status
            updated = True
            break
            
    if updated:
        save_data(data)
        return jsonify({"success": True, "message": "Appointment status updated successfully."}), 200
        
    return jsonify({"success": False, "message": "Invalid confirmation code or appointment not found."}), 404

@app.route('/api/camps/update', methods=['POST'])
def api_update_camp():
    allowed_roles = ['superadmin', 'Camp Admin', 'UH Building Managers', 'camp_admin', 'staff']
    if 'user' not in session or session.get('role') not in allowed_roles:
        return jsonify({"success": False, "message": "Unauthorized. Please log in."}), 401

    req_data = request.get_json() or request.form
    old_name = req_data.get('old_name')
    new_name = req_data.get('name')
    
    data = load_data()
    camps = data.get('camps', [])
    
    updated = False
    if old_name in camps:
        idx = camps.index(old_name)
        camps[idx] = new_name
        updated = True
    elif new_name and new_name not in camps:
        camps.append(new_name)
        updated = True

    if updated:
        data['camps'] = camps
        save_data(data)
        return jsonify({"success": True, "message": "Location updated successfully."}), 200
        
    return jsonify({"success": False, "message": "Location update failed."}), 400

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        data = load_data()
        user = next((u for u in data.get('users', []) if u.get('username') == username and u.get('password') == password), None)
        if user:
            session['user'] = username
            session['role'] = user.get('role', 'staff')
            if session['role'] == 'superadmin':
                return redirect(url_for('superadmin'))
            return redirect(url_for('staff_dashboard'))
        return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    data = load_data()
    return render_template('dashboard.html', appointments=data.get('appointments', []))

@app.route('/staff')
def staff_dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    data = load_data()
    return render_template('staff.html', appointments=data.get('appointments', []))

@app.route('/superadmin')
def superadmin():
    if 'user' not in session or session.get('role') != 'superadmin':
        return redirect(url_for('login'))
    data = load_data()
    return render_template('superadmin.html', data=data)

@app.route('/change-password', methods=['GET', 'POST'])
def change_password():
    if 'user' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        old_pw = request.form.get('old_password')
        new_pw = request.form.get('new_password')
        data = load_data()
        for u in data.get('users', []):
            if u.get('username') == session['user'] and u.get('password') == old_pw:
                u['password'] = new_pw
                save_data(data)
                return render_template('change_password.html', success=True)
        return render_template('change_password.html', error="Incorrect current password")
    return render_template('change_password.html')

if __name__ == '__main__':
    app.run(debug=True)