/**
 * Ad Renderer Module
 * Handles loading and displaying ad creatives based on ZK proof results
 * Implements fetch-based ad loading with comprehensive error handling
 */

console.log('📊 Ad Renderer module loaded');

// Global variable to store ZK proof data for modal display
let currentZkProofData = null;

/**
 * Renders an ad based on the provided tag by fetching the corresponding HTML file
 * @param {string} tag - The ad tag (finance, travel, privacy, gaming, technology)
 * @param {Object} zkProofData - Optional ZK proof data to display in modal
 * @returns {Promise} Promise that resolves when ad is rendered or rejects with error
 */
function renderAd(tag, zkProofData = null) {
    console.log(`🎯 renderAd called with tag: ${tag}`);
    
    // Store ZK proof data for modal display
    currentZkProofData = zkProofData;
    
    // Validate input
    if (!tag || typeof tag !== 'string') {
        console.error('❌ Invalid tag provided to renderAd:', tag);
        renderNoAd();
        return Promise.reject(new Error('Invalid tag provided'));
    }
    
    // Construct ad path (relative to spotlite.news directory)
    const adPath = `ads/${tag}.html`;
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
            
            // Add ZK proof icon if we have proof data
            if (zkProofData && zkProofData.qualified) {
                addZkProofIcon(adContainer);
            }
            
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
 * Adds a small ZK proof icon to the ad container
 * @param {HTMLElement} adContainer - The ad container element
 */
function addZkProofIcon(adContainer) {
    // Find the ad card within the container
    const adCard = adContainer.querySelector('.ad-card');
    if (!adCard) {
        console.warn('⚠️ Could not find .ad-card element to add ZK icon');
        return;
    }
    
    const zkIcon = document.createElement('div');
    zkIcon.className = 'zk-proof-icon';
    zkIcon.innerHTML = '🔐';
    zkIcon.title = 'View ZK Proof Details';
    zkIcon.onclick = () => openZkProofModal();
    
    // Position the icon in the top-right corner
    zkIcon.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        z-index: 100;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    
    // Add hover effect
    zkIcon.addEventListener('mouseenter', () => {
        zkIcon.style.background = 'rgba(0, 0, 0, 0.9)';
        zkIcon.style.transform = 'scale(1.15)';
    });
    
    zkIcon.addEventListener('mouseleave', () => {
        zkIcon.style.background = 'rgba(0, 0, 0, 0.8)';
        zkIcon.style.transform = 'scale(1)';
    });
    
    // Make sure the ad card has relative positioning
    adCard.style.position = 'relative';
    
    // Add the icon to the ad card
    adCard.appendChild(zkIcon);
    
    console.log('✅ ZK icon added to ad card');
}

/**
 * Opens the ZK proof modal with technical details
 */
function openZkProofModal() {
    if (!currentZkProofData) {
        console.error('❌ No ZK proof data available');
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('zk-proof-modal');
    if (!modal) {
        modal = createZkProofModal();
        document.body.appendChild(modal);
    }
    
    // Populate modal with ZK proof data
    populateZkProofModal(modal, currentZkProofData);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * Creates the ZK proof modal HTML structure
 * @returns {HTMLElement} The modal element
 */
function createZkProofModal() {
    const modal = document.createElement('div');
    modal.id = 'zk-proof-modal';
    modal.className = 'zk-modal';
    
    modal.innerHTML = `
        <div class="zk-modal-content">
            <div class="zk-modal-header">
                <h3>🔐 ZK Proof Details</h3>
                <button class="zk-modal-close" onclick="closeZkProofModal()">&times;</button>
            </div>
            <div class="zk-modal-body" id="zk-modal-body">
                <!-- Content will be populated dynamically -->
            </div>
        </div>
    `;
    
    // Add modal styles
    modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    `;
    
    // Add styles for modal content
    const modalContent = modal.querySelector('.zk-modal-content');
    modalContent.style.cssText = `
        background-color: #2c3e50;
        color: #ecf0f1;
        margin: 5% auto;
        padding: 0;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Add styles for modal header
    const modalHeader = modal.querySelector('.zk-modal-header');
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #34495e;
        margin: 0;
    `;
    
    // Add styles for close button
    const closeBtn = modal.querySelector('.zk-modal-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #ecf0f1;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    `;
    
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = 'transparent';
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeZkProofModal();
        }
    });
    
    return modal;
}

/**
 * Populates the ZK proof modal with data
 * @param {HTMLElement} modal - The modal element
 * @param {Object} zkData - The ZK proof data
 */
function populateZkProofModal(modal, zkData) {
    const modalBody = modal.querySelector('#zk-modal-body');
    
    // Extract information from the actual zkData structure
    const isVerified = zkData.qualified && zkData.proofDetails && zkData.proofDetails.success;
    const tag = zkData.proofDetails ? zkData.proofDetails.tag : 'unknown';
    const publicSignals = zkData.proofDetails ? zkData.proofDetails.publicSignals : [];
    const threshold = zkData.proofDetails ? zkData.proofDetails.threshold : 'unknown';
    const matchCount = zkData.proofDetails ? zkData.proofDetails.attestationCount : 0;
    const duration = zkData.proofDetails && zkData.proofDetails.verification && zkData.proofDetails.verification.metadata 
        ? `${zkData.proofDetails.verification.metadata.verificationTime}ms` : 'unknown';
    const walletAddress = zkData.proofDetails ? zkData.proofDetails.walletAddress : 'unknown';
    const targetingReason = zkData.targetingReason || 'Unknown targeting reason';
    
    modalBody.innerHTML = `
        <div class="zk-proof-content">
            <div class="zk-section">
                <div class="zk-status ${isVerified ? 'verified' : 'failed'}">
                    ${isVerified ? '✅ ZK Proof Verified' : '❌ ZK Proof Failed'}
                </div>
                <div class="zk-reason">${targetingReason}</div>
            </div>
            
            <div class="zk-section">
                <h4>📊 Proof Summary</h4>
                <div class="zk-data-grid">
                    <div class="zk-data-item">
                        <span class="zk-label">Target Tag:</span>
                        <span class="zk-value">${tag}</span>
                    </div>
                    <div class="zk-data-item">
                        <span class="zk-label">Attestations:</span>
                        <span class="zk-value">${matchCount}/${threshold}</span>
                    </div>
                    <div class="zk-data-item">
                        <span class="zk-label">Verification Time:</span>
                        <span class="zk-value">${duration}</span>
                    </div>
                    <div class="zk-data-item zk-data-wide">
                        <span class="zk-label">Wallet:</span>
                        <span class="zk-value zk-wallet">${walletAddress}</span>
                    </div>
                </div>
            </div>
            
            <div class="zk-section">
                <h4>🔢 Public Signals</h4>
                <div class="zk-data-explanation">
                    <small>Public signals contain: [attestationCount, targetTag, threshold]</small>
                </div>
                <div class="zk-code-block">
                    <code>${JSON.stringify(publicSignals, null, 2)}</code>
                </div>
            </div>
            
            ${zkData.proofDetails && zkData.proofDetails.verification ? `
                <div class="zk-section">
                    <h4>🔐 Verification Details</h4>
                    <div class="zk-data-grid">
                        <div class="zk-data-item">
                            <span class="zk-label">Protocol:</span>
                            <span class="zk-value">${zkData.proofDetails.verification.metadata.protocol}</span>
                        </div>
                        <div class="zk-data-item">
                            <span class="zk-label">Curve:</span>
                            <span class="zk-value">${zkData.proofDetails.verification.metadata.curve}</span>
                        </div>
                        <div class="zk-data-item">
                            <span class="zk-label">Timestamp:</span>
                            <span class="zk-value">${new Date(zkData.proofDetails.verification.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="zk-section">
                <details>
                    <summary>📝 Complete ZK Proof Data</summary>
                    <div class="zk-code-block">
                        <pre>${JSON.stringify(zkData, null, 2)}</pre>
                    </div>
                </details>
            </div>
        </div>
    `;
    
    // Add styles for the modal body content
    modalBody.style.cssText = `
        padding: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
    `;
    
    // Add styles for sections
    const sections = modalBody.querySelectorAll('.zk-section');
    sections.forEach(section => {
        section.style.cssText = `
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #34495e;
        `;
    });
    
    // Add styles for status
    const status = modalBody.querySelector('.zk-status');
    if (status) {
        status.style.cssText = `
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            font-size: 1.1em;
            margin-bottom: 8px;
            ${isVerified ? 'background-color: #27ae60; color: white;' : 'background-color: #e74c3c; color: white;'}
        `;
    }
    
    // Add styles for reason text
    const reason = modalBody.querySelector('.zk-reason');
    if (reason) {
        reason.style.cssText = `
            text-align: center;
            color: #95a5a6;
            font-style: italic;
            margin-top: 5px;
        `;
    }
    
    // Add styles for data explanation
    const explanation = modalBody.querySelector('.zk-data-explanation');
    if (explanation) {
        explanation.style.cssText = `
            margin-bottom: 10px;
            color: #95a5a6;
            font-style: italic;
        `;
    }
    
    // Add styles for data grid
    const dataGrids = modalBody.querySelectorAll('.zk-data-grid');
    dataGrids.forEach(dataGrid => {
        dataGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-top: 10px;
        `;
    });
    
    // Add styles for data items
    const dataItems = modalBody.querySelectorAll('.zk-data-item');
    dataItems.forEach(item => {
        const isWide = item.classList.contains('zk-data-wide');
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background-color: #34495e;
            border-radius: 6px;
            ${isWide ? 'grid-column: 1 / -1;' : ''}
        `;
        
        const label = item.querySelector('.zk-label');
        const value = item.querySelector('.zk-value');
        
        if (label) {
            label.style.cssText = `
                font-weight: bold;
                color: #ecf0f1;
                margin-right: 10px;
            `;
        }
        
        if (value) {
            value.style.cssText = `
                color: #3498db;
                font-family: monospace;
                ${value.classList.contains('zk-wallet') ? 'font-size: 0.85em; word-break: break-all;' : ''}
            `;
        }
    });
    
    // Add styles for code blocks
    const codeBlocks = modalBody.querySelectorAll('.zk-code-block');
    codeBlocks.forEach(block => {
        block.style.cssText = `
            background-color: #1e1e1e;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin-top: 10px;
            border: 1px solid #444;
        `;
        
        const code = block.querySelector('code, pre');
        if (code) {
            code.style.cssText = `
                color: #f8f8f2;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                white-space: pre-wrap;
                word-break: break-word;
                line-height: 1.4;
            `;
        }
    });
    
    // Add styles for details/summary (collapsible sections)
    const details = modalBody.querySelector('details');
    if (details) {
        details.style.cssText = `
            border: 1px solid #34495e;
            border-radius: 6px;
            padding: 10px;
        `;
        
        const summary = details.querySelector('summary');
        if (summary) {
            summary.style.cssText = `
                cursor: pointer;
                font-weight: bold;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.2s;
            `;
            
            summary.addEventListener('mouseenter', () => {
                summary.style.backgroundColor = '#34495e';
            });
            
            summary.addEventListener('mouseleave', () => {
                summary.style.backgroundColor = 'transparent';
            });
        }
    }
}

/**
 * Closes the ZK proof modal
 */
function closeZkProofModal() {
    const modal = document.getElementById('zk-proof-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
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
window.closeZkProofModal = closeZkProofModal;

console.log('🎯 Ad Renderer ready - supported tags:', getSupportedTags()); 