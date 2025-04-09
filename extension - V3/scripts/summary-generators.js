// Summary generation functions for different AI models

// OpenAI summary generation
async function generateOpenAISummary(content, mode, apiKey) {
    const prompt = getPromptForMode(mode, content);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise and informative summaries.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate summary with OpenAI');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Gemini summary generation
async function generateGeminiSummary(content, mode, apiKey) {
    const prompt = getPromptForMode(mode, content);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500
            }
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate summary with Gemini');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
}

// Mistral summary generation
async function generateMistralSummary(content, mode, apiKey) {
    const prompt = getPromptForMode(mode, content);
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-tiny',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise and informative summaries.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate summary with Mistral');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Deepseek summary generation
async function generateDeepseekSummary(content, mode, apiKey) {
    const prompt = getPromptForMode(mode, content);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise and informative summaries.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate summary with Deepseek');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Anthropic summary generation
async function generateAnthropicSummary(content, mode, apiKey) {
    const prompt = getPromptForMode(mode, content);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-2',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate summary with Anthropic');
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

// Helper function to get the appropriate prompt based on the selected mode
function getPromptForMode(mode, content) {
    const basePrompt = `Please summarize the following content: ${content}\n\n`;
    
    switch (mode) {
        case 'standard':
            return `${basePrompt}Provide a clear and concise summary of the main points.`;
        case 'bullet':
            return `${basePrompt}Create a bullet-point list of the key points and takeaways.`;
        case 'detailed':
            return `${basePrompt}Provide a comprehensive analysis with supporting details and examples.`;
        case 'tldr':
            return `${basePrompt}Give a very brief summary in 2-3 sentences maximum.`;
        case 'academic':
            return `${basePrompt}Create a formal academic summary with proper citations and scholarly tone.`;
        default:
            return basePrompt;
    }
}

// Export all summary generation functions
window.generateOpenAISummary = generateOpenAISummary;
window.generateGeminiSummary = generateGeminiSummary;
window.generateMistralSummary = generateMistralSummary;
window.generateDeepseekSummary = generateDeepseekSummary;
window.generateAnthropicSummary = generateAnthropicSummary; 