document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const summaryModeSelect = document.getElementById('summaryMode');
  const aiModelSelect = document.getElementById('aiModel');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const summaryOutput = document.getElementById('summaryOutput');
  const progressBar = document.getElementById('progressBar');
  const copyBtn = document.getElementById('copyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const explainBtn = document.getElementById('explainBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const explanationSection = document.getElementById('explanationSection');
  const themeToggle = document.getElementById('themeToggle');
  const modelInfoIcon = document.getElementById('modelInfoIcon');
  const modeInfoIcon = document.getElementById('modeInfoIcon');
  
  // Check license status immediately
  checkLicenseStatus();
  
  // Initialize theme
  ThemeManager.init();
  
  // Setup event listeners for info icons
  modelInfoIcon.addEventListener('click', function() {
    const modelExplanation = ExplanationProvider.getModelExplanation(aiModelSelect.value);
    alert(ExplanationProvider.getModelDisplayName(aiModelSelect.value) + '\n\n' + modelExplanation);
  });
  
  modeInfoIcon.addEventListener('click', function() {
    const modeExplanation = ExplanationProvider.getModeExplanation(summaryModeSelect.value);
    alert(ExplanationProvider.getModeDisplayName(summaryModeSelect.value) + '\n\n' + modeExplanation);
  });
  
  // Check license status
  function checkLicenseStatus() {
    chrome.runtime.sendMessage({action: 'checkLicense'}, function(response) {
      if (!response || !response.isValid) {
        // License is invalid or expired
        disableExtensionFunctionality();
        showLicenseWarning();
      } else {
        // License is valid
        loadUserPreferences();
      }
    });
  }
  
  // Disable extension functionality when license is invalid
  function disableExtensionFunctionality() {
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'License Required';
    summaryOutput.innerHTML = '<div class="license-warning">⚠️ Your license has expired or is not activated. Please visit the settings page to manage your license.</div>';
  }
  
  // Show license warning
  function showLicenseWarning() {
    const warningEl = document.createElement('div');
    warningEl.className = 'license-banner';
    warningEl.innerHTML = '<span>⚠️ License required</span><button id="goToLicense" class="license-btn">Activate License</button>';
    document.querySelector('.container').prepend(warningEl);
    
    document.getElementById('goToLicense').addEventListener('click', function() {
      chrome.runtime.openOptionsPage(function() {
        // Navigate to license page after options page opens
        setTimeout(() => {
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'navigateToLicense'});
          });
        }, 500);
      });
    });
  }
  
  // Load user preferences
  function loadUserPreferences() {
    chrome.storage.sync.get(['defaultModel', 'defaultMode', 'alwaysUseDefaultAI'], function(settings) {
      if (settings.defaultModel) {
        aiModelSelect.value = settings.defaultModel;
      }
      
      if (settings.defaultMode) {
        summaryModeSelect.value = settings.defaultMode;
      }
      
      // If always use default AI is enabled, disable the AI model select
      if (settings.alwaysUseDefaultAI && settings.defaultModel) {
        aiModelSelect.disabled = true;
        aiModelSelect.value = settings.defaultModel;
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        lockIcon.title = 'Default AI model is locked in settings';
        aiModelSelect.parentNode.appendChild(lockIcon);
      }
    });
  }
  
  // Setup explanation button
  explainBtn.addEventListener('click', function() {
    if (explanationSection.classList.contains('hidden')) {
      explanationSection.innerHTML = ExplanationProvider.getFullExplanation(aiModelSelect.value, summaryModeSelect.value);
      explanationSection.classList.remove('hidden');
      explainBtn.querySelector('.button-icon').textContent = '❌';
      explainBtn.querySelector('.button-icon').nextSibling.textContent = ' Hide';
    } else {
      explanationSection.classList.add('hidden');
      explainBtn.querySelector('.button-icon').textContent = 'ℹ️';
      explainBtn.querySelector('.button-icon').nextSibling.textContent = ' Explain';
    }
  });
  
  // Load scripts for different AI models
  function loadScripts() {
    return new Promise((resolve) => {
      const scripts = [
        'scripts/openai.js',
        'scripts/gemini.js',
        'scripts/mistral.js',
        'scripts/deepseek.js',
        'scripts/anthropic.js'
      ];
      
      let loaded = 0;
      scripts.forEach(script => {
        const scriptEl = document.createElement('script');
        scriptEl.src = script;
        scriptEl.onload = () => {
          loaded++;
          if (loaded === scripts.length) {
            resolve();
          }
        };
        document.head.appendChild(scriptEl);
      });
    });
  }
  
  // Extract content from the active tab
  async function getPageContent() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getContent"}, function(response) {
          if (response && response.content) {
            resolve(response.content);
          } else {
            // If content script hasn't injected or failed, inject it
            chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              function: () => {
                // Simple content extraction
                const content = document.body.innerText;
                return content;
              }
            }, (results) => {
              if (results && results[0] && results[0].result) {
                resolve(results[0].result);
              } else {
                resolve('Failed to extract content from page.');
              }
            });
          }
        });
      });
    });
  }
  
  // Get API key for selected model
  function getApiKey(model) {
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
  
  // Summarize content using selected AI model
  async function summarizeContent(content, model, mode) {
    const apiKey = await getApiKey(model);
    
    if (!apiKey) {
      return 'Please set up your API key in the extension settings.';
    }
    
    try {
      // Show model and mode information in the summary output while waiting
      summaryOutput.innerHTML = `
        <div class="summary-loading">
          <div class="spinner"></div>
          <p>Generating summary using ${ExplanationProvider.getModelDisplayName(model)} in ${ExplanationProvider.getModeDisplayName(mode)} mode...</p>
        </div>
      `;
      
      // Disable summarize button and show progress
      summarizeBtn.disabled = true;
      progressBar.style.display = 'block';
      progressBar.style.width = '50%';
      
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
          summary = 'Invalid model selection';
      }
      
      // Complete progress bar
      progressBar.style.width = '100%';
      
      // Enable copy and save buttons
      copyBtn.disabled = false;
      saveBtn.disabled = false;
      
      return summary;
    } catch (error) {
      console.error('Summarization error:', error);
      return `Error generating summary: ${error.message}`;
    } finally {
      // Re-enable summarize button and hide progress bar after a delay
      setTimeout(() => {
        summarizeBtn.disabled = false;
        progressBar.style.display = 'none';
        progressBar.style.width = '0%';
      }, 500);
    }
  }
  
  // Initialize the popup
  async function init() {
    await loadScripts();
    
    // Load saved preferences
    chrome.storage.sync.get(['defaultModel', 'defaultMode'], function(result) {
      if (result.defaultModel) aiModel.value = result.defaultModel;
      if (result.defaultMode) summaryMode.value = result.defaultMode;
    });
  }
  
  // Event listeners
  summarizeBtn.addEventListener('click', async function() {
    try {
      // Hide explanation section if visible
      if (!explanationSection.classList.contains('hidden')) {
        explanationSection.classList.add('hidden');
        explainBtn.querySelector('.button-icon').textContent = 'ℹ️';
        explainBtn.querySelector('.button-icon').nextSibling.textContent = ' Explain';
      }
      
      // Show progress
      progressBar.style.display = 'block';
      progressBar.style.width = '30%';
      summaryOutput.textContent = 'Extracting content...';
      
      // Disable buttons during processing
      summarizeBtn.disabled = true;
      
      // Get page content
      const content = await getPageContent();
      progressBar.style.width = '60%';
      summaryOutput.textContent = 'Summarizing...';
      
      // Summarize content
      const summary = await summarizeContent(
        content,
        aiModel.value,
        summaryMode.value
      );
      
      // Display summary
      progressBar.style.width = '100%';
      summaryOutput.innerHTML = `<div class="summary-content">${summary.replace(/\n/g, '<br>')}</div>`;
      
      // Enable action buttons
      copyBtn.disabled = false;
      saveBtn.disabled = false;
      
      // Hide progress bar after completion
      setTimeout(() => {
        progressBar.style.display = 'none';
        progressBar.style.width = '0%';
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      summaryOutput.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
      progressBar.style.display = 'none';
    } finally {
      // Re-enable summarize button
      summarizeBtn.disabled = false;
    }
  });
  
  copyBtn.addEventListener('click', function() {
    const summaryText = summaryOutput.textContent;
    navigator.clipboard.writeText(summaryText).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="button-icon">✓</span> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
  });
  
  saveBtn.addEventListener('click', function() {
    const summaryText = summaryOutput.textContent;
    const blob = new Blob([summaryText], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="button-icon">✓</span> Saved!';
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
    }, 2000);
  });
  
  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // Initialize
  init();
});