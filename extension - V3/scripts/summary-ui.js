// UI components for displaying summaries

// Create and show the summary interface
function createSummaryUI() {
    // Create container
    const container = document.createElement('div');
    container.id = 'ai-summary-container';
    container.className = 'ai-summary-container';
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .ai-summary-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .ai-summary-container.dark-mode {
            background: #1a1a1a;
            color: #ffffff;
        }
        
        .ai-summary-header {
            padding: 12px 16px;
            background: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .dark-mode .ai-summary-header {
            background: #2d2d2d;
            border-bottom-color: #404040;
        }
        
        .ai-summary-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .ai-summary-controls {
            display: flex;
            gap: 8px;
        }
        
        .ai-summary-button {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
            font-size: 12px;
        }
        
        .ai-summary-button:hover {
            background: #0056b3;
        }
        
        .ai-summary-content {
            padding: 16px;
            overflow-y: auto;
            max-height: calc(80vh - 60px);
        }
        
        .ai-summary-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .ai-summary-error {
            color: #dc3545;
            padding: 16px;
            text-align: center;
        }
        
        .ai-summary-mode-selector {
            margin-bottom: 16px;
        }
        
        .ai-summary-mode-selector select {
            width: 100%;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
        }
        
        .dark-mode .ai-summary-mode-selector select {
            background: #2d2d2d;
            border-color: #404040;
            color: white;
        }
    `;
    document.head.appendChild(styles);
    
    // Create header
    const header = document.createElement('div');
    header.className = 'ai-summary-header';
    header.innerHTML = `
        <h3 class="ai-summary-title">AI Summary</h3>
        <div class="ai-summary-controls">
            <button class="ai-summary-button" id="ai-summary-minimize">_</button>
            <button class="ai-summary-button" id="ai-summary-close">×</button>
        </div>
    `;
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'ai-summary-content';
    content.innerHTML = `
        <div class="ai-summary-mode-selector">
            <select id="ai-summary-mode">
                <option value="standard">Standard Summary</option>
                <option value="bullets">Bullet Points</option>
                <option value="detailed">Detailed Analysis</option>
                <option value="tldr">TL;DR</option>
                <option value="academic">Academic Style</option>
            </select>
        </div>
        <div id="ai-summary-text"></div>
    `;
    
    // Add elements to container
    container.appendChild(header);
    container.appendChild(content);
    
    // Add event listeners
    document.getElementById('ai-summary-minimize').addEventListener('click', () => {
        container.style.transform = 'translateY(calc(-100% + 50px))';
    });
    
    document.getElementById('ai-summary-close').addEventListener('click', () => {
        container.remove();
    });
    
    // Add to page
    document.body.appendChild(container);
    
    return container;
}

// Update the summary content
function updateSummary(text, isLoading = false, error = null) {
    const container = document.getElementById('ai-summary-container');
    if (!container) return;
    
    const content = container.querySelector('.ai-summary-content');
    const summaryText = document.getElementById('ai-summary-text');
    
    if (isLoading) {
        content.innerHTML = `
            <div class="ai-summary-loading">
                <div class="spinner"></div>
                <p>Generating summary...</p>
            </div>
        `;
    } else if (error) {
        content.innerHTML = `
            <div class="ai-summary-error">
                <p>${error}</p>
            </div>
        `;
    } else {
        summaryText.innerHTML = text;
    }
}

// Toggle dark mode
function toggleDarkMode(isDark) {
    const container = document.getElementById('ai-summary-container');
    if (!container) return;
    
    if (isDark) {
        container.classList.add('dark-mode');
    } else {
        container.classList.remove('dark-mode');
    }
}

// Export functions
window.createSummaryUI = createSummaryUI;
window.updateSummary = updateSummary;
window.toggleDarkMode = toggleDarkMode; 