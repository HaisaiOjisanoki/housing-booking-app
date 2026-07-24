<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing Dashboard</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .modal-body {
            max-height: 70vh;
            overflow-y: auto;
        }
        .action-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .message-item {
            transition: background-color 0.2s;
        }
        .message-item.unread {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .app-section {
            display: none;
        }
        .app-section.active {
            display: block;
        }
    </style>
</head>
<body onload="initApp()">

    <!-- Navigation Bar with Mobile Toggle -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="#" onclick="switchSection('dashboard')">Housing Dashboard</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <a class="nav-link" href="#" id="nav-dashboard" onclick="switchSection('dashboard')">Dashboard</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" id="nav-public-booking" onclick="switchSection('publicBooking')">Public Booking</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" id="nav-manage-buildings" onclick="switchSection('manageBuildings')">Manage Buildings (Admin)</a>
                    </li>
                </ul>
                <!-- Search Bar, Notification Inbox Button, and Admin Controls -->
                <div class="d-flex align-items-center flex-wrap gap-2 mt-2 mt-lg-0">
                    <input class="form-control form-control-sm" type="search" placeholder="Search bookings..." aria-label="Search">
                    <!-- Notification Inbox Button -->
                    <button class="btn btn-outline-light btn-sm position-relative" type="button" data-bs-toggle="modal" data-bs-target="#notificationModal" aria-label="Inbox" onclick="renderInbox()">
                        📥 Inbox
                        <span id="unreadBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            0
                        </span>
                    </button>
                    <a class="btn btn-outline-warning btn-sm" href="#" onclick="switchSection('manageBuildings')">Admin Portal</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- MAIN DASHBOARD SECTION -->
    <div id="section-dashboard" class="container my-4 app-section active">
        <h2 class="mb-4">Housing Management Overview</h2>
        
        <!-- Action Button Toolbar -->
        <div class="action-toolbar mb-4">
            <button class="btn btn-primary" onclick="switchSection('publicBooking')">New Booking</button>
            <button class="btn btn-secondary" onclick="switchSection('manageBuildings')">Manage Buildings & Export</button>
            <button class="btn btn-outline-secondary" onclick="resetDefaultData()">Reset Sample Data</button>
        </div>

        <!-- Responsive Grid Layout -->
        <div class="row g-3">
            <div class="col-12 col-md-4">
                <div class="card p-3 shadow-sm">
                    <h5>Active Bookings</h5>
                    <p class="text-muted mb-0">View and manage booking updates[cite: 1].</p>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="card p-3 shadow-sm">
                    <h5>Room Status</h5>
                    <p class="text-muted mb-0">Check current barracks occupancy.</p>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="card p-3 shadow-sm">
                    <h5>System Logs</h5>
                    <p class="text-muted mb-0">Review recent administrative changes.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- PUBLIC BOOKING PAGE SECTION -->
    <div id="section-publicBooking" class="container my-4 app-section">
        <h2 class="mb-4">Public Room Booking</h2>
        <div class="card p-4 shadow-sm col-12 col-lg-8 mx-auto">
            <form id="publicBookingForm" onsubmit="submitBooking(event)">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="firstName" class="form-label">First Name</label>
                        <input type="text" class="form-control" id="firstName" required placeholder="First name">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="lastName" class="form-label">Last Name</label>
                        <input type="text" class="form-control" id="lastName" required placeholder="Last name">
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="branchOfService" class="form-label">Branch of Service</label>
                        <select class="form-select" id="branchOfService" required>
                            <option value="">-- Select Branch --</option>
                            <option value="Army">Army</option>
                            <option value="Navy">Navy</option>
                            <option value="Air Force">Air Force</option>
                            <option value="Marine Corps">Marine Corps</option>
                            <option value="Coast Guard">Coast Guard</option>
                            <option value="Space Force">Space Force</option>
                            <option value="Civilian / Other">Civilian / Other</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="email" class="form-label">Email Address</label>
                        <input type="email" class="form-control" id="email" required placeholder="user@mil / email.com">
                    </div>
                </div>
                <div class="mb-3">
                    <label for="publicBuildingSelect" class="form-label">Building Number</label>
                    <select class="form-select" id="publicBuildingSelect" onchange="updateAvailableTimes()" required>
                        <option value="">-- Choose a Building --</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="bookingDate" class="form-label">Date</label>
                        <input type="date" class="form-control" id="bookingDate" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="publicTimeSelect" class="form-label">Time (Restricted to Admin Hours)</label>
                        <select class="form-select" id="publicTimeSelect" required disabled>
                            <option value="">-- Select building first --</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="purposeOfVisit" class="form-label">Purpose of Visit</label>
                    <input type="text" class="form-control" id="purposeOfVisit" required placeholder="e.g. In-processing, Room Inspection, Maintenance">
                </div>
                <button type="submit" class="btn btn-primary w-100">Confirm Booking</button>
            </form>
        </div>
    </div>

    <!-- MANAGE BUILDINGS & EXPORT SECTION (ADMIN) -->
    <div id="section-manageBuildings" class="container my-4 app-section">
        <h2 class="mb-4">Admin Portal: Buildings & Data Export</h2>
        
        <!-- Admin Export Controls Toolbar -->
        <div class="card p-3 shadow-sm mb-4 bg-light">
            <h5 class="mb-3">📊 Booking Data Export (Excel / CSV Format)</h5>
            <div class="row g-3 align-items-end">
                <div class="col-12 col-md-4">
                    <button class="btn btn-success w-100" onclick="exportAllBookings()">Export All Bookings (CSV)</button>
                </div>
                <div class="col-12 col-md-5">
                    <label for="exportUserSelect" class="form-label form-label-sm mb-1">Filter by User (Email / Name):</label>
                    <select class="form-select form-select-sm" id="exportUserSelect">
                        <option value="">-- Select a User --</option>
                    </select>
                </div>
                <div class="col-12 col-md-3">
                    <button class="btn btn-outline-success w-100" onclick="exportSelectedUserBookings()">Export Selected User</button>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <!-- Add / Edit Building Form -->
            <div class="col-12 col-lg-4">
                <div class="card p-3 shadow-sm">
                    <h5 id="formTitle" class="mb-3">Add New Building</h5>
                    <form id="buildingForm" onsubmit="saveBuilding(event)">
                        <input type="hidden" id="buildingIndex" value="">
                        <div class="mb-3">
                            <label for="buildingNameInput" class="form-label">Building Number/Name</label>
                            <input type="text" class="form-control" id="buildingNameInput" required placeholder="e.g. Building 4">
                        </div>
                        <div class="mb-3">
                            <label for="startTimeInput" class="form-label">Available Start Time</label>
                            <input type="time" class="form-control" id="startTimeInput" value="08:00" required>
                        </div>
                        <div class="mb-3">
                            <label for="endTimeInput" class="form-label">Available End Time</label>
                            <input type="time" class="form-control" id="endTimeInput" value="17:00" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 mb-2">Save Building Rules</button>
                        <button type="button" class="btn btn-outline-secondary w-100" onclick="resetBuildingForm()" id="cancelEditBtn" style="display:none;">Cancel Edit</button>
                    </form>
                </div>
            </div>
            <!-- Buildings List Table -->
            <div class="col-12 col-lg-8">
                <div class="card p-3 shadow-sm">
                    <h5 class="mb-3">Configured Buildings & Operating Hours</h5>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead>
                                <tr>
                                    <th>Building Number</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="buildingsTableBody">
                                <!-- Populated Dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Inbox Modal -->
    <div class="modal fade" id="notificationModal" tabindex="-1" aria-labelledby="notificationModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="notificationModalLabel">Booking Notification Inbox</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Inbox Filters -->
                    <div class="btn-group mb-3 w-100" role="group">
                        <button type="button" class="btn btn-outline-secondary active" onclick="setFilter('all')">All</button>
                        <button type="button" class="btn btn-outline-secondary" onclick="setFilter('unread')">Unread</button>
                        <button type="button" class="btn btn-outline-secondary" onclick="setFilter('starred')">Starred</button>
                    </div>

                    <!-- Message List Container -->
                    <div id="messageList" class="list-group">
                        <!-- Populated Dynamically via JavaScript -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="markAllAsRead()">Mark All as Read</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS Bundle & Application Script -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initial Default Data
        const defaultBuildings = [
            { id: 1, name: "Building 1", startTime: "08:00", endTime: "12:00" },
            { id: 2, name: "Building 2", startTime: "13:00", endTime: "17:00" },
            { id: 3, name: "Building 4", startTime: "09:00", endTime: "16:00" }
        ];

        const defaultBookings = [
            { branchOfService: "Army", lastName: "Smith", firstName: "John", email: "john.smith@mil.ar", buildingNumber: "Building 4", date: "2026-08-01", time: "10:00", purpose: "In-processing" },
            { branchOfService: "Navy", lastName: "Johnson", firstName: "Sarah", email: "sarah.j@mil.navy", buildingNumber: "Building 1", date: "2026-08-02", time: "09:00", purpose: "Room Inspection" },
            { branchOfService: "Air Force", lastName: "Davis", firstName: "Michael", email: "m.davis@mil.af", buildingNumber: "Building 2", date: "2026-08-03", time: "14:00", purpose: "Maintenance Request" }
        ];

        const defaultMessages = [
            { id: 1, text: "Room inspection scheduled for Building 4.", time: "2026-07-24 10:30", read: false, starred: false },
            { id: 2, text: "Maintenance request approved for plumbing fix.", time: "2026-07-23 14:15", read: false, starred: true },
            { id: 3, text: "Check-out clearance verified and processed.", time: "2026-07-22 09:00", read: true, starred: false }
        ];

        let currentFilter = 'all';

        function initApp() {
            if (!localStorage.getItem('housing_buildings')) {
                localStorage.setItem('housing_buildings', JSON.stringify(defaultBuildings));
            }
            if (!localStorage.getItem('housing_bookings_list')) {
                localStorage.setItem('housing_bookings_list', JSON.stringify(defaultBookings));
            }
            if (!localStorage.getItem('housing_notifications')) {
                localStorage.setItem('housing_notifications', JSON.stringify(defaultMessages));
            }
            updateUnreadBadge();
            renderBuildingsTable();
            populatePublicBuildingDropdown();
            populateExportUserDropdown();
        }

        // Section Switching Logic
        function switchSection(sectionId) {
            document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('section-' + sectionId).classList.add('active');
            
            document.querySelectorAll('.navbar-nav .nav-link').forEach(link => link.classList.remove('active'));
            if(document.getElementById('nav-' + sectionId)) {
                document.getElementById('nav-' + sectionId).classList.add('active');
            }

            if (sectionId === 'publicBooking') {
                populatePublicBuildingDropdown();
            } else if (sectionId === 'manageBuildings') {
                renderBuildingsTable();
                populateExportUserDropdown();
            }
        }

        // --- ADMIN: MANAGE BUILDINGS LOGIC ---
        function getBuildings() {
            return JSON.parse(localStorage.getItem('housing_buildings')) || [];
        }

        function saveBuilding(event) {
            event.preventDefault();
            const index = document.getElementById('buildingIndex').value;
            const name = document.getElementById('buildingNameInput').value.trim();
            const startTime = document.getElementById('startTimeInput').value;
            const endTime = document.getElementById('endTimeInput').value;

            if (startTime >= endTime) {
                alert("Start time must be earlier than end time.");
                return;
            }

            let buildings = getBuildings();

            if (index === "") {
                const newId = buildings.length > 0 ? Math.max(...buildings.map(b => b.id)) + 1 : 1;
                buildings.push({ id: newId, name, startTime, endTime });
            } else {
                buildings[index] = { id: buildings[index].id, name, startTime, endTime };
            }

            localStorage.setItem('housing_buildings', JSON.stringify(buildings));
            resetBuildingForm();
            renderBuildingsTable();
            alert("Building operating hours successfully saved!");
        }

        function renderBuildingsTable() {
            const buildings = getBuildings();
            const tbody = document.getElementById('buildingsTableBody');
            tbody.innerHTML = '';

            if (buildings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No buildings configured.</td></tr>`;
                return;
            }

            buildings.forEach((b, idx) => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${b.name}</strong></td>
                        <td>${b.startTime}</td>
                        <td>${b.endTime}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editBuilding(${idx})">Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteBuilding(${b.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }

        function editBuilding(index) {
            const buildings = getBuildings();
            const b = buildings[index];
            document.getElementById('buildingIndex').value = index;
            document.getElementById('buildingNameInput').value = b.name;
            document.getElementById('startTimeInput').value = b.startTime;
            document.getElementById('endTimeInput').value = b.endTime;
            document.getElementById('formTitle').innerText = "Edit Building Hours";
            document.getElementById('cancelEditBtn').style.display = 'block';
        }

        function resetBuildingForm() {
            document.getElementById('buildingForm').reset();
            document.getElementById('buildingIndex').value = "";
            document.getElementById('startTimeInput').value = "08:00";
            document.getElementById('endTimeInput').value = "17:00";
            document.getElementById('formTitle').innerText = "Add New Building";
            document.getElementById('cancelEditBtn').style.display = 'none';
        }

        function deleteBuilding(id) {
            let buildings = getBuildings();
            buildings = buildings.filter(b => b.id !== id);
            localStorage.setItem('housing_buildings', JSON.stringify(buildings));
            renderBuildingsTable();
        }

        // --- PUBLIC BOOKING LOGIC ---
        function populatePublicBuildingDropdown() {
            const buildings = getBuildings();
            const select = document.getElementById('publicBuildingSelect');
            select.innerHTML = '<option value="">-- Choose a Building --</option>';
            
            buildings.forEach(b => {
                select.innerHTML += `<option value="${b.name}">${b.name} (${b.startTime} - ${b.endTime})</option>`;
            });
            document.getElementById('publicTimeSelect').innerHTML = '<option value="">-- Select a building first --</option>';
            document.getElementById('publicTimeSelect').disabled = true;
        }

        function updateAvailableTimes() {
            const buildingName = document.getElementById('publicBuildingSelect').value;
            const timeSelect = document.getElementById('publicTimeSelect');
            
            if (!buildingName) {
                timeSelect.innerHTML = '<option value="">-- Select a building first --</option>';
                timeSelect.disabled = true;
                return;
            }

            const buildings = getBuildings();
            const selectedBuilding = buildings.find(b => b.name === buildingName);

            if (!selectedBuilding) return;

            timeSelect.innerHTML = '<option value="">-- Select an available time slot --</option>';
            timeSelect.disabled = false;

            let currentMinutes = timeToMinutes(selectedBuilding.startTime);
            const endMinutes = timeToMinutes(selectedBuilding.endTime);
            const interval = 60; // 60-minute intervals

            while (currentMinutes <= endMinutes) {
                const timeString = minutesToTime(currentMinutes);
                timeSelect.innerHTML += `<option value="${timeString}">${timeString}</option>`;
                currentMinutes += interval;
            }
        }

        function timeToMinutes(timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }

        function minutesToTime(totalMinutes) {
            const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
            const minutes = (totalMinutes % 60).toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        function submitBooking(event) {
            event.preventDefault();
            const branchOfService = document.getElementById('branchOfService').value;
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const buildingNumber = document.getElementById('publicBuildingSelect').value;
            const date = document.getElementById('bookingDate').value;
            const time = document.getElementById('publicTimeSelect').value;
            const purpose = document.getElementById('purposeOfVisit').value.trim();

            const newBooking = {
                branchOfService,
                lastName,
                firstName,
                email,
                buildingNumber,
                date,
                time,
                purposeOfVisit: purpose
            };

            // Save to bookings list
            let bookingsList = JSON.parse(localStorage.getItem('housing_bookings_list')) || [];
            bookingsList.push(newBooking);
            localStorage.setItem('housing_bookings_list', JSON.stringify(bookingsList));

            // Push notification into inbox
            let messages = JSON.parse(localStorage.getItem('housing_notifications')) || [];
            const newMsg = {
                id: Date.now(),
                text: `New Booking: ${firstName} ${lastName} (${branchOfService}) for ${buildingNumber} on ${date} at ${time}.`,
                time: new Date().toISOString().slice(0, 16).replace('T', ' '),
                read: false,
                starred: true
            };
            messages.unshift(newMsg);
            localStorage.setItem('housing_notifications', JSON.stringify(messages));
            updateUnreadBadge();

            alert(`Booking successfully confirmed for ${firstName} ${lastName} at ${buildingNumber}!`);
            document.getElementById('publicBookingForm').reset();
            document.getElementById('publicTimeSelect').disabled = true;
            document.getElementById('publicTimeSelect').innerHTML = '<option value="">-- Select a building first --</option>';
            switchSection('dashboard');
        }

        // --- EXPORT FUNCTIONALITY (CSV FOR EXCEL) ---
        function populateExportUserDropdown() {
            const bookings = JSON.parse(localStorage.getItem('housing_bookings_list')) || [];
            const select = document.getElementById('exportUserSelect');
            select.innerHTML = '<option value="">-- Select a User --</option>';
            
            // Get unique users by email
            const uniqueUsers = {};
            bookings.forEach(b => {
                uniqueUsers[b.email] = `${b.lastName}, ${b.firstName} (${b.email})`;
            });

            for (const [email, label] of Object.entries(uniqueUsers)) {
                select.innerHTML += `<option value="${email}">${label}</option>`;
            }
        }

        function downloadCSV(dataArray, filename) {
            if (dataArray.length === 0) {
                alert("No booking data available to export.");
                return;
            }

            // Define exact headers requested
            const headers = ["Branch of Service", "Last name", "First name", "Email", "Building number", "Date", "Time", "Purpose of Visit"];
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += headers.join(",") + "\r\n";

            dataArray.forEach(row => {
                const rowData = [
                    `"${row.branchOfService || ''}"`,
                    `"${row.lastName || ''}"`,
                    `"${row.firstName || ''}"`,
                    `"${row.email || ''}"`,
                    `"${row.buildingNumber || ''}"`,
                    `"${row.date || ''}"`,
                    `"${row.time || ''}"`,
                    `"${row.purposeOfVisit || ''}"`
                ];
                csvContent += rowData.join(",") + "\r\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function exportAllBookings() {
            const bookings = JSON.parse(localStorage.getItem('housing_bookings_list')) || [];
            downloadCSV(bookings, "all_housing_bookings.csv");
        }

        function exportSelectedUserBookings() {
            const selectedEmail = document.getElementById('exportUserSelect').value;
            if (!selectedEmail) {
                alert("Please select a user from the dropdown first.");
                return;
            }
            const bookings = JSON.parse(localStorage.getItem('housing_bookings_list')) || [];
            const userBookings = bookings.filter(b => b.email === selectedEmail);
            
            if (userBookings.length === 0) {
                alert("No bookings found for the selected user.");
                return;
            }
            downloadCSV(userBookings, `bookings_${selectedEmail.replace(/[@.]/g, '_')}.csv`);
        }

        // --- NOTIFICATION INBOX LOGIC ---
        function getMessages() {
            return JSON.parse(localStorage.getItem('housing_notifications')) || [];
        }

        function saveMessages(messages) {
            localStorage.setItem('housing_notifications', JSON.stringify(messages));
            updateUnreadBadge();
        }

        function updateUnreadBadge() {
            const messages = getMessages();
            const unreadCount = messages.filter(m => !m.read).length;
            const badge = document.getElementById('unreadBadge');
            badge.innerText = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }

        function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('.modal-body .btn-group button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.innerText.toLowerCase() === filter || (filter === 'all' && btn.innerText === 'All')) {
                    btn.classList.add('active');
                }
            });
            renderInbox();
        }

        function renderInbox() {
            const messages = getMessages();
            const listContainer = document.getElementById('messageList');
            listContainer.innerHTML = '';

            let filtered = messages;
            if (currentFilter === 'unread') {
                filtered = messages.filter(m => !m.read);
            } else if (currentFilter === 'starred') {
                filtered = messages.filter(m => m.starred);
            }

            if (filtered.length === 0) {
                listContainer.innerHTML = `<div class="text-center text-muted py-4">No messages found in this view.</div>`;
                return;
            }

            filtered.forEach(msg => {
                const item = document.createElement('div');
                item.className = `list-group-item list-group-item-action message-item d-flex justify-content-between align-items-center ${msg.read ? '' : 'unread'}`;
                
                item.innerHTML = `
                    <div class="ms-2 me-auto" style="cursor: pointer;" onclick="toggleRead(${msg.id})">
                        <div class="fw-normal">${msg.text}</div>
                        <small class="text-muted">${msg.time}</small>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn ${msg.starred ? 'btn-warning' : 'btn-outline-secondary'}" title="Star/Save" onclick="toggleStar(${msg.id})">
                            ${msg.starred ? '★' : '☆'}
                        </button>
                        <button type="button" class="btn ${msg.read ? 'btn-outline-secondary' : 'btn-outline-success'}" title="Toggle Read Status" onclick="toggleRead(${msg.id})">
                            ${msg.read ? 'Mark Unread' : 'Mark Read'}
                        </button>
                        <button type="button" class="btn btn-outline-danger" title="Delete" onclick="deleteMessage(${msg.id})">
                            🗑️
                        </button>
                    </div>
                `;
                listContainer.appendChild(item);
            });
            updateUnreadBadge();
        }

        function toggleRead(id) {
            let messages = getMessages();
            messages = messages.map(m => m.id === id ? { ...m, read: !m.read } : m);
            saveMessages(messages);
            renderInbox();
        }

        function toggleStar(id) {
            let messages = getMessages();
            messages = messages.map(m => m.id === id ? { ...m, starred: !m.starred } : m);
            saveMessages(messages);
            renderInbox();
        }

        function deleteMessage(id) {
            let messages = getMessages();
            messages = messages.filter(m => m.id !== id);
            saveMessages(messages);
            renderInbox();
        }

        function markAllAsRead() {
            let messages = getMessages();
            messages = messages.map(m => ({ ...m, read: true }));
            saveMessages(messages);
            renderInbox();
        }

        function resetDefaultData() {
            localStorage.setItem('housing_buildings', JSON.stringify(defaultBuildings));
            localStorage.setItem('housing_bookings_list', JSON.stringify(defaultBookings));
            localStorage.setItem('housing_notifications', JSON.stringify(defaultMessages));
            initApp();
            alert('Default sample buildings, bookings, and notifications restored.');
        }
    </script>
</body>
</html>