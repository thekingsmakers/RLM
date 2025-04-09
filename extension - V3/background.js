// Check if license is valid
async function isLicenseValid() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['license', 'licenseValid'], (result) => {
      // Initialize license if not present
      if (!result.license) {
        chrome.storage.sync.set({ 
          license: null,
          licenseValid: false 
        }, () => {
          resolve(false);
        });
        return;
      }

      // If we have a cached license validity status, use that
      if (typeof result.licenseValid !== 'undefined') {
        resolve(result.licenseValid);
        return;
      }
      
      const license = result.license;
      
      if (!license || !license.token) {
        // No valid license found
        chrome.storage.sync.set({ licenseValid: false });
        resolve(false);
        return;
      }
      
      const now = Date.now();
      const expiryDate = license.expires;
      const isExpired = now > expiryDate;
      
      // Update the cached license validity status
      chrome.storage.sync.set({ licenseValid: !isExpired });
      resolve(!isExpired);
    });
  });
}

// Validate license and update storage
async function validateLicense() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['license'], (result) => {
      // Initialize license if not present
      if (!result.license) {
        chrome.storage.sync.set({ 
          license: null,
          licenseValid: false 
        }, () => {
          resolve(false);
        });
        return;
      }

      const license = result.license;
      
      if (!license || !license.token) {
        // No valid license found
        chrome.storage.sync.set({ licenseValid: false });
        resolve(false);
        return;
      }
      
      const now = Date.now();
      const expiryDate = license.expires;
      const isExpired = now > expiryDate;
      
      // Update the cached license validity status
      chrome.storage.sync.set({ licenseValid: !isExpired });
      
      // If license has expired, notify all tabs
      if (isExpired) {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, { action: 'licenseInvalid' });
            } catch (e) {
              // Tab might not be ready to receive messages
              console.log('Tab not ready for message:', tab.id);
            }
          });
        });
      }
      
      resolve(!isExpired);
    });
  });
}

// Initialize license system
async function initializeLicenseSystem() {
  try {
    // Set initial license state if not present
    const result = await chrome.storage.sync.get(['license', 'licenseValid']);
    if (!result.license) {
      await chrome.storage.sync.set({
        license: null,
        licenseValid: false
      });
    }
    
    // Start periodic validation
    startPeriodicLicenseValidation();
  } catch (error) {
    console.error('Failed to initialize license system:', error);
  }
}

// Start periodic license validation
function startPeriodicLicenseValidation() {
  // Validate immediately
  validateLicense();
  
  // Then validate every minute
  setInterval(validateLicense, 60000);
}

// Initialize when extension starts
initializeLicenseSystem();

// Store summary tasks and windows
let summaryTasks = {};
const summaryWindows = new Map();

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu item
  chrome.contextMenus.create({
    id: 'redomMenu',
    title: 'Redom',
    contexts: ['page', 'selection']
  });

  // Create submenu items
  chrome.contextMenus.create({
    id: 'summarizePage',
    parentId: 'redomMenu',
    title: 'Summarize Page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'explainSelection',
    parentId: 'redomMenu',
    title: 'Explain Selection',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'explainPage',
    parentId: 'redomMenu',
    title: 'Explain Page',
    contexts: ['page']
  });
});

// Ensure content script is loaded before sending messages
async function ensureContentScriptLoaded(tabId) {
  try {
    // First try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    // If ping fails, inject the content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (error) {
      console.error('Failed to inject content script:', error);
      return false;
    }
  }
}

// Get configured API settings
async function getConfiguredAPI() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiEndpoint', 'apiKey', 'defaultModel', 'openaiKey', 'geminiKey', 'mistralKey', 'deepseekKey', 'anthropicKey'], (result) => {
      // Check if we have a specific API key for the selected model
      const model = result.defaultModel || 'openai';
      const keyMap = {
        'openai': result.openaiKey,
        'gemini': result.geminiKey,
        'mistral': result.mistralKey,
        'deepseek': result.deepseekKey,
        'anthropic': result.anthropicKey
      };
      
      // Use model-specific key if available, otherwise fall back to generic API key
      const apiKey = keyMap[model] || result.apiKey;
      
      // Use model-specific endpoint if available, otherwise fall back to generic endpoint
      const endpointMap = {
        'openai': 'https://api.openai.com/v1/chat/completions',
        'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'mistral': 'https://api.mistral.ai/v1/chat/completions',
        'deepseek': 'https://api.deepseek.com/v1/chat/completions',
        'anthropic': 'https://api.anthropic.com/v1/messages'
      };
      
      const apiEndpoint = result.apiEndpoint || endpointMap[model];
      
      resolve({
        endpoint: apiEndpoint || '',
        key: apiKey || '',
        model: model
      });
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab.url.startsWith('chrome://')) {
    const isLoaded = await ensureContentScriptLoaded(tab.id);
    if (!isLoaded) {
      console.error('Could not load content script');
      return;
    }

    // Get configured API settings
    const apiConfig = await getConfiguredAPI();
    if (!apiConfig.endpoint || !apiConfig.key) {
      console.error('API not configured');
      return;
    }

    switch (info.menuItemId) {
      case 'summarizePage':
        try {
          const isValid = await isLicenseValid();
          if (isValid) {
            // Create summary window
            const taskId = Date.now().toString();
            await createSummaryWindow(taskId, tab.id, "Page Summary", apiConfig);
          } else {
            await chrome.tabs.sendMessage(tab.id, { action: 'licenseInvalid' });
          }
        } catch (error) {
          console.error('Error in summarizePage handler:', error);
        }
        break;
      case 'explainSelection':
        try {
          const isValid = await isLicenseValid();
          if (isValid && info.selectionText) {
            // Create explanation window for selection
            const taskId = Date.now().toString();
            await createExplanationWindow(taskId, tab.id, "Selection Explanation", info.selectionText, apiConfig);
          } else {
            await chrome.tabs.sendMessage(tab.id, { action: 'licenseInvalid' });
          }
        } catch (error) {
          console.error('Error in explainSelection handler:', error);
        }
        break;
      case 'explainPage':
        try {
          const isValid = await isLicenseValid();
          if (isValid) {
            // Get page content and create explanation window
            const content = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: () => document.body.innerText
            });
            
            if (content && content[0] && content[0].result) {
              const taskId = Date.now().toString();
              await createExplanationWindow(taskId, tab.id, "Page Explanation", content[0].result, apiConfig);
            }
          } else {
            await chrome.tabs.sendMessage(tab.id, { action: 'licenseInvalid' });
          }
        } catch (error) {
          console.error('Error in explainPage handler:', error);
        }
        break;
    }
  }
});

// Create explanation window
async function createExplanationWindow(taskId, tabId, title, content, apiConfig) {
  try {
    // Check if window already exists
    if (summaryWindows.has(taskId)) {
      const window = summaryWindows.get(taskId);
      if (window) {
        await chrome.windows.update(window.id, { focused: true });
        return window.id;
      }
    }

    // Get current window to calculate position
    const currentWindow = await chrome.windows.getCurrent();
    
    // Create new window
    const width = 500;
    const height = 600;
    const left = currentWindow.left + currentWindow.width - width - 20;
    const top = currentWindow.top + 20;

    const window = await chrome.windows.create({
      url: `explanation.html?taskId=${taskId}&tabId=${tabId}&title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}&apiEndpoint=${encodeURIComponent(apiConfig.endpoint)}&apiKey=${encodeURIComponent(apiConfig.key)}&model=${encodeURIComponent(apiConfig.model)}`,
      type: 'popup',
      width,
      height,
      left,
      top
    });

    summaryWindows.set(taskId, window);

    // Clean up when window is closed
    chrome.windows.onRemoved.addListener((windowId) => {
      if (windowId === window.id) {
        summaryWindows.delete(taskId);
      }
    });

    return window.id;
  } catch (error) {
    console.error('Error creating explanation window:', error);
    throw error;
  }
}

// Function to get page content
function getPageContent() {
  // Try to find the main content container
  const mainContent = document.querySelector('main, article, [role="main"], .main-content, #content, .content');
  
  if (mainContent) {
    return mainContent.innerText;
  }
  
  // Fallback to body text if no main content container is found
  return document.body.innerText;
}

// Create summary window
async function createSummaryWindow(taskId, tabId, title, apiConfig) {
  try {
    // Check if window already exists
    if (summaryWindows.has(taskId)) {
      const window = summaryWindows.get(taskId);
      if (window) {
        await chrome.windows.update(window.id, { focused: true });
        return window.id;
      }
    }

    // Get current window to calculate position
    const currentWindow = await chrome.windows.getCurrent();
    
    // Create new window
    const width = 500;
    const height = 600;
    const left = currentWindow.left + currentWindow.width - width - 20;
    const top = currentWindow.top + 20;

    const window = await chrome.windows.create({
      url: `summary.html?taskId=${taskId}&tabId=${tabId}&title=${encodeURIComponent(title)}&apiEndpoint=${encodeURIComponent(apiConfig.endpoint)}&apiKey=${encodeURIComponent(apiConfig.key)}&model=${encodeURIComponent(apiConfig.model)}`,
      type: 'popup',
      width,
      height,
      left,
      top
    });

    summaryWindows.set(taskId, window);

    // Clean up when window is closed
    chrome.windows.onRemoved.addListener((windowId) => {
      if (windowId === window.id) {
        summaryWindows.delete(taskId);
      }
    });

    return window.id;
  } catch (error) {
    console.error('Error creating summary window:', error);
    throw error;
  }
}

// Handle summary window creation and management
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'show_summary') {
    showSummaryWindow();
  } else if (request.type === 'minimize_summary') {
    minimizeSummaryWindow();
  } else if (request.type === 'update_summary') {
    updateSummaryWindow(request.summary);
  } else if (request.type === 'generate_summary') {
    generateTabSummary();
  }
});

function showSummaryWindow() {
  const taskId = Date.now().toString();
  createSummaryWindow(taskId, null, "Tab Summary");
}

function minimizeSummaryWindow() {
  // Find the most recent summary window
  const windows = Array.from(summaryWindows.values());
  if (windows.length > 0) {
    const lastWindow = windows[windows.length - 1];
    chrome.windows.update(lastWindow.id, { focused: false });
  }
}

function updateSummaryWindow(summary) {
  // Find the most recent summary window
  const windows = Array.from(summaryWindows.values());
  if (windows.length > 0) {
    const lastWindow = windows[windows.length - 1];
    chrome.tabs.sendMessage(lastWindow.tabs[0].id, {
      type: 'update_summary',
      summary: summary
    });
  }
}

// Generate summary of open tabs
async function generateTabSummary() {
  try {
    const tabs = await chrome.tabs.query({});
    const summary = tabs.map(tab => tab.title).join('\n');
    
    // Find the most recent summary window
    const windows = Array.from(summaryWindows.values());
    if (windows.length > 0) {
      const lastWindow = windows[windows.length - 1];
      chrome.tabs.sendMessage(lastWindow.tabs[0].id, {
        type: 'summary_update',
        summary: summary
      });
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    const windows = Array.from(summaryWindows.values());
    if (windows.length > 0) {
      const lastWindow = windows[windows.length - 1];
      chrome.tabs.sendMessage(lastWindow.tabs[0].id, {
        type: 'summary_update',
        summary: null
      });
    }
  }
}

// Listen for window close events
chrome.windows.onRemoved.addListener((windowId) => {
  // Check if this was a summary window
  for (const [taskId, window] of summaryWindows.entries()) {
    if (window.id === windowId) {
      summaryWindows.delete(taskId);
      break;
    }
  }
});

// Generate summary content
async function generateSummary() {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Filter out chrome:// URLs and get tab titles
    const validTabs = tabs
      .filter(tab => !tab.url.startsWith('chrome://'))
      .map(tab => tab.title);
    
    if (validTabs.length === 0) {
      sendSummaryUpdate({ error: 'No valid tabs found to summarize.' });
      return;
    }
    
    // Create summary content
    const summary = `
      <h2>Open Tabs Summary</h2>
      <p>You currently have ${validTabs.length} open tabs:</p>
      <ul>
        ${validTabs.map(title => `<li>${title}</li>`).join('')}
      </ul>
    `;
    
    sendSummaryUpdate({ summary });
  } catch (error) {
    sendSummaryUpdate({ error: 'Failed to generate summary: ' + error.message });
  }
}

// Send summary update to the summary window
function sendSummaryUpdate(data) {
  const taskId = Date.now().toString();
  createSummaryWindow(taskId, null, "Tab Summary");
  chrome.tabs.sendMessage(taskId, {
    type: 'update_summary',
    ...data
  });
}

// Handle messages from content scripts and popups
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get_task_content') {
    const task = summaryTasks[request.taskId];
    if (task && task.content) {
      sendResponse({ content: task.content });
    } else {
      sendResponse({ error: 'No content available' });
    }
    return true; // Required for async response
  }
  
  if (request.type === 'generate_summary') {
    const { taskId, tabId, title } = request;
    
    // Get the content from the task
    const task = summaryTasks[taskId];
    if (!task || !task.content) {
      // Send error to the summary window
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'update_summary',
        error: 'No content available for summarization'
      });
      return;
    }

    // Start summary generation process
    generateSummary(taskId, tabId, sender.tab.id);
  }
});

// Generate summary for a task
async function generateSummary(taskId, tabId, windowId) {
  try {
    // Get task content
    const task = summaryTasks[taskId];
    if (!task || !task.content) {
      throw new Error('No content available for summarization');
    }

    // Get user preferences
    const settings = await chrome.storage.sync.get(['defaultModel', 'defaultMode']);
    const model = settings.defaultModel || 'openai';
    const mode = settings.defaultMode || 'concise';
    
    // Get API key for the selected model
    const apiKey = await getApiKey(model);
    
    if (!apiKey) {
      throw new Error('API key not found. Please set up your API key in the extension settings.');
    }

    // Generate summary based on the model
    let summary;
    switch (model) {
      case 'openai':
        summary = await summarizeWithOpenAI(task.content, mode, apiKey);
        break;
      case 'gemini':
        summary = await summarizeWithGemini(task.content, mode, apiKey);
        break;
      case 'mistral':
        summary = await summarizeWithMistral(task.content, mode, apiKey);
        break;
      case 'deepseek':
        summary = await summarizeWithDeepseek(task.content, mode, apiKey);
        break;
      case 'anthropic':
        summary = await summarizeWithAnthropic(task.content, mode, apiKey);
        break;
      default:
        summary = await summarizeWithOpenAI(task.content, mode, apiKey);
    }

    // Update the task status
    summaryTasks[taskId].status = "completed";
    summaryTasks[taskId].summary = summary;

    // Send summary to window
    chrome.tabs.sendMessage(windowId, {
      type: 'update_summary',
      summary: summary
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Send error to window
    chrome.tabs.sendMessage(windowId, {
      type: 'update_summary',
      error: error.message
    });
  }
}

// Summarization functions for different AI models
async function summarizeWithOpenAI(content, mode, apiKey) {
  const prompt = mode === 'concise' 
    ? 'Summarize the following text concisely:'
    : 'Provide a detailed summary of the following text:';
    
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: content }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary with OpenAI');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function summarizeWithGemini(content, mode, apiKey) {
  // Define summary types and their prompts
  const summaryTypes = {
    'concise': {
      prompt: 'Summarize the following text concisely in 2-3 paragraphs:',
      format: 'bullet points'
    },
    'detailed': {
      prompt: 'Provide a detailed summary of the following text with main points and supporting details:',
      format: 'sections with headings'
    },
    'academic': {
      prompt: 'Create an academic summary of the following text with key concepts, methodology, and conclusions:',
      format: 'academic paper format'
    },
    'executive': {
      prompt: 'Create an executive summary of the following text focusing on key findings and recommendations:',
      format: 'executive report format'
    },
    'technical': {
      prompt: 'Provide a technical summary of the following text with specifications, processes, and technical details:',
      format: 'technical documentation format'
    }
  };
  
  // Get the appropriate summary type or default to concise
  const summaryType = summaryTypes[mode] || summaryTypes['concise'];
  
  try {
    // Use the correct endpoint and model
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${summaryType.prompt}\n\nFormat the summary in ${summaryType.format}.\n\nText to summarize:\n${content}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    // Get the summary text
    const summaryText = data.candidates[0].content.parts[0].text;
    
    // Format the summary with HTML for better display
    const formattedSummary = formatSummary(summaryText, mode);
    
    return formattedSummary;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to generate summary with Gemini: ${error.message}`);
  }
}

// Function to format the summary with HTML
function formatSummary(summaryText, mode) {
  // Add a header with the summary type
  let formattedSummary = `<div class="summary-header"><h3>${mode.charAt(0).toUpperCase() + mode.slice(1)} Summary</h3></div>`;
  
  // Process the summary text based on the mode
  if (mode === 'concise') {
    // For concise summaries, add bullet points
    formattedSummary += `<div class="summary-content">${summaryText.replace(/\n/g, '<br>')}</div>`;
  } else if (mode === 'detailed') {
    // For detailed summaries, format with sections
    formattedSummary += `<div class="summary-content">${summaryText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
  } else if (mode === 'academic') {
    // For academic summaries, format with sections and citations
    formattedSummary += `<div class="summary-content academic">${summaryText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
  } else if (mode === 'executive') {
    // For executive summaries, format with key points
    formattedSummary += `<div class="summary-content executive">${summaryText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
  } else if (mode === 'technical') {
    // For technical summaries, format with code blocks and technical details
    formattedSummary += `<div class="summary-content technical">${summaryText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
  } else {
    // Default formatting
    formattedSummary += `<div class="summary-content">${summaryText.replace(/\n/g, '<br>')}</div>`;
  }
  
  return formattedSummary;
}

async function summarizeWithMistral(content, mode, apiKey) {
  const prompt = mode === 'concise' 
    ? 'Summarize the following text concisely:'
    : 'Provide a detailed summary of the following text:';
    
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-tiny',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: content }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary with Mistral');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function summarizeWithDeepseek(content, mode, apiKey) {
  const prompt = mode === 'concise' 
    ? 'Summarize the following text concisely:'
    : 'Provide a detailed summary of the following text:';
    
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: content }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary with Deepseek');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function summarizeWithAnthropic(content, mode, apiKey) {
  const prompt = mode === 'concise' 
    ? 'Summarize the following text concisely:'
    : 'Provide a detailed summary of the following text:';
    
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      messages: [
        { role: 'user', content: `${prompt}\n\n${content}` }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary with Anthropic');
  }

  const data = await response.json();
  // Implementation for Anthropic summarization
  return "Anthropic summary placeholder";
}

// Function to get API key for the selected model
async function getApiKey(model) {
  return new Promise((resolve) => {
    const keyMap = {
      'openai': 'openaiKey',
      'gemini': 'geminiKey',
      'mistral': 'mistralKey',
      'deepseek': 'deepseekKey',
      'anthropic': 'anthropicKey'
    };
    
    chrome.storage.sync.get(keyMap[model], function(result) {
      resolve(result[keyMap[model]]);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSummary") {
    const taskId = Date.now().toString();
    summaryTasks[taskId] = { status: "processing", content: request.content };
    sendResponse({ taskId });
  }
  if (request.action === "getSummaryStatus") {
    sendResponse(summaryTasks[request.taskId]);
  }
  
  // Check license status
  if (request.action === 'checkLicense') {
    isLicenseValid().then(valid => {
      sendResponse({ isValid: valid });
    });
    return true;
  }
  
  // Get summary task
  if (request.action === 'getSummaryTask') {
    sendResponse(summaryTasks[request.taskId]);
    return true;
  }
});