// License Management Configuration
const CONFIG = {
    SECRET_KEY: 'redom-rlm-secure-key-2025',
    LICENSE_PREFIX: 'REDOM-RLM',
    VALIDATION_INTERVAL: 3600000, // 1 hour in milliseconds
    MAX_LICENSE_HISTORY: 5
};

// Initialize the license system
document.addEventListener('DOMContentLoaded', function() {
    initializeLicenseSystem();
    setupEventListeners();
    startLicenseValidation();
});

// Initialize the license system
function initializeLicenseSystem() {
    // Initialize theme
    initTheme();
    
    // Check license status
    checkLicenseStatus();
    
    // Load license history
    loadLicenseHistory();
}

// Setup event listeners
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    const licenseTokenInput = document.getElementById('licenseToken');
    const activateTokenBtn = document.getElementById('activateToken');
    const returnToSettingsBtn = document.getElementById('returnToSettings');
    const contactSupportBtn = document.getElementById('contactSupport');
    
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    if (activateTokenBtn) {
        activateTokenBtn.addEventListener('click', activateLicense);
    }
    
    if (returnToSettingsBtn) {
        returnToSettingsBtn.addEventListener('click', () => {
            window.location.href = 'options.html';
        });
    }
    
    if (contactSupportBtn) {
        contactSupportBtn.addEventListener('click', () => {
            window.open('mailto:redomlicensemanager@gmail.com?subject=License%20Request&body=I%20would%20like%20to%20request%20a%20license%20for%20Redom%20Web%20Summarizer.');
        });
    }
    
    // Listen for license status updates
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.action === 'licenseValid' || message.action === 'licenseInvalid') {
            checkLicenseStatus();
        }
    });
}

// Theme Functions
function initTheme() {
    chrome.storage.sync.get(['darkMode'], function(result) {
        if (result.darkMode) {
            document.body.classList.add('dark-theme');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.checked = true;
            }
        }
    });
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        if (themeToggle.checked) {
            document.body.classList.add('dark-theme');
            chrome.storage.sync.set({ darkMode: true });
        } else {
            document.body.classList.remove('dark-theme');
            chrome.storage.sync.set({ darkMode: false });
        }
    }
}

// License Validation Functions
async function validateLicense(token) {
    try {
        // Decode the token using the shared decoder
        const decoded = decodeLicenseToken(token);
        if (!decoded) {
            throw new Error('Invalid license format');
        }
        
        // Validate the hash
        const isValidHash = await validateTokenHash(decoded.email, decoded.expiry, decoded.hash);
        if (!isValidHash) {
            throw new Error('Invalid license signature');
        }
        
        // Check if the license has expired
        const now = Date.now();
        if (now > decoded.expiry) {
            throw new Error('License has expired');
        }
        
        return {
            isValid: true,
            email: decoded.email,
            expiry: decoded.expiry
        };
    } catch (error) {
        console.error('License validation error:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}

// License Activation Functions
async function activateLicense() {
    console.log('Activate license button clicked');
    const licenseTokenInput = document.getElementById('licenseToken');
    const token = licenseTokenInput.value.trim();
    
    if (!token) {
        showActivationStatus('Please enter a valid license token', 'error');
        return;
    }
    
    try {
        console.log('Validating license:', token);
        const validationResult = await validateLicense(token);
        
        if (!validationResult.isValid) {
            showActivationStatus(validationResult.error || 'Invalid license', 'error');
            return;
        }
        
        // Store the license
        const license = {
            token: token,
            email: validationResult.email,
            expires: validationResult.expiry
        };
        
        await chrome.storage.sync.set({ license: license });
        
        // Add to license history
        await addToLicenseHistory(license);
        
        // Update UI
        showActivationStatus('License activated successfully!', 'success');
        checkLicenseStatus();
        
        // Notify background script
        chrome.runtime.sendMessage({ action: 'licenseUpdated' });
    } catch (error) {
        console.error('License activation error:', error);
        showActivationStatus('Failed to activate license: ' + error.message, 'error');
    }
}

// License Status Functions
function checkLicenseStatus() {
    chrome.storage.sync.get(['license', 'licenseValid'], function(result) {
        const licenseStatusTitle = document.getElementById('licenseStatusTitle');
        const licenseStatusMessage = document.getElementById('licenseStatusMessage');
        const licenseExpiryEl = document.getElementById('licenseExpiry');
        const statusIconEl = document.getElementById('statusIcon');
        
        if (result.license && result.licenseValid) {
            const now = new Date();
            const expiryDate = new Date(result.license.expires);
            const isExpired = now > expiryDate;
            
            if (isExpired) {
                updateLicenseStatusUI('expired', 'License Expired', 'Your license has expired. Please renew your license to continue using the extension.', expiryDate);
            } else {
                updateLicenseStatusUI('active', 'License Active', 'Your license is active and valid.', expiryDate);
            }
        } else {
            updateLicenseStatusUI('inactive', 'No License', 'Please activate your license to use the extension.', null);
        }
    });
}

function updateLicenseStatusUI(status, title, message, expiryDate) {
    const licenseStatusTitle = document.getElementById('licenseStatusTitle');
    const licenseStatusMessage = document.getElementById('licenseStatusMessage');
    const licenseExpiryEl = document.getElementById('licenseExpiry');
    const statusIconEl = document.getElementById('statusIcon');
    
    if (licenseStatusTitle) {
        licenseStatusTitle.textContent = title;
    }
    
    if (licenseStatusMessage) {
        licenseStatusMessage.textContent = message;
    }
    
    if (licenseExpiryEl) {
        licenseExpiryEl.textContent = expiryDate ? `Expires: ${formatDate(expiryDate)}` : '';
    }
    
    if (statusIconEl) {
        statusIconEl.className = `status-icon ${status}`;
    }
}

// License History Functions
function loadLicenseHistory() {
    chrome.storage.sync.get(['licenseHistory'], function(result) {
        const licenseHistoryEl = document.getElementById('licenseHistory');
        const history = result.licenseHistory || [];
        
        if (licenseHistoryEl) {
            if (history.length === 0) {
                licenseHistoryEl.innerHTML = '<div class="empty-history-message">No previous license tokens found.</div>';
            } else {
                let historyHTML = '';
                const now = new Date();
                
                history.forEach(item => {
                    const expiryDate = new Date(item.expires);
                    const isExpired = expiryDate < now;
                    const statusClass = isExpired ? 'expired' : 'active';
                    const statusText = isExpired ? 'Expired' : 'Active';
                    
                    historyHTML += `
                        <div class="license-history-item">
                            <div class="history-item-details">
                                <div class="history-item-token">${maskToken(item.token)}</div>
                                <div class="history-item-date">Expires: ${formatDate(expiryDate)}</div>
                            </div>
                            <div class="history-item-status ${statusClass}">${statusText}</div>
                        </div>
                    `;
                });
                
                licenseHistoryEl.innerHTML = historyHTML;
            }
        }
    });
}

function addToLicenseHistory(licenseData) {
    chrome.storage.sync.get(['licenseHistory'], function(result) {
        let history = result.licenseHistory || [];
        
        // Add the new license to history if it doesn't exist already
        const exists = history.some(item => item.token === licenseData.token);
        if (!exists) {
            history.unshift(licenseData);
            
            // Keep only the last MAX_LICENSE_HISTORY licenses
            if (history.length > CONFIG.MAX_LICENSE_HISTORY) {
                history = history.slice(0, CONFIG.MAX_LICENSE_HISTORY);
            }
            
            chrome.storage.sync.set({ licenseHistory: history }, function() {
                loadLicenseHistory();
            });
        }
    });
}

// Utility Functions
function showActivationStatus(message, type) {
    const activationStatusEl = document.getElementById('activationStatus');
    if (activationStatusEl) {
        activationStatusEl.textContent = message;
        activationStatusEl.className = `activation-status ${type}`;
        activationStatusEl.style.display = 'block';
        
        setTimeout(function() {
            activationStatusEl.style.display = 'none';
        }, 5000);
    }
}

function maskToken(token) {
    if (token.length <= 20) return token;
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
}

function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Start periodic license validation
function startLicenseValidation() {
    setInterval(checkLicenseStatus, CONFIG.VALIDATION_INTERVAL);
}