// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('taskId');
const tabId = urlParams.get('tabId');
const title = urlParams.get('title');

// Initialize UI elements
document.addEventListener('DOMContentLoaded', () => {
  // Update title
  const titleElement = document.getElementById('summary-title');
  if (titleElement) {
    titleElement.textContent = title || 'Summary';
  }

  // Get UI elements
  const contentDiv = document.querySelector('.content');
  const minimizeBtn = document.querySelector('.minimize-btn');
  const summaryContent = document.querySelector('.summary-content');

  // Initialize summary content
  if (summaryContent) {
    summaryContent.innerHTML = '<div class="loading">Generating summary...</div>';
  }

  // Request initial summary
  if (taskId && tabId) {
    // Get the content from the background script
    chrome.runtime.sendMessage({ 
      type: 'get_task_content',
      taskId,
      tabId
    }, (response) => {
      if (response && response.content) {
        // Now request the summary generation
        chrome.runtime.sendMessage({ 
          type: 'generate_summary',
          taskId,
          tabId,
          title
        });
      } else {
        if (summaryContent) {
          summaryContent.innerHTML = '<div class="error">Failed to get content for summarization</div>';
        }
      }
    });
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const summaryContent = document.querySelector('.summary-content');
  
  if (message.type === 'update_summary') {
    if (summaryContent) {
      if (message.error) {
        summaryContent.innerHTML = `<div class="error">${message.error}</div>`;
      } else if (message.summary) {
        // Display the formatted HTML summary
        summaryContent.innerHTML = message.summary;
        
        // Add CSS classes for styling
        document.body.classList.add('summary-loaded');
        
        // Apply additional styling based on summary type
        if (message.summary.includes('academic')) {
          document.body.classList.add('academic-summary');
        } else if (message.summary.includes('executive')) {
          document.body.classList.add('executive-summary');
        } else if (message.summary.includes('technical')) {
          document.body.classList.add('technical-summary');
        }
      } else {
        summaryContent.innerHTML = '<div class="no-summary">No summary available yet.</div>';
      }
    }
  }
});

// Handle minimize button click
document.querySelector('.minimize-btn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'minimize_summary' });
});

// Check for dark mode preference
chrome.storage.sync.get(['darkMode'], (result) => {
  if (result.darkMode) {
    document.body.classList.add('dark-mode');
  }
});

// Listen for dark mode changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.darkMode) {
    if (changes.darkMode.newValue) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}); 