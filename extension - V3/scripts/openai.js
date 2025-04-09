async function summarizeWithOpenAI(text, apiKey, mode = 'standard') {
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
          { role: 'user', content: text }
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

// Export for use in popup.js
window.summarizeWithOpenAI = summarizeWithOpenAI;