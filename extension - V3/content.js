// Content script for Redom Web Summarizer

// Initialize when the content script loads
console.log('Content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  // Handle ping message to check if content script is loaded
  if (request.action === "ping") {
    sendResponse({ status: "ok" });
    return true;
  }
  
  if (request.action === "getContent") {
    try {
      // Extract content from the page
      const content = extractPageContent();
      sendResponse({ content });
    } catch (error) {
      console.error('Error extracting content:', error);
      sendResponse({ error: error.message });
    }
  } else if (request.action === "summarizePage") {
    try {
      // Check license before proceeding
      chrome.runtime.sendMessage({ action: "checkLicense" }, (response) => {
        if (response && response.isValid) {
          const content = extractPageContent();
          showSummaryUI(content.mainContent);
        } else {
          showLicenseError();
        }
      });
    } catch (error) {
      console.error('Error in summarizePage handler:', error);
      showError('Failed to summarize page. Please try again.');
    }
  } else if (request.action === "explainSelection") {
    try {
      // Check license before proceeding
      chrome.runtime.sendMessage({ action: "checkLicense" }, (response) => {
        if (response && response.isValid) {
          showExplanationUI(request.text, 'selection');
        } else {
          showLicenseError();
        }
      });
    } catch (error) {
      console.error('Error in explainSelection handler:', error);
      showError('Failed to explain selection. Please try again.');
    }
  } else if (request.action === "explainPage") {
    try {
      // Check license before proceeding
      chrome.runtime.sendMessage({ action: "checkLicense" }, (response) => {
        if (response && response.isValid) {
          const content = extractPageContent();
          showExplanationUI(content.mainContent, 'page');
        } else {
          showLicenseError();
        }
      });
    } catch (error) {
      console.error('Error in explainPage handler:', error);
      showError('Failed to explain page. Please try again.');
    }
  } else if (request.action === "licenseInvalid") {
    showLicenseError();
  }
  return true;
});

// Function to extract content from the page
function extractPageContent() {
  // Get the main content of the page
  const mainContent = document.querySelector('main, article, .content, #content, .main, #main');
  
  if (mainContent) {
    return { mainContent: mainContent.innerText };
  }
  
  // Fallback to body text if no main content container is found
  return { mainContent: document.body.innerText };
}

// Function to process the summary
async function processSummary(content, taskId) {
  try {
    // Get user preferences
    const settings = await chrome.storage.sync.get(['defaultModel', 'defaultMode']);
    const model = settings.defaultModel || 'openai';
    const mode = settings.defaultMode || 'standard';
    
    // Get API key for the selected model
    const apiKey = await getApiKey(model);
    
    if (!apiKey) {
      return {
        status: "error",
        error: "API key not found. Please set up your API key in the extension settings."
      };
    }
    
    // Generate summary based on the model
    let summary;
    switch (model) {
      case 'openai':
        summary = await summarizeWithOpenAI(content, apiKey, mode);
        break;
      case 'gemini':
        summary = await summarizeWithGemini(content, apiKey, mode);
        break;
      case 'mistral':
        summary = await summarizeWithMistral(content, apiKey, mode);
        break;
      case 'deepseek':
        summary = await summarizeWithDeepseek(content, apiKey, mode);
        break;
      case 'anthropic':
        summary = await summarizeWithAnthropic(content, apiKey, mode);
        break;
      default:
        summary = await summarizeWithOpenAI(content, apiKey, mode);
    }
    
    return {
      status: "completed",
      summary: summary
    };
  } catch (error) {
    console.error('Summary processing error:', error);
    return {
      status: "error",
      error: error.message
    };
  }
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

// Summarization functions for different AI models
async function summarizeWithOpenAI(content, apiKey, mode = 'standard') {
  let systemPrompt = '';
  
  // Set system prompt based on summary mode
  switch (mode) {
    case 'bullet':
      systemPrompt = 'Create a comprehensive bullet-point summary that captures all key ideas, main arguments, and important details from the text. Ensure each point is clear, concise, and substantive. Organize points logically and maintain the original meaning and nuance of the content.';
      break;
    case 'detailed':
      systemPrompt = 'Provide a thorough and nuanced explanation of the content, highlighting main concepts, supporting evidence, and contextual information. Include relevant examples that illustrate key points. Maintain the original structure and flow while ensuring all important details are preserved and clearly explained.';
      break;
    case 'tldr':
      systemPrompt = 'Create an extremely concise yet comprehensive TL;DR summary in 1-2 sentences that captures the absolute essence of the content. Focus only on the most critical information while maintaining accuracy and clarity.';
      break;
    case 'academic':
      systemPrompt = 'Provide a scholarly analysis of this academic paper following standard academic review structure. Extract and clearly articulate: 1) the research question and objectives, 2) the methodology and theoretical framework, 3) key findings and evidence presented, 4) main conclusions and their implications, and 5) any limitations or suggestions for future research mentioned.';
      break;
    default: // standard
      systemPrompt = 'Create a clear, accurate, and well-structured summary that captures the essential information from the text. Include main arguments, key supporting points, and important conclusions while maintaining the original meaning and tone. Ensure the summary is concise yet comprehensive.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

async function summarizeWithGemini(content, apiKey, mode = 'standard') {
  let prompt = '';
  
  // Set prompt based on summary mode
  switch (mode) {
    case 'bullet':
      prompt = 'Create a comprehensive bullet-point summary that captures all key ideas, main arguments, and important details from the text. Ensure each point is clear, concise, and substantive. Organize points logically and maintain the original meaning and nuance of the content: ';
      break;
    case 'detailed':
      prompt = 'Provide a thorough and nuanced explanation of the content, highlighting main concepts, supporting evidence, and contextual information. Include relevant examples that illustrate key points. Maintain the original structure and flow while ensuring all important details are preserved and clearly explained: ';
      break;
    case 'tldr':
      prompt = 'Create an extremely concise yet comprehensive TL;DR summary in 1-2 sentences that captures the absolute essence of the content. Focus only on the most critical information while maintaining accuracy and clarity: ';
      break;
    case 'academic':
      prompt = 'Provide a scholarly analysis of this academic paper following standard academic review structure. Extract and clearly articulate: 1) the research question and objectives, 2) the methodology and theoretical framework, 3) key findings and evidence presented, 4) main conclusions and their implications, and 5) any limitations or suggestions for future research mentioned: ';
      break;
    default: // standard
      prompt = 'Create a clear, accurate, and well-structured summary that captures the essential information from the text. Include main arguments, key supporting points, and important conclusions while maintaining the original meaning and tone. Ensure the summary is concise yet comprehensive: ';
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt + content
          }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    // Check if the response structure matches the expected format
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else if (data.contents && data.contents[0] && data.contents[0].parts && data.contents[0].parts[0]) {
      // Alternative response format
      return data.contents[0].parts[0].text;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

async function summarizeWithMistral(content, apiKey, mode = 'standard') {
  let systemPrompt = '';
  
  // Set system prompt based on summary mode
  switch (mode) {
    case 'bullet':
      systemPrompt = 'Create a comprehensive bullet-point summary that captures all key ideas, main arguments, and important details from the text. Ensure each point is clear, concise, and substantive. Organize points logically and maintain the original meaning and nuance of the content.';
      break;
    case 'detailed':
      systemPrompt = 'Provide a thorough and nuanced explanation of the content, highlighting main concepts, supporting evidence, and contextual information. Include relevant examples that illustrate key points. Maintain the original structure and flow while ensuring all important details are preserved and clearly explained.';
      break;
    case 'tldr':
      systemPrompt = 'Create an extremely concise yet comprehensive TL;DR summary in 1-2 sentences that captures the absolute essence of the content. Focus only on the most critical information while maintaining accuracy and clarity.';
      break;
    case 'academic':
      systemPrompt = 'Provide a scholarly analysis of this academic paper following standard academic review structure. Extract and clearly articulate: 1) the research question and objectives, 2) the methodology and theoretical framework, 3) key findings and evidence presented, 4) main conclusions and their implications, and 5) any limitations or suggestions for future research mentioned.';
      break;
    default: // standard
      systemPrompt = 'Create a clear, accurate, and well-structured summary that captures the essential information from the text. Include main arguments, key supporting points, and important conclusions while maintaining the original meaning and tone. Ensure the summary is concise yet comprehensive.';
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw error;
  }
}

async function summarizeWithDeepseek(content, apiKey, mode = 'standard') {
  let systemPrompt = '';
  
  // Set system prompt based on summary mode
  switch (mode) {
    case 'bullet':
      systemPrompt = 'Create a comprehensive bullet-point summary that captures all key ideas, main arguments, and important details from the text. Ensure each point is clear, concise, and substantive. Organize points logically and maintain the original meaning and nuance of the content.';
      break;
    case 'detailed':
      systemPrompt = 'Provide a thorough and nuanced explanation of the content, highlighting main concepts, supporting evidence, and contextual information. Include relevant examples that illustrate key points. Maintain the original structure and flow while ensuring all important details are preserved and clearly explained.';
      break;
    case 'tldr':
      systemPrompt = 'Create an extremely concise yet comprehensive TL;DR summary in 1-2 sentences that captures the absolute essence of the content. Focus only on the most critical information while maintaining accuracy and clarity.';
      break;
    case 'academic':
      systemPrompt = 'Provide a scholarly analysis of this academic paper following standard academic review structure. Extract and clearly articulate: 1) the research question and objectives, 2) the methodology and theoretical framework, 3) key findings and evidence presented, 4) main conclusions and their implications, and 5) any limitations or suggestions for future research mentioned.';
      break;
    default: // standard
      systemPrompt = 'Create a clear, accurate, and well-structured summary that captures the essential information from the text. Include main arguments, key supporting points, and important conclusions while maintaining the original meaning and tone. Ensure the summary is concise yet comprehensive.';
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Deepseek API Error:', error);
    throw error;
  }
}

async function summarizeWithAnthropic(content, apiKey, mode = 'standard') {
  let systemPrompt = '';
  
  // Set system prompt based on summary mode
  switch (mode) {
    case 'bullet':
      systemPrompt = 'Create a comprehensive bullet-point summary that captures all key ideas, main arguments, and important details from the text. Ensure each point is clear, concise, and substantive. Organize points logically and maintain the original meaning and nuance of the content.';
      break;
    case 'detailed':
      systemPrompt = 'Provide a thorough and nuanced explanation of the content, highlighting main concepts, supporting evidence, and contextual information. Include relevant examples that illustrate key points. Maintain the original structure and flow while ensuring all important details are preserved and clearly explained.';
      break;
    case 'tldr':
      systemPrompt = 'Create an extremely concise yet comprehensive TL;DR summary in 1-2 sentences that captures the absolute essence of the content. Focus only on the most critical information while maintaining accuracy and clarity.';
      break;
    case 'academic':
      systemPrompt = 'Provide a scholarly analysis of this academic paper following standard academic review structure. Extract and clearly articulate: 1) the research question and objectives, 2) the methodology and theoretical framework, 3) key findings and evidence presented, 4) main conclusions and their implications, and 5) any limitations or suggestions for future research mentioned.';
      break;
    default: // standard
      systemPrompt = 'Create a clear, accurate, and well-structured summary that captures the essential information from the text. Include main arguments, key supporting points, and important conclusions while maintaining the original meaning and tone. Ensure the summary is concise yet comprehensive.';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${content}` }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
    
  } catch (error) {
    console.error('Anthropic API Error:', error);
    throw error;
  }
}

// Listen for messages from the background script to show summary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showSummary") {
    const content = extractPageContent();
    
    // Load the onscreen summary script if not already loaded
    if (!window.showSummaryUI) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('scripts/onscreen-summary.js');
      script.onload = function() {
        window.showSummaryUI(content.mainContent);
      };
      document.head.appendChild(script);
    } else {
      window.showSummaryUI(content.mainContent);
    }
    
    sendResponse({ success: true });
  }
  return true;
});

// Load required scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Initialize the content script
async function initialize() {
  try {
    // Load required scripts
    await loadScript('scripts/onscreen-summary.js');
    await loadScript('scripts/onscreen-explanation.js');
    
    // Add keyboard shortcut listener for explanation
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + E for page explanation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        const content = extractPageContent();
        showExplanationUI(content.mainContent, 'page');
      }
    });
    
    // Add selection listener for quick explanation
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        // Show quick explanation button near selection
        showQuickExplanationButton(selection);
      }
    });
  } catch (error) {
    console.error('Failed to initialize content script:', error);
  }
}

// Show quick explanation button near selection
function showQuickExplanationButton(selection) {
  // Remove any existing quick explanation button
  const existingButton = document.querySelector('.trae-quick-explanation');
  if (existingButton) {
    existingButton.remove();
  }

  // Create button
  const button = document.createElement('button');
  button.className = 'trae-quick-explanation';
  button.textContent = 'Explain';
  
  // Add styles
  const quickExplanationStyles = document.createElement('style');
  quickExplanationStyles.textContent = `
    .trae-quick-explanation {
      position: fixed;
      z-index: 10000;
      padding: 4px 8px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .trae-quick-explanation:hover {
      background: #0056b3;
    }
    
    @media (prefers-color-scheme: dark) {
      .trae-quick-explanation {
        background: #0056b3;
      }
      
      .trae-quick-explanation:hover {
        background: #003d82;
      }
    }
  `;
  document.head.appendChild(quickExplanationStyles);

  // Position button near selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  button.style.left = `${rect.left + window.scrollX}px`;
  button.style.top = `${rect.bottom + window.scrollY + 5}px`;

  // Add click handler
  button.addEventListener('click', () => {
    showExplanationUI(selection.toString(), 'selection');
    button.remove();
  });

  // Add to document
  document.body.appendChild(button);

  // Remove button after 5 seconds
  setTimeout(() => {
    button.remove();
  }, 5000);
}

// Show license error message
function showLicenseError() {
  // Remove any existing error message
  const existingError = document.querySelector('.trae-license-error');
  if (existingError) {
    existingError.remove();
  }

  // Create error container
  const container = document.createElement('div');
  container.className = 'trae-license-error';
  
  // Create error message
  container.innerHTML = `
    <div class="trae-license-error-content">
      <h3>License Required</h3>
      <p>Please activate your license to use this feature.</p>
      <button class="trae-license-error-button">Activate License</button>
    </div>
  `;

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .trae-license-error {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .trae-license-error-content {
      text-align: center;
    }

    .trae-license-error h3 {
      margin: 0 0 10px 0;
      color: #dc3545;
    }

    .trae-license-error p {
      margin: 0 0 15px 0;
      color: #666;
    }

    .trae-license-error-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .trae-license-error-button:hover {
      background: #0056b3;
    }

    @media (prefers-color-scheme: dark) {
      .trae-license-error {
        background: #1a1a1a;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }

      .trae-license-error h3 {
        color: #ff6b6b;
      }

      .trae-license-error p {
        color: #ccc;
      }

      .trae-license-error-button {
        background: #0056b3;
      }

      .trae-license-error-button:hover {
        background: #003d82;
      }
    }
  `;
  document.head.appendChild(styles);

  // Add to document
  document.body.appendChild(container);

  // Handle button click
  const button = container.querySelector('.trae-license-error-button');
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "openOptions" });
    container.remove();
  });

  // Auto-remove after 10 seconds
  setTimeout(() => {
    container.remove();
  }, 10000);
}

// Show error message
function showError(message) {
  // Remove any existing error message
  const existingError = document.querySelector('.trae-error-message');
  if (existingError) {
    existingError.remove();
  }

  // Create error container
  const container = document.createElement('div');
  container.className = 'trae-error-message';
  
  // Create error message
  container.innerHTML = `
    <div class="trae-error-content">
      <h3>Error</h3>
      <p>${message}</p>
    </div>
  `;

  // Add styles if not already present
  if (!document.querySelector('#trae-error-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'trae-error-styles';
    styleSheet.textContent = `
      .trae-error-message {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: #dc3545;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .trae-error-content h3 {
        margin: 0 0 5px 0;
        font-size: 16px;
      }

      .trae-error-content p {
        margin: 0;
        font-size: 14px;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Add to document
  document.body.appendChild(container);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    container.remove();
  }, 5000);
}

// Initialize when the content script loads
initialize();