// Summary generation logic

// Summary modes
const SUMMARY_MODES = {
    STANDARD: 'standard',
    BULLETS: 'bullets',
    DETAILED: 'detailed',
    TLDR: 'tldr',
    ACADEMIC: 'academic'
};

// Generate summary based on content and mode
async function generateSummary(content, mode = SUMMARY_MODES.STANDARD) {
    try {
        // Validate input
        if (!content || typeof content !== 'string') {
            throw new Error('Invalid content provided');
        }

        // Prepare the prompt based on mode
        const prompt = preparePrompt(content, mode);
        
        // Call the API to generate summary
        const summary = await callSummaryAPI(prompt);
        
        // Format the summary based on mode
        return formatSummary(summary, mode);
    } catch (error) {
        console.error('Summary generation failed:', error);
        throw error;
    }
}

// Prepare the prompt based on mode
function preparePrompt(content, mode) {
    const basePrompt = 'Please summarize the following text';
    const modeSpecificInstructions = {
        [SUMMARY_MODES.STANDARD]: 'in a clear and concise way',
        [SUMMARY_MODES.BULLETS]: 'as bullet points highlighting key information',
        [SUMMARY_MODES.DETAILED]: 'in detail, preserving important nuances',
        [SUMMARY_MODES.TLDR]: 'in a very brief, TL;DR format',
        [SUMMARY_MODES.ACADEMIC]: 'in an academic style with proper citations'
    };

    return `${basePrompt} ${modeSpecificInstructions[mode]}: ${content}`;
}

// Call the summary API
async function callSummaryAPI(prompt) {
    // TODO: Replace with actual API call
    // This is a placeholder that should be replaced with your chosen API
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
    return data.summary;
}

// Format the summary based on mode
function formatSummary(summary, mode) {
    switch (mode) {
        case SUMMARY_MODES.BULLETS:
            return formatBulletPoints(summary);
        case SUMMARY_MODES.ACADEMIC:
            return formatAcademic(summary);
        default:
            return summary;
    }
}

// Format summary as bullet points
function formatBulletPoints(summary) {
    return summary
        .split('\n')
        .filter(line => line.trim())
        .map(line => `• ${line.trim()}`)
        .join('\n');
}

// Format summary in academic style
function formatAcademic(summary) {
    // Add academic formatting (citations, references, etc.)
    return summary;
}

// Export functions and constants
window.SUMMARY_MODES = SUMMARY_MODES;
window.generateSummary = generateSummary; 