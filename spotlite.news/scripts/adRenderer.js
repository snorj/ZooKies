/**
 * Ad Renderer Module
 * Handles loading and displaying ad creatives based on ZK proof results
 * Implements fetch-based ad loading with comprehensive error handling
 */

console.log('📊 Ad Renderer module loaded');

/**
 * Renders an ad based on the provided tag by fetching the corresponding HTML file
 * @param {string} tag - The ad tag (finance, travel, privacy, gaming, technology)
 * @returns {Promise} Promise that resolves when ad is rendered or rejects with error
 */
function renderAd(tag) {
    console.log(`🎯 renderAd called with tag: ${tag}`);
    
    // Validate input
    if (!tag || typeof tag !== 'string') {
        console.error('❌ Invalid tag provided to renderAd:', tag);
        renderNoAd();
        return Promise.reject(new Error('Invalid tag provided'));
    }
    
    // Construct ad path
    const adPath = `/ads/${tag}.html`;
    console.log(`🔍 Fetching ad from: ${adPath}`);
    
    // Ensure ad container exists
    const adContainer = document.getElementById('ad-container');
    if (!adContainer) {
        console.error('❌ Ad container element not found');
        return Promise.reject(new Error('Ad container not found'));
    }
    
    // Add loading state
    adContainer.innerHTML = '<div class="ad-loading">Loading ad...</div>';
    adContainer.classList.add('loading');
    
    // Fetch and render ad
    return fetch(adPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            // Inject HTML into ad container
            adContainer.innerHTML = html;
            adContainer.classList.remove('loading');
            adContainer.classList.add('has-ad');
            
            console.log(`✅ Successfully rendered ${tag} ad`);
            
            // Update ad container styling
            adContainer.style.minHeight = 'auto';
            
            return html;
        })
        .catch(error => {
            console.error(`❌ Failed to load ${tag} ad:`, error);
            
            // Display error message
            adContainer.innerHTML = '<div class="ad-error">Ad failed to load.</div>';
            adContainer.classList.remove('loading', 'has-ad');
            adContainer.classList.add('error');
            
            throw error;
        });
}

/**
 * Renders a "no ad" message when no qualifying ads are available
 * @returns {void}
 */
function renderNoAd() {
    console.log('❌ renderNoAd called - displaying fallback message');
    
    const adContainer = document.getElementById('ad-container');
    if (!adContainer) {
        console.error('❌ Ad container element not found');
        return;
    }
    
    // Display no ad message
    adContainer.innerHTML = '<div class="ad-no-ads">No qualifying ads at this time.</div>';
    adContainer.classList.remove('loading', 'has-ad', 'error');
    adContainer.classList.add('no-ads');
    
    console.log('✅ No ads message displayed');
}

/**
 * Utility function to clear ad container
 * @returns {void}
 */
function clearAd() {
    const adContainer = document.getElementById('ad-container');
    if (adContainer) {
        adContainer.innerHTML = '';
        adContainer.classList.remove('loading', 'has-ad', 'error', 'no-ads');
    }
}

/**
 * Utility function to get supported ad tags
 * @returns {string[]} Array of supported ad tags
 */
function getSupportedTags() {
    return ['finance', 'travel', 'privacy', 'gaming', 'technology'];
}

/**
 * Utility function to validate if a tag is supported
 * @param {string} tag - The tag to validate
 * @returns {boolean} True if tag is supported
 */
function isValidTag(tag) {
    return getSupportedTags().includes(tag);
}

// Export functions for global access
window.renderAd = renderAd;
window.renderNoAd = renderNoAd;
window.clearAd = clearAd;
window.getSupportedTags = getSupportedTags;
window.isValidTag = isValidTag;

console.log('🎯 Ad Renderer ready - supported tags:', getSupportedTags()); 