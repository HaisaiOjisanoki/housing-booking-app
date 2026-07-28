const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(bodyParser.json());

const defaultState = {
    camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "MCAS Futenma"],
    camp_buildings: {
        "Camp Hansen": ["1001", "1002", "1003"],
        "Camp Schwab": ["2001", "2002"],
        "Camp Foster": ["3001", "3002", "3003"],
        "MCAS Futenma": ["4001", "4002"]
    },
    purposes: [
        "Initial Check-in",
        "Final Check-out / Clearance",
        "Room Maintenance Request",
        "Housing Inquiry"
    ],
    staff_users: [
        { username: "superadmin", role: "superadmin", camp: "ALL", building: "ALL", name: "Master Superadmin" },
        { username: "hansen_admin", role: "camp_admin", camp: "Camp Hansen", building: "ALL", name: "Hansen Camp Admin" },
        { username: "schwab_admin", role: "camp_admin", camp: "Camp Schwab", building: "ALL", name: "Schwab Camp Admin" },
        { username: "mgr_1001", role: "building_manager", camp: "Camp Hansen", building: "1001", name: "Bldg 1001 Manager" },
        { username: "mgr_2001", role: "building_manager", camp: "Camp Schwab", building: "2001", name: "Bldg 2001 Manager" }
    ],
    bookings: []
};

let appState = JSON.parse(JSON.stringify(defaultState));

if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        const savedState = JSON.parse(fileData);
        if (savedState) {
            appState.camps = (Array.isArray(savedState.camps) && savedState.camps.length > 0) ? savedState.camps : defaultState.camps;
            appState.camp_buildings = {};
            appState.camps.forEach(camp => {
                if (savedState.camp_buildings && Array.isArray(savedState.camp_buildings[camp]) && savedState.camp_buildings[camp].length > 0) {
                    appState.camp_buildings[camp] = savedState.camp_buildings[camp];
                } else {
                    appState.camp_buildings[camp] = defaultState.camp_buildings[camp] || [];
                }
            });
            if (Array.isArray(savedState.purposes) && savedState.purposes.length > 0) {
                appState.purposes = savedState.purposes;
            }
            if (Array.isArray(savedState.staff_users) && savedState.staff_users.length > 0) {
                appState.staff_users = savedState.staff_users;
            }
            if (Array.isArray(savedState.bookings)) {
                appState.bookings = savedState.bookings;
            }
        }
    } catch (err) {
        console.error("Error reading data.json:", err);
    }
}

app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState) {
        if (Array.isArray(newState.camps)) appState.camps = newState.camps;
        if (newState.camp_buildings) appState.camp_buildings = newState.camp_buildings;
        if (Array.isArray(newState.purposes)) appState.purposes = newState.purposes;
        if (Array.isArray(newState.staff_users)) appState.staff_users = newState.staff_users;
        if (Array.isArray(newState.bookings)) appState.bookings = newState.bookings;
        
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2));
        } catch (err) {
            console.error("Error saving data.json:", err);
        }
        return res.json({ success: true, appState });
    }
    res.status(400).json({ success: false, message: "Invalid payload." });
});

// Serve the frontend directly from the server to eliminate static routing/caching bugs
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing Synchronized Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f4f6f9; }
        .card { border: none; border-radius: 0.5rem; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }
        .view-section { display: none; }
        .view-section.active { display: block; }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark bg-dark px-4 shadow-sm">
        <span class="navbar-brand fw-bold">
            <i class="bi bi-building-fill-gear me-2"></i>UH Management Portal
        </span>
        <div>
            <button class="btn btn-outline-light btn-sm me-2" onclick="switchView('publicView')">
                <i class="bi bi-calendar-plus me-1"></i> Public Booking
            </button>
            <button class="btn btn-primary btn-sm" onclick="switchView('loginView')">
                <i class="bi bi-shield-lock me-1"></i> Staff Login
            </button>
        </div>
    </nav>

    <div class="container py-4">
        <div id="publicView" class="view-section active">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card p-4 bg-white">
                        <div class="text-center mb-4">
                            <i class="bi bi-calendar-check fs-1 text-primary"></i>
                            <h3 class="fw-bold mt-2">Schedule Appointment</h3>
                            <p class="text-muted small">Camps and buildings are synced live with administration</p>
                        </div>

                        <div id="successAlert" class="alert alert-success d-none" role="alert">
                            <h5 class="fw-bold mb-1"><i class="bi bi-check-circle-fill me-2"></i>Booking Confirmed!</h5>
                            <p class="mb-1 small">Your confirmation code: <strong id="displayCode" class="fs-5 text-dark"></strong></p>
                            <button class="btn btn-sm btn-outline-success mt-3 w-100 fw-bold" onclick="resetPublicForm()">Book Another</button>
                        </div>

                        <form id="bookingForm" onsubmit="submitBooking(event)">
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">First Name *</label>
                                    <input type="text" id="firstName" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Last Name *</label>
                                    <input type="text" id="lastName" class="form-control" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Email Address *</label>
                                <input type="email" id="email" class="form-control" required placeholder="john.doe@mil.mil">
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Branch *</label>
                                    <select id="branch" class="form-select" required>
                                        <option value="">-- Select Branch --</option>
                                        <option value="USMC">USMC</option>
                                        <option value="USA">USA</option>
                                        <option value="USN">USN</option>
                                        <option value="USAF">USAF</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Camp Location *</label>
                                    <select id="campSelect" class="form-select" required onchange="updateBuildingDropdown()">
                                        <option value="">-- Select Camp --</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Building Number *</label>
                                    <select id="buildingSelect" class="form-select" required>
                                        <option value="">-- Select Camp First --</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Purpose *</label>
                                    <select id="purposeSelect" class="form-select" required>
                                        <option value="">-- Select Purpose --</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row g-3 mb-4">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Date *</label>
                                    <input type="date" id="apptDate" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Time *</label>
                                    <select id="apptTime" class="form-select" required>
                                        <option value="">-- Select Time --</option>
                                        <option value="08:00">08:00 AM</option>
                                        <option value="09:00">09:00 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="13:00">01:00 PM</option>
                                        <option value="14:00">02:00 PM</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold py-2">Submit Appointment</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div id="loginView" class="view-section">
            <div class="row justify-content-center">
                <div class="col-md-5">
                    <div class="card p-4 bg-white text-center">
                        <i class="bi bi-shield-fill-check fs-1 text-success mb-2"></i>
                        <h3 class="fw-bold mb-3">Staff Portal Login</h3>
                        <p class="text-muted small mb-4">Select an account profile to test access levels:</p>
                        <div class="d-grid gap-2" id="loginButtonsList"></div>
                        <button class="btn btn-link btn-sm mt-3 text-muted" onclick="switchView('publicView')">Back to Booking</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="staffDashboardView" class="view-section">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 class="fw-bold mb-0" id="dashTitle">Dashboard</h3>
                    <p class="text-muted small mb-0" id="dashSubtitle"></p>
                </div>
                <div>
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="initializeApp(true)"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="switchView('publicView')"><i class="bi bi-box-arrow-right"></i> Logout</button>
                </div>
            </div>

            <div id="adminControlPanel" class="card p-4 bg-white mb-4 d-none">
                <h5 class="fw-bold text-dark mb-3"><i class="bi bi-gear-fill me-2"></i>Facility & Asset Management</h5>
                <div class="row g-3">
                    <div class="col-md-4" id="superadminCampBox">
                        <label class="form-label small fw-bold">Add New Camp</label>
                        <div class="input-group input-group-sm">
                            <input type="text" id="newCampName" class="form-control" placeholder="Camp Name">
                            <button class="btn btn-dark" onclick="addCamp()">Add</button>
                        </div>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label small fw-bold">Add Building Number to Camp</label>
                        <div class="input-group input-group-sm">
                            <select id="mgmtCampSelect" class="form-select" onchange="renderBuildingManagementList()"></select>
                            <input type="text" id="newBldgNum" class="form-control" placeholder="Bldg #">
                            <button class="btn btn-dark" onclick="addBuilding()">Add Bldg</button>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold">Buildings in Camp</label>
                        <div id="buildingTagList" class="border rounded p-1 bg-light small text-muted" style="max-height: 40px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>

            <div class="card p-4 bg-white">
                <h5 class="fw-bold mb-3"><i class="bi bi-list-check me-2"></i>Appointments</h5>
                <div class="table-responsive">
                    <table class="table table-hover align-middle small">
                        <thead class="table-light">
                            <tr>
                                <th>Code</th>
                                <th>Visitor</th>
                                <th>Camp / Building</th>
                                <th>Purpose</th>
                                <th>Date & Time</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="bookingsTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        let appState = {
            camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "MCAS Futenma"],
            camp_buildings: {
                "Camp Hansen": ["1001", "1002", "1003"],
                "Camp Schwab": ["2001", "2002"],
                "Camp Foster": ["3001", "3002", "3003"],
                "MCAS Futenma": ["4001", "4002"]
            },
            purposes: ["Initial Check-in", "Final Check-out / Clearance", "Room Maintenance Request", "Housing Inquiry"],
            staff_users: [
                { username: "superadmin", role: "superadmin", camp: "ALL", building: "ALL", name: "Master Superadmin" },
                { username: "hansen_admin", role: "camp_admin", camp: "Camp Hansen", building: "ALL", name: "Hansen Camp Admin" },
                { username: "schwab_admin", role: "camp_admin", camp: "Camp Schwab", building: "ALL", name: "Schwab Camp Admin" },
                { username: "mgr_1001", role: "building_manager", camp: "Camp Hansen", building: "1001", name: "Bldg 1001 Manager" },
                { username: "mgr_2001", role: "building_manager", camp: "Camp Schwab", building: "2001", name: "Bldg 2001 Manager" }
            ],
            bookings: []
        };
        let currentStaffUser = null;

        document.addEventListener("DOMContentLoaded", () => {
            const dateInput = document.getElementById('apptDate');
            if (dateInput) {
                dateInput.min = new Date().toISOString().split('T')[0];
            }
            initializeApp();
        });

        async function initializeApp(showAlert = false) {
            try {
                const res = await fetch('/api/state');
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.camps) && data.camps.length > 0) {
                        appState = data;
                    }
                }
            } catch (err) {
                console.warn("Using default data state:", err);
            } finally {
                populatePublicDropdowns();
                populateLoginButtons();
                if (currentStaffUser) {
                    renderStaffDashboard();
                }
                if (showAlert) alert("Data synchronized successfully.");
            }
        }

        function switchView(viewId) {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
        }

        function populatePublicDropdowns() {
            const campSelect = document.getElementById('campSelect');
            if (!campSelect) return;

            const currentCampVal = campSelect.value;
            campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
            (appState.camps || []).forEach(c => {
                campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
            });
            if (currentCampVal && appState.camps.includes(currentCampVal)) {
                campSelect.value = currentCampVal;
            }

            const purposeSelect = document.getElementById('purposeSelect');
            if (purposeSelect) {
                const currentPurposeVal = purposeSelect.value;
                purposeSelect.innerHTML = '<option value="">-- Select Purpose --</option>';
                (appState.purposes || []).forEach(p => {
                    purposeSelect.innerHTML += \`<option value="\${p}">\${p}</option>\`;
                });
                if (currentPurposeVal) purposeSelect.value = currentPurposeVal;
            }

            updateBuildingDropdown();
        }

        function updateBuildingDropdown() {
            const campSelect = document.getElementById('campSelect');
            const buildingSelect = document.getElementById('buildingSelect');
            if (!campSelect || !buildingSelect) return;

            const camp = campSelect.value;
            const currentBldgVal = buildingSelect.value;

            buildingSelect.innerHTML = '<option value="">-- Select Camp First --</option>';

            if (!camp) return;

            const bldgs = (appState.camp_buildings && appState.camp_buildings[camp]) ? appState.camp_buildings[camp] : [];

            if (bldgs.length === 0) {
                buildingSelect.innerHTML = '<option value="">-- No Buildings Available --</option>';
                return;
            }

            buildingSelect.innerHTML = '<option value="">-- Select Building --</option>';
            bldgs.forEach(b => {
                buildingSelect.innerHTML += \`<option value="\${b}">Bldg \${b}</option>\`;
            });

            if (currentBldgVal && bldgs.includes(currentBldgVal)) {
                buildingSelect.value = currentBldgVal;
            }
        }

        async function submitBooking(e) {
            e.preventDefault();
            const code = 'HSG-' + Math.floor(100000 + Math.random() * 900000);
            const newBooking = {
                id: Date.now(),
                confirmationCode: code,
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                branch: document.getElementById('branch').value,
                camp: document.getElementById('campSelect').value,
                building: document.getElementById('buildingSelect').value,
                purpose: document.getElementById('purposeSelect').value,
                date: document.getElementById('apptDate').value,
                time: document.getElementById('apptTime').value,
                status: 'Pending'
            };

            if (!Array.isArray(appState.bookings)) appState.bookings = [];
            appState.bookings.push(newBooking);

            await saveStateToServer();
            document.getElementById('bookingForm').classList.add('d-none');
            document.getElementById('displayCode').textContent = code;
            document.getElementById('successAlert').classList.remove('d-none');
        }

        function resetPublicForm() {
            document.getElementById('bookingForm').reset();
            document.getElementById('buildingSelect').innerHTML = '<option value="">-- Select Camp First --</option>';
            document.getElementById('successAlert').classList.add('d-none');
            document.getElementById('bookingForm').classList.remove('d-none');
        }

        function populateLoginButtons() {
            const container = document.getElementById('loginButtonsList');
            if (!container) return;
            container.innerHTML = '';
            (appState.staff_users || []).forEach(u => {
                let badgeColor = u.role === 'superadmin' ? 'btn-dark' : (u.role === 'camp_admin' ? 'btn-secondary' : 'btn-outline-secondary');
                container.innerHTML += \`<button class="btn \${badgeColor} fw-bold text-start p-2" onclick="loginAs('\${u.username}')">
                    <i class="bi bi-person-badge me-2"></i>\${u.name} <span class="badge bg-light text-dark float-end">\${u.role.toUpperCase()}</span>
                </button>\`;
            });
        }

        function loginAs(username) {
            currentStaffUser = (appState.staff_users || []).find(u => u.username === username);
            switchView('staffDashboardView');
            renderStaffDashboard();
        }

        function renderStaffDashboard() {
            const titleEl = document.getElementById('dashTitle');
            const subEl = document.getElementById('dashSubtitle');
            const adminPanel = document.getElementById('adminControlPanel');
            const superCampBox = document.getElementById('superadminCampBox');

            if (!currentStaffUser) return;

            if (currentStaffUser.role === 'superadmin') {
                titleEl.textContent = "Superadmin Dashboard (Master View)";
                subEl.textContent = "Full system privileges: Viewing and managing ALL appointments, camps, and buildings.";
                adminPanel.classList.remove('d-none');
                superCampBox.classList.remove('d-none');
                setupAdminCampDropdowns();
            } else if (currentStaffUser.role === 'camp_admin') {
                titleEl.textContent = \`Camp Admin Dashboard (\${currentStaffUser.camp})\`;
                subEl.textContent = \`Managing inventory and updating booking statuses exclusively for \${currentStaffUser.camp}.\`;
                adminPanel.classList.remove('d-none');
                superCampBox.classList.add('d-none'); 
                setupAdminCampDropdownsForCampAdmin();
            } else {
                titleEl.textContent = \`Building Manager Dashboard (Bldg \${currentStaffUser.building}, \${currentStaffUser.camp})\`;
                subEl.textContent = \`Viewing bookings restricted to Building \${currentStaffUser.building}.\`;
                adminPanel.classList.add('d-none');
            }

            renderBookingsTable();
        }

        function setupAdminCampDropdowns() {
            const sel = document.getElementById('mgmtCampSelect');
            if (!sel) return;
            const selectedVal = sel.value;
            sel.innerHTML = '';
            (appState.camps || []).forEach(c => {
                sel.innerHTML += \`<option value="\${c}">\${c}</option>\`;
            });
            if (selectedVal && appState.camps.includes(selectedVal)) {
                sel.value = selectedVal;
            }
            renderBuildingManagementList();
        }

        function setupAdminCampDropdownsForCampAdmin() {
            const sel = document.getElementById('mgmtCampSelect');
            if (!sel) return;
            sel.innerHTML = \`<option value="\${currentStaffUser.camp}">\${currentStaffUser.camp}</option>\`;
            sel.disabled = true;
            renderBuildingManagementList();
        }

        function renderBuildingManagementList() {
            const sel = document.getElementById('mgmtCampSelect');
            const tagContainer = document.getElementById('buildingTagList');
            if (!sel || !tagContainer) return;

            const camp = sel.value;
            const bldgs = (appState.camp_buildings && appState.camp_buildings[camp]) ? appState.camp_buildings[camp] : [];
            if (bldgs.length === 0) {
                tagContainer.innerHTML = '<span class="text-muted">No buildings</span>';
            } else {
                tagContainer.innerHTML = bldgs.map(b => '<span class="badge bg-secondary me-1">Bldg ' + b + '</span>').join(' ');
            }
        }

        async function addCamp() {
            const inputEl = document.getElementById('newCampName');
            if (!inputEl) return;
            const name = inputEl.value.trim();
            if (!name) return alert("Enter camp name.");
            if (!appState.camps.includes(name)) {
                appState.camps.push(name);
            }
            if (!appState.camp_buildings[name]) {
                appState.camp_buildings[name] = [];
            }
            await saveStateToServer();
            inputEl.value = '';
            populatePublicDropdowns();
            setupAdminCampDropdowns();
            alert("Camp added successfully.");
        }

        async function addBuilding() {
            const campSel = document.getElementById('mgmtCampSelect');
            const bldgInput = document.getElementById('newBldgNum');
            if (!campSel || !bldgInput) return;

            const camp = campSel.value;
            const bldg = bldgInput.value.trim();
            if (!camp || !bldg) return alert("Enter building number.");

            if (!appState.camp_buildings[camp]) {
                appState.camp_buildings[camp] = [];
            }
            if (!appState.camp_buildings[camp].includes(bldg)) {
                appState.camp_buildings[camp].push(bldg);
            }
            await saveStateToServer();
            bldgInput.value = '';
            renderBuildingManagementList();
            populatePublicDropdowns();
            alert("Building added successfully.");
        }

        function renderBookingsTable() {
            const tbody = document.getElementById('bookingsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const bookingsList = Array.isArray(appState.bookings) ? appState.bookings : [];
            const filtered = bookingsList.filter(b => {
                if (!currentStaffUser) return false;
                if (currentStaffUser.role === 'superadmin') return true;
                if (currentStaffUser.role === 'camp_admin') return b.camp === currentStaffUser.camp;
                if (currentStaffUser.role === 'building_manager') {
                    return b.camp === currentStaffUser.camp && b.building === currentStaffUser.building;
                }
                return false;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = \`<tr><td colspan="7" class="text-center text-muted py-3">No bookings found.</td></tr>\`;
                return;
            }

            filtered.forEach(b => {
                tbody.innerHTML += \`
                    <tr>
                        <td class="fw-bold text-primary">\${b.confirmationCode}</td>
                        <td>\${b.firstName} \${b.lastName}<br><small class="text-muted">\${b.email}</small></td>
                        <td>\${b.camp}<br><span class="badge bg-secondary">Bldg \${b.building}</span></td>
                        <td>\${b.purpose}</td>
                        <td>\${b.date} @ \${b.time}</td>
                        <td>
                            <select class="form-select form-select-sm" onchange="updateBookingStatus(\${b.id}, this.value)">
                                <option value="Pending" \${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Approved" \${b.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                <option value="Completed" \${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" \${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteBooking(\${b.id})"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>
                \`;
            });
        }

        async function updateBookingStatus(id, newStatus) {
            const booking = (appState.bookings || []).find(b => b.id === id);
            if (booking) {
                booking.status = newStatus;
                await saveStateToServer();
            }
        }

        async function deleteBooking(id) {
            if (!confirm("Are you sure?")) return;
            appState.bookings = (appState.bookings || []).filter(b => b.id !== id);
            await saveStateToServer();
            renderStaffDashboard();
        }

        async function saveStateToServer() {
            try {
                const res = await fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appState)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.appState) {
                        appState = data.appState;
                    }
                }
            } catch (err) {
                console.warn("Network sync error.");
            }
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log(`Housing Portal running on port ${PORT}`);
});