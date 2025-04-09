// Onscreen explanation functionality

// Create and show the explanation UI
function showExplanationUI(content, type = 'page') {
    // Remove any existing explanation UI
    const existingUI = document.querySelector('.trae-explanation-container');
    if (existingUI) {
        existingUI.remove();
    }

    // Create the explanation container
    const container = document.createElement('div');
    container.className = 'trae-explanation-container';
    
    // Create the card structure
    container.innerHTML = `
        <div class="trae-explanation-card">
            <div class="trae-explanation-header">
                <h2 class="trae-explanation-title">${type === 'selection' ? 'Selection Explanation' : 'Page Explanation'}</h2>
                <button class="trae-explanation-close">&times;</button>
            </div>
            <div class="trae-explanation-content">
                <div class="trae-explanation-loading">
                    <div class="trae-explanation-spinner"></div>
                    <div>Generating explanation...</div>
                </div>
                <div class="trae-explanation-options">
                    <select class="trae-explanation-select">
                        <option value="simple">Simple Explanation</option>
                        <option value="detailed">Detailed Explanation</option>
                        <option value="technical">Technical Analysis</option>
                        <option value="educational">Educational Breakdown</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .trae-explanation-container {
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

        .trae-explanation-card {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .trae-explanation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid #eee;
        }

        .trae-explanation-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0;
        }

        .trae-explanation-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
            padding: 4px;
            line-height: 1;
        }

        .trae-explanation-content {
            padding: 24px;
            overflow-y: auto;
            flex-grow: 1;
        }

        .trae-explanation-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #666;
        }

        .trae-explanation-spinner {
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

        .trae-explanation-options {
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .trae-explanation-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            color: #333;
            background: white;
        }

        .trae-explanation-error {
            color: #dc3545;
            padding: 16px;
            text-align: center;
            background: #fff5f5;
            border-radius: 8px;
            margin-top: 16px;
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
            .trae-explanation-container {
                background: #1a1a1a;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .trae-explanation-header {
                border-bottom-color: #333;
            }

            .trae-explanation-title {
                color: #fff;
            }

            .trae-explanation-close {
                color: #999;
            }

            .trae-explanation-content {
                color: #e0e0e0;
            }

            .trae-explanation-options {
                background: #2a2a2a;
            }

            .trae-explanation-select {
                background: #333;
                border-color: #444;
                color: #fff;
            }

            .trae-explanation-error {
                background: #2a1f1f;
            }
        }
    `;
    document.head.appendChild(styles);

    // Add to document
    document.body.appendChild(container);

    // Get elements
    const closeButton = container.querySelector('.trae-explanation-close');
    const contentArea = container.querySelector('.trae-explanation-content');
    const loadingIndicator = container.querySelector('.trae-explanation-loading');
    const explanationSelect = container.querySelector('.trae-explanation-select');

    // Handle close button
    closeButton.addEventListener('click', () => {
        container.remove();
    });

    // Function to process with selected mode
    async function processWithSelectedMode() {
        const selectedMode = explanationSelect.value;
        loadingIndicator.style.display = 'flex';
        
        try {
            const explanation = await generateExplanation(content, selectedMode);
            
            // Hide loading indicator and show explanation
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `
                <div style="white-space: pre-wrap;">${explanation}</div>
                <div class="trae-explanation-options">
                    <select class="trae-explanation-select">
                        <option value="simple">Simple Explanation</option>
                        <option value="detailed">Detailed Explanation</option>
                        <option value="technical">Technical Analysis</option>
                        <option value="educational">Educational Breakdown</option>
                    </select>
                </div>
            `;

            // Reattach event listener to new select element
            const newExplanationSelect = contentArea.querySelector('.trae-explanation-select');
            newExplanationSelect.value = selectedMode;
            newExplanationSelect.addEventListener('change', processWithSelectedMode);

        } catch (error) {
            loadingIndicator.style.display = 'none';
            contentArea.innerHTML = `
                <div class="trae-explanation-error">
                    ${error.message}
                </div>
                <div class="trae-explanation-options">
                    <select class="trae-explanation-select">
                        <option value="simple">Simple Explanation</option>
                        <option value="detailed">Detailed Explanation</option>
                        <option value="technical">Technical Analysis</option>
                        <option value="educational">Educational Breakdown</option>
                    </select>
                </div>
            `;

            // Reattach event listener to new select element
            const newExplanationSelect = contentArea.querySelector('.trae-explanation-select');
            newExplanationSelect.value = selectedMode;
            newExplanationSelect.addEventListener('change', processWithSelectedMode);
        }
    }

    // Handle mode selection
    explanationSelect.addEventListener('change', processWithSelectedMode);

    // Start initial processing
    processWithSelectedMode();
}

// Generate explanation based on content and mode
async function generateExplanation(content, mode) {
    const prompt = prepareExplanationPrompt(content, mode);
    return await callExplanationAPI(prompt);
}

// Prepare the prompt based on mode
function prepareExplanationPrompt(content, mode) {
    const basePrompt = 'Please explain the following content';
    const modeSpecificInstructions = {
        'simple': 'in simple terms that anyone can understand',
        'detailed': 'in detail, covering all important aspects',
        'technical': 'from a technical perspective, including relevant concepts and terminology',
        'educational': 'in an educational way, breaking down complex ideas into understandable parts'
    };

    return `${basePrompt} ${modeSpecificInstructions[mode]}: ${content}`;
}

// Call the explanation API
async function callExplanationAPI(prompt) {
    // TODO: Replace with actual API call
    const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    return data.explanation;
}

// Export functions
window.showExplanationUI = showExplanationUI; 