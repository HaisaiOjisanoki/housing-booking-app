from flask import Flask, request, jsonify, render_template_string, redirect, url_for, session
from functools import wraps
from datetime import timedelta
import sqlite3
import json
import secrets
import os
import traceback

app = Flask(__name__)
app.secret_key = "change-this-to-a-secure-secret-key"

# Absolute path configuration for robust SQLite file storage on Render
basedir = os.path.abspath(os.path.dirname(__file__))
DB_NAME = os.path.join(basedir, "housing.db")

# -------------------------------------------------------------------
# Database Initialization & Auto-Migration
# -------------------------------------------------------------------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create Appointments Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            confirmation_number TEXT UNIQUE,
            sm_name TEXT NOT NULL,
            branch TEXT NOT NULL,
            email TEXT NOT NULL,
            date_time TEXT NOT NULL,
            purpose TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            notes TEXT DEFAULT ''
        )
    ''')
    
    # Auto-migration check: Ensure columns exist in appointments
    cursor.execute("PRAGMA table_info(appointments)")
    columns = [column[1] for column in cursor.fetchall()]
    if 'notes' not in columns:
        cursor.execute("ALTER TABLE appointments ADD COLUMN notes TEXT DEFAULT ''")
    if 'confirmation_number' not in columns:
        cursor.execute("ALTER TABLE appointments ADD COLUMN confirmation_number TEXT")

    # Create Users Table (For Admins and Super Admins)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            email TEXT,
            must_change_password INTEGER DEFAULT 1
        )
    ''')

    # Auto-migration check: Ensure columns exist in users
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [column[1] for column in cursor.fetchall()]
    if 'email' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
    if 'must_change_password' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 1")

    # Seed default super admin if table is empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO users (username, password, role, email, must_change_password) VALUES (?, ?, ?, ?, ?)', 
                       ('admin', 'housingpassword123', 'super_admin', None, 1))

    # Create Staff Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Create Staff Availability Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER,
            time_slot TEXT NOT NULL,
            FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
    ''')

    # Create Appointment-Staff Bridge Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointment_staff (
            appointment_id INTEGER,
            staff_id INTEGER,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE,
            PRIMARY KEY(appointment_id, staff_id)
        )
    ''')
    
    # Create Staff Inbox / Notifications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff_inbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER,
            appointment_id INTEGER,
            message TEXT NOT NULL,
            notification_type TEXT DEFAULT 'New Booking',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0,
            FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        )
    ''')

    # Auto-migration check: Ensure columns exist in staff_inbox
    cursor.execute("PRAGMA table_info(staff_inbox)")
    inbox_columns = [column[1] for column in cursor.fetchall()]
    if inbox_columns:
        if 'is_read' not in inbox_columns:
            cursor.execute("ALTER TABLE staff_inbox ADD COLUMN is_read INTEGER DEFAULT 0")
        if 'notification_type' not in inbox_columns:
            cursor.execute("ALTER TABLE staff_inbox ADD COLUMN notification_type TEXT DEFAULT 'New Booking'")
    
    # Create Purposes Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visit_purposes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Seed default staff if table is empty
    cursor.execute('SELECT COUNT(*) FROM staff')
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO staff (name) VALUES (?)', [
            ('Building 100 - Check-In Desk',),
            ('Building 101 - Main Office',),
            ('Building 102 - Inspection Desk',)
        ])
        
    # Seed default staff availability if table is empty
    cursor.execute('SELECT COUNT(*) FROM staff_availability')
    if cursor.fetchone()[0] == 0:
        cursor.execute('SELECT id FROM staff')
        staff_rows = cursor.fetchall()
        default_slots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']
        for row in staff_rows:
            s_id = row[0]
            for slot in default_slots:
                cursor.execute('INSERT INTO staff_availability (staff_id, time_slot) VALUES (?, ?)', (s_id, slot))

    # Seed default purposes if table is empty
    cursor.execute('SELECT COUNT(*) FROM visit_purposes')
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO visit_purposes (name) VALUES (?)', [
            ('Check-in',),
            ('Check-out',),
            ('Room Inspection',),
            ('Maintenance Request',),
            ('Key Replacement',)
        ])
        
    conn.commit()
    conn.close()

init_db()

# -------------------------------------------------------------------
# Authentication Helper Decorators & Notification Function
# -------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def super_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in') or session.get('role') != 'super_admin':
            return redirect(url_for('admin'))
        return f(*args, **kwargs)
    return decorated_function

def notify_appointment_staff(appointment_id, message, n_type='Update'):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT staff_id FROM appointment_staff WHERE appointment_id = ?', (appointment_id,))
    staff_rows = cursor.fetchall()
    for row in staff_rows:
        s_id = row[0]
        cursor.execute('''
            INSERT INTO staff_inbox (staff_id, appointment_id, message, notification_type)
            VALUES (?, ?, ?, ?)
        ''', (s_id, appointment_id, message, n_type))
    conn.commit()
    conn.close()

def get_staff_data():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM staff ORDER BY name ASC')
    staff_rows = cursor.fetchall()
    
    staff_list = []
    staff_availability_dict = {}
    staff_inbox_dict = {}
    
    for s_id, s_name in staff_rows:
        staff_list.append((s_id, s_name))
        
        # Slots
        cursor.execute('SELECT id, time_slot FROM staff_availability WHERE staff_id = ? ORDER BY time_slot ASC', (s_id,))
        slots = cursor.fetchall()
        slot_list = [{'id': slot[0], 'time': slot[1]} for slot in slots]
        staff_availability_dict[s_id] = slot_list
        staff_availability_dict[str(s_id)] = slot_list
        
        # Inbox notifications (only unread or limited recent read)
        cursor.execute('''
            SELECT id, appointment_id, message, notification_type, timestamp, is_read 
            FROM staff_inbox 
            WHERE staff_id = ? AND is_read = 0
            ORDER BY timestamp DESC 
            LIMIT 15
        ''', (s_id,))
        inbox_items = cursor.fetchall()
        
        items_list = []
        unread_count = 0
        for item in inbox_items:
            unread_count += 1
            items_list.append({
                'id': item[0],
                'appointment_id': item[1],
                'message': item[2],
                'type': item[3],
                'timestamp': item[4],
                'is_read': item[5]
            })
            
        inbox_payload = {
            'items': items_list,
            'unread_count': unread_count
        }
        staff_inbox_dict[s_id] = inbox_payload
        staff_inbox_dict[str(s_id)] = inbox_payload
        
    conn.close()
    return staff_list, staff_availability_dict, staff_inbox_dict

def get_global_unread_inbox():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT si.id, si.staff_id, s.name, si.appointment_id, si.message, si.notification_type, si.timestamp, si.is_read
        FROM staff_inbox si
        JOIN staff s ON si.staff_id = s.id
        WHERE si.is_read = 0
        ORDER BY si.timestamp DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    items = []
    for r in rows:
        items.append({
            'id': r[0],
            'staff_id': r[1],
            'staff_name': r[2],
            'appointment_id': r[3],
            'message': r[4],
            'type': r[5],
            'timestamp': r[6],
            'is_read': r[7]
        })
    return items

def generate_conf_number():
    return f"HB-{secrets.token_hex(3).upper()}"

# -------------------------------------------------------------------
# HTML Templates
# -------------------------------------------------------------------
BOOK_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing Booking</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-4 py-md-5">
    <div class="container px-3" style="max-width: 650px;">
        <div class="card shadow-sm p-3 p-md-4">
            <h3 class="mb-4 text-primary fw-bold text-center text-md-start">Schedule Housing Appointment</h3>
            
            {% if message %}
                <div class="alert alert-success">
                    {{ message }}
                    {% if conf_num %}
                        <hr>
                        <p class="mb-1"><strong>Confirmation Number:</strong> <span class="badge bg-dark fs-6">{{ conf_num }}</span></p>
                        <p class="mb-2 small text-muted">A confirmation email has been simulated and sent to your address. Keep this number to manage your booking.</p>
                        <a href="/manage/{{ conf_num }}" class="btn btn-sm btn-outline-primary fw-bold">Manage Booking Now →</a>
                    {% endif %}
                </div>
            {% endif %}

            <form method="POST" action="/book">
                <div class="mb-3">
                    <label class="form-label fw-bold">Service Member Name</label>
                    <input type="text" name="sm_name" class="form-control" placeholder="Last, First" required>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Branch of Service</label>
                    <select name="branch" class="form-select" required>
                        <option value="">-- Select Branch --</option>
                        <option value="Army">Army</option>
                        <option value="Marine Corps">Marine Corps</option>
                        <option value="Navy">Navy</option>
                        <option value="Air Force">Air Force</option>
                        <option value="Space Force">Space Force</option>
                        <option value="Coast Guard">Coast Guard</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Contact Email</label>
                    <input type="email" name="email" class="form-control" placeholder="name@mail.mil" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Building Number</label>
                    <select name="staff_id" class="form-select" required>
                        <option value="">-- Select Building Number --</option>
                        {% for s_id, s_name in staff_list %}
                            <option value="{{ s_id }}">{{ s_name }}</option>
                        {% endfor %}
                    </select>
                </div>
                
                <div class="row mb-3">
                    <div class="col-12 col-md-7 mb-3 mb-md-0">
                        <label class="form-label fw-bold">Date</label>
                        <input type="date" name="appt_date" class="form-control" required>
                    </div>
                    <div class="col-12 col-md-5">
                        <label class="form-label fw-bold">Time (24-Hr)</label>
                        <select name="appt_time" class="form-select" required>
                            <option value="">-- Time --</option>
                            <option value="07:00">07:00</option>
                            <option value="07:30">07:30</option>
                            <option value="08:00">08:00</option>
                            <option value="08:30">08:30</option>
                            <option value="09:00">09:00</option>
                            <option value="09:30">09:30</option>
                            <option value="10:00">10:00</option>
                            <option value="10:30">10:30</option>
                            <option value="11:00">11:00</option>
                            <option value="11:30">11:30</option>
                            <option value="12:00">12:00</option>
                            <option value="12:30">12:30</option>
                            <option value="13:00">13:00</option>
                            <option value="13:30">13:30</option>
                            <option value="14:00">14:00</option>
                            <option value="14:30">14:30</option>
                            <option value="15:00">15:00</option>
                            <option value="15:30">15:30</option>
                            <option value="16:00">16:00</option>
                            <option value="16:30">16:30</option>
                            <option value="17:00">17:00</option>
                        </select>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="form-label fw-bold">Purpose of Visit</label>
                    <select name="purpose" class="form-select" required>
                        <option value="">-- Select Purpose --</option>
                        {% for p in purpose_list %}
                            <option value="{{ p[1] }}">{{ p[1] }}</option>
                        {% endfor %}
                    </select>
                </div>

                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold mb-3">Submit Booking</button>
            </form>

            <hr class="my-3">
            <div class="text-center">
                <a href="/lookup" class="text-decoration-none fw-semibold">Already booked? Manage your booking with confirmation number →</a>
            </div>
            <div class="text-center mt-2">
                <a href="#" class="text-muted small text-decoration-none" data-bs-toggle="modal" data-bs-target="#adminLoginModal">Admin Portal Login →</a>
            </div>
        </div>
    </div>

    <div class="modal fade" id="adminLoginModal" tabindex="-1" aria-labelledby="adminLoginModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
            <div class="modal-content shadow">
                <form method="POST" action="/login">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title fw-bold fs-6" id="adminLoginModalLabel">Admin Portal Login</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold small">Username</label>
                            <input type="text" name="username" class="form-control" required autofocus>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small">Password</label>
                            <input type="password" name="password" class="form-control" required>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" name="remember" class="form-check-input" id="modalRememberCheck">
                            <label class="form-check-label small" for="modalRememberCheck">Remember Password</label>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 py-2 fw-bold mb-3">Login</button>
                        <div class="text-center">
                            <a href="/forgot-password" class="text-muted small text-decoration-none">Forgot password? Click here</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''

LOOKUP_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lookup Booking</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container px-3" style="max-width: 450px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-3 text-center fw-bold">Manage Your Booking</h3>
            <p class="text-muted small text-center mb-4">Enter your confirmation number (sent to your email) to view or update your appointment.</p>
            
            {% if error %}
                <div class="alert alert-danger">{{ error }}</div>
            {% endif %}

            <form method="POST" action="/lookup">
                <div class="mb-3">
                    <label class="form-label fw-bold">Confirmation Number</label>
                    <input type="text" name="conf_number" class="form-control text-uppercase" placeholder="e.g., HB-123XYZ" required autofocus>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">Lookup Booking</button>
            </form>
            <div class="text-center mt-3">
                <a href="/" class="text-muted small">← Back to Public Booking Form</a>
            </div>
        </div>
    </div>
</body>
</html>
'''

USER_MANAGE_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Booking - {{ appt[1] }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-4 py-md-5">
    <div class="container px-3" style="max-width: 650px;">
        <div class="card shadow-sm p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <h3 class="text-primary fw-bold m-0">Booking Details</h3>
                <span class="badge bg-dark fs-6">{{ appt[1] }}</span>
            </div>

            {% if message %}
                <div class="alert alert-success">{{ message }}</div>
            {% endif %}

            <div class="row mb-3">
                <div class="col-6">
                    <span class="text-muted small fw-bold d-block">Service Member</span>
                    <span class="fs-5 fw-bold text-dark">{{ appt[2] }}</span>
                </div>
                <div class="col-6">
                    <span class="text-muted small fw-bold d-block">Branch</span>
                    <span class="fs-6 text-dark">{{ appt[3] }}</span>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-6">
                    <span class="text-muted small fw-bold d-block">Email</span>
                    <span class="text-dark">{{ appt[4] }}</span>
                </div>
                <div class="col-6">
                    <span class="text-muted small fw-bold d-block">Current Status</span>
                    <span class="badge bg-primary fs-6">{{ appt[7] if appt[7] else 'Pending' }}</span>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-12">
                    <span class="text-muted small fw-bold d-block">Assigned Building(s)</span>
                    <span class="text-dark fw-medium">{{ staff_names }}</span>
                </div>
            </div>

            <hr class="mb-4">

            <h5 class="fw-bold text-secondary mb-3">Update Appointment Date & Time</h5>
            <form method="POST" action="/manage/{{ appt[1] }}/update">
                <div class="row mb-3">
                    <div class="col-12 col-md-7 mb-3 mb-md-0">
                        <label class="form-label fw-bold">New Date</label>
                        <input type="date" name="appt_date" class="form-control" value="{{ appt[5].split('T')[0] }}" required>
                    </div>
                    <div class="col-12 col-md-5">
                        <label class="form-label fw-bold">New Time (24-Hr)</label>
                        <input type="time" name="appt_time" class="form-control" value="{{ appt[5].split('T')[1] }}" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-outline-primary w-100 py-2 fw-bold mb-3">Reschedule Appointment</button>
            </form>

            <form method="POST" action="/manage/{{ appt[1] }}/cancel" onsubmit="return confirm('Are you sure you want to cancel this booking?');">
                <button type="submit" class="btn btn-outline-danger w-100 py-2 fw-bold">Cancel Booking</button>
            </form>

            <div class="text-center mt-4">
                <a href="/lookup" class="text-muted small">← Look up another booking</a>
            </div>
        </div>
    </div>
</body>
</html>
'''

LOGIN_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container px-3" style="max-width: 400px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-3 text-center fw-bold">Admin Portal Login</h3>
            {% if error %}
                <div class="alert alert-danger">{{ error }}</div>
            {% endif %}
            {% if message %}
                <div class="alert alert-success">{{ message }}</div>
            {% endif %}
            <form method="POST" action="/login">
                <div class="mb-3">
                    <label class="form-label fw-bold">Username</label>
                    <input type="text" name="username" class="form-control" required autofocus>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" name="remember" class="form-check-input" id="rememberCheck">
                    <label class="form-check-label" for="rememberCheck">Remember Password</label>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold mb-3">Login</button>
            </form>
            <div class="text-center">
                <a href="/forgot-password" class="text-muted small text-decoration-none">Forgot password? Click here</a>
            </div>
            <div class="text-center mt-3">
                <a href="/" class="text-muted small">← Back to Public Booking Form</a>
            </div>
        </div>
    </div>
</body>
</html>
'''

SETUP_PROFILE_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Initial Security Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container px-3" style="max-width: 400px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-3 text-center fw-bold">Security Setup</h3>
            <p class="text-muted small text-center mb-4">This is your first login. Please update your password and provide an email address for future password resets.</p>
            {% if error %}
                <div class="alert alert-danger">{{ error }}</div>
            {% endif %}
            <form method="POST" action="/setup-profile">
                <div class="mb-3">
                    <label class="form-label fw-bold">New Password</label>
                    <input type="password" name="new_password" class="form-control" required autofocus>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Confirm Password</label>
                    <input type="password" name="confirm_password" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Recovery Email</label>
                    <input type="email" name="email" class="form-control" placeholder="admin@mail.mil" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">Save & Continue</button>
            </form>
        </div>
    </div>
</body>
</html>
'''

FORGOT_PASSWORD_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container px-3" style="max-width: 400px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-3 text-center fw-bold">Reset Password</h3>
            <p class="text-muted small text-center mb-4">Enter your registered recovery email address to reset your password.</p>
            {% if error %}
                <div class="alert alert-danger">{{ error }}</div>
            {% endif %}
            <form method="POST" action="/forgot-password">
                <div class="mb-3">
                    <label class="form-label fw-bold">Recovery Email</label>
                    <input type="email" name="email" class="form-control" placeholder="admin@mail.mil" required autofocus>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">Verify Email</button>
            </form>
            <div class="text-center mt-3">
                <a href="/login" class="text-muted small">← Back to Login</a>
            </div>
        </div>
    </div>
</body>
</html>
'''

RESET_PASSWORD_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set New Password</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container px-3" style="max-width: 400px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-3 text-center fw-bold">New Password</h3>
            <p class="text-muted small text-center mb-4">Please enter your new password below.</p>
            {% if error %}
                <div class="alert alert-danger">{{ error }}</div>
            {% endif %}
            <form method="POST" action="/reset-password">
                <div class="mb-3">
                    <label class="form-label fw-bold">New Password</label>
                    <input type="password" name="new_password" class="form-control" required autofocus>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Confirm Password</label>
                    <input type="password" name="confirm_password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">Update Password</button>
            </form>
        </div>
    </div>
</body>
</html>
'''

ADMIN_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Admin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js"></script>
</head>
<body class="bg-light p-2 p-md-4">
    <div class="container-fluid bg-white p-3 p-md-4 rounded shadow-sm">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
            <div>
                <h2 class="fw-bold m-0 text-center text-md-start">Unaccompanied Housing Admin</h2>
                <span class="text-muted small">Logged in as: <strong>{{ current_user }}</strong> ({{ current_role.replace('_', ' ').title() }})</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <a href="/" class="btn btn-outline-secondary btn-sm">Public Booking Form</a>
                <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>

        <div class="row mb-4 align-items-center">
            <div class="col-12 col-md-8 d-flex flex-column flex-md-row gap-3 align-items-stretch align-items-md-center">
                <form method="GET" action="/admin" class="input-group flex-grow-1">
                    <input type="text" name="search" class="form-control text-uppercase" placeholder="Search by Confirmation Number (e.g. HB-123XYZ)" value="{{ search_query }}">
                    <button type="submit" class="btn btn-primary">Search</button>
                    {% if search_query %}
                        <a href="/admin" class="btn btn-outline-secondary">Clear</a>
                    {% endif %}
                </form>
                <button type="button" class="btn btn-outline-primary position-relative px-3 py-2 fw-bold text-nowrap" data-bs-toggle="modal" data-bs-target="#globalInboxModal">
                    <i class="bi bi-bell-fill me-1 text-danger"></i> Notifications
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger global-inbox-badge" style="font-size: 0.65rem; {% if not global_unread_items %}display: none;{% endif %}">
                        {{ global_unread_items|length }}
                    </span>
                </button>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-12 col-lg-7">
                <h4 class="mb-2 fw-bold text-secondary">Appointment Schedule</h4>
                <p class="text-muted small mb-3">Click any appointment to manage status, assign staff, or add notes.</p>
                <div id="calendar" class="w-100"></div>
            </div>

            <div class="col-12 col-lg-5">
                {% if current_role == 'super_admin' %}
                <div class="card p-3 shadow-sm bg-light mb-4 border-primary">
                    <h4 class="fw-bold mb-3 text-primary">Manage Admin Users</h4>
                    <form method="POST" action="/admin/add-user" class="mb-3">
                        <div class="mb-2">
                            <input type="text" name="new_username" class="form-control form-control-sm" placeholder="Username" required>
                        </div>
                        <div class="mb-2">
                            <input type="password" name="new_password" class="form-control form-control-sm" placeholder="Initial Password" required>
                        </div>
                        <div class="mb-2">
                            <select name="new_role" class="form-select form-select-sm" required>
                                <option value="admin">Regular Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm w-100 fw-bold">Add New User</button>
                    </form>

                    <ul class="list-group" style="max-height: 180px; overflow-y: auto;">
                        {% for u in admin_users %}
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <div>
                                    <span class="fw-bold text-dark">{{ u[1] }}</span>
                                    <span class="badge bg-secondary ms-1" style="font-size: 0.7rem;">{{ u[2] }}</span>
                                </div>
                                {% if u[1] != current_user %}
                                    <form method="POST" action="/admin/delete-user/{{ u[0] }}" style="margin:0;">
                                        <button type="submit" class="btn btn-outline-danger btn-sm py-0 px-2" onclick="return confirm('Remove user access?');">Delete</button>
                                    </form>
                                {% else %}
                                    <span class="text-muted small fst-italic">Current User</span>
                                {% endif %}
                            </li>
                        {% endfor %}
                    </ul>
                </div>
                {% endif %}

                <div class="card p-3 shadow-sm bg-light mb-4">
                    <h4 class="fw-bold mb-3 text-secondary">Manage Building Numbers & Inbox</h4>
                    <form method="POST" action="/admin/add-staff" class="mb-3">
                        <div class="input-group">
                            <input type="text" name="staff_name" class="form-control" placeholder="e.g., Building 103" required>
                            <button type="submit" class="btn btn-success">Add Building</button>
                        </div>
                    </form>

                    <div style="max-height: 550px; overflow-y: auto;" class="pe-1">
                        {% for s_id, s_name in staff_list %}
                            <div class="card mb-3 p-3 bg-white shadow-sm border">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold text-primary fs-5">{{ s_name }}</span>
                                    <div class="d-flex align-items-center gap-2">
                                        {% set inbox_data = staff_inbox[s_id] %}
                                        <button type="button" class="btn btn-outline-primary btn-sm position-relative py-1 px-2 mail-btn-{{ s_id }}" onclick="scrollToInbox('{{ s_id }}')" title="View Booking Inbox">
                                            <i class="bi bi-envelope-fill {% if inbox_data['unread_count'] > 0 %}text-danger{% endif %}" id="mail-icon-{{ s_id }}"></i>
                                            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger inbox-count-badge-{{ s_id }}" style="font-size: 0.6rem; {% if inbox_data['unread_count'] == 0 %}display: none;{% endif %}">
                                                {{ inbox_data['unread_count'] }}
                                            </span>
                                        </button>
                                        <form method="POST" action="/admin/delete-staff/{{ s_id }}" style="margin:0;">
                                            <button type="submit" class="btn btn-outline-danger btn-sm py-0 px-2" onclick="return confirm('Remove building and schedule?');">Delete</button>
                                        </form>
                                    </div>
                                </div>

                                <div class="mb-3 border rounded p-2 bg-light inbox-section-{{ s_id }}" id="inbox-div-{{ s_id }}">
                                    <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                                        <span class="text-dark small fw-bold d-flex align-items-center gap-1">
                                            <i class="bi bi-bell-fill text-primary"></i> Booking Notifications Inbox
                                        </span>
                                        <span class="badge bg-secondary" style="font-size: 0.65rem;">Live Feed</span>
                                    </div>
                                    <div class="list-group inbox-container-{{ s_id }}" style="max-height: 150px; overflow-y: auto;">
                                        {% set items = inbox_data['items'] %}
                                        {% if items %}
                                            {% for item in items %}
                                                <div class="list-group-item list-group-item-action py-2 px-2 bg-white border-start border-danger border-4" style="font-size: 0.82rem;" id="inbox-item-{{ item.id }}">
                                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                                        <span class="badge bg-info text-dark" style="font-size: 0.6rem;">{{ item.type }}</span>
                                                        <small class="text-muted" style="font-size: 0.6rem;">{{ item.timestamp }}</small>
                                                    </div>
                                                    <p class="mb-1 text-dark text-break">{{ item.message }}</p>
                                                    <div class="d-flex justify-content-end gap-1">
                                                        {% if item.appointment_id %}
                                                            <button type="button" class="btn btn-sm btn-outline-primary py-0 px-1" style="font-size: 0.68rem;" onclick="openModalForAppointment({{ item.appointment_id }})">View Booking</button>
                                                        {% endif %}
                                                        <a href="/admin/inbox/read/{{ item.id }}" class="btn btn-sm btn-outline-secondary py-0 px-1" style="font-size: 0.68rem;">Mark Read</a>
                                                    </div>
                                                </div>
                                            {% endfor %}
                                        {% else %}
                                            <div class="text-muted small fst-italic p-1">No unread notifications.</div>
                                        {% endif %}
                                    </div>
                                </div>

                                <div class="mb-2 border-top pt-2">
                                    <span class="text-muted small fw-bold d-block mb-1">Available Time Slots:</span>
                                    <div class="d-flex flex-wrap gap-1">
                                        {% set slots_list = staff_availability[s_id] %}
                                        {% for slot in slots_list %}
                                            <span class="badge bg-secondary d-flex align-items-center gap-1">
                                                {{ slot.time }}
                                                <form method="POST" action="/admin/delete-slot/{{ slot.id }}" style="display:inline; margin:0;">
                                                    <button type="submit" class="btn-close btn-close-white" style="font-size: 0.5rem;" aria-label="Remove"></button>
                                                </form>
                                            </span>
                                        {% else %}
                                            <span class="text-muted small fst-italic">No time slots set.</span>
                                        {% endfor %}
                                    </div>
                                </div>
                                <form method="POST" action="/admin/add-slot/{{ s_id }}" class="input-group input-group-sm mt-2">
                                    <input type="time" name="time_slot" class="form-control" required>
                                    <button type="submit" class="btn btn-outline-primary">Add Slot</button>
                                </form>
                            </div>
                        {% else %}
                            <p class="text-muted">No buildings configured.</p>
                        {% endfor %}
                    </div>
                </div>

                <div class="card p-3 shadow-sm bg-light">
                    <h4 class="fw-bold mb-3 text-secondary">Manage Visit Purposes</h4>
                    <form method="POST" action="/admin/add-purpose" class="mb-3">
                        <div class="input-group">
                            <input type="text" name="purpose_name" class="form-control" placeholder="e.g., Room Inspection" required>
                            <button type="submit" class="btn btn-success">Add</button>
                        </div>
                    </form>
                    <ul class="list-group" style="max-height: 180px; overflow-y: auto;">
                        {% for p in purpose_list %}
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span class="text-break me-2">{{ p[1] }}</span>
                                <form method="POST" action="/admin/delete-purpose/{{ p[0] }}" style="margin:0;">
                                    <button type="submit" class="btn btn-outline-danger btn-sm py-0 px-2" onclick="return confirm('Remove purpose?');">Remove</button>
                                </form>
                            </li>
                        {% else %}
                            <li class="list-group-item text-muted">No visit options configured.</li>
                        {% endfor %}
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Global Inbox Modal Pop-Out -->
    <div class="modal fade" id="globalInboxModal" tabindex="-1" aria-labelledby="globalInboxModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content shadow">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title fw-bold" id="globalInboxModalLabel">
                        <i class="bi bi-bell-fill me-2"></i>All New Booking Notifications
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-3 p-md-4 bg-light">
                    <div class="list-group global-inbox-modal-list">
                        {% if global_unread_items %}
                            {% for item in global_unread_items %}
                                <div class="list-group-item list-group-item-action py-3 px-3 mb-2 bg-white rounded shadow-sm border-start border-danger border-4" id="global-inbox-item-{{ item.id }}">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <div>
                                            <span class="badge bg-primary text-white me-1" style="font-size: 0.7rem;">{{ item.staff_name }}</span>
                                            <span class="badge bg-info text-dark" style="font-size: 0.7rem;">{{ item.type }}</span>
                                        </div>
                                        <small class="text-muted" style="font-size: 0.7rem;">{{ item.timestamp }}</small>
                                    </div>
                                    <p class="mb-2 text-dark text-break fw-medium">{{ item.message }}</p>
                                    <div class="d-flex justify-content-end gap-2">
                                        {% if item.appointment_id %}
                                            <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2" onclick="openModalForAppointment({{ item.appointment_id }})">View Booking</button>
                                        {% endif %}
                                        <a href="/admin/inbox/read/{{ item.id }}" class="btn btn-sm btn-outline-secondary py-1 px-2">Mark Read</a>
                                    </div>
                                </div>
                            {% endfor %}
                        {% else %}
                            <div class="text-center text-muted fst-italic py-4">No new unread notifications.</div>
                        {% endif %}
                    </div>
                </div>
                <div class="modal-footer bg-white">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content shadow">
                <form id="updateApptForm" method="POST" action="">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title fw-bold" id="bookingModalLabel">Manage Appointment</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-3 p-md-4">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 pb-2 border-bottom gap-2">
                            <div>
                                <span id="modalSmName" class="fs-4 fw-bold text-dark"></span>
                                <span id="modalBranch" class="badge bg-secondary ms-0 ms-md-2 fs-6 d-block d-md-inline-block mt-1 mt-md-0"></span>
                            </div>
                            <div>
                                <span class="text-muted small me-1">Confirmation:</span>
                                <span id="modalConfBadge" class="badge bg-dark fs-6"></span>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-12 col-md-6 mb-2 mb-md-0">
                                <label class="text-muted small text-uppercase fw-bold d-block">Email Contact</label>
                                <span id="modalEmail" class="text-dark fw-medium text-break"></span>
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="text-muted small text-uppercase fw-bold d-block">Date & Time (24-Hr)</label>
                                <span id="modalDateTime" class="text-dark fw-medium"></span>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-12 mb-2">
                                <label class="text-muted small text-uppercase fw-bold d-block">Purpose of Visit</label>
                                <span id="modalPurpose" class="text-dark fw-medium"></span>
                            </div>
                        </div>

                        <hr class="my-3">

                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Assigned Building(s)</label>
                            <div class="border p-3 rounded bg-light" style="max-height: 150px; overflow-y: auto;" id="modalStaffContainer"></div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Update Status</label>
                            <select name="status" id="modalStatusSelect" class="form-select fw-semibold">
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Rescheduled">Rescheduled</option>
                                <option value="Complete">Complete</option>
                                <option value="Incomplete">Incomplete</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div class="mb-2">
                            <label class="form-label fw-bold text-dark d-flex justify-content-between">
                                <span>Internal Staff Notes</span>
                                <span class="text-danger small font-monospace">(Internal Only)</span>
                            </label>
                            <textarea name="notes" id="modalNotes" class="form-control" rows="3" placeholder="Add room numbers or notes..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm px-4 fw-bold">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        var allStaffList = {{ all_staff_json | safe }};
        var searchParam = "{{ search_query }}";
        var autoOpened = false;
        var calendarInstance = null;

        function openBookingModal(props, eventId) {
            document.getElementById('updateApptForm').action = '/admin/update-appointment/' + eventId;
            document.getElementById('modalSmName').textContent = props.sm_name;
            document.getElementById('modalBranch').textContent = props.branch;
            document.getElementById('modalEmail').textContent = props.email;
            document.getElementById('modalDateTime').textContent = props.date_time.replace('T', ' ');
            document.getElementById('modalPurpose').textContent = props.purpose;
            document.getElementById('modalNotes').value = props.notes || '';
            document.getElementById('modalStatusSelect').value = props.status;
            document.getElementById('modalConfBadge').textContent = props.conf_number;
            
            var staffContainer = document.getElementById('modalStaffContainer');
            staffContainer.innerHTML = '';
            var assignedIds = props.staff_ids || [];

            allStaffList.forEach(function(s) {
                var isChecked = assignedIds.includes(s.id) ? 'checked' : '';
                var div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" name="staff_ids" value="${s.id}" id="modal_staff_${s.id}" ${isChecked}>
                    <label class="form-check-label" for="modal_staff_${s.id}">
                        ${s.name}
                    </label>
                `;
                staffContainer.appendChild(div);
            });
            
            var modal = new bootstrap.Modal(document.getElementById('bookingModal'));
            modal.show();
        }

        function openModalForAppointment(appointmentId) {
            fetch('/api/appointment/' + appointmentId)
                .then(response => response.json())
                .then(data => {
                    if (data && data.id) {
                        openBookingModal(data.extendedProps, data.id);
                    }
                });
        }

        function scrollToInbox(staffId) {
            var inboxEl = document.getElementById('inbox-div-' + staffId);
            if (inboxEl) {
                inboxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                inboxEl.classList.add('border-primary');
                setTimeout(() => {
                    inboxEl.classList.remove('border-primary');
                }, 2000);
            }
        }

        function pollInboxUpdates() {
            fetch('/api/inbox-updates')
                .then(response => response.json())
                .then(data => {
                    // Update staff cards
                    for (const [staffId, staffData] of Object.entries(data.staff)) {
                        var container = document.querySelector('.inbox-container-' + staffId);
                        var badge = document.querySelector('.inbox-count-badge-' + staffId);
                        var mailIcon = document.getElementById('mail-icon-' + staffId);
                        
                        if (!container) continue;
                        
                        if (staffData.unread_count > 0) {
                            if (badge) {
                                badge.textContent = staffData.unread_count;
                                badge.style.display = 'inline-block';
                            }
                            if (mailIcon) mailIcon.classList.add('text-danger');
                        } else {
                            if (badge) badge.style.display = 'none';
                            if (mailIcon) mailIcon.classList.remove('text-danger');
                        }
                        
                        var html = '';
                        var items = staffData.items;
                        if (items && items.length > 0) {
                            items.forEach(item => {
                                html += `
                                    <div class="list-group-item list-group-item-action py-2 px-2 bg-white border-start border-danger border-4" style="font-size: 0.82rem;" id="inbox-item-${item.id}">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="badge bg-info text-dark" style="font-size: 0.6rem;">${item.type}</span>
                                            <small class="text-muted" style="font-size: 0.6rem;">${item.timestamp}</small>
                                        </div>
                                        <p class="mb-1 text-dark text-break">${item.message}</p>
                                        <div class="d-flex justify-content-end gap-1">
                                            ${item.appointment_id ? `<button type="button" class="btn btn-sm btn-outline-primary py-0 px-1" style="font-size: 0.68rem;" onclick="openModalForAppointment(${item.appointment_id})">View Booking</button>` : ''}
                                            <a href="/admin/inbox/read/${item.id}" class="btn btn-sm btn-outline-secondary py-0 px-1" style="font-size: 0.68rem;">Mark Read</a>
                                        </div>
                                    </div>
                                `;
                            });
                        } else {
                            html = '<div class="text-muted small fst-italic p-1">No unread notifications.</div>';
                        }
                        container.innerHTML = html;
                    }

                    // Update global notifications modal and badge
                    var globalBadge = document.querySelector('.global-inbox-badge');
                    var globalList = document.querySelector('.global-inbox-modal-list');
                    if (data.global_unread_count > 0) {
                        if (globalBadge) {
                            globalBadge.textContent = data.global_unread_count;
                            globalBadge.style.display = 'inline-block';
                        }
                    } else {
                        if (globalBadge) globalBadge.style.display = 'none';
                    }

                    var globalHtml = '';
                    if (data.global_items && data.global_items.length > 0) {
                        data.global_items.forEach(item => {
                            globalHtml += `
                                <div class="list-group-item list-group-item-action py-3 px-3 mb-2 bg-white rounded shadow-sm border-start border-danger border-4" id="global-inbox-item-${item.id}">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <div>
                                            <span class="badge bg-primary text-white me-1" style="font-size: 0.7rem;">${item.staff_name}</span>
                                            <span class="badge bg-info text-dark" style="font-size: 0.7rem;">${item.type}</span>
                                        </div>
                                        <small class="text-muted" style="font-size: 0.7rem;">${item.timestamp}</small>
                                    </div>
                                    <p class="mb-2 text-dark text-break fw-medium">${item.message}</p>
                                    <div class="d-flex justify-content-end gap-2">
                                        ${item.appointment_id ? `<button type="button" class="btn btn-sm btn-outline-primary py-1 px-2" onclick="openModalForAppointment(${item.appointment_id})">View Booking</button>` : ''}
                                        <a href="/admin/inbox/read/${item.id}" class="btn btn-sm btn-outline-secondary py-1 px-2">Mark Read</a>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        globalHtml = '<div class="text-center text-muted fst-italic py-4">No new unread notifications.</div>';
                    }
                    if (globalList) globalList.innerHTML = globalHtml;
                });
        }

        setInterval(pollInboxUpdates, 15000);

        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendar');
            var calendarEventsUrl = '/api/appointments' + (searchParam ? '?search=' + encodeURIComponent(searchParam) : '');

            calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
                handleWindowResize: true,
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                events: calendarEventsUrl,
                eventClick: function(info) {
                    openBookingModal(info.event.extendedProps, info.event.id);
                },
                eventsSet: function(events) {
                    if (searchParam && events.length > 0 && !autoOpened) {
                        autoOpened = true;
                        var targetEvent = events.find(e => e.extendedProps.conf_number.toUpperCase().includes(searchParam)) || events[0];
                        if (targetEvent) {
                            openBookingModal(targetEvent.extendedProps, targetEvent.id);
                        }
                    }
                }
            });
            calendarInstance.render();
        });
    </script>
</body>
</html>
'''

# -------------------------------------------------------------------
# Web Routes
# -------------------------------------------------------------------

@app.route('/')
def home():
    staff_list, _, _ = get_staff_data()
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM visit_purposes ORDER BY name ASC')
    purpose_list = cursor.fetchall()
    conn.close()
    
    return render_template_string(
        BOOK_TEMPLATE, 
        staff_list=staff_list, 
        purpose_list=purpose_list
    )

@app.route('/book', methods=['POST'])
def book():
    staff_id = request.form.get('staff_id')
    conf_num = generate_conf_number()
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    date_str = request.form['appt_date']
    time_str = request.form['appt_time']
    combined_date_time = f"{date_str}T{time_str}"
    
    cursor.execute('''
        INSERT INTO appointments (confirmation_number, sm_name, branch, email, date_time, purpose)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        conf_num,
        request.form['sm_name'],
        request.form['branch'],
        request.form['email'],
        combined_date_time,
        request.form['purpose']
    ))
    appt_id = cursor.lastrowid
    
    if staff_id:
        cursor.execute('INSERT OR IGNORE INTO appointment_staff (appointment_id, staff_id) VALUES (?, ?)', (appt_id, staff_id))
        cursor.execute('''
            INSERT INTO staff_inbox (staff_id, appointment_id, message, notification_type)
            VALUES (?, ?, ?, ?)
        ''', (staff_id, appt_id, f"New booking: {request.form['sm_name']} ({request.form['branch']}) on {combined_date_time}", 'New Booking'))
        
    conn.commit()
    conn.close()
    
    print(f"\n[EMAIL SIMULATION] Sent to: {request.form['email']}")
    print(f"Subject: Housing Appointment Confirmation ({conf_num})")
    print(f"Body: Hello {request.form['sm_name']}, your appointment is scheduled for {combined_date_time}. Confirmation #: {conf_num}\n")
    
    staff_list, _, _ = get_staff_data()
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM visit_purposes ORDER BY name ASC')
    purpose_list = cursor.fetchall()
    conn.close()
    
    return render_template_string(
        BOOK_TEMPLATE, 
        staff_list=staff_list, 
        purpose_list=purpose_list, 
        message="Appointment successfully booked!",
        conf_num=conf_num
    )

@app.route('/lookup', methods=['GET', 'POST'])
def lookup():
    error = None
    if request.method == 'POST':
        conf_num = request.form.get('conf_number', '').strip().upper()
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM appointments WHERE confirmation_number = ?', (conf_num,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return redirect(url_for('manage_booking_public', conf_num=conf_num))
        else:
            error = "Confirmation number not found. Please check and try again."
    return render_template_string(LOOKUP_TEMPLATE, error=error)

@app.route('/manage/<conf_num>')
def manage_booking_public(conf_num):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.id, a.confirmation_number, a.sm_name, a.branch, a.email, a.date_time, a.purpose, a.status, a.notes,
               GROUP_CONCAT(s.name, ', ') as staff_names
        FROM appointments a
        LEFT JOIN appointment_staff ast ON a.id = ast.appointment_id
        LEFT JOIN staff s ON ast.staff_id = s.id
        WHERE a.confirmation_number = ?
        GROUP BY a.id
    ''', (conf_num,))
    appt = cursor.fetchone()
    conn.close()
    
    if not appt:
        return redirect(url_for('lookup'))
        
    staff_names = appt[9] if appt[9] else 'Unassigned'
    return render_template_string(USER_MANAGE_TEMPLATE, appt=appt, staff_names=staff_names)

@app.route('/manage/<conf_num>/update', methods=['POST'])
def update_booking_public(conf_num):
    date_str = request.form.get('appt_date')
    time_str = request.form.get('appt_time')
    new_date_time = f"{date_str}T{time_str}"
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, sm_name FROM appointments WHERE confirmation_number = ?', (conf_num,))
    row = cursor.fetchone()
    
    if row:
        appt_id = row[0]
        sm_name = row[1]
        cursor.execute('''
            UPDATE appointments 
            SET date_time = ?, status = 'Rescheduled'
            WHERE confirmation_number = ?
        ''', (new_date_time, conf_num))
        conn.commit()
        
        notify_appointment_staff(appt_id, f"Rescheduled: {sm_name} changed date/time to {new_date_time}", 'Reschedule')
        
    conn.close()
    return redirect(url_for('manage_booking_public', conf_num=conf_num))

@app.route('/manage/<conf_num>/cancel', methods=['POST'])
def cancel_booking_public(conf_num):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, sm_name FROM appointments WHERE confirmation_number = ?', (conf_num,))
    row = cursor.fetchone()
    
    if row:
        appt_id = row[0]
        sm_name = row[1]
        cursor.execute('''
            UPDATE appointments 
            SET status = 'Cancelled'
            WHERE confirmation_number = ?
        ''', (conf_num,))
        conn.commit()
        
        notify_appointment_staff(appt_id, f"Cancelled: Booking for {sm_name} ({conf_num}) was cancelled.", 'Cancellation')
        
    conn.close()
    return redirect(url_for('manage_booking_public', conf_num=conf_num))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('SELECT id, password, role, must_change_password FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        conn.close()
        
        if row and row[1] == password:
            session['logged_in'] = True
            session['user_id'] = row[0]
            session['username'] = username
            session['role'] = row[2]
            
            if request.form.get('remember'):
                session.permanent = True
                app.permanent_session_lifetime = timedelta(days=30)
            else:
                session.permanent = False
                
            if row[3] == 1:
                return redirect(url_for('setup_profile'))
                
            return redirect(url_for('admin'))
        else:
            error = "Invalid username or password."
    return render_template_string(LOGIN_TEMPLATE, error=error)

@app.route('/setup-profile', methods=['GET', 'POST'])
def setup_profile():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
        
    error = None
    if request.method == 'POST':
        new_password = request.form.get('new_password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        email = request.form.get('email', '').strip()
        
        if not new_password or not email:
            error = "All fields are required."
        elif new_password != confirm_password:
            error = "Passwords do not match."
        else:
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE users 
                SET password = ?, email = ?, must_change_password = 0 
                WHERE id = ?
            ''', (new_password, email, session.get('user_id')))
            conn.commit()
            conn.close()
            return redirect(url_for('admin'))
            
    return render_template_string(SETUP_PROFILE_TEMPLATE, error=error)

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    error = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            session['reset_user_id'] = row[0]
            return redirect(url_for('reset_password'))
        else:
            error = "No account found with that recovery email address."
    return render_template_string(FORGOT_PASSWORD_TEMPLATE, error=error)

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if not session.get('reset_user_id'):
        return redirect(url_for('forgot_password'))
        
    error = None
    if request.method == 'POST':
        new_password = request.form.get('new_password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        
        if not new_password:
            error = "Password cannot be empty."
        elif new_password != confirm_password:
            error = "Passwords do not match."
        else:
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', 
                           (new_password, session.get('reset_user_id')))
            conn.commit()
            conn.close()
            session.pop('reset_user_id', None)
            return render_template_string(LOGIN_TEMPLATE, message="Password successfully updated! You can now log in.")
            
    return render_template_string(RESET_PASSWORD_TEMPLATE, error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/admin')
@login_required
def admin():
    try:
        search_query = request.args.get('search', '').strip().upper()
        staff_list, staff_availability_dict, staff_inbox_dict = get_staff_data()
        global_unread_items = get_global_unread_inbox()
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM visit_purposes ORDER BY name ASC')
        purpose_list = cursor.fetchall()
        
        admin_users = []
        if session.get('role') == 'super_admin':
            cursor.execute('SELECT id, username, role FROM users ORDER BY username ASC')
            admin_users = cursor.fetchall()
            
        conn.close()
        
        all_staff_json = [{'id': s[0], 'name': s[1]} for s in staff_list]
        
        return render_template_string(
            ADMIN_TEMPLATE, 
            staff_list=staff_list, 
            staff_availability=staff_availability_dict,
            staff_inbox=staff_inbox_dict,
            global_unread_items=global_unread_items,
            purpose_list=purpose_list,
            admin_users=admin_users,
            current_user=session.get('username'),
            current_role=session.get('role'),
            all_staff_json=json.dumps(all_staff_json),
            search_query=search_query
        )
    except Exception as e:
        print(f"\n[ADMIN ROUTE EXCEPTION]: {e}")
        traceback.print_exc()
        return f"Internal Admin Error: {e}", 500

@app.route('/admin/inbox/read/<int:inbox_id>')
@login_required
def mark_inbox_read(inbox_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('UPDATE staff_inbox SET is_read = 1 WHERE id = ?', (inbox_id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/add-user', methods=['POST'])
@super_admin_required
def add_user():
    new_username = request.form.get('new_username', '').strip()
    new_password = request.form.get('new_password', '').strip()
    new_role = request.form.get('new_role', 'admin')
    
    if new_username and new_password:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, 1)', 
                           (new_username, new_password, new_role))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
        conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/delete-user/<int:user_id>', methods=['POST'])
@super_admin_required
def delete_user(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    
    if row and row[0] != session.get('username'):
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        
    conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/update-appointment/<int:appt_id>', methods=['POST'])
@login_required
def update_appointment(appt_id):
    status = request.form.get('status', 'Pending')
    notes = request.form.get('notes', '').strip()
    staff_ids = request.form.getlist('staff_ids')
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT sm_name FROM appointments WHERE id = ?', (appt_id,))
    appt_row = cursor.fetchone()
    sm_name = appt_row[0] if appt_row else 'Service Member'
    
    cursor.execute('''
        UPDATE appointments 
        SET status = ?, notes = ? 
        WHERE id = ?
    ''', (status, notes, appt_id))
    
    cursor.execute('DELETE FROM appointment_staff WHERE appointment_id = ?', (appt_id,))
    for s_id in staff_ids:
        cursor.execute('INSERT OR IGNORE INTO appointment_staff (appointment_id, staff_id) VALUES (?, ?)', (appt_id, s_id))
        cursor.execute('''
            INSERT INTO staff_inbox (staff_id, appointment_id, message, notification_type)
            VALUES (?, ?, ?, ?)
        ''', (s_id, appt_id, f"Appointment status updated to '{status}' for {sm_name}.", 'Status Update'))
        
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/add-staff', methods=['POST'])
@login_required
def add_staff():
    staff_name = request.form.get('staff_name', '').strip()
    if staff_name:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO staff (name) VALUES (?)', (staff_name,))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
        conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/delete-staff/<int:staff_id>', methods=['POST'])
@login_required
def delete_staff(staff_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM staff WHERE id = ?', (staff_id,))
    cursor.execute('DELETE FROM staff_availability WHERE staff_id = ?', (staff_id,))
    cursor.execute('DELETE FROM staff_inbox WHERE staff_id = ?', (staff_id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/add-slot/<int:staff_id>', methods=['POST'])
@login_required
def add_slot(staff_id):
    time_slot = request.form.get('time_slot', '').strip()
    if time_slot:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO staff_availability (staff_id, time_slot) VALUES (?, ?)', (staff_id, time_slot))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
        conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/delete-slot/<int:slot_id>', methods=['POST'])
@login_required
def delete_slot(slot_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM staff_availability WHERE id = ?', (slot_id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/add-purpose', methods=['POST'])
@login_required
def add_purpose():
    purpose_name = request.form.get('purpose_name', '').strip()
    if purpose_name:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO visit_purposes (name) VALUES (?)', (purpose_name,))
            conn.commit()
        except sqlite3.IntegrityError:
            pass
        conn.close()
    return redirect(url_for('admin'))

@app.route('/admin/delete-purpose/<int:purpose_id>', methods=['POST'])
@login_required
def delete_purpose(purpose_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM visit_purposes WHERE id = ?', (purpose_id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))

@app.route('/api/appointments')
@login_required
def api_appointments():
    search_query = request.args.get('search', '').strip().upper()
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    if search_query:
        cursor.execute('''
            SELECT a.id, a.confirmation_number, a.sm_name, a.branch, a.email, a.date_time, a.purpose, a.status, a.notes,
                   GROUP_CONCAT(s.name, ', ') as staff_names,
                   GROUP_CONCAT(s.id) as staff_ids_csv
            FROM appointments a
            LEFT JOIN appointment_staff ast ON a.id = ast.appointment_id
            LEFT JOIN staff s ON ast.staff_id = s.id
            WHERE a.confirmation_number LIKE ?
            GROUP BY a.id
        ''', (f"%{search_query}%",))
    else:
        cursor.execute('''
            SELECT a.id, a.confirmation_number, a.sm_name, a.branch, a.email, a.date_time, a.purpose, a.status, a.notes,
                   GROUP_CONCAT(s.name, ', ') as staff_names,
                   GROUP_CONCAT(s.id) as staff_ids_csv
            FROM appointments a
            LEFT JOIN appointment_staff ast ON a.id = ast.appointment_id
            LEFT JOIN staff s ON ast.staff_id = s.id
            GROUP BY a.id
        ''')
        
    rows = cursor.fetchall()
    conn.close()
    
    color_map = {
        'Pending': '#ffc107',
        'Confirmed': '#0d6efd',
        'Rescheduled': '#0dcaf0',
        'Complete': '#198754',
        'Incomplete': '#6c757d',
        'Cancelled': '#dc3545'
    }
    
    events = []
    for r in rows:
        conf_num = r[1] if r[1] else 'N/A'
        status_val = r[7] if r[7] else 'Pending'
        status_color = color_map.get(status_val, '#0d6efd')
        staff_str = r[9] if r[9] else 'Unassigned'
        staff_ids = [int(sid) for sid in r[10].split(',')] if r[10] else []
        
        events.append({
            'id': r[0],
            'title': f"[{conf_num}] {r[2]} ({r[3]}) w/ {staff_str} - {status_val}",
            'start': r[5],
            'backgroundColor': status_color,
            'borderColor': status_color,
            'extendedProps': {
                'conf_number': conf_num,
                'sm_name': r[2],
                'branch': r[3],
                'email': r[4],
                'date_time': r[5],
                'purpose': r[6],
                'status': status_val,
                'notes': r[8] if r[8] else '',
                'staff_names': staff_str,
                'staff_ids': staff_ids
            }
        })
    return jsonify(events)

@app.route('/api/appointment/<int:appt_id>')
@login_required
def api_single_appointment(appt_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.id, a.confirmation_number, a.sm_name, a.branch, a.email, a.date_time, a.purpose, a.status, a.notes,
               GROUP_CONCAT(s.name, ', ') as staff_names,
               GROUP_CONCAT(s.id) as staff_ids_csv
        FROM appointments a
        LEFT JOIN appointment_staff ast ON a.id = ast.appointment_id
        LEFT JOIN staff s ON ast.staff_id = s.id
        WHERE a.id = ?
        GROUP BY a.id
    ''', (appt_id,))
    r = cursor.fetchone()
    conn.close()
    
    if not r:
        return jsonify({})
        
    conf_num = r[1] if r[1] else 'N/A'
    status_val = r[7] if r[7] else 'Pending'
    staff_str = r[9] if r[9] else 'Unassigned'
    staff_ids = [int(sid) for sid in r[10].split(',')] if r[10] else []
    
    return jsonify({
        'id': r[0],
        'extendedProps': {
            'conf_number': conf_num,
            'sm_name': r[2],
            'branch': r[3],
            'email': r[4],
            'date_time': r[5],
            'purpose': r[6],
            'status': status_val,
            'notes': r[8] if r[8] else '',
            'staff_names': staff_str,
            'staff_ids': staff_ids
        }
    })

@app.route('/api/inbox-updates')
@login_required
def api_inbox_updates():
    _, _, staff_inbox_dict = get_staff_data()
    global_items = get_global_unread_inbox()
    return jsonify({
        'staff': staff_inbox_dict,
        'global_items': global_items,
        'global_unread_count': len(global_items)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)