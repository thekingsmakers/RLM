const SECRET_KEY = 'redom-rlm-secure-key-2025';
const LICENSE_PREFIX = 'REDOM-RLM';

// License Validator Script
// This script checks if the user's license is valid and prevents extension use if expired

const decodeLicenseToken = (token) => {
  try {
    const cleanToken = token.replace(/\n/g, '').split(LICENSE_PREFIX + ':')[1];
    const [encodedEmail, expiry, hash] = cleanToken.split('.');
    return {
      email: atob(encodedEmail),
      expiry: parseInt(expiry),
      hash
    };
  } catch (e) {
    console.error('License decode error:', e);
    return null;
  }
};

const validateTokenHash = async (email, expiry, receivedHash) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email + expiry + SECRET_KEY);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === receivedHash;
  } catch (e) {
    console.error('Hash validation error:', e);
    return false;
  }
};

async function checkLicenseValidity() {
  chrome.storage.sync.get(['license'], async function(result) {
    let isValid = false;
    let decoded = null;
    const license = result.license;
    
    if (license?.token) {
      decoded = decodeLicenseToken(license.token);
      if (decoded) {
        const now = Date.now();
        const validHash = await validateTokenHash(decoded.email, decoded.expiry, decoded.hash);
        isValid = validHash && now < decoded.expiry;
      }
    }

    chrome.storage.sync.set({ licenseValid: isValid }, () => {
      chrome.runtime.sendMessage({
        action: isValid ? 'licenseValid' : 'licenseInvalid',
        message: isValid && decoded ? 'License valid until ' + new Date(decoded.expiry).toLocaleDateString()
          : 'Invalid or expired license. Contact Redom License Manager'
      });
      
      if (!isValid) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    });
  });
}

// Initial check and periodic validation
checkLicenseValidity();
setInterval(checkLicenseValidity, 5 * 60 * 1000);

/**
 * Notifies any open extension pages that the license is invalid
 */
function notifyInvalidLicense() {
  chrome.runtime.sendMessage({ action: 'licenseInvalid' });
}

/**
 * Formats a date for display
 */
function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}