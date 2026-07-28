const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Auto-generate public directory and HTML files at runtime
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// 1. PUBLIC BOOKING PAGE (Updated UI)
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schedule Unaccompanied Housing Appointment</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f4f6f9; }
        .card { border: none; border-radius: 0.5rem; }
    </style>
</head>
<body onload="initBookingPage()">

    <nav class="navbar navbar-dark bg-dark shadow-sm">
        <div class="container px-4">
            <span class="navbar-brand fw-bold">
                <i class="bi bi-building me-2"></i>Unaccompanied Housing Portal
            </span>
            <div>
                <a href="/staff" class="btn btn-outline-light btn-sm fw-bold">
                    <i class="bi bi-shield-lock me-1"></i> Staff Login
                </a>
            </div>
        </div>
    </nav>

    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card shadow-sm p-4 bg-white">
                    <div class="text-center mb-4">
                        <i class="bi bi-calendar-plus fs-1 text-primary"></i>
                        <h3 class="fw-bold mt-2">Schedule Appointment</h3>
                        <p class="text-muted small">Select your camp, building, and appointment time</p>
                    </div>

                    <div id="successAlert" class="alert alert-success d-none" role="alert">
                        <h5 class="fw-bold mb-1"><i class="bi bi-check-circle-fill me-2"></i>Appointment Booked!</h5>
                        <p class="mb-1 small">Your confirmation code is: <strong id="displayCode" class="fs-5 text-dark"></strong></p>
                        <p class="mb-0 text-muted small">Please save this code to reference your appointment.</p>
                        <button class="btn btn-sm btn-outline-success mt-3 w-100 fw-bold" onclick="resetForm()">Book Another Appointment</button>
                    </div>

                    <form id="bookingForm" onsubmit="submitBooking(event)">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">First Name *</label>
                                <input type="text" id="firstName" class="form-control" required placeholder="John">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Last Name *</label>
                                <input type="text" id="lastName" class="form-control" required placeholder="Doe">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">Email Address *</label>
                            <input type="email" id="email" class="form-control" required placeholder="john.doe@mil.mil">
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Branch of Service *</label>
                                <select id="branch" class="form-select" required>
                                    <option value="">-- Select Branch --</option>
                                    <option value="USMC">USMC</option>
                                    <option value="USA">USA</option>
                                    <option value="USN">USN</option>
                                    <option value="USAF">USAF</option>
                                    <option value="USCG">USCG</option>
                                    <option value="USSF">USSF</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Camp Location *</label>
                                <select id="campSelect" class="form-select" required onchange="updateBuildings()">
                                    <option value="">-- Select Camp --</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Building Number *</label>
                                <select id="buildingSelect" class="form-select" required>
                                    <option value="">-- Select Building --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Purpose of Visit *</label>
                                <select id="purposeSelect" class="form-select" required>
                                    <option value="">-- Select Purpose --</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Appointment Date *</label>
                                <input type="date" id="apptDate" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Appointment Time *</label>
                                <select id="apptTime" class="form-select" required>
                                    <option value="">-- Select Time --</option>
                                    <option value="08:00">08:00 AM</option>
                                    <option value="09:00">09:00 AM</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="11:00">11:00 AM</option>
                                    <option value="13:00">01:00 PM</option>
                                    <option value="14:00">02:00 PM</option>
                                    <option value="15:00">03:00 PM</option>
                                    <option value="16:00">04:00 PM</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 fw-bold py-2">
                            <i class="bi bi-calendar-check me-1"></i> Submit Booking
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let appState = {};

        async function initBookingPage() {
            try {
                const res = await fetch('/api/state');
                appState = await res.json();
                
                // Populate Camps
                const campSelect = document.getElementById('campSelect');
                campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
                (appState.camps || []).forEach(c => {
                    campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
                });

                // Populate Purposes
                const purposeSelect = document.getElementById('purposeSelect');
                purposeSelect.innerHTML = '<option value="">-- Select Purpose --</option>';
                (appState.purposes || []).forEach(p => {
                    purposeSelect.innerHTML += \`<option value="\${p}">\${p}</option>\`;
                });
            } catch (err) {
                console.error("Error loading application state:", err);
            }
        }

        function updateBuildings() {
            const camp = document.getElementById('campSelect').value;
            const buildingSelect = document.getElementById('buildingSelect');
            buildingSelect.innerHTML = '<option value="">-- Select Building --</option>';

            if (!camp || !appState.camp_buildings || !appState.camp_buildings[camp]) return;

            appState.camp_buildings[camp].forEach(b => {
                buildingSelect.innerHTML += \`<option value="\${b}">Bldg \${b}</option>\`;
            });
        }

        async function submitBooking(e) {
            e.preventDefault();
            const bookingData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                branch: document.getElementById('branch').value,
                camp: document.getElementById('campSelect').value,
                building: document.getElementById('buildingSelect').value,
                purpose: document.getElementById('purposeSelect').value,
                date: document.getElementById('apptDate').value,
                time: document.getElementById('apptTime').value
            };

            try {
                const res = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                const data = await res.json();
                if (data.status === 'success') {
                    document.getElementById('bookingForm').classList.add('d-none');
                    document.getElementById('displayCode').textContent = data.confirmationCode;
                    document.getElementById('successAlert').classList.remove('d-none');
                } else {
                    alert('Error creating booking. Please try again.');
                }
            } catch (err) {
                console.error("Error submitting booking:", err);
                alert('Connection error. Please try again.');
            }
        }

        function resetForm() {
            document.getElementById('bookingForm').reset();
            document.getElementById('buildingSelect').innerHTML = '<option value="">-- Select Building --</option>';
            document.getElementById('successAlert').classList.add('d-none');
            document.getElementById('bookingForm').classList.remove('d-none');
        }
    </script>
</body>
</html>`;

// 2. SUPERADMIN DASHBOARD
const superadminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Superadmin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Superadmin Dashboard</h2>
            <div>
                <a href="/" class="btn btn-outline-primary btn-sm me-2">Back to Booking</a>
                <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>
        <div class="card shadow p-4 mb-4">
            <h4 class="mb-3">Manage Bookings & Appointments</h4>
            <div class="table-responsive">
                <table class="table table-striped align-middle">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Camp / Bldg</th>
                            <th>Date & Time</th>
                            <th>Purpose</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-bookings-body">
                        <tr><td colspan="8" class="text-center">Loading appointments...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script>
        let state = {};

        async function loadAdminData() {
            const res = await fetch('/api/state');
            state = await res.json();
            const tbody = document.getElementById('admin-bookings-body');
            if (state.bookings && state.bookings.length > 0) {
                tbody.innerHTML = state.bookings.map((b, index) => \`
                    <tr>
                        <td><strong>\${b.confirmationCode}</strong></td>
                        <td>\${b.firstName} \${b.lastName}</td>
                        <td>\${b.branch}</td>
                        <td>\${b.camp} (Bldg \${b.building})</td>
                        <td>\${b.date} \${b.time}</td>
                        <td>\${b.purpose}</td>
                        <td><span class="badge bg-success">\${b.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="cancelBooking(\${index})">Cancel</button>
                        </td>
                    </tr>
                \`).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No appointments recorded.</td></tr>';
            }
        }

        async function cancelBooking(index) {
            if (confirm('Are you sure you want to cancel this booking?')) {
                state.bookings.splice(index, 1);
                await fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state)
                });
                loadAdminData();
            }
        }

        loadAdminData();
    </script>
</body>
</html>`;

// 3. STAFF DASHBOARD
const staffHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Staff Portal</h2>
            <div>
                <a href="/superadmin" class="btn btn-outline-secondary btn-sm me-2">Superadmin View</a>
                <a href="/" class="btn btn-outline-primary btn-sm me-2">Back to Booking</a>
                <a href="/logout" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>
        <div class="card shadow p-4">
            <h4 class="mb-3">Camp Staff Check-in & Management</h4>
            <p class="text-muted">Review daily resident arrivals and manage building rosters.</p>
            <div id="staff-bookings-list" class="list-group"></div>
        </div>
    </div>
    <script>
        async function loadStaffPortal() {
            const res = await fetch('/api/state');
            const data = await res.json();
            const container = document.getElementById('staff-bookings-list');
            if (data.bookings && data.bookings.length > 0) {
                container.innerHTML = data.bookings.map(b => \`
                    <div class="list-group-item list-group-item-action flex-column align-items-start mb-2 shadow-sm rounded">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">\${b.firstName} \${b.lastName} (\${b.branch})</h5>
                            <small class="text-muted">Code: \${b.confirmationCode}</small>
                        </div>
                        <p class="mb-1"><strong>Camp:</strong> \${b.camp} | <strong>Building:</strong> \${b.building}</p>
                        <p class="mb-1"><strong>Purpose:</strong> \${b.purpose}</p>
                        <small>Scheduled: \${b.date} at \${b.time}</small>
                    </div>
                \`).join('');
            } else {
                container.innerHTML = '<p class="text-muted">No appointments scheduled for review.</p>';
            }
        }
        loadStaffPortal();
    </script>
</body>
</html>`;

// Write the runtime files to public directory
fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
fs.writeFileSync(path.join(publicDir, 'superadmin_dashboard.html'), superadminHtml);
fs.writeFileSync(path.join(publicDir, 'staff_dashboard.html'), staffHtml);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// In-Memory State Architecture
let appState = {
    camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "McNair", "Courtney"],
    camp_buildings: {
        "Camp Hansen": ["5701", "5702", "5703"],
        "Camp Schwab": ["301", "302"],
        "Camp Foster": ["5601", "5602"],
        "McNair": ["101", "102"],
        "Courtney": ["401", "402"]
    },
    purposes: [
        "Check-in / In-processing",
        "Check-out / Out-processing",
        "Room Inspection",
        "Maintenance Request",
        "Administrative Support"
    ],
    bookings: [],
    staff_users: [
        {
            username: "superadmin",
            password: "password123",
            role: "superadmin",
            camp: "ALL",
            buildings: [],
            recovery_email: "superadmin@usmc.mil"
        }
    ]
};

// API Endpoints
app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    if (req.body && typeof req.body === 'object') {
        appState = req.body;
        return res.json({ success: true, message: "State updated successfully" });
    }
    res.status(400).json({ success: false, error: "Invalid state payload" });
});

// Dedicated Booking Endpoint for the updated UI
app.post('/api/book', (req, res) => {
    try {
        const newBooking = {
            confirmationCode: 'UH-' + Math.floor(1000 + Math.random() * 9000),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            branch: req.body.branch,
            camp: req.body.camp,
            building: req.body.building,
            purpose: req.body.purpose,
            date: req.body.date,
            time: req.body.time,
            status: 'Confirmed',
            staffNotes: ''
        };
        
        appState.bookings.push(newBooking);
        res.json({ status: 'success', confirmationCode: newBooking.confirmationCode });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Failed to process booking' });
    }
});

// Routes
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(publicDir, 'superadmin_dashboard.html'));
});

app.get('/staff', (req, res) => {
    res.sendFile(path.join(publicDir, 'staff_dashboard.html'));
});

app.get('/logout', (req, res) => {
    res.redirect('/');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing Dashboard server running on port ${PORT}`);
});