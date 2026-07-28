const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Auto-generate public directory and dashboard files at runtime
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const superadminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Superadmin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Unaccompanied Housing - Superadmin Dashboard</h2>
            <div>
                <a href="/staff" class="btn btn-outline-primary me-2">Staff Portal</a>
                <a href="/logout" class="btn btn-danger">Logout</a>
            </div>
        </div>
        <div class="card shadow p-4 mb-4">
            <h4>System Bookings & Management</h4>
            <div id="booking-container" class="table-responsive mt-3">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Confirmation</th>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Camp / Bldg</th>
                            <th>Date & Time</th>
                            <th>Purpose</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="bookings-table-body">
                        <tr><td colspan="7" class="text-center">Loading bookings...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script>
        async function loadState() {
            try {
                const res = await fetch('/api/state');
                const data = await res.json();
                const tbody = document.getElementById('bookings-table-body');
                if (data.bookings && data.bookings.length > 0) {
                    tbody.innerHTML = data.bookings.map(b => \`
                        <tr>
                            <td>\${b.confirmationCode}</td>
                            <td>\${b.firstName} \${b.lastName}</td>
                            <td>\${b.branch}</td>
                            <td>\${b.camp} (\${b.building})</td>
                            <td>\${b.date} \${b.time}</td>
                            <td>\${b.purpose}</td>
                            <td><span class="badge bg-success">\${b.status}</span></td>
                        </tr>
                    \`).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No active bookings found.</td></tr>';
                }
            } catch (err) {
                console.error('Failed to load state', err);
            }
        }
        loadState();
    </script>
</body>
</html>`;

const staffHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Staff Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Unaccompanied Housing - Staff Portal</h2>
            <div>
                <a href="/superadmin" class="btn btn-outline-secondary me-2">Superadmin View</a>
                <a href="/logout" class="btn btn-danger">Logout</a>
            </div>
        </div>
        <div class="card shadow p-4">
            <h4>Staff Login & Management</h4>
            <p class="text-muted">Manage camp assignments and room check-ins.</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'superadmin_dashboard.html'), superadminHtml);
fs.writeFileSync(path.join(publicDir, 'staff_dashboard.html'), staffHtml);

// 2. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// 3. In-Memory State Architecture
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

// 4. API Endpoints
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

// 5. Route Handlers
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
    res.sendFile(path.join(publicDir, 'superadmin_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing Dashboard server running on port ${PORT}`);
});