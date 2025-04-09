// Content extraction from web pages

// Extract content from the current page
function extractPageContent() {
    return {
        mainContent: extractMainContent(),
        metadata: extractMetadata(),
        images: extractRelevantImages()
    };
}

// Extract the main content from the page
function extractMainContent() {
    // Try to find the main content container
    const mainContent = document.querySelector('main, article, [role="main"], .main-content, #content, .content');
    
    if (mainContent) {
        return cleanContent(mainContent.textContent);
    }
    
    // Fallback to body content if no main container found
    return cleanContent(document.body.textContent);
}

// Extract metadata from the page
function extractMetadata() {
    return {
        title: document.title,
        description: getMetaContent('description'),
        author: getMetaContent('author'),
        keywords: getMetaContent('keywords'),
        url: window.location.href
    };
}

// Get content from meta tags
function getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.content : '';
}

// Extract relevant images from the page
function extractRelevantImages() {
    const images = Array.from(document.getElementsByTagName('img'));
    return images
        .filter(img => {
            // Filter out small images and icons
            const rect = img.getBoundingClientRect();
            return rect.width >= 100 && rect.height >= 100;
        })
        .map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
        }));
}

// Clean and format the extracted content
function cleanContent(content) {
    return content
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim(); // Remove leading/trailing whitespace
}

// Export functions
window.extractPageContent = extractPageContent;
window.extractMainContent = extractMainContent;
window.extractMetadata = extractMetadata;
window.extractRelevantImages = extractRelevantImages; 