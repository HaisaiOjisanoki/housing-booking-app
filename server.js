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

// 1. PUBLIC BOOKING PAGE (index.html)
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Appointment Booking</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="text-primary">Unaccompanied Housing Portal</h2>
                    <div>
                        <a href="/staff" class="btn btn-outline-secondary btn-sm me-2">Staff Portal</a>
                        <a href="/superadmin" class="btn btn-outline-primary btn-sm">Superadmin</a>
                    </div>
                </div>
                
                <div class="card shadow p-4 mb-4">
                    <h4 class="mb-3">Schedule an Appointment / In-Processing</h4>
                    <form id="booking-form">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">First Name</label>
                                <input type="text" id="firstName" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Last Name</label>
                                <input type="text" id="lastName" class="form-control" required>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Service Branch</label>
                                <select id="branch" class="form-select" required>
                                    <option value="USMC">USMC</option>
                                    <option value="USN">USN</option>
                                    <option value="USA">USA</option>
                                    <option value="USAF">USAF</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email (.mil preferred)</label>
                                <input type="email" id="email" class="form-control" required>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Camp</label>
                                <select id="camp-select" class="form-select" required></select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Building Number</label>
                                <select id="building-select" class="form-select" required></select>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <label class="form-label">Date</label>
                                <input type="date" id="date" class="form-control" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Time</label>
                                <input type="time" id="time" class="form-control" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Purpose</label>
                                <select id="purpose-select" class="form-select" required></select>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Confirm Booking</button>
                    </form>
                    <div id="booking-alert" class="mt-3"></div>
                </div>
            </div>
        </div>
    </div>
    <script>
        let globalState = {};

        async function fetchState() {
            const res = await fetch('/api/state');
            globalState = await res.json();
            populateDropdowns();
        }

        function populateDropdowns() {
            const campSelect = document.getElementById('camp-select');
            const purposeSelect = document.getElementById('purpose-select');

            campSelect.innerHTML = globalState.camps.map(c => \`<option value="\${c}">\${c}</option>\`).join('');
            purposeSelect.innerHTML = globalState.purposes.map(p => \`<option value="\${p}">\${p}</option>\`).join('');

            updateBuildings();
            campSelect.onchange = updateBuildings;
        }

        function updateBuildings() {
            const camp = document.getElementById('camp-select').value;
            const buildingSelect = document.getElementById('building-select');
            const buildings = globalState.camp_buildings[camp] || [];
            buildingSelect.innerHTML = buildings.map(b => \`<option value="\${b}">Building \${b}</option>\`).join('');
        }

        document.getElementById('booking-form').onsubmit = async (e) => {
            e.preventDefault();
            const newBooking = {
                confirmationCode: 'UH-' + Math.floor(1000 + Math.random() * 9000),
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                branch: document.getElementById('branch').value,
                email: document.getElementById('email').value,
                camp: document.getElementById('camp-select').value,
                building: document.getElementById('building-select').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                purpose: document.getElementById('purpose-select').value,
                status: 'Confirmed',
                staffNotes: ''
            };

            globalState.bookings.push(newBooking);

            const res = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(globalState)
            });
            const result = await res.json();

            const alertDiv = document.getElementById('booking-alert');
            if (result.success) {
                alertDiv.innerHTML = \`<div class="alert alert-success">Booking successful! Your confirmation code is <strong>\${newBooking.confirmationCode}</strong>.</div>\`;
                document.getElementById('booking-form').reset();
                updateBuildings();
            } else {
                alertDiv.innerHTML = \`<div class="alert alert-danger">Error saving booking. Please try again.</div>\`;
            }
        };

        fetchState();
    </script>
</body>
</html>`;

// 2. SUPERADMIN DASHBOARD (superadmin_dashboard.html)
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

// 3. STAFF DASHBOARD (staff_dashboard.html)
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

// Middleware & State
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

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
    bookings: [
        {
            confirmationCode: "UH-9941",
            firstName: "John",
            lastName: "Doe",
            branch: "USMC",
            camp: "Camp Hansen",
            building: "5701",
            date: "2026-07-28",
            time: "10:00",
            purpose: "Check-in / In-processing",
            status: "Confirmed",
            email: "john.doe@usmc.mil",
            staffNotes: ""
        }
    ],
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