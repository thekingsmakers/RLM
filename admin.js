// Admin Portal Configuration
const CONFIG = {
    SECRET_KEY: 'redom-rlm-secure-key-2025',
    RLM_VERSION: '1.0.0',
    LICENSE_PREFIX: 'REDOM-RLM',
    SESSION_DURATION: 3600000, // 1 hour in milliseconds
    MAX_LICENSE_HISTORY: 100
};

// State Management
let state = {
    isAuthenticated: true, // Always authenticated
    sessionExpiry: null,
    licenses: [],
    darkMode: false,
    currentTab: 'dashboard'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeApp();
});

// Initialize application
function initializeApp() {
    console.log('Initializing app');
    
    // Load saved state
    loadState();
    
    // Initialize theme
    initTheme();
    
    // Initialize the UI immediately
    setupEventListeners();
    initializeTabNavigation();
    loadLicenseHistory();
    
    // Enable license generation by default
    enableLicenseGeneration();
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // License generation form - will be added dynamically
    document.addEventListener('submit', function(event) {
        if (event.target && event.target.id === 'licenseForm') {
            handleLicenseGeneration(event);
        }
    });
    
    // Duration select change - will be added dynamically
    document.addEventListener('change', function(event) {
        if (event.target && event.target.id === 'duration') {
            handleDurationChange(event);
        }
    });
    
    // Copy button
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'copyBtn') {
            copyToClipboard();
        }
    });
    
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });
}

// Tab Navigation Functions
function initializeTabNavigation() {
    console.log('Initializing tab navigation');
    
    // Create tab content containers if they don't exist
    const mainContent = document.querySelector('main');
    
    // Create tab content containers
    const tabContents = {
        dashboard: createDashboardContent(),
        licenses: createLicensesContent(),
        users: createUsersContent(),
        settings: createSettingsContent()
    };
    
    // Add tab content to main
    Object.keys(tabContents).forEach(tabId => {
        const content = tabContents[tabId];
        content.id = `${tabId}Content`;
        content.style.display = tabId === state.currentTab ? 'block' : 'none';
        mainContent.appendChild(content);
    });
    
    // Update active tab in sidebar
    updateActiveTab(state.currentTab);
}

function createDashboardContent() {
    const container = document.createElement('div');
    container.className = 'tab-content';
    
    // License Generator Card
    const licenseGeneratorCard = document.createElement('div');
    licenseGeneratorCard.className = 'card mb-4';
    licenseGeneratorCard.innerHTML = `
        <div class="card-header">
            <h5 class="card-title mb-0">Generate License</h5>
        </div>
        <div class="card-body">
            <form id="licenseForm">
                <div class="mb-3">
                    <label for="userEmail" class="form-label">User Email</label>
                    <input type="email" class="form-control" id="userEmail" required>
                </div>
                <div class="mb-3">
                    <label for="duration" class="form-label">License Duration</label>
                    <select class="form-select" id="duration" required>
                        <option value="1">1 Minute (Testing)</option>
                        <option value="43200">30 Days</option>
                        <option value="129600">90 Days</option>
                        <option value="259200">180 Days</option>
                        <option value="525600">365 Days</option>
                        <option value="custom">Custom Duration</option>
                    </select>
                </div>
                <div class="mb-3" id="customDurationGroup" style="display: none;">
                    <label for="customDuration" class="form-label">Custom Duration (minutes)</label>
                    <input type="number" class="form-control" id="customDuration" min="1" max="525600" value="1440">
                </div>
                <button type="submit" class="btn btn-primary" id="generateBtn">
                    <i class="fas fa-key"></i> Generate License
                </button>
            </form>
        </div>
    `;
    
    // Recent Licenses Card
    const recentLicensesCard = document.createElement('div');
    recentLicensesCard.className = 'card';
    recentLicensesCard.innerHTML = `
        <div class="card-header">
            <h5 class="card-title mb-0">Recent Licenses</h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Token</th>
                            <th>Created</th>
                            <th>Expires</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recentLicenses">
                        <!-- Licenses will be populated here -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.appendChild(licenseGeneratorCard);
    container.appendChild(recentLicensesCard);
    
    // Add event listeners to the form elements
    setTimeout(() => {
        const durationSelect = document.getElementById('duration');
        if (durationSelect) {
            durationSelect.addEventListener('change', handleDurationChange);
        }
    }, 100);
    
    return container;
}

function createLicensesContent() {
    const container = document.createElement('div');
    container.className = 'tab-content';
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">All Licenses</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Token</th>
                                <th>Created</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="allLicenses">
                            <!-- All licenses will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    return container;
}

function createUsersContent() {
    const container = document.createElement('div');
    container.className = 'tab-content';
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">User Management</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Licenses</th>
                                <th>Last Active</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <!-- Users will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    return container;
}

function createSettingsContent() {
    const container = document.createElement('div');
    container.className = 'tab-content';
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">Admin Settings</h5>
            </div>
            <div class="card-body">
                <form id="settingsForm">
                    <div class="mb-3">
                        <label for="adminPassword" class="form-label">Change Admin Password</label>
                        <input type="password" class="form-control" id="newPassword" placeholder="New Password">
                    </div>
                    <div class="mb-3">
                        <label for="confirmPassword" class="form-label">Confirm New Password</label>
                        <input type="password" class="form-control" id="confirmPassword" placeholder="Confirm New Password">
                    </div>
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="darkModeToggle">
                            <label class="form-check-label" for="darkModeToggle">Dark Mode</label>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Settings</button>
                </form>
            </div>
        </div>
    `;
    
    return container;
}

function handleTabNavigation(event) {
    event.preventDefault();
    
    const tabId = event.currentTarget.getAttribute('href').substring(1);
    switchTab(tabId);
}

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`${tabId}Content`);
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }
    
    // Update active tab in sidebar
    updateActiveTab(tabId);
    
    // Update state
    state.currentTab = tabId;
    saveState();
}

function updateActiveTab(tabId) {
    // Remove active class from all tabs
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`.nav-link[href="#${tabId}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update page title
    document.querySelector('main .h2').textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

// Authentication Functions - Removed authentication requirements
function handleLogin(event) {
    // No longer needed
}

function handleLogout() {
    // No longer needed
}

function checkSession() {
    // No longer needed
}

// License Generation Functions
async function handleLicenseGeneration(event) {
    event.preventDefault();
    
    const email = document.getElementById('userEmail').value;
    const durationSelect = document.getElementById('duration');
    const customDuration = document.getElementById('customDuration');
    
    let duration;
    if (durationSelect.value === 'custom') {
        duration = parseInt(customDuration.value);
    } else {
        duration = parseInt(durationSelect.value);
    }
    
    try {
        const licenseData = await generateLicense(email, duration);
        showLicenseModal(licenseData);
        addToLicenseHistory(licenseData);
        showToast('License generated successfully!', 'success');
    } catch (error) {
        console.error('License generation error:', error);
        showToast('Failed to generate license: ' + error.message, 'error');
    }
}

async function generateLicense(email, durationMinutes) {
    const now = Date.now();
    const expiry = now + (durationMinutes * 60 * 1000);
    
    // Create the license data
    const licenseData = {
        email,
        expiry
    };
    
    // Generate the token in the format expected by the extension
    const token = await generateSecureToken(licenseData);
    
    return {
        email,
        created: now,
        expiry,
        token
    };
}

async function generateSecureToken(licenseData) {
    // Encode email in base64
    const encodedEmail = btoa(licenseData.email);
    
    // Generate hash using SHA-256 to match the extension
    const hashPromise = generateSHA256Hash(licenseData.email + licenseData.expiry + CONFIG.SECRET_KEY);
    
    // Format: REDOM-RLM:base64Email.expiry.hash
    return hashPromise.then(hash => `${CONFIG.LICENSE_PREFIX}:${encodedEmail}.${licenseData.expiry}.${hash}`);
}

// SHA-256 hash function that matches the extension's validation
async function generateSHA256Hash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple UUID generator that doesn't rely on Web Crypto API
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// UI Functions
function showLoginModal() {
    // No longer needed
}

function hideLoginModal() {
    // No longer needed
}

function showLicenseModal(licenseData) {
    document.getElementById('generatedToken').value = licenseData.token;
    document.getElementById('expiryDate').value = new Date(licenseData.expiry).toLocaleString();
    
    const licenseModal = new bootstrap.Modal(document.getElementById('licenseModal'));
    licenseModal.show();
}

function showToast(message, type) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    setTimeout(() => {
        toastContainer.remove();
    }, 3000);
}

// Theme Functions
function initTheme() {
    state.darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-theme', state.darkMode);
    
    // Check if themeToggle exists before accessing it
    const themeToggle = document.getElementById('darkModeToggle');
    if (themeToggle) {
        themeToggle.checked = state.darkMode;
    }
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-theme', state.darkMode);
    localStorage.setItem('darkMode', state.darkMode);
}

// Utility Functions
function handleDurationChange(event) {
    const customDurationGroup = document.getElementById('customDurationGroup');
    if (customDurationGroup) {
        customDurationGroup.style.display = event.target.value === 'custom' ? 'block' : 'none';
    }
}

async function copyToClipboard() {
    const tokenInput = document.getElementById('generatedToken');
    if (!tokenInput) return;
    
    try {
        await navigator.clipboard.writeText(tokenInput.value);
        showToast('License token copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy error:', error);
        showToast('Failed to copy token: ' + error.message, 'error');
    }
}

function enableLicenseGeneration() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.disabled = false;
    }
}

function disableLicenseGeneration() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.disabled = true;
    }
}

// State Management Functions
function loadState() {
    try {
        const savedState = localStorage.getItem('adminState');
        if (savedState) {
            state = { ...state, ...JSON.parse(savedState) };
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

function saveState() {
    localStorage.setItem('adminState', JSON.stringify(state));
}

// License History Functions
function loadLicenseHistory() {
    const history = JSON.parse(localStorage.getItem('licenseHistory') || '[]');
    state.licenses = history;
    updateLicenseHistoryUI();
    updateAllLicensesUI();
    updateUsersUI();
}

function addToLicenseHistory(licenseData) {
    state.licenses.unshift(licenseData);
    
    // Keep only the last MAX_LICENSE_HISTORY licenses
    if (state.licenses.length > CONFIG.MAX_LICENSE_HISTORY) {
        state.licenses = state.licenses.slice(0, CONFIG.MAX_LICENSE_HISTORY);
    }
    
    localStorage.setItem('licenseHistory', JSON.stringify(state.licenses));
    updateLicenseHistoryUI();
    updateAllLicensesUI();
    updateUsersUI();
}

function updateLicenseHistoryUI() {
    const tbody = document.getElementById('recentLicenses');
    if (!tbody) {
        console.log('License history table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (state.licenses.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="text-center">No licenses generated yet</td>';
        tbody.appendChild(tr);
        return;
    }
    
    state.licenses.forEach(license => {
        const tr = document.createElement('tr');
        const now = Date.now();
        const isExpired = now > license.expiry;
        
        tr.innerHTML = `
            <td>${license.email}</td>
            <td><code>${maskToken(license.token)}</code></td>
            <td>${new Date(license.created).toLocaleString()}</td>
            <td>${new Date(license.expiry).toLocaleString()}</td>
            <td><span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'Expired' : 'Active'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="copyLicenseToken('${license.token}')">
                    <i class="fas fa-copy"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function maskToken(token) {
    if (token.length <= 20) return token;
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
}

function copyLicenseToken(token) {
    if (!token) return;
    
    navigator.clipboard.writeText(token)
        .then(() => showToast('License token copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Copy error:', err);
            showToast('Failed to copy token: ' + err.message, 'error');
        });
}

// Function to update the licenses tab
function updateAllLicensesUI() {
    const tbody = document.getElementById('allLicenses');
    if (!tbody) {
        console.log('All licenses table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (state.licenses.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="text-center">No licenses generated yet</td>';
        tbody.appendChild(tr);
        return;
    }
    
    state.licenses.forEach(license => {
        const tr = document.createElement('tr');
        const now = Date.now();
        const isExpired = now > license.expiry;
        
        tr.innerHTML = `
            <td>${license.email}</td>
            <td><code>${maskToken(license.token)}</code></td>
            <td>${new Date(license.created).toLocaleString()}</td>
            <td>${new Date(license.expiry).toLocaleString()}</td>
            <td><span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">${isExpired ? 'Expired' : 'Active'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="copyLicenseToken('${license.token}')">
                    <i class="fas fa-copy"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Function to update the users tab
function updateUsersUI() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        console.log('Users table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Group licenses by email
    const userMap = new Map();
    
    state.licenses.forEach(license => {
        const email = license.email;
        if (!userMap.has(email)) {
            userMap.set(email, {
                email,
                licenses: [],
                lastActive: license.created,
                status: 'Active'
            });
        }
        
        const user = userMap.get(email);
        user.licenses.push(license);
        
        // Update last active if this license is newer
        if (license.created > user.lastActive) {
            user.lastActive = license.created;
        }
        
        // Check if any license is active
        const now = Date.now();
        const hasActiveLicense = user.licenses.some(l => now < l.expiry);
        user.status = hasActiveLicense ? 'Active' : 'Inactive';
    });
    
    if (userMap.size === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">No users found</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Convert map to array and sort by last active
    const users = Array.from(userMap.values()).sort((a, b) => b.lastActive - a.lastActive);
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${user.licenses.length}</td>
            <td>${new Date(user.lastActive).toLocaleString()}</td>
            <td><span class="status-badge ${user.status === 'Active' ? 'status-active' : 'status-expired'}">${user.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewUserLicenses('${user.email}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Function to view a user's licenses
function viewUserLicenses(email) {
    // Switch to licenses tab
    switchTab('licenses');
    
    // Filter licenses by email
    const tbody = document.getElementById('allLicenses');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const emailCell = row.querySelector('td:first-child');
        if (emailCell && emailCell.textContent === email) {
            row.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
        } else {
            row.style.backgroundColor = '';
        }
    });
    
    showToast(`Showing licenses for ${email}`, 'success');
}