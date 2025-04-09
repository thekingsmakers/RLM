// Message handling between content and background scripts

// Message types
const MESSAGE_TYPES = {
    SHOW_SUMMARY: 'show_summary',
    MINIMIZE_SUMMARY: 'minimize_summary',
    UPDATE_SUMMARY: 'update_summary',
    GENERATE_SUMMARY: 'generate_summary',
    SUMMARY_COMPLETE: 'summary_complete',
    SUMMARY_ERROR: 'summary_error'
};

// Send message to background script
function sendMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type, ...data }, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

// Listen for messages from background script
function listenForMessages(callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        callback(message, sender, sendResponse);
        return true; // Keep the message channel open for async responses
    });
}

// Handle summary generation request
async function handleSummaryGeneration(content, mode = 'standard') {
    try {
        // Show loading state
        window.updateSummary(null, true);
        
        // Send request to background script
        const response = await sendMessage(MESSAGE_TYPES.GENERATE_SUMMARY, {
            content,
            mode
        });
        
        // Update UI with the summary
        window.updateSummary(response.summary);
        
        return response;
    } catch (error) {
        // Show error state
        window.updateSummary(null, false, error.message);
        throw error;
    }
}

// Handle summary mode change
function handleSummaryModeChange(mode) {
    const content = document.querySelector('main')?.textContent || document.body.textContent;
    handleSummaryGeneration(content, mode);
}

// Initialize message handling
function initializeMessageHandling() {
    // Listen for messages from background script
    listenForMessages((message, sender, sendResponse) => {
        switch (message.type) {
            case MESSAGE_TYPES.SHOW_SUMMARY:
                window.createSummaryUI();
                sendResponse({ success: true });
                break;
                
            case MESSAGE_TYPES.MINIMIZE_SUMMARY:
                const container = document.getElementById('ai-summary-container');
                if (container) {
                    container.style.transform = 'translateY(calc(-100% + 50px))';
                }
                sendResponse({ success: true });
                break;
                
            case MESSAGE_TYPES.UPDATE_SUMMARY:
                window.updateSummary(message.text, message.isLoading, message.error);
                sendResponse({ success: true });
                break;
                
            case MESSAGE_TYPES.SUMMARY_COMPLETE:
                window.updateSummary(message.summary);
                sendResponse({ success: true });
                break;
                
            case MESSAGE_TYPES.SUMMARY_ERROR:
                window.updateSummary(null, false, message.error);
                sendResponse({ success: true });
                break;
        }
    });
    
    // Add event listener for mode changes
    document.addEventListener('change', event => {
        if (event.target.id === 'ai-summary-mode') {
            handleSummaryModeChange(event.target.value);
        }
    });
}

// Export functions and constants
window.MESSAGE_TYPES = MESSAGE_TYPES;
window.sendMessage = sendMessage;
window.listenForMessages = listenForMessages;
window.handleSummaryGeneration = handleSummaryGeneration;
window.handleSummaryModeChange = handleSummaryModeChange;
window.initializeMessageHandling = initializeMessageHandling; 