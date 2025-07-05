/**
 * Debug Panel Module
 * Displays ZK proof information for judges and technical evaluation
 * Implements the exact showProofDebug function as specified in implementation details
 */

console.log('🔍 Debug Panel module loaded');

/**
 * Shows detailed ZK proof debug information for judges
 * Displays proof verification status, public signals, tag matching, and threshold details
 * @param {Object} result - The result object from zkAffinityAgent.requestAd()
 * @returns {void}
 */
function showProofDebug(result) {
    console.log('🔍 showProofDebug called with result:', result);
    
    const debugInfoContainer = document.getElementById('debug-content');
    if (!debugInfoContainer) {
        console.error('❌ Debug info container not found');
        return;
    }
    
    // Only show debug panel when in debug mode or when manually toggled
    const debugPanel = document.getElementById('debug-info');
    if (debugPanel && window.debugMode) {
        debugPanel.style.display = 'block';
    }
    
    try {
        // Extract information from result structure
        const isVerified = result.success && result.proof && result.proof.verified;
        const tag = result.ad ? result.ad.tag : 'unknown';
        const publicSignals = result.proof ? result.proof.publicSignals : [];
        const threshold = result.debug ? result.debug.threshold : 'unknown';
        const matchCount = result.debug ? result.debug.attestationCount : 0;
        
        // Build the exact debug template as specified
        const debugHtml = `
            <div class="proof-debug-info">
                <div class="debug-header">
                    <h4>🔍 ZK Proof Debug Information</h4>
                    <span class="debug-timestamp">${new Date().toLocaleTimeString()}</span>
                </div>
                
                <div class="debug-section verification-status">
                    <h5>${isVerified ? '✅ ZK Proof Verified' : '❌ ZK Proof Failed'}</h5>
                </div>
                
                <div class="debug-section tag-info">
                    <h5>Matched Tag:</h5>
                    <code>${tag}</code>
                </div>
                
                <div class="debug-section threshold-info">
                    <h5>Threshold:</h5>
                    <code>${threshold}</code>
                </div>
                
                <div class="debug-section match-count">
                    <h5>Match Count:</h5>
                    <code>${matchCount}</code>
                </div>
                
                <div class="debug-section public-signals">
                    <h5>Public Signals:</h5>
                    <pre>${JSON.stringify(publicSignals, null, 2)}</pre>
                </div>
                
                ${result.error ? `
                    <div class="debug-section error-info">
                        <h5>Error Details:</h5>
                        <code class="error">${result.error}</code>
                    </div>
                ` : ''}
                
                ${result.debug ? `
                    <div class="debug-section additional-info">
                        <h5>Additional Debug Info:</h5>
                        <pre>${JSON.stringify(result.debug, null, 2)}</pre>
                    </div>
                ` : ''}
                
                <div class="debug-section raw-result">
                    <details>
                        <summary>Raw Result Object</summary>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    </details>
                </div>
            </div>
        `;
        
        // Update debug container
        debugInfoContainer.innerHTML = debugHtml;
        
        // Make debug content visible
        debugInfoContainer.style.display = 'block';
        
        console.log('✅ Debug info displayed successfully');
        
    } catch (error) {
        console.error('❌ Failed to display debug info:', error);
        
        // Show error in debug panel
        debugInfoContainer.innerHTML = `
            <div class="debug-error">
                <h4>❌ Debug Display Error</h4>
                <p><strong>Error:</strong> ${error.message}</p>
                <pre>Raw result: ${JSON.stringify(result, null, 2)}</pre>
            </div>
        `;
        debugInfoContainer.style.display = 'block';
    }
}

/**
 * Toggle debug panel visibility
 * @returns {void}
 */
function toggleDebugPanel() {
    const debugContent = document.getElementById('debug-content');
    if (debugContent) {
        debugContent.style.display = debugContent.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Clear debug panel content
 * @returns {void}
 */
function clearDebugPanel() {
    const debugContent = document.getElementById('debug-content');
    if (debugContent) {
        debugContent.innerHTML = '<p>Debug information will appear here when ZK proofs are generated...</p>';
    }
}

/**
 * Enable debug mode for automatic debug panel display
 * @returns {void}
 */
function enableDebugMode() {
    window.debugMode = true;
    console.log('🔍 Debug mode enabled');
}

/**
 * Disable debug mode
 * @returns {void}
 */
function disableDebugMode() {
    window.debugMode = false;
    console.log('🔍 Debug mode disabled');
}

// Export functions for global access
window.showProofDebug = showProofDebug;
window.toggleDebugPanel = toggleDebugPanel;
window.clearDebugPanel = clearDebugPanel;
window.enableDebugMode = enableDebugMode;
window.disableDebugMode = disableDebugMode;

// Add CSS for debug panel styling
const debugStyles = `
<style>
.proof-debug-info {
    font-family: 'Courier New', monospace;
    line-height: 1.4;
    font-size: 0.85rem;
}

.debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #34495e;
}

.debug-header h4 {
    margin: 0;
    color: #ecf0f1;
}

.debug-timestamp {
    color: #bdc3c7;
    font-size: 0.75rem;
}

.debug-section {
    margin-bottom: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #2c3e50;
}

.debug-section:last-child {
    border-bottom: none;
}

.debug-section h5 {
    margin: 0 0 0.5rem 0;
    color: #3498db;
    font-size: 0.9rem;
}

.debug-section code {
    background: #34495e;
    color: #e74c3c;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
}

.debug-section code.error {
    background: #e74c3c;
    color: white;
}

.debug-section pre {
    background: #2c3e50;
    color: #ecf0f1;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    overflow-x: auto;
    margin: 0;
}

.verification-status h5 {
    font-size: 1rem;
    font-weight: bold;
}

.debug-error {
    color: #e74c3c;
}

.debug-error h4 {
    color: #e74c3c;
    margin-top: 0;
}

details summary {
    cursor: pointer;
    color: #3498db;
    margin-bottom: 0.5rem;
}

details[open] summary {
    margin-bottom: 1rem;
}
</style>
`;

// Inject styles if not already present
if (!document.getElementById('debug-panel-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'debug-panel-styles';
    styleElement.innerHTML = debugStyles;
    document.head.appendChild(styleElement);
}

console.log('🔍 Debug Panel ready - functions available:', {
    showProofDebug: typeof showProofDebug,
    toggleDebugPanel: typeof toggleDebugPanel,
    clearDebugPanel: typeof clearDebugPanel
}); 