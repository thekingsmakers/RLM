// Onscreen summary functionality for Redom Web Summarizer

// Create and inject styles if not already present
if (!document.getElementById('trae-summary-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'trae-summary-styles';
    styleSheet.textContent = `
    .trae-summary-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .trae-summary-card {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .trae-summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #eee;
    }

    .trae-summary-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0;
    }

    .trae-summary-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
    }

    .trae-summary-content {
        padding: 24px;
        overflow-y: auto;
        flex-grow: 1;
    }

    .trae-summary-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #666;
    }

    .trae-summary-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .trae-summary-options {
        margin-top: 16px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .trae-summary-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        color: #333;
        background: white;
    }

    .trae-summary-error {
        color: #dc3545;
        padding: 16px;
        text-align: center;
        background: #fff5f5;
        border-radius: 8px;
        margin-top: 16px;
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
        .trae-summary-container {
            background: #1a1a1a;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .trae-summary-header {
            border-bottom-color: #333;
        }

        .trae-summary-title {
            color: #fff;
        }

        .trae-summary-close {
            color: #999;
        }

        .trae-summary-content {
            color: #e0e0e0;
        }

        .trae-summary-options {
            background: #2a2a2a;
        }

        .trae-summary-select {
            background: #333;
            border-color: #444;
            color: #fff;
        }

        .trae-summary-error {
            background: #2a1f1f;
        }
    }
    `;
    document.head.appendChild(styleSheet);
}

// Function to create and show the summary UI
function showSummaryUI(content) {
    // Remove any existing summary UI
    const existingUI = document.querySelector('.trae-summary-container');
    if (existingUI) {
        existingUI.remove();
    }

    // Create the summary container
    const container = document.createElement('div');
    container.className = 'trae-summary-container';
    
    // Create the card structure
    container.innerHTML = `
        <div class="trae-summary-card">
            <div class="trae-summary-header">
                <h2 class="trae-summary-title">Summary</h2>
                <button class="trae-summary-close">&times;</button>
            </div>
            <div class="trae-summary-content">
                <div class="trae-summary-loading">
                    <div class="trae-summary-spinner"></div>
                    <div>Generating summary...</div>
                </div>
                <div class="trae-summary-options">
                    <select class="trae-summary-select">
                        <option value="standard">Standard Summary</option>
                        <option value="bullet">Bullet Points</option>
                        <option value="detailed">Detailed Analysis</option>
                        <option value="tldr">TL;DR</option>
                        <option value="academic">Academic Style</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    // Add to document
    document.body.appendChild(container);

    // Get elements
    const closeButton = container.querySelector('.trae-summary-close');
    const contentArea = container.querySelector('.trae-summary-content');
    const loadingIndicator = container.querySelector('.trae-summary-loading');
    const summarySelect = container.querySelector('.trae-summary-select');

    // Load user's preferred summary mode
    chrome.storage.sync.get(['defaultSummaryMode'], (result) => {
        if (result.defaultSummaryMode) {
            summarySelect.value = result.defaultSummaryMode;
        }
    });

    // Handle close button
    closeButton.addEventListener('click', () => {
        container.remove();
    });

    // Function to process with selected mode
    async function processWithSelectedMode() {
        const selectedMode = summarySelect.value;
        loadingIndicator.style.display = 'flex';
        
        try {
            // Get API key from storage
            const { apiKey } = await chrome.storage.sync.get(['apiKey']);
            if (!apiKey) {
                throw new Error('API key not found. Please set your API key in the extension settings.');
            }

            // Get the selected model
            const { selectedModel } = await chrome.storage.sync.get(['selectedModel']);
            
            let summary;
            switch (selectedModel) {
                case 'openai':
                    summary = await generateOpenAISummary(content, selectedMode, apiKey);
                    break;
                case 'gemini':
                    summary = await generateGeminiSummary(content, selectedMode, apiKey);
                    break;
                case 'mistral':
                    summary = await generateMistralSummary(content, selectedMode, apiKey);
                    break;
                case 'deepseek':
                    summary = await generateDeepseekSummary(content, selectedMode, apiKey);
                    break;
                case 'anthropic':
                    summary = await generateAnthropicSummary(content, selectedMode, apiKey);
                    break;
                default:
                    throw new Error('No AI model selected. Please choose a model in the extension settings.');
            }

            // Hide loading indicator and show summary
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `
                <div style="white-space: pre-wrap;">${summary}</div>
                <div class="trae-summary-options">
                    <select class="trae-summary-select">
                        <option value="standard">Standard Summary</option>
                        <option value="bullet">Bullet Points</option>
                        <option value="detailed">Detailed Analysis</option>
                        <option value="tldr">TL;DR</option>
                        <option value="academic">Academic Style</option>
                    </select>
                </div>
            `;

            // Reattach event listener to new select element
            const newSummarySelect = contentArea.querySelector('.trae-summary-select');
            newSummarySelect.value = selectedMode;
            newSummarySelect.addEventListener('change', processWithSelectedMode);

        } catch (error) {
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `
                <div class="trae-summary-error">
                    ${error.message}
                </div>
                <div class="trae-summary-options">
                    <select class="trae-summary-select">
                        <option value="standard">Standard Summary</option>
                        <option value="bullet">Bullet Points</option>
                        <option value="detailed">Detailed Analysis</option>
                        <option value="tldr">TL;DR</option>
                        <option value="academic">Academic Style</option>
                    </select>
                </div>
            `;

            // Reattach event listener to new select element
            const newSummarySelect = contentArea.querySelector('.trae-summary-select');
            newSummarySelect.value = selectedMode;
            newSummarySelect.addEventListener('change', processWithSelectedMode);
        }
    }

    // Handle mode selection
    summarySelect.addEventListener('change', processWithSelectedMode);

    // Start initial processing
    processWithSelectedMode();
}

// Export the function
window.showSummaryUI = showSummaryUI; 