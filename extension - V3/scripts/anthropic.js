async function summarizeWithAnthropic(text, apiKey, mode = 'standard') {
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt + text }
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

// Export for use in popup.js
window.summarizeWithAnthropic = summarizeWithAnthropic;