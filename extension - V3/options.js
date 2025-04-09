document.addEventListener('DOMContentLoaded', function() {
  const saveSettingsBtn = document.getElementById('saveSettings');
  const addCustomApiBtn = document.getElementById('addCustomApi');
  const manageLicenseBtn = document.getElementById('manageLicense');
  const themeToggle = document.getElementById('themeToggle');
  
  // Initialize theme
  initTheme();
  
  // Check license status
  checkLicenseStatus();
  
  // Load saved settings
  chrome.storage.sync.get([
    'openaiKey', 'geminiKey', 'mistralKey', 'deepseekKey', 'anthropicKey',
    'customApis', 'defaultModel', 'defaultMode', 'autoSummarize', 'showExplanations', 'alwaysUseDefaultAI'
  ], function(settings) {
    if (settings.openaiKey) document.getElementById('openaiKey').value = settings.openaiKey;
    if (settings.geminiKey) document.getElementById('geminiKey').value = settings.geminiKey;
    if (settings.mistralKey) document.getElementById('mistralKey').value = settings.mistralKey;
    if (settings.deepseekKey) document.getElementById('deepseekKey').value = settings.deepseekKey;
    if (settings.anthropicKey) document.getElementById('anthropicKey').value = settings.anthropicKey;
    
    if (settings.defaultModel) document.getElementById('defaultModel').value = settings.defaultModel;
    if (settings.defaultMode) document.getElementById('defaultMode').value = settings.defaultMode;
    if (settings.autoSummarize) document.getElementById('autoSummarize').checked = settings.autoSummarize;
    if (settings.showExplanations) document.getElementById('showExplanations').checked = settings.showExplanations;
    if (settings.alwaysUseDefaultAI) document.getElementById('alwaysUseDefaultAI').checked = settings.alwaysUseDefaultAI;
    
    // TODO: Load custom APIs
  });
  
  // Theme functions
  function initTheme() {
    chrome.storage.sync.get(['darkMode'], function(result) {
      if (result.darkMode) {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
      } else {
        document.body.classList.remove('dark-theme');
        themeToggle.checked = false;
      }
    });
  }
  
  themeToggle.addEventListener('change', function() {
    if (themeToggle.checked) {
      document.body.classList.add('dark-theme');
      chrome.storage.sync.set({ darkMode: true });
    } else {
      document.body.classList.remove('dark-theme');
      chrome.storage.sync.set({ darkMode: false });
    }
  });
  
  saveSettingsBtn.addEventListener('click', function() {
    const settings = {
      openaiKey: document.getElementById('openaiKey').value,
      geminiKey: document.getElementById('geminiKey').value,
      mistralKey: document.getElementById('mistralKey').value,
      deepseekKey: document.getElementById('deepseekKey').value,
      anthropicKey: document.getElementById('anthropicKey').value,
      defaultModel: document.getElementById('defaultModel').value,
      defaultMode: document.getElementById('defaultMode').value,
      autoSummarize: document.getElementById('autoSummarize').checked,
      showExplanations: document.getElementById('showExplanations').checked,
      alwaysUseDefaultAI: document.getElementById('alwaysUseDefaultAI').checked
    };
    
    chrome.storage.sync.set(settings, function() {
      alert('Settings saved successfully!');
    });
  });
  
  // License management
  manageLicenseBtn.addEventListener('click', function() {
    window.location.href = 'license.html';
  });
  
  function checkLicenseStatus() {
    chrome.storage.sync.get(['license'], function(result) {
      const license = result.license;
      const licenseStatusTitle = document.getElementById('licenseStatusTitle');
      const licenseStatusMessage = document.getElementById('licenseStatusMessage');
      const licenseExpiryEl = document.getElementById('licenseExpiry');
      const statusIconEl = document.getElementById('statusIcon');
      
      if (!license || !license.token) {
        // No license found
        updateLicenseStatusUI({
          title: 'No Active License',
          message: 'Please activate a license to use the extension.',
          icon: '⚠️',
          expiryText: '',
          expiryClass: ''
        });
        return;
      }
      
      const now = new Date();
      const expiryDate = new Date(license.expires);
      const isExpired = expiryDate < now;
      
      if (isExpired) {
        // License expired
        updateLicenseStatusUI({
          title: 'License Expired',
          message: 'Your license has expired. Please activate a new license.',
          icon: '❌',
          expiryText: `Expired on ${formatDate(license.expires)}`,
          expiryClass: 'expired'
        });
      } else {
        // License active
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60));
        const minutesRemaining = Math.ceil((expiryDate - now) / (1000 * 60));
        
        let timeRemainingText;
        let statusClass = 'active';
        
        if (daysRemaining > 1) {
          timeRemainingText = `${daysRemaining} days remaining`;
        } else if (hoursRemaining > 1) {
          timeRemainingText = `${hoursRemaining} hours remaining`;
          if (hoursRemaining < 24) statusClass = 'warning';
        } else {
          timeRemainingText = `${minutesRemaining} minutes remaining`;
          statusClass = 'warning';
        }
        
        updateLicenseStatusUI({
          title: 'License Active',
          message: `Your license is currently active and valid.`,
          icon: '✅',
          expiryText: timeRemainingText,
          expiryClass: statusClass
        });
      }
    });
  }
  
  function updateLicenseStatusUI(status) {
    const licenseStatusTitle = document.getElementById('licenseStatusTitle');
    const licenseStatusMessage = document.getElementById('licenseStatusMessage');
    const licenseExpiryEl = document.getElementById('licenseExpiry');
    const statusIconEl = document.getElementById('statusIcon');
    
    licenseStatusTitle.textContent = status.title;
    licenseStatusMessage.textContent = status.message;
    statusIconEl.textContent = status.icon;
    licenseExpiryEl.textContent = status.expiryText;
    licenseExpiryEl.className = 'license-expiry';
    if (status.expiryClass) {
      licenseExpiryEl.classList.add(status.expiryClass);
    }
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  addCustomApiBtn.addEventListener('click', function() {
    const apiName = document.getElementById('customApiName').value;
    const apiEndpoint = document.getElementById('customApiEndpoint').value;
    const apiKey = document.getElementById('customApiKey').value;
    
    if (!apiName || !apiEndpoint || !apiKey) {
      alert('Please fill all fields for custom API');
      return;
    }
    
    chrome.storage.sync.get(['customApis'], function(result) {
      const customApis = result.customApis || [];
      customApis.push({
        name: apiName,
        endpoint: apiEndpoint,
        key: apiKey
      });
      
      chrome.storage.sync.set({ customApis: customApis }, function() {
        alert('Custom API added successfully!');
        document.getElementById('customApiName').value = '';
        document.getElementById('customApiEndpoint').value = '';
        document.getElementById('customApiKey').value = '';
      });
    });
  });
});