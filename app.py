from flask import Flask, request, jsonify, render_template_string
import sqlite3
import os

app = Flask(__name__)
DB_NAME = "housing.db"

# 1. Initialize Local Database
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sm_name TEXT NOT NULL,
            branch TEXT NOT NULL,
            email TEXT NOT NULL,
            staff TEXT NOT NULL,
            date_time TEXT NOT NULL,
            purpose TEXT NOT NULL,
            status TEXT DEFAULT 'Pending'
        )
    ''')
    conn.commit()
    conn.close()

# 2. Public Booking Page Template
BOOK_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Unaccompanied Housing Booking</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container" style="max-width: 600px;">
        <div class="card shadow-sm p-4">
            <h3 class="mb-4 text-primary fw-bold">Schedule Housing Appointment</h3>
            {% if message %}
                <div class="alert alert-success">{{ message }}</div>
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
                    <label class="form-label fw-bold">Assigned Staff Member</label>
                    <select name="staff" class="form-select" required>
                        <option value="Staff Sergeant Miller">Staff Sergeant Miller</option>
                        <option value="Petty Officer Davis">Petty Officer Davis</option>
                        <option value="Housing Desk A">Housing Desk A</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Date & Time</label>
                    <input type="datetime-local" name="date_time" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Purpose of Visit</label>
                    <input type="text" name="purpose" class="form-control" placeholder="e.g., Check-in, Check-out, Room Inspection" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Submit Booking</button>
            </form>
            <div class="text-center mt-3">
                <a href="/admin" class="text-muted small">Open Staff Admin / Calendar View →</a>
            </div>
        </div>
    </div>
</body>
</html>
'''

# 3. Admin Calendar Dashboard Template
ADMIN_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Staff Admin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js"></script>
</head>
<body class="bg-light p-4">
    <div class="container bg-white p-4 rounded shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold">Unaccompanied Housing Schedule</h2>
            <a href="/" class="btn btn-outline-secondary btn-sm">← Back to Booking Form</a>
        </div>
        <div id="calendar"></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendar');
            var calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                events: '/api/appointments'
            });
            calendar.render();
        });
    </script>
</body>
</html>
'''

# 4. Web Routes
@app.route('/')
def home():
    return render_template_string(BOOK_TEMPLATE)

@app.route('/book', methods=['POST'])
def book():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO appointments (sm_name, branch, email, staff, date_time, purpose)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        request.form['sm_name'],
        request.form['branch'],
        request.form['email'],
        request.form['staff'],
        request.form['date_time'],
        request.form['purpose']
    ))
    conn.commit()
    conn.close()
    return render_template_string(BOOK_TEMPLATE, message="Appointment successfully requested!")

@app.route('/admin')
def admin():
    return render_template_string(ADMIN_TEMPLATE)

@app.route('/api/appointments')
def api_appointments():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT sm_name, branch, staff, date_time, purpose FROM appointments')
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for r in rows:
        events.append({
            'title': f"{r[0]} ({r[1]}) - {r[4]}",
            'start': r[3]
        })
    return jsonify(events)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)