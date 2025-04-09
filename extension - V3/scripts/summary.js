// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('taskId');
const tabId = urlParams.get('tabId');
const title = decodeURIComponent(urlParams.get('title') || '');
const content = decodeURIComponent(urlParams.get('content') || '');
const apiEndpoint = urlParams.get('apiEndpoint');
const apiKey = urlParams.get('apiKey');
const model = urlParams.get('model');

// Update title
document.querySelector('.title').textContent = title || 'Summary';

// Handle close button
document.querySelector('.close-btn').addEventListener('click', () => {
    window.close();
});

// Handle mode selection
const modeSelect = document.getElementById('modeSelect');
modeSelect.addEventListener('change', () => {
    generateSummary(content, modeSelect.value);
});

// Generate summary
async function generateSummary(content, mode) {
    const contentDiv = document.querySelector('.content');
    contentDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>Generating summary...</div>
        </div>
    `;

    try {
        const summary = await callSummaryAPI(content, mode);
        contentDiv.innerHTML = `<div class="summary-text">${summary}</div>`;
    } catch (error) {
        contentDiv.innerHTML = `
            <div class="error">
                Failed to generate summary. Please try again.
                <br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Prepare summary prompt based on mode
function prepareSummaryPrompt(content, mode) {
    const prompts = {
        simple: `Please provide a simple, concise summary of the following content in 2-3 paragraphs:`,
        detailed: `Please provide a detailed summary of the following content, including key points and supporting details:`,
        bullet: `Please provide a bullet-point summary of the following content, highlighting the main points:`,
        'key-points': `Please extract and explain the key points from the following content:`
    };

    return `${prompts[mode]}\n\n${content}`;
}

// Call the summary API
async function callSummaryAPI(content, mode) {
    if (!apiEndpoint || !apiKey) {
        throw new Error('API configuration is missing');
    }

    let requestBody;
    let headers = {
        'Content-Type': 'application/json'
    };

    // Configure request based on model
    switch (model) {
        case 'openai':
            headers['Authorization'] = `Bearer ${apiKey}`;
            requestBody = {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: prepareSummaryPrompt(content, mode)
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            };
            break;
        case 'gemini':
            requestBody = {
                contents: [{
                    parts: [{
                        text: prepareSummaryPrompt(content, mode)
                    }]
                }]
            };
            apiEndpoint += `?key=${apiKey}`;
            break;
        case 'anthropic':
            headers['x-api-key'] = apiKey;
            requestBody = {
                model: 'claude-3-opus-20240229',
                messages: [
                    {
                        role: 'user',
                        content: prepareSummaryPrompt(content, mode)
                    }
                ]
            };
            break;
        case 'mistral':
        case 'deepseek':
            headers['Authorization'] = `Bearer ${apiKey}`;
            requestBody = {
                model: model === 'mistral' ? 'mistral-tiny' : 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prepareSummaryPrompt(content, mode)
                    }
                ]
            };
            break;
        default:
            throw new Error('Unsupported model');
    }

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    switch (model) {
        case 'openai':
        case 'mistral':
        case 'deepseek':
            return data.choices[0].message.content.trim();
        case 'gemini':
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text.trim();
            }
            throw new Error('Invalid Gemini API response format');
        case 'anthropic':
            if (data.content && data.content[0]) {
                return data.content[0].text.trim();
            }
            throw new Error('Invalid Anthropic API response format');
        default:
            throw new Error('Unsupported model');
    }
}

// Initialize dark mode based on system preference
function initializeTheme() {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
});

// Initialize
initializeTheme();
generateSummary(content, 'simple'); 