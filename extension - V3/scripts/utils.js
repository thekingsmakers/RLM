/**
 * Utility functions for the Redom Web Summarizer extension
 */

// Theme management
const ThemeManager = {
  // Initialize theme based on user preference or system preference
  init: function() {
    chrome.storage.sync.get(['theme'], (result) => {
      const savedTheme = result.theme;
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        // Use system preference as default
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.setTheme('dark');
        } else {
          this.setTheme('light');
        }
      }
    });

    // Add listener for theme toggle switches
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.setTheme(e.target.checked ? 'dark' : 'light');
      });
    });
  },

  // Set theme and save preference
  setTheme: function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    chrome.storage.sync.set({ theme: theme });
    
    // Update any theme toggle switches
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
      toggle.checked = (theme === 'dark');
    });
  },

  // Toggle between light and dark themes
  toggleTheme: function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }
};

// API connectivity testing
const ApiTester = {
  // Test API connectivity for a specific model
  testConnection: async function(model, apiKey) {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }

    const testEndpoints = {
      'openai': 'https://api.openai.com/v1/models',
      'anthropic': 'https://api.anthropic.com/v1/messages',
      'gemini': 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey,
      'mistral': 'https://api.mistral.ai/v1/models',
      'deepseek': 'https://api.deepseek.com/v1/models'
    };

    const headers = {
      'openai': { 'Authorization': `Bearer ${apiKey}` },
      'anthropic': { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      'gemini': {}, // API key is in the URL
      'mistral': { 'Authorization': `Bearer ${apiKey}` },
      'deepseek': { 'Authorization': `Bearer ${apiKey}` }
    };

    try {
      const response = await fetch(testEndpoints[model], {
        method: 'GET',
        headers: headers[model]
      });

      if (response.ok) {
        return { 
          success: true, 
          message: 'Connection successful! Your API key is valid.'
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          message: `Connection failed: ${response.status} ${response.statusText}`,
          details: errorData.error?.message || ''
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Connection error: ${error.message}`,
      };
    }
  }
};

// Summary explanation provider
const ExplanationProvider = {
  // Get explanation for a specific model and mode
  getModelExplanation: function(model) {
    const explanations = {
      'openai': 'OpenAI GPT-4 is a large language model known for its strong reasoning capabilities and broad knowledge. It excels at understanding context and generating coherent, relevant summaries.',
      'anthropic': 'Claude 3 Opus by Anthropic is designed to be helpful, harmless, and honest. It provides nuanced summaries with strong reasoning and understanding of complex topics.',
      'gemini': 'Google Gemini is a multimodal AI model that can understand and process text, images, and other data types. It provides comprehensive summaries with strong contextual understanding.',
      'mistral': 'Mistral AI models are efficient language models that provide high-quality summaries while being computationally efficient.',
      'deepseek': 'DeepSeek is an advanced language model that excels at understanding and summarizing complex information with high accuracy.'
    };

    return explanations[model] || 'This model processes your content and generates a summary based on the selected mode.';
  },

  getModeExplanation: function(mode) {
    const explanations = {
      'standard': 'Creates a balanced summary that captures the essential information while maintaining clarity and brevity.',
      'bullet': 'Organizes key points into a bullet-point format for easy scanning and quick comprehension.',
      'detailed': 'Provides an in-depth explanation that preserves nuance and includes supporting details.',
      'tldr': 'Generates an extremely concise 1-2 sentence summary focusing only on the most critical information.',
      'academic': 'Follows academic paper review structure to analyze research questions, methodology, findings, and implications.'
    };

    return explanations[mode] || 'This mode determines how your content will be processed and summarized.';
  },

  // Get full explanation HTML for the current model and mode
  getFullExplanation: function(model, mode) {
    const modelExplanation = this.getModelExplanation(model);
    const modeExplanation = this.getModeExplanation(mode);
    
    return `
      <div class="explanation-card">
        <h3>About Your Summary</h3>
        <div class="explanation-section">
          <h4>Model: ${this.getModelDisplayName(model)}</h4>
          <p>${modelExplanation}</p>
        </div>
        <div class="explanation-section">
          <h4>Summary Mode: ${this.getModeDisplayName(mode)}</h4>
          <p>${modeExplanation}</p>
        </div>
      </div>
    `;
  },

  // Helper functions to get display names
  getModelDisplayName: function(model) {
    const displayNames = {
      'openai': 'OpenAI GPT-4',
      'anthropic': 'Anthropic Claude 3',
      'gemini': 'Google Gemini',
      'mistral': 'Mistral AI',
      'deepseek': 'DeepSeek'
    };
    return displayNames[model] || model;
  },

  getModeDisplayName: function(mode) {
    const displayNames = {
      'standard': 'Standard Summary',
      'bullet': 'Bullet Points',
      'detailed': 'Detailed Explanation',
      'tldr': 'TL;DR',
      'academic': 'Academic Analysis'
    };
    return displayNames[mode] || mode;
  }
};

// Export utilities for use in other scripts
window.ThemeManager = ThemeManager;
window.ApiTester = ApiTester;
window.ExplanationProvider = ExplanationProvider;