const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. PUBLIC BOOKING PAGE (index.html)
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
                <a href="/login" class="btn btn-outline-light btn-sm fw-bold">
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
                
                const campSelect = document.getElementById('campSelect');
                campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
                (appState.camps || []).forEach(c => {
                    campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
                });

                const purposeSelect = document.getElementById('purposeSelect');
                purposeSelect.innerHTML = '<option value="">-- Select Purpose --</option>';
                (appState.purposes || []).forEach(p => {
                    purposeSelect.innerHTML += \`<option value="\${p}">\${p}</option>\`;
                });
            } catch (err) {
                console.error("Error loading state:", err);
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

// 2. STAFF LOGIN PAGE (login.html)
const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Login - UH Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>body { background-color: #f4f6f9; }</style>
</head>
<body class="d-flex align-items-center py-4 bg-light" style="height: 100vh;">
    <main class="form-signin w-100 m-auto" style="max-width: 400px;">
        <div class="card shadow-sm p-4 bg-white">
            <div class="text-center mb-4">
                <i class="bi bi-shield-lock fs-1 text-primary"></i>
                <h3 class="h3 mb-3 fw-bold">Staff Login</h3>
                <p class="text-muted small">Sign in to manage camp appointments</p>
            </div>
            <form onsubmit="handleLogin(event)">
                <div class="mb-3">
                    <label class="form-label small fw-bold">Username</label>
                    <input type="text" id="loginUser" class="form-control" required placeholder="Enter username">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Password</label>
                    <input type="password" id="loginPass" class="form-control" required placeholder="Password">
                </div>
                <button type="submit" class="btn btn-primary w-100 fw-bold py-2">Sign In</button>
            </form>
            <div class="text-center mt-3">
                <a href="/" class="small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>Back to Booking Portal</a>
            </div>
        </div>
    </main>
    <script>
        async function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('loginUser').value.trim();
            const password = document.getElementById('loginPass').value.trim();

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = '/dashboard';
            } else {
                alert(data.message || 'Invalid username or password.');
            }
        }
    </script>
</body>
</html>`;

// 3. STAFF MANAGEMENT DASHBOARD (staff_dashboard.html)
const staffHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UH Management Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f4f6f9; }
        .card { border: none; border-radius: 0.5rem; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .calendar-day-header { text-align: center; font-weight: bold; background: #e9ecef; padding: 8px; border-radius: 4px; font-size: 0.85rem; }
        .calendar-cell { min-height: 110px; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px; font-size: 0.8rem; overflow-y: auto; }
        .calendar-cell.other-month { background: #f8f9fa; color: #adb5bd; }
        .booking-badge { font-size: 0.7rem; padding: 2px 5px; border-radius: 3px; margin-bottom: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        .booking-badge:hover { opacity: 0.85; }
    </style>
</head>
<body onload="initStaffDashboard()">

    <nav class="navbar navbar-dark bg-dark shadow-sm">
        <div class="container-fluid px-4">
            <span class="navbar-brand fw-bold">
                <i class="bi bi-building me-2"></i>UH Management Dashboard — <span class="text-info" id="navCampInfo">Loading...</span>
            </span>
            <div class="d-flex align-items-center">
                <span class="text-light me-3 small" id="navUserInfo"></span>
                <a href="/logout" class="btn btn-outline-light btn-sm">
                    <i class="bi bi-box-arrow-right me-1"></i>Sign Out
                </a>
            </div>
        </div>
    </nav>

    <div class="container py-4">
        
        <!-- SUPERADMIN GLOBAL CONTROLS SECTION -->
        <div id="superAdminSection" class="row mb-4" style="display: none;">
            <div class="col-md-12">
                <div class="card shadow-sm p-4 bg-white border border-danger">
                    <h5 class="fw-bold mb-3 text-danger"><i class="bi bi-shield-fill-exclamation me-2"></i>Superadmin Master Controls</h5>
                    <p class="text-muted small">Global administration: Add/remove camps, manage building numbers across all camps, and create or manage staff accounts with password reset capabilities.</p>
                    
                    <div class="row g-4">
                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Manage Camp Locations</h6>
                            <div class="input-group mb-2">
                                <input type="text" id="superNewCampInput" class="form-control" placeholder="Camp Name (e.g., Camp Hansen)">
                                <button class="btn btn-dark fw-bold" onclick="superAdminAddCamp()">Add Camp</button>
                            </div>
                            <div id="superCampsList" class="small text-muted mb-3 d-flex flex-wrap gap-1"></div>

                            <h6 class="fw-bold text-secondary">Manage Buildings for Camp</h6>
                            <div class="mb-2">
                                <select id="superCampTargetSelect" class="form-select form-select-sm mb-2" onchange="superAdminUpdateCampBldgPreview()">
                                    <option value="">-- Select Camp --</option>
                                </select>
                                <div class="input-group mb-2">
                                    <input type="text" id="superNewBldgInput" class="form-control form-control-sm" placeholder="Building # (e.g., 5704)">
                                    <button class="btn btn-success btn-sm fw-bold" onclick="superAdminAddBuilding()">Add Building</button>
                                </div>
                                <div id="superCampBldgsList" class="small text-muted mb-3"></div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Create System Staff User (Superadmin / Camp Admin / Manager)</h6>
                            <form onsubmit="superAdminCreateUser(event)" class="border p-3 rounded bg-light">
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <input type="text" id="saUsername" class="form-control form-control-sm" required placeholder="Username">
                                    </div>
                                    <div class="col-6">
                                        <input type="password" id="saPassword" class="form-control form-control-sm" required placeholder="Password">
                                    </div>
                                </div>
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <select id="saRole" class="form-select form-select-sm" onchange="superAdminRoleChanged()">
                                            <option value="staff">UH Building Manager</option>
                                            <option value="camp_admin">Camp Admin</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <select id="saCamp" class="form-select form-select-sm" onchange="superAdminCampChanged()">
                                            <option value="">-- Select Camp --</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-2" id="saBuildingsContainer">
                                    <label class="form-label small fw-bold mb-1">Assigned Buildings:</label>
                                    <div id="saBuildingCheckboxes" class="d-flex flex-wrap gap-2 small border p-2 bg-white rounded" style="max-height: 90px; overflow-y: auto;"></div>
                                </div>
                                <button type="submit" class="btn btn-danger btn-sm fw-bold w-100">Create Staff Account</button>
                            </form>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6 class="fw-bold text-secondary">All System User Accounts</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover align-middle">
                                <thead class="table-light">
                                    <tr><th>Username</th><th>Role</th><th>Camp</th><th>Buildings</th><th class="text-end">Actions</th></tr>
                                </thead>
                                <tbody id="superAdminUsersTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CAMP ADMIN CONTROLS SECTION -->
        <div id="campAdminSection" class="row mb-4" style="display: none;">
            <div class="col-md-12">
                <div class="card shadow-sm p-4 bg-white">
                    <h5 class="fw-bold mb-3"><i class="bi bi-building-add me-2"></i>Camp Admin Controls for <span id="adminCampName"></span></h5>
                    <p class="text-muted small">Manage building numbers and UH Building Managers assigned to your camp.</p>
                    
                    <div class="row g-4">
                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Add / Remove Building Numbers</h6>
                            <div class="input-group mb-2">
                                <input type="text" id="newBuildingInput" class="form-control" placeholder="Building # (e.g., 1004)">
                                <button class="btn btn-success fw-bold" onclick="addBuildingToCamp()">Add Building</button>
                            </div>
                            <div id="campBuildingsList" class="small text-muted mb-4"></div>

                            <h6 class="fw-bold text-secondary">Managed Building Managers</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover align-middle">
                                    <thead class="table-light">
                                        <tr><th>Username</th><th>Buildings</th><th class="text-end">Actions</th></tr>
                                    </thead>
                                    <tbody id="campManagersTableBody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Assign UH Building Manager</h6>
                            <form onsubmit="campAdminCreateManager(event)" class="border p-3 rounded bg-light">
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <input type="text" id="caMgrUsername" class="form-control form-control-sm" required placeholder="Username">
                                    </div>
                                    <div class="col-6">
                                        <input type="password" id="caMgrPassword" class="form-control form-control-sm" required placeholder="Initial Password">
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <input type="email" id="caMgrEmail" class="form-control form-control-sm" required placeholder="Recovery Email (e.g. mgr@mil.mil)">
                                </div>
                                <div class="mb-2">
                                    <label class="form-label small fw-bold mb-1">Select Buildings:</label>
                                    <div id="caBuildingCheckboxes" class="d-flex flex-wrap gap-2 small"></div>
                                </div>
                                <button type="submit" class="btn btn-primary btn-sm fw-bold w-100">Create Manager</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4 align-items-center">
            <div class="col-md-6">
                <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i>Appointments Management</h4>
            </div>
            <div class="col-md-6 text-md-end mt-3 mt-md-0">
                <div class="btn-group shadow-sm" role="group">
                    <button type="button" class="btn btn-primary fw-bold" id="btnTableView" onclick="switchView('table')"><i class="bi bi-table me-1"></i> Table View</button>
                    <button type="button" class="btn btn-outline-primary fw-bold" id="btnCalendarView" onclick="switchView('calendar')"><i class="bi bi-calendar3 me-1"></i> Calendar View</button>
                </div>
            </div>
        </div>

        <div id="tableViewSection" class="card shadow-sm">
            <div class="card-body p-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Confirmation Code</th>
                                <th>Service Member</th>
                                <th>Branch</th>
                                <th>Bldg / Camp</th>
                                <th>Date & Time</th>
                                <th>Purpose</th>
                                <th class="text-end">Actions / Notes</th>
                            </tr>
                        </thead>
                        <tbody id="staffAppointmentsTable"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="calendarViewSection" class="card shadow-sm p-4 bg-white" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2"></i>Calendar View</h5>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-secondary btn-sm fw-bold" onclick="changeMonth(-1)"><i class="bi bi-chevron-left"></i> Prev</button>
                    <span id="calendarMonthTitle" class="fw-bold fs-5 px-2">Month Year</span>
                    <button class="btn btn-outline-secondary btn-sm fw-bold" onclick="changeMonth(1)">Next <i class="bi bi-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-grid mb-2">
                <div class="calendar-day-header">Sun</div>
                <div class="calendar-day-header">Mon</div>
                <div class="calendar-day-header">Tue</div>
                <div class="calendar-day-header">Wed</div>
                <div class="calendar-day-header">Thu</div>
                <div class="calendar-day-header">Fri</div>
                <div class="calendar-day-header">Sat</div>
            </div>
            <div id="calendarDaysGrid" class="calendar-grid"></div>
        </div>

    </div>

    <div class="modal fade" id="bookingActionModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-calendar-check me-2"></i>Manage Booking Confirmation</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="modalBookingIndex">
                    <div id="modalBookingDetails" class="mb-3 p-3 bg-light rounded small border"></div>
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-primary"><i class="bi bi-clock-history me-1"></i> Reschedule Appointment</label>
                        <div class="row g-2">
                            <div class="col-7"><input type="date" id="rescheduleDate" class="form-control form-control-sm"></div>
                            <div class="col-5"><input type="time" id="rescheduleTime" class="form-control form-control-sm"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer justify-content-between">
                    <div>
                        <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="deleteBookingFromModal()"><i class="bi bi-trash me-1"></i> Delete</button>
                    </div>
                    <div>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="rescheduleBookingFromModal()"><i class="bi bi-check2-circle me-1"></i> Save Reschedule</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let appState = {};
        let sessionUser = {};
        let staffCamp = "";
        let staffAssignedBuildings = [];
        let userRole = "";
        let currentCalendarDate = new Date();
        let activeBookingIndex = null;

        async function initStaffDashboard() {
            try {
                const sessionRes = await fetch('/api/session');
                sessionUser = await sessionRes.json();
                if (!sessionUser.username) {
                    window.location.href = '/login';
                    return;
                }

                staffCamp = sessionUser.camp;
                staffAssignedBuildings = sessionUser.buildings || [];
                userRole = sessionUser.role;

                let roleLabel = 'UH Building Manager';
                if (userRole === 'superadmin') roleLabel = 'Superadmin';
                else if (userRole === 'camp_admin') roleLabel = 'Camp Admin';

                let scopeDisplay = \`(Bldgs: \${staffAssignedBuildings.join(', ')})\`;
                if (userRole === 'superadmin') scopeDisplay = '(All Camps & Buildings)';
                else if (userRole === 'camp_admin') scopeDisplay = '(All Camp Bldgs)';

                document.getElementById('navCampInfo').innerHTML = \`\${staffCamp} \${scopeDisplay}\`;
                document.getElementById('navUserInfo').innerHTML = \`Logged in as: <strong>\${sessionUser.username}</strong> (\${roleLabel})\`;

                const res = await fetch('/api/state');
                appState = await res.json();

                if (userRole === 'superadmin') {
                    document.getElementById('superAdminSection').style.display = 'block';
                    initSuperAdminPanel();
                } else if (userRole === 'camp_admin') {
                    document.getElementById('campAdminSection').style.display = 'block';
                    document.getElementById('adminCampName').textContent = staffCamp;
                    renderCampBuildings();
                    renderCaBuildingCheckboxes();
                    renderCampManagers();
                }

                renderStaffAppointments();
                renderCalendar();
            } catch (err) {
                console.error("Error loading session or state:", err);
            }
        }

        function getEffectiveBuildings() {
            if (userRole === 'superadmin') {
                let all = [];
                Object.values(appState.camp_buildings || {}).forEach(arr => all.push(...arr));
                return all;
            } else if (userRole === 'camp_admin') {
                return (appState.camp_buildings && appState.camp_buildings[staffCamp]) ? appState.camp_buildings[staffCamp] : [];
            } else {
                return staffAssignedBuildings;
            }
        }

        function initSuperAdminPanel() {
            const campSelect = document.getElementById('superCampTargetSelect');
            campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
            const saCampSelect = document.getElementById('saCamp');
            saCampSelect.innerHTML = '<option value="">-- Select Camp --</option>';

            (appState.camps || []).forEach(c => {
                campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
                saCampSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
            });

            const campsListContainer = document.getElementById('superCampsList');
            if (campsListContainer) {
                let html = '';
                (appState.camps || []).forEach(c => {
                    html += \`<span class="badge bg-secondary me-1 mb-1">\${c} <a href="javascript:void(0)" class="text-white ms-1 text-decoration-none" onclick="superAdminDeleteCamp('\${c}')">&times;</a></span>\`;
                });
                campsListContainer.innerHTML = html || 'No camps registered.';
            }

            superAdminUpdateCampBldgPreview();
            renderSuperAdminUsersTable();
        }

        async function superAdminAddCamp() {
            const input = document.getElementById('superNewCampInput');
            const campName = input.value.trim();
            if (!campName) return;

            if (!appState.camps) appState.camps = [];
            if (appState.camps.includes(campName)) {
                alert('Camp already exists.');
                return;
            }

            appState.camps.push(campName);
            if (!appState.camp_buildings) appState.camp_buildings = {};
            appState.camp_buildings[campName] = [];
            input.value = '';

            const res = await saveState();
            if (res) {
                alert('Camp created successfully!');
                initSuperAdminPanel();
            }
        }

        async function superAdminDeleteCamp(campName) {
            if (!confirm(\`Permanently delete \${campName} and all its associated buildings?\`)) return;
            appState.camps = (appState.camps || []).filter(c => c !== campName);
            if (appState.camp_buildings) {
                delete appState.camp_buildings[campName];
            }
            const res = await saveState();
            if (res) {
                alert('Camp deleted successfully!');
                initSuperAdminPanel();
            }
        }

        function superAdminUpdateCampBldgPreview() {
            const camp = document.getElementById('superCampTargetSelect').value;
            const container = document.getElementById('superCampBldgsList');
            if (!camp || !appState.camp_buildings || !appState.camp_buildings[camp]) {
                container.innerHTML = 'Buildings: None';
                return;
            }
            const bldgs = appState.camp_buildings[camp];
            if (bldgs.length === 0) {
                container.innerHTML = 'Buildings: None';
                return;
            }
            let html = '<strong>Buildings:</strong> ';
            bldgs.forEach(b => {
                html += \`<span class="badge bg-light text-dark border me-1 mb-1">Bldg \${b} <a href="javascript:void(0)" class="text-danger ms-1 text-decoration-none" onclick="superAdminDeleteBuilding('\${camp}', '\${b}')">&times;</a></span>\`;
            });
            container.innerHTML = html;
        }

        async function superAdminAddBuilding() {
            const camp = document.getElementById('superCampTargetSelect').value;
            const bldgInput = document.getElementById('superNewBldgInput');
            const bldg = bldgInput.value.trim();
            if (!camp) return alert('Please select a camp first.');
            if (!bldg) return alert('Please enter a building number.');

            if (!appState.camp_buildings[camp]) appState.camp_buildings[camp] = [];
            if (appState.camp_buildings[camp].includes(bldg)) {
                alert('Building already exists for this camp.');
                return;
            }

            appState.camp_buildings[camp].push(bldg);
            bldgInput.value = '';
            const res = await saveState();
            if (res) {
                alert('Building added successfully!');
                superAdminUpdateCampBldgPreview();
            }
        }

        async function superAdminDeleteBuilding(camp, bldg) {
            if (!confirm(\`Delete building \${bldg} from \${camp}?\`)) return;
            if (appState.camp_buildings && appState.camp_buildings[camp]) {
                appState.camp_buildings[camp] = appState.camp_buildings[camp].filter(b => b !== bldg);
            }
            const res = await saveState();
            if (res) {
                superAdminUpdateCampBldgPreview();
                superAdminCampChanged();
            }
        }

        function superAdminRoleChanged() {
            const role = document.getElementById('saRole').value;
            const container = document.getElementById('saBuildingsContainer');
            if (role === 'superadmin') {
                container.style.display = 'none';
            } else {
                container.style.display = 'block';
                superAdminCampChanged();
            }
        }

        function superAdminCampChanged() {
            const camp = document.getElementById('saCamp').value;
            const container = document.getElementById('saBuildingCheckboxes');
            container.innerHTML = '';
            if (!camp || !appState.camp_buildings || !appState.camp_buildings[camp] || appState.camp_buildings[camp].length === 0) {
                container.innerHTML = '<span class="text-muted">No buildings available for this camp.</span>';
                return;
            }
            appState.camp_buildings[camp].forEach(b => {
                container.innerHTML += \`
                    <div class="form-check form-check-inline">
                        <input class="form-check-input sa-bldg-chk" type="checkbox" value="\${b}" id="sa_chk_\${b}">
                        <label class="form-check-label" for="sa_chk_\${b}">Bldg \${b}</label>
                    </div>
                \`;
            });
        }

        async function superAdminCreateUser(e) {
            e.preventDefault();
            const username = document.getElementById('saUsername').value.trim();
            const password = document.getElementById('saPassword').value.trim();
            const role = document.getElementById('saRole').value;
            const camp = document.getElementById('saCamp').value;

            let selectedBldgs = [];
            if (role !== 'superadmin') {
                if (!camp) return alert('Please select a camp.');
                const checkboxes = document.querySelectorAll('.sa-bldg-chk:checked');
                selectedBldgs = Array.from(checkboxes).map(chk => chk.value);
                if (role === 'staff' && selectedBldgs.length === 0) {
                    return alert('Please select at least one building for the UH Building Manager.');
                }
            }

            if (!appState.staff_users) appState.staff_users = [];
            if (appState.staff_users.some(u => u.username === username)) {
                return alert('Username already exists.');
            }

            const newUser = {
                username,
                password,
                role,
                camp: camp || (appState.camps[0] || 'Camp Hansen'),
                buildings: role === 'superadmin' ? [] : (role === 'camp_admin' ? (appState.camp_buildings[camp] || []) : selectedBldgs),
                recovery_email: username + '@mil.mil'
            };

            appState.staff_users.push(newUser);
            const res = await saveState();
            if (res) {
                alert('Staff account created successfully!');
                document.getElementById('saUsername').value = '';
                document.getElementById('saPassword').value = '';
                renderSuperAdminUsersTable();
            }
        }

        function renderSuperAdminUsersTable() {
            const tbody = document.getElementById('superAdminUsersTableBody');
            if (!tbody) return;
            const users = appState.staff_users || [];
            tbody.innerHTML = users.length === 0 ? \`<tr><td colspan="5" class="text-center text-muted">No users found.</td></tr>\` : '';

            users.forEach((u, idx) => {
                let roleBadge = '<span class="badge bg-secondary">Manager</span>';
                if (u.role === 'superadmin') roleBadge = '<span class="badge bg-danger">Superadmin</span>';
                else if (u.role === 'camp_admin') roleBadge = '<span class="badge bg-primary">Camp Admin</span>';

                tbody.innerHTML += \`
                    <tr>
                        <td class="fw-bold">\${u.username}</td>
                        <td>\${roleBadge}</td>
                        <td>\${u.camp || 'N/A'}</td>
                        <td>\${u.buildings ? u.buildings.join(', ') : 'All / None'}</td>
                        <td class="text-end">
                            <button class="btn btn-outline-warning btn-sm py-0 px-1 me-1" onclick="superAdminResetPassword(\${idx})" title="Reset Password"><i class="bi bi-key"></i></button>
                            <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="superAdminDeleteUser(\${idx})" title="Delete User"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>
                \`;
            });
        }

        async function superAdminResetPassword(idx) {
            const newPass = prompt("Enter new password for this user:");
            if (!newPass) return;
            appState.staff_users[idx].password = newPass;
            const res = await saveState();
            if (res) {
                alert('Password reset successfully!');
                renderSuperAdminUsersTable();
            }
        }

        async function superAdminDeleteUser(idx) {
            if (!confirm('Permanently delete this user account?')) return;
            appState.staff_users.splice(idx, 1);
            const res = await saveState();
            if (res) {
                renderSuperAdminUsersTable();
            }
        }

        function switchView(viewType) {
            const tableView = document.getElementById('tableViewSection');
            const calView = document.getElementById('calendarViewSection');
            const btnTable = document.getElementById('btnTableView');
            const btnCal = document.getElementById('btnCalendarView');

            if (viewType === 'table') {
                tableView.style.display = 'block';
                calView.style.display = 'none';
                btnTable.className = 'btn btn-primary fw-bold';
                btnCal.className = 'btn btn-outline-primary fw-bold';
            } else {
                tableView.style.display = 'none';
                calView.style.display = 'block';
                btnTable.className = 'btn btn-outline-primary fw-bold';
                btnCal.className = 'btn btn-primary fw-bold';
                renderCalendar();
            }
        }

        function changeMonth(direction) {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
            renderCalendar();
        }

        function renderCalendar() {
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            document.getElementById('calendarMonthTitle').textContent = \`\${monthNames[month]} \${year}\`;

            const grid = document.getElementById('calendarDaysGrid');
            grid.innerHTML = '';

            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const prevTotalDays = new Date(year, month, 0).getDate();
            const effectiveBldgs = getEffectiveBuildings();

            for (let i = firstDayIndex; i > 0; i--) {
                const dayNum = prevTotalDays - i + 1;
                grid.innerHTML += \`<div class="calendar-cell other-month"><div class="fw-bold mb-1">\${dayNum}</div></div>\`;
            }

            for (let day = 1; day <= totalDays; day++) {
                const formattedMonth = String(month + 1).padStart(2, '0');
                const formattedDay = String(day).padStart(2, '0');
                const dateStr = \`\${year}-\${formattedMonth}-\${formattedDay}\`;

                let cellHtml = \`<div class="calendar-cell"><div class="fw-bold mb-1 text-dark">\${day}</div>\`;
                
                const bookingsOnDay = (appState.bookings || []).filter(b => {
                    if (userRole === 'superadmin') return b.date === dateStr;
                    return b.camp === staffCamp && effectiveBldgs.includes(String(b.building)) && b.date === dateStr;
                });

                bookingsOnDay.forEach(b => {
                    const globalIdx = (appState.bookings || []).findIndex(item => item.confirmationCode === b.confirmationCode);
                    cellHtml += \`<span class="booking-badge bg-primary text-white" onclick="openBookingActionModal(\${globalIdx})" title="\${b.time} - \${b.firstName} \${b.lastName} (Bldg \${b.building})">\${b.time} Bldg \${b.building} (\${b.firstName})</span>\`;
                });

                cellHtml += \`</div>\`;
                grid.innerHTML += cellHtml;
            }

            const totalCellsSoFar = firstDayIndex + totalDays;
            const remainingCells = (totalCellsSoFar % 7 === 0) ? 0 : 7 - (totalCellsSoFar % 7);
            for (let i = 1; i <= remainingCells; i++) {
                grid.innerHTML += \`<div class="calendar-cell other-month"><div class="fw-bold mb-1">\${i}</div></div>\`;
            }
        }

        function renderCampBuildings() {
            const container = document.getElementById('campBuildingsList');
            if (!appState.camp_buildings || !appState.camp_buildings[staffCamp]) {
                container.innerHTML = 'Current Buildings: None';
                return;
            }
            const bldgs = appState.camp_buildings[staffCamp];
            if (bldgs.length === 0) {
                container.innerHTML = 'Current Buildings: None';
                return;
            }
            let html = '<strong>Registered Buildings:</strong> ';
            bldgs.forEach(b => {
                html += \`<span class="badge bg-light text-dark border me-1 mb-1">Bldg \${b} <a href="javascript:void(0)" class="text-danger ms-1 text-decoration-none" onclick="campAdminDeleteBuilding('\${b}')">&times;</a></span>\`;
            });
            container.innerHTML = html;
        }

        async function campAdminDeleteBuilding(bldg) {
            if (!confirm(\`Delete building \${bldg} from \${staffCamp}?\`)) return;
            if (appState.camp_buildings && appState.camp_buildings[staffCamp]) {
                appState.camp_buildings[staffCamp] = appState.camp_buildings[staffCamp].filter(b => b !== bldg);
            }
            const res = await saveState();
            if (res) {
                renderCampBuildings();
                renderCaBuildingCheckboxes();
            }
        }

        function renderCampManagers() {
            const tbody = document.getElementById('campManagersTableBody');
            if (!tbody) return;
            const managers = (appState.staff_users || []).filter(u => u.camp === staffCamp && u.role === 'staff');
            tbody.innerHTML = managers.length === 0 ? \`<tr><td colspan="3" class="text-muted text-center">No managers found for this camp.</td></tr>\` : '';
            
            managers.forEach((m) => {
                const globalIdx = appState.staff_users.findIndex(u => u.username === m.username);
                const bldgs = m.buildings ? m.buildings.join(', ') : 'None';
                tbody.innerHTML += \`
                    <tr>
                        <td class="fw-bold">\${m.username}</td>
                        <td>Bldg \${bldgs}</td>
                        <td class="text-end">
                            <button class="btn btn-outline-warning btn-sm py-0 px-1 me-1" onclick="campAdminResetPassword(\${globalIdx})" title="Reset Password"><i class="bi bi-key"></i></button>
                            <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="campAdminDeleteManager(\${globalIdx})" title="Delete"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>
                \`;
            });
        }

        async function campAdminResetPassword(idx) {
            const newPass = prompt("Enter temporary password for this manager:");
            if (!newPass) return;
            appState.staff_users[idx].password = newPass;
            const res = await saveState();
            if (res) {
                alert('Password reset successfully!');
                renderCampManagers();
            }
        }

        async function campAdminDeleteManager(idx) {
            if (!confirm('Are you sure you want to delete this manager?')) return;
            appState.staff_users.splice(idx, 1);
            const res = await saveState();
            if (res) {
                renderCampManagers();
            }
        }

        function renderCaBuildingCheckboxes() {
            const container = document.getElementById('caBuildingCheckboxes');
            container.innerHTML = '';
            if (!appState.camp_buildings || !appState.camp_buildings[staffCamp] || appState.camp_buildings[staffCamp].length === 0) {
                container.innerHTML = '<span class="text-muted">No buildings available.</span>';
                return;
            }
            appState.camp_buildings[staffCamp].forEach(b => {
                container.innerHTML += \`
                    <div class="form-check">
                        <input class="form-check-input ca-bldg-chk" type="checkbox" value="\${b}" id="ca_chk_\${b}">
                        <label class="form-check-label" for="ca_chk_\${b}">Bldg \${b}</label>
                    </div>
                \`;
            });
        }

        async function addBuildingToCamp() {
            const input = document.getElementById('newBuildingInput');
            const bldg = input.value.trim();
            if (!bldg) return;

            if (!appState.camp_buildings) appState.camp_buildings = {};
            if (!appState.camp_buildings[staffCamp]) appState.camp_buildings[staffCamp] = [];

            if (appState.camp_buildings[staffCamp].includes(bldg)) {
                alert('This building already exists for this camp.');
                return;
            }

            appState.camp_buildings[staffCamp].push(bldg);
            input.value = '';

            const res = await saveState();
            if (res) {
                alert('Building added successfully!');
                renderCampBuildings();
                renderCaBuildingCheckboxes();
            }
        }

        async function campAdminCreateManager(e) {
            e.preventDefault();
            const username = document.getElementById('caMgrUsername').value.trim();
            const password = document.getElementById('caMgrPassword').value.trim();
            const email = document.getElementById('caMgrEmail').value.trim();
            const checkboxes = document.querySelectorAll('.ca-bldg-chk:checked');
            const selectedBldgs = Array.from(checkboxes).map(chk => chk.value);

            if (selectedBldgs.length === 0) {
                alert('Please select at least one building.');
                return;
            }

            if (!appState.staff_users) appState.staff_users = [];

            const newMgr = {
                username: username,
                password: password,
                recovery_email: email,
                role: 'staff',
                camp: staffCamp,
                buildings: selectedBldgs
            };

            appState.staff_users.push(newMgr);
            const res = await saveState();
            if (res) {
                alert('UH Building Manager created successfully!');
                document.getElementById('caMgrUsername').value = '';
                document.getElementById('caMgrPassword').value = '';
                document.getElementById('caMgrEmail').value = '';
                renderCaBuildingCheckboxes();
                renderCampManagers();
            }
        }

        function renderStaffAppointments() {
            const tbody = document.getElementById('staffAppointmentsTable');
            tbody.innerHTML = '';

            if (!appState.bookings || appState.bookings.length === 0) {
                tbody.innerHTML = \`<tr><td colspan="7" class="text-center text-muted py-4">No appointments found in the system.</td></tr>\`;
                return;
            }

            const effectiveBldgs = getEffectiveBuildings();
            const filtered = (appState.bookings || []).filter(b => {
                if (userRole === 'superadmin') return true;
                return b.camp === staffCamp && effectiveBldgs.includes(String(b.building));
            });

            if (filtered.length === 0) {
                tbody.innerHTML = \`<tr><td colspan="7" class="text-center text-muted py-4">No appointments found.</td></tr>\`;
                return;
            }

            filtered.forEach(b => {
                const globalIdx = appState.bookings.findIndex(item => item.confirmationCode === b.confirmationCode);
                tbody.innerHTML += \`
                    <tr>
                        <td><span class="fw-bold text-primary">\${b.confirmationCode}</span></td>
                        <td>\${b.firstName} \${b.lastName}<br><small class="text-muted">\${b.email || ''}</small></td>
                        <td>\${b.branch}</td>
                        <td>Bldg \${b.building} (\${b.camp})</td>
                        <td>\${b.date} @ \${b.time}</td>
                        <td>\${b.purpose}</td>
                        <td class="text-end">
                            <div class="d-flex flex-column gap-2">
                                <input type="text" class="form-control form-control-sm" placeholder="Add manager notes..." value="\${b.staffNotes || ''}" onchange="updateNotes('\${b.confirmationCode}', this.value)">
                                <button class="btn btn-outline-primary btn-sm fw-bold" onclick="openBookingActionModal(\${globalIdx})"><i class="bi bi-gear me-1"></i> Full Details</button>
                            </div>
                        </td>
                    </tr>
                \`;
            });
        }

        async function updateNotes(code, notes) {
            const target = appState.bookings.find(b => b.confirmationCode === code);
            if (target) {
                target.staffNotes = notes;
                await saveState();
            }
        }

        function openBookingActionModal(index) {
            activeBookingIndex = index;
            const b = appState.bookings[index];
            document.getElementById('modalBookingIndex').value = index;
            document.getElementById('rescheduleDate').value = b.date || '';
            document.getElementById('rescheduleTime').value = b.time || '';

            document.getElementById('modalBookingDetails').innerHTML = \`
                <div class="row">
                    <div class="col-6 mb-1"><strong>Confirmation Code:</strong> <span class="text-primary">\${b.confirmationCode}</span></div>
                    <div class="col-12 mb-1"><strong>Guest:</strong> \${b.firstName} \${b.lastName} (\${b.branch})</div>
                    <div class="col-12 mb-1"><strong>Email:</strong> \${b.email || 'N/A'}</div>
                    <div class="col-12 mb-1"><strong>Location:</strong> \${b.camp} - Bldg \${b.building}</div>
                    <div class="col-12 mb-0"><strong>Purpose:</strong> \${b.purpose}</div>
                </div>
            \`;
            const modal = new bootstrap.Modal(document.getElementById('bookingActionModal'));
            modal.show();
        }

        async function rescheduleBookingFromModal() {
            if (activeBookingIndex === null) return;
            const newDate = document.getElementById('rescheduleDate').value;
            const newTime = document.getElementById('rescheduleTime').value;
            if (!newDate || !newTime) return alert('Please select both a new date and time.');
            
            appState.bookings[activeBookingIndex].date = newDate;
            appState.bookings[activeBookingIndex].time = newTime;
            await saveState();
            bootstrap.Modal.getInstance(document.getElementById('bookingActionModal')).hide();
            renderStaffAppointments();
            renderCalendar();
        }

        async function deleteBookingFromModal() {
            if (activeBookingIndex === null) return;
            if (!confirm('Permanently delete this booking confirmation?')) return;
            appState.bookings.splice(activeBookingIndex, 1);
            await saveState();
            bootstrap.Modal.getInstance(document.getElementById('bookingActionModal')).hide();
            renderStaffAppointments();
            renderCalendar();
        }

        async function saveState() {
            try {
                const res = await fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appState)
                });
                return res.ok;
            } catch (err) {
                console.error("Error saving state:", err);
                return false;
            }
        }
    </script>
</body>
</html>`;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let activeSessions = {};

app.use((req, res, next) => {
    const cookieHeader = req.headers['cookie'] || '';
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match && activeSessions[match[1]]) {
        req.user = activeSessions[match[1]];
    }
    next();
});

// In-Memory Database State with default superadmin
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
            camp: "Camp Hansen",
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
    res.status(400).json({ success: false, error: "Invalid payload" });
});

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
        res.status(500).json({ status: 'error' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = (appState.staff_users || []).find(u => u.username === username && u.password === password);
    if (user) {
        const token = Math.random().toString(36).substring(2);
        activeSessions[token] = user;
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly`);
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/session', (req, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(401).json({});
    }
});

// Route Handlers (Serving from memory variables to prevent Render read-only disk crashes)
app.get('/', (req, res) => {
    res.send(indexHtml);
});

app.get('/login', (req, res) => {
    res.send(loginHtml);
});

app.get('/dashboard', (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.send(staffHtml);
});

app.get('/logout', (req, res) => {
    const cookieHeader = req.headers['cookie'] || '';
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match && activeSessions[match[1]]) {
        delete activeSessions[match[1]];
    }
    res.setHeader('Set-Cookie', 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing server running on port ${PORT}`);
});
// ==========================================
// 1. In-Memory Stores for Bookings & Rules
// ==========================================
let availabilityRules = [];
let bookings = [];

// ==========================================
// 2. Permission Verification Middleware
// ==========================================
function verifyAvailabilityPermission(req, res, next) {
    const user = req.session && req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Superadmins have global system access
    if (user.role === 'Superadmin') {
        return next();
    }

    const targetCampId = req.body.campId || req.query.campId;
    const targetBuildingId = req.body.buildingId || req.query.buildingId;

    if (user.role === 'Camp Admin') {
        if (targetCampId && String(targetCampId) === String(user.assignedCampId)) {
            return next();
        }
        return res.status(403).json({ error: "Forbidden: Outside camp jurisdiction" });
    }

    if (user.role === 'UH Building Manager') {
        if (targetBuildingId && user.assignedBuildingIds && user.assignedBuildingIds.map(String).includes(String(targetBuildingId))) {
            return next();
        }
        return res.status(403).json({ error: "Forbidden: Outside building jurisdiction" });
    }

    return res.status(403).json({ error: "Forbidden: Invalid role permissions" });
}

// ==========================================
// 3. Availability Management Endpoints
// ==========================================

// GET availability rules with optional filters
app.get('/api/availability', (req, res) => {
    const { campId, buildingId, userId } = req.query;
    let results = availabilityRules.filter(r => r.isActive);

    if (campId) results = results.filter(r => String(r.campId) === String(campId));
    if (buildingId) results = results.filter(r => String(r.buildingId) === String(buildingId));
    if (userId) results = results.filter(r => String(r.userId) === String(userId));

    res.json(results);
});

// POST to set or update availability rules (Restricted to authorized roles)
app.post('/api/availability', verifyAvailabilityPermission, (req, res) => {
    const { campId, buildingId, dayOfWeek, specificDate, startTime, endTime, slotDurationMinutes } = req.body;
    const user = req.session.user;

    const newRule = {
        id: Date.now(),
        userId: user.id,
        role: user.role,
        campId: campId ? String(campId) : null,
        buildingId: buildingId ? String(buildingId) : null,
        dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? parseInt(dayOfWeek) : null,
        specificDate: specificDate || null,
        startTime: startTime || "08:00",
        endTime: endTime || "16:00",
        slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes, 10) : 30,
        isActive: true
    };

    availabilityRules.push(newRule);
    res.status(201).json(newRule);
});

// DELETE to remove an availability rule
app.delete('/api/availability/:id', (req, res) => {
    const ruleId = parseInt(req.params.id, 10);
    const user = req.session && req.session.user;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const ruleIndex = availabilityRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
        return res.status(404).json({ error: "Rule not found" });
    }

    const rule = availabilityRules[ruleIndex];

    if (user.role !== 'Superadmin') {
        if (user.role === 'Camp Admin' && String(rule.campId) !== String(user.assignedCampId)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (user.role === 'UH Building Manager' && (!user.assignedBuildingIds || !user.assignedBuildingIds.map(String).includes(String(rule.buildingId)))) {
            return res.status(403).json({ error: "Forbidden" });
        }
    }

    availabilityRules.splice(ruleIndex, 1);
    res.json({ message: "Availability rule deleted successfully" });
});

// ==========================================
// 4. Booking Page Synchronization Endpoints
// ==========================================

// Helper: Generate granular intervals between configured start and end times
function generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    let [startHour, startMin] = startTime.split(':').map(Number);
    let [endHour, endMin] = endTime.split(':').map(Number);

    let currentTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    while (currentTotalMinutes + durationMinutes <= endTotalMinutes) {
        let h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        let m = (currentTotalMinutes % 60).toString().padStart(2, '0');
        let slotStart = `${h}:${m}`;

        currentTotalMinutes += durationMinutes;
        let eh = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        let em = (currentTotalMinutes % 60).toString().padStart(2, '0');
        let slotEnd = `${eh}:${em}`;

        slots.push({ startTime: slotStart, endTime: slotEnd });
    }
    return slots;
}

// GET available slots synchronized for the booking form based on camp and building filters
app.get('/api/booking-slots', (req, res) => {
    const { campId, buildingId, date } = req.query;

    if (!campId || !buildingId || !date) {
        return res.status(400).json({ error: "Missing required query parameters: campId, buildingId, date" });
    }

    const targetDateObj = new Date(date);
    const dayOfWeek = targetDateObj.getDay(); // 0 = Sunday, 6 = Saturday

    // 1. Check for a specific date override first
    let matchingRule = availabilityRules.find(r => 
        r.isActive && 
        String(r.campId) === String(campId) && 
        String(r.buildingId) === String(buildingId) && 
        r.specificDate === date
    );

    // 2. Fall back to recurring weekly schedule if no date override exists
    if (!matchingRule) {
        matchingRule = availabilityRules.find(r => 
            r.isActive && 
            String(r.campId) === String(campId) && 
            String(r.buildingId) === String(buildingId) && 
            r.dayOfWeek === dayOfWeek && 
            !r.specificDate
        );
    }

    if (!matchingRule) {
        return res.json({ availableSlots: [], message: "No active availability configured for this building and date." });
    }

    // Generate theoretical slots from rule
    let slots = generateTimeSlots(matchingRule.startTime, matchingRule.endTime, matchingRule.slotDurationMinutes);

    // Filter out already booked slots for that building and date
    const bookedSlotsForDate = bookings.filter(b => 
        String(b.campId) === String(campId) && 
        String(b.buildingId) === String(buildingId) && 
        b.date === date && 
        b.status !== 'Cancelled'
    );

    const availableSlots = slots.filter(slot => {
        return !bookedSlotsForDate.some(b => b.startTime === slot.startTime);
    });

    res.json({
        ruleId: matchingRule.id,
        campId,
        buildingId,
        date,
        availableSlots
    });
});

// POST to submit a booking (validates live against manager availability rules)
app.post('/api/bookings', (req, res) => {
    const { campId, buildingId, date, startTime, residentName, contactInfo } = req.body;

    if (!campId || !buildingId || !date || !startTime || !residentName) {
        return res.status(400).json({ error: "Missing required booking fields" });
    }

    const targetDateObj = new Date(date);
    const dayOfWeek = targetDateObj.getDay();

    let matchingRule = availabilityRules.find(r => 
        r.isActive && 
        String(r.campId) === String(campId) && 
        String(r.buildingId) === String(buildingId) && 
        r.specificDate === date
    );

    if (!matchingRule) {
        matchingRule = availabilityRules.find(r => 
            r.isActive && 
            String(r.campId) === String(campId) && 
            String(r.buildingId) === String(buildingId) && 
            r.dayOfWeek === dayOfWeek && 
            !r.specificDate
        );
    }

    if (!matchingRule) {
        return res.status(400).json({ error: "Selected time is outside active operating hours or unavailable." });
    }

    const slots = generateTimeSlots(matchingRule.startTime, matchingRule.endTime, matchingRule.slotDurationMinutes);
    const selectedSlot = slots.find(s => s.startTime === startTime);

    if (!selectedSlot) {
        return res.status(400).json({ error: "Invalid time slot selected for this building." });
    }

    // Prevent double booking
    const existingBooking = bookings.find(b => 
        String(b.campId) === String(campId) && 
        String(b.buildingId) === String(buildingId) && 
        b.date === date && 
        b.startTime === startTime && 
        b.status !== 'Cancelled'
    );

    if (existingBooking) {
        return res.status(409).json({ error: "This time slot has already been booked." });
    }

    const newBooking = {
        id: Date.now(),
        campId: String(campId),
        buildingId: String(buildingId),
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        residentName,
        contactInfo: contactInfo || "",
        status: 'Confirmed',
        createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    res.status(201).json({ message: "Booking confirmed successfully", booking: newBooking });
});