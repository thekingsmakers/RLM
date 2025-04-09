// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('taskId');
const tabId = urlParams.get('tabId');
const title = decodeURIComponent(urlParams.get('title') || '');
const content = decodeURIComponent(urlParams.get('content') || '');
const apiEndpoint = decodeURIComponent(urlParams.get('apiEndpoint') || '');
const apiKey = decodeURIComponent(urlParams.get('apiKey') || '');
const model = decodeURIComponent(urlParams.get('model') || 'gpt-3.5-turbo');

// Update title
document.querySelector('.title').textContent = title;

// Handle close button
document.querySelector('.close-button').addEventListener('click', () => {
  window.close();
});

// Handle mode selection
const modeSelect = document.getElementById('mode');
modeSelect.addEventListener('change', () => {
  generateExplanation(content, modeSelect.value);
});

// Generate explanation
async function generateExplanation(content, mode) {
  const loading = document.querySelector('.loading');
  const explanation = document.querySelector('.explanation');
  
  try {
    // Show loading state
    loading.classList.add('active');
    explanation.textContent = '';
    
    // Check if API is configured
    if (!apiEndpoint || !apiKey) {
      throw new Error('API not configured. Please configure the API settings in the extension options.');
    }
    
    // Prepare the prompt based on mode
    const prompt = prepareExplanationPrompt(content, mode);
    
    // Call the API to get the explanation
    const response = await callExplanationAPI(prompt);
    
    // Display the explanation
    explanation.textContent = response;
  } catch (error) {
    console.error('Error generating explanation:', error);
    explanation.innerHTML = `<div class="error">Failed to generate explanation: ${error.message}</div>`;
  } finally {
    loading.classList.remove('active');
  }
}

// Prepare the explanation prompt based on mode
function prepareExplanationPrompt(content, mode) {
  const prompts = {
    simple: `Please provide a simple, easy-to-understand explanation of the following text. Focus on the main ideas and use clear, straightforward language:`,
    detailed: `Please provide a detailed explanation of the following text. Include all important points, supporting details, and relevant context:`,
    technical: `Please provide a technical analysis of the following text. Focus on technical details, specifications, and implementation aspects:`,
    educational: `Please provide an educational breakdown of the following text. Explain concepts step by step, include examples, and highlight key learning points:`
  };
  
  return `${prompts[mode]}\n\n${content}`;
}

// Call the explanation API
async function callExplanationAPI(prompt) {
  try {
    let headers = {
      'Content-Type': 'application/json'
    };
    
    let requestBody;
    let endpoint = apiEndpoint;
    
    // Configure request based on model
    switch (model) {
      case 'openai':
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides clear and accurate explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };
        break;
        
      case 'gemini':
        requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        };
        endpoint = `${apiEndpoint}?key=${apiKey}`;
        break;
        
      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody = {
          model: 'claude-3-opus-20240229',
          messages: [
            { role: 'user', content: prompt }
          ]
        };
        break;
        
      case 'mistral':
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model: 'mistral-tiny',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides clear and accurate explanations.' },
            { role: 'user', content: prompt }
          ]
        };
        break;
        
      case 'deepseek':
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides clear and accurate explanations.' },
            { role: 'user', content: prompt }
          ]
        };
        break;
        
      default:
        throw new Error('Unsupported model');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
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
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error('Failed to generate explanation. Please check your API configuration and try again.');
  }
}

// Generate initial explanation
generateExplanation(content, 'simple'); 