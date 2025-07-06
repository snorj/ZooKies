/**
 * TheModernByte - Site-specific JavaScript
 * Handles ad interactions, profile management, and attestation creation
 */

// Global variables
let zkAgent;
let currentUser = null;
let userAttestations = [];
let financeArticleClicks = [];

// Finance article tracking keywords
const FINANCE_KEYWORDS = [
    'finance', 'investment', 'banking', 'cryptocurrency', 'stocks', 'trading',
    'economy', 'financial', 'money', 'budget', 'loan', 'credit', 'insurance',
    'retirement', 'savings', 'portfolio', 'market', 'bonds', 'dividend', 'tax',
    'yield', 'interest', 'apy', 'fintech', 'defi', 'crypto', 'wallet'
];

// Ensure zkAgent is available globally
window.zkAgent = null;

// Initialize site-specific functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('TheModernByte - Site initializing...');
    
    try {
        // Use the global zkAffinityAgent singleton
        zkAgent = window.zkAffinityAgent;
        window.zkAgent = zkAgent; // Make it globally accessible
        if (!zkAgent) {
            throw new Error('zkAffinityAgent not available');
        }
        // Use global wallet system instead of site-specific wallet
        const walletResult = await zkAgent.ensureWalletAndProfile();
        if (!walletResult.success) {
            throw new Error('Failed to initialize global wallet: ' + walletResult.error);
        }
        console.log('✅ Global wallet initialized:', walletResult.isGlobal ? 'Global' : 'Fallback');
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize profile viewer
        await initializeProfile();
        
        // Set up navigation highlighting
        setupNavigation();
        
        // Initialize wallet debug display
        await initializeWalletDebug();
        
        console.log('TheModernByte - Site initialized successfully');
    } catch (error) {
        console.error('Failed to initialize site:', error);
        showErrorMessage('Failed to initialize site functionality');
    }
});

// Set up all event listeners
function setupEventListeners() {
    // Article link handlers for attestation tracking
    const articleLinks = document.querySelectorAll('.article-link');
    articleLinks.forEach(link => {
        link.addEventListener('click', handleArticleClick);
    });
    
    // Navigation link handlers
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
    
    // Add click tracking for any finance-related content
    const financeArticles = document.querySelectorAll('[data-article-tag="finance"]');
    financeArticles.forEach(article => {
        article.addEventListener('click', handleFinanceArticleClick);
    });
    
    // Keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close any open modals or panels
            closeModals();
        }
    });
}

// Handle article link clicks for attestation tracking
async function handleArticleClick(event) {
    const link = event.currentTarget;
    const articleId = link.getAttribute('data-article-id');
    const article = link.closest('.article-card');
    const articleTag = article?.getAttribute('data-article-tag');
    const articleTitle = article?.querySelector('h2')?.textContent || '';
    
    console.log('Article clicked:', { articleId, articleTag, articleTitle });
    
    // Create attestation for article interaction
    const attestation = createArticleAttestation(articleId, articleTag, articleTitle);
    
    // Store attestation
    await storeAttestation(attestation);
    
    // If it's a finance article, track it specially
    if (articleTag === 'finance') {
        await trackFinanceArticleClick(articleId, articleTitle);
    }
    
    // Update user profile
    await updateUserProfile(articleTag);
    
    // Allow the link to continue (don't prevent default)
    return true;
}

// Handle finance article clicks specifically
async function handleFinanceArticleClick(event) {
    const article = event.currentTarget;
    const articleTag = article.getAttribute('data-article-tag');
    const articleId = article.id;
    const articleTitle = article.querySelector('h2')?.textContent || '';
    
    // Only track if it's truly a finance article
    if (articleTag === 'finance') {
        console.log('Finance article interaction:', { articleId, articleTitle });
        
        // Create attestation for finance article interaction
        const attestation = createArticleAttestation(articleId, articleTag, articleTitle);
        
        // Store attestation
        await storeAttestation(attestation);
        
        // Track finance click
        await trackFinanceArticleClick(articleId, articleTitle);
        
        // Update user profile
        await updateUserProfile(articleTag);
        
        // Show subtle success message
        showSuccessMessage('Finance article interaction recorded!');
        
        // Emit event for ZooKies integration
        emitFinanceArticleEvent(articleId, articleTitle);
    }
}

// Show ad modal with specific content
function showAdModal(adId, adTitle, adCard) {
    const modalOverlay = document.getElementById('adModalOverlay');
    const modalTitle = document.getElementById('adModalTitle');
    const modalContent = document.getElementById('adModalContent');
    const actionBtn = document.getElementById('adActionBtn');
    
    // Set modal title
    modalTitle.textContent = adTitle;
    
    let modalHtml = '';
    let actionUrl = '#';
    let actionText = 'Visit Site';
    
    switch (adId) {
        case 'neobank-apy':
            modalHtml = `
                <div class="ad-detail">
                    <h4>💰 High Yield Savings</h4>
                    <p>Earn 5.00% APY on all balances with no minimum deposit required.</p>
                    <ul class="ad-features">
                        <li>✓ 5.00% APY on all balances</li>
                        <li>✓ No minimum balance required</li>
                        <li>✓ FDIC insured up to $250,000</li>
                        <li>✓ No monthly fees or hidden charges</li>
                        <li>✓ Mobile app with instant notifications</li>
                    </ul>
                    <p class="ad-disclaimer">APY is variable and subject to change. FDIC Member.</p>
                </div>
            `;
            actionUrl = 'https://neobank.example.com/signup';
            actionText = 'Open Account';
            break;
            
        case 'clearvpn':
            modalHtml = `
                <div class="ad-detail">
                    <h4>🛡️ ClearVPN Privacy Protection</h4>
                    <p>${adDescription}</p>
                    <ul class="ad-features">
                        <li>✓ Military-grade encryption</li>
                        <li>✓ Zero-log policy verified by audit</li>
                        <li>✓ 50+ server locations worldwide</li>
                        <li>✓ Kill switch protection</li>
                        <li>✓ 30-day money-back guarantee</li>
                    </ul>
                    <p class="ad-disclaimer">Terms and conditions apply. See website for details.</p>
                </div>
            `;
            actionUrl = 'https://clearvpn.example.com/protect';
            actionText = 'Start Free Trial';
            break;
            
        case 'gamegrid':
            modalHtml = `
                <div class="ad-detail">
                    <h4>🎮 GameGrid Browser Gaming</h4>
                    <p>${adDescription}</p>
                    <ul class="ad-features">
                        <li>✓ 1000+ free browser games</li>
                        <li>✓ No downloads or installations</li>
                        <li>✓ Multiplayer and single-player options</li>
                        <li>✓ Cross-platform compatibility</li>
                        <li>✓ Regular new game releases</li>
                    </ul>
                    <p class="ad-disclaimer">Free to play. Premium features available.</p>
                </div>
            `;
            actionUrl = 'https://gamegrid.example.com/play';
            actionText = 'Start Playing';
            break;
    }
    
    modalContent.innerHTML = modalHtml;
    actionBtn.textContent = actionText;
    actionBtn.onclick = () => window.open(actionUrl, '_blank');
    
    // Show modal with animation
    modalOverlay.style.display = 'flex';
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close ad modal
function closeAdModal() {
    const modalOverlay = document.getElementById('adModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Get the closest article title for context
function getClosestArticleTitle(adCard) {
    const article = adCard.previousElementSibling;
    if (article && article.tagName === 'ARTICLE') {
        const title = article.querySelector('h2');
        return title ? title.textContent : 'Unknown Article';
    }
    return 'Unknown Article';
}

// Initialize profile viewer
async function initializeProfile() {
    try {
        // Skip user profile for now (method doesn't exist)
        currentUser = null;
        
        // Get user attestations from database
        const walletAddress = await zkAgent.getWalletAddress();
        if (zkAgent.dbManager) {
            userAttestations = await zkAgent.dbManager.getAttestations(walletAddress) || [];
        } else {
            // Fallback to local attestations if no database
            userAttestations = zkAgent.getAttestations() || [];
        }
        
        // Update profile display
        updateProfileDisplay();
        
    } catch (error) {
        console.error('Error initializing profile:', error);
        // Set default values
        userAttestations = [];
        updateProfileDisplay();
    }
}

// Update profile display
function updateProfileDisplay() {
    const attestationCount = document.getElementById('attestationCount');
    const lastActivity = document.getElementById('lastActivity');
    const userInterests = document.getElementById('userInterests');
    
    if (attestationCount) {
        attestationCount.textContent = userAttestations.length;
    }
    
    if (lastActivity && userAttestations.length > 0) {
        const latest = userAttestations[userAttestations.length - 1];
        const date = new Date(latest.timestamp);
        lastActivity.textContent = date.toLocaleDateString();
    }
    
    if (userInterests) {
        const interests = extractInterests();
        userInterests.textContent = interests.length > 0 ? interests.join(', ') : 'None detected';
    }
}

// Extract user interests from attestations
function extractInterests() {
    const tagCounts = {};
    
    userAttestations.forEach(attestation => {
        const tag = attestation.tag;
        if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    });
    
    return Object.keys(tagCounts)
        .sort((a, b) => tagCounts[b] - tagCounts[a])
        .slice(0, 3)
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
}

// Update user profile with new interaction
async function updateUserProfile(tag) {
    try {
        const profileUpdate = {
            lastActivity: Date.now(),
            interactionCount: (currentUser?.interactionCount || 0) + 1,
            tags: [...(currentUser?.tags || []), tag]
        };
        
        // Update profile in zkAffinityAgent
        await zkAgent.updateProfile(profileUpdate);
        
        // Refresh local data
        await initializeProfile();
        
    } catch (error) {
        console.error('Error updating user profile:', error);
    }
}

// ========== NEW ATTESTATION TRACKING FUNCTIONS ==========

// Create attestation object for article interactions
function createArticleAttestation(articleId, articleTag, articleTitle) {
    const sessionId = getOrCreateSessionId();
    const timestamp = new Date().toISOString();
    
    return {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'article_click',
        articleId: articleId,
        articleTag: articleTag,
        articleTitle: articleTitle.replace(/💰 Finance$/, '').trim(), // Clean up the title
        timestamp: timestamp,
        sessionId: sessionId,
        site: 'themodernbyte.com',
        userAction: 'click',
        metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
        }
    };
}

// Store attestation in localStorage and profile-store
async function storeAttestation(attestation) {
    try {
        // Store in localStorage for immediate access
        const existingAttestations = JSON.parse(localStorage.getItem('zk_attestations') || '[]');
        existingAttestations.push(attestation);
        
        // Keep only last 100 attestations to prevent storage bloat
        if (existingAttestations.length > 100) {
            existingAttestations.splice(0, existingAttestations.length - 100);
        }
        
        localStorage.setItem('zk_attestations', JSON.stringify(existingAttestations));
        
        // Store in global attestations array
        userAttestations.push(attestation);
        
        console.log('Attestation stored:', attestation);
        
        // Update profile viewer
        updateProfileDisplay();
        
        return true;
    } catch (error) {
        console.error('Failed to store attestation:', error);
        return false;
    }
}

// Track finance article clicks specifically
async function trackFinanceArticleClick(articleId, articleTitle) {
    try {
        const financeClick = {
            id: `fin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            articleId: articleId,
            articleTitle: articleTitle.replace(/💰 Finance$/, '').trim(),
            timestamp: new Date().toISOString(),
            site: 'themodernbyte.com'
        };
        
        // Store in finance-specific array
        financeArticleClicks.push(financeClick);
        
        // Store in localStorage
        const existingFinanceClicks = JSON.parse(localStorage.getItem('zk_finance_clicks') || '[]');
        existingFinanceClicks.push(financeClick);
        localStorage.setItem('zk_finance_clicks', JSON.stringify(existingFinanceClicks));
        
        console.log(`Finance click tracked (${financeArticleClicks.length} total):`, financeClick);
        
        // Check if user qualifies for ads (2+ finance clicks)
        if (financeArticleClicks.length >= 2) {
            console.log('🎯 User qualifies for targeted ads!');
            emitQualificationEvent();
        }
        
        return true;
    } catch (error) {
        console.error('Failed to track finance click:', error);
        return false;
    }
}

// Emit event for ZooKies integration
function emitFinanceArticleEvent(articleId, articleTitle) {
    const event = new CustomEvent('finance-article-click', {
        detail: {
            articleId,
            articleTitle: articleTitle.replace(/💰 Finance$/, '').trim(),
            timestamp: new Date().toISOString(),
            site: 'themodernbyte.com',
            totalFinanceClicks: financeArticleClicks.length
        }
    });
    
    window.dispatchEvent(event);
    console.log('Finance article event emitted:', event.detail);
}

// Emit qualification event when user reaches threshold
function emitQualificationEvent() {
    const event = new CustomEvent('user-qualified-for-ads', {
        detail: {
            totalFinanceClicks: financeArticleClicks.length,
            timestamp: new Date().toISOString(),
            site: 'themodernbyte.com'
        }
    });
    
    window.dispatchEvent(event);
    console.log('User qualification event emitted:', event.detail);
}

// Get or create session ID
function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('zk_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('zk_session_id', sessionId);
    }
    return sessionId;
}

// Close any open modals or panels
function closeModals() {
    // Close any modals that might be open
    const modals = document.querySelectorAll('.modal-overlay, .ad-modal-overlay');
    modals.forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    });
}

// Refresh profile data
async function refreshProfile() {
    console.log('Refreshing profile...');
    
    try {
        await initializeProfile();
        showSuccessMessage('Profile refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing profile:', error);
        showErrorMessage('Failed to refresh profile');
    }
}

// Reset user profile
async function resetProfile() {
    showResetConfirmationModal();
}

// Show styled reset confirmation modal
function showResetConfirmationModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'reset-confirmation-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: overlayFadeIn 0.3s ease;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'reset-confirmation-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease;
        text-align: center;
    `;

    modal.innerHTML = `
        <div class="reset-modal-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        </div>
        <h3 style="color: #dc3545; margin: 20px 0 10px 0; font-size: 1.5rem;">Reset Profile</h3>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">
            This will permanently delete all your attestations and generate a new wallet address. 
            This action cannot be undone and you will lose all interaction history.
        </p>
        <div class="reset-modal-buttons" style="display: flex; gap: 15px; justify-content: center;">
            <button class="btn-cancel" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button class="btn-confirm-reset" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Reset Profile</button>
        </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // Add hover effects
    const cancelBtn = modal.querySelector('.btn-cancel');
    const resetBtn = modal.querySelector('.btn-confirm-reset');

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#5a6268';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#6c757d';
    });

    resetBtn.addEventListener('mouseenter', () => {
        resetBtn.style.background = '#c82333';
    });
    resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.background = '#dc3545';
    });

    // Handle button clicks
    cancelBtn.addEventListener('click', () => {
        closeResetModal(modalOverlay);
    });

    resetBtn.addEventListener('click', async () => {
        await performProfileReset(modalOverlay);
    });

    // Handle overlay click to close
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeResetModal(modalOverlay);
        }
    });

    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeResetModal(modalOverlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Close reset confirmation modal
function closeResetModal(modalOverlay) {
    modalOverlay.style.animation = 'overlayFadeIn 0.3s ease reverse';
    const modal = modalOverlay.querySelector('.reset-confirmation-modal');
    modal.style.animation = 'modalSlideIn 0.3s ease reverse';
    
    setTimeout(() => {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    }, 300);
}

// Perform actual profile reset with API integration
async function performProfileReset(modalOverlay) {
    const resetBtn = modalOverlay.querySelector('.btn-confirm-reset');
    const originalText = resetBtn.textContent;
    
    try {
        // Show loading state
        resetBtn.disabled = true;
        resetBtn.textContent = 'Resetting...';
        resetBtn.style.background = '#6c757d';

        // Get current wallet address
        const currentWallet = await zkAgent.getWalletAddress();
        
        // Call server API to reset profile
        const response = await fetch(`/api/reset-profile/${currentWallet}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Server reset failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Reset zkAffinityAgent state
        const agentResetResult = await zkAgent.resetProfile();
        
        // Clear localStorage
        clearLocalStorageData();
        
        // Clear local UI state
        currentUser = null;
        userAttestations = [];
        
        // Update profile display
        updateProfileDisplay();
        
        // Close modal
        closeResetModal(modalOverlay);
        
        // Show enhanced success message
        showEnhancedSuccessMessage(agentResetResult.newWalletAddress);
        
    } catch (error) {
        console.error('Profile reset failed:', error);
        
        // Reset button state
        resetBtn.disabled = false;
        resetBtn.textContent = originalText;
        resetBtn.style.background = '#dc3545';
        
        // Show error message
        showEnhancedErrorMessage('Failed to reset profile: ' + error.message);
    }
}

// Clear all localStorage data related to ZooKies
function clearLocalStorageData() {
    const keysToRemove = [];
    
    // Find all localStorage keys that might be related to ZooKies
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.startsWith('zkAffinity') ||
            key.startsWith('zookies') ||
            key.startsWith('wallet') ||
            key.includes('attestation') ||
            key.includes('profile')
        )) {
            keysToRemove.push(key);
        }
    }
    
    // Remove identified keys
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
    });
    
    console.log(`Cleared ${keysToRemove.length} localStorage entries`);
}

// Show enhanced success message with new wallet info
function showEnhancedSuccessMessage(newWalletAddress) {
    const container = document.getElementById('messageContainer');
    if (!container) {
        console.error('Message container not found');
        return;
    }
    
    const msgElement = document.createElement('div');
    msgElement.className = 'message success enhanced-success';
    msgElement.style.cssText = `
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        animation: messageSlideIn 0.5s ease;
    `;
    
    msgElement.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            <strong>Profile Reset Successfully!</strong>
        </div>
        <div style="font-size: 0.9rem; opacity: 0.9;">
            New wallet address: <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${newWalletAddress}</code>
        </div>
        <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">
            You can now start a fresh user journey with your new profile.
        </div>
    `;
    
    // Remove any existing messages
    container.querySelectorAll('.message').forEach(el => el.remove());
    
    // Add new message
    container.appendChild(msgElement);
    
    // Auto-remove after 10 seconds (longer for important success message)
    setTimeout(() => {
        if (msgElement.parentNode) {
            msgElement.style.animation = 'messageSlideIn 0.5s ease reverse';
            setTimeout(() => {
                if (msgElement.parentNode) {
                    msgElement.remove();
                }
            }, 500);
        }
    }, 10000);
}

// Show enhanced error message
function showEnhancedErrorMessage(message) {
    const container = document.getElementById('messageContainer');
    if (!container) {
        console.error('Message container not found');
        return;
    }
    
    const msgElement = document.createElement('div');
    msgElement.className = 'message error enhanced-error';
    msgElement.style.cssText = `
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
        animation: messageSlideIn 0.5s ease;
    `;
    
    msgElement.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 10px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <strong>Reset Failed</strong>
        </div>
        <div style="font-size: 0.9rem; opacity: 0.9;">
            ${message}
        </div>
        <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">
            Please try again or contact support if the problem persists.
        </div>
    `;
    
    // Remove any existing error messages
    container.querySelectorAll('.message.error').forEach(el => el.remove());
    
    // Add new message
    container.appendChild(msgElement);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (msgElement.parentNode) {
            msgElement.style.animation = 'messageSlideIn 0.5s ease reverse';
            setTimeout(() => {
                if (msgElement.parentNode) {
                    msgElement.remove();
                }
            }, 500);
        }
    }, 8000);
}

// Handle navigation clicks
function handleNavClick(event) {
    event.preventDefault();
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    event.target.classList.add('active');
    
    // Smooth scroll to section
    const targetId = event.target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Set up navigation highlighting based on scroll position
function setupNavigation() {
    const sections = document.querySelectorAll('article[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Intersection Observer for navigation highlighting
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                // Remove active class from all nav links
                navLinks.forEach(link => link.classList.remove('active'));
                
                // Add active class to corresponding nav link
                const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -100px 0px'
    });
    
    sections.forEach(section => observer.observe(section));
}

// Show error message
function showErrorMessage(message) {
    const container = document.getElementById('messageContainer');
    if (!container) {
        console.error('Message container not found');
        return;
    }
    
    const msgElement = document.createElement('div');
    msgElement.className = 'message error';
    msgElement.textContent = message;
    msgElement.setAttribute('role', 'alert');
    
    // Remove any existing error messages
    container.querySelectorAll('.message.error').forEach(el => el.remove());
    
    // Add new message
    container.appendChild(msgElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        msgElement.remove();
    }, 5000);
}

// Show success message
function showSuccessMessage(message) {
    const container = document.getElementById('messageContainer');
    if (!container) {
        console.error('Message container not found');
        return;
    }
    
    const msgElement = document.createElement('div');
    msgElement.className = 'message success';
    msgElement.textContent = message;
    msgElement.setAttribute('role', 'status');
    
    // Remove any existing success messages
    container.querySelectorAll('.message.success').forEach(el => el.remove());
    
    // Add new message
    container.appendChild(msgElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        msgElement.remove();
    }, 5000);
}

// Utility function for debugging
function getAdStats() {
    console.log('Current attestations:', userAttestations);
    console.log('User interests:', extractInterests());
    console.log('Total interactions:', userAttestations.length);
}

// Export functions for debugging
window.zkAffinityDebug = {
    getAdStats,
    refreshProfile,
    resetProfile,
    currentUser: () => currentUser,
    attestations: () => userAttestations
};

// ============ WALLET DEBUG FUNCTIONALITY ============

/**
 * Initialize wallet debug display
 */
async function initializeWalletDebug() {
    console.log('🔧 Initializing wallet debug display...');
    
    try {
        // Get wallet info and update display
        await updateWalletDisplay();
        
        // Set up console debugging methods
        setupWalletConsoleDebug();
        
        console.log('✅ Wallet debug display initialized');
    } catch (error) {
        console.error('❌ Failed to initialize wallet debug:', error);
        updateWalletDisplay('Error');
    }
}

/**
 * Update the wallet address display
 */
async function updateWalletDisplay(status = null) {
    const walletAddressElement = document.getElementById('walletAddress');
    if (!walletAddressElement) return;
    
    try {
        if (status === 'Error') {
            walletAddressElement.textContent = 'Error';
            walletAddressElement.className = 'wallet-address error';
            return;
        }
        
        // Show loading state
        walletAddressElement.textContent = 'Loading...';
        walletAddressElement.className = 'wallet-address loading';
        
        // Get wallet info from zkAgent
        if (!zkAgent) {
            throw new Error('zkAgent not available');
        }
        
        // Try to get wallet using new Privy integration first
        let walletAddress = null;
        if (zkAgent.getWalletShort) {
            try {
                walletAddress = await zkAgent.getWalletShort();
            } catch (error) {
                console.warn('Privy wallet not available, trying fallback:', error);
            }
        }
        
        // Fallback to old method if Privy not available
        if (!walletAddress) {
            const fullAddress = await zkAgent.getWalletAddress();
            walletAddress = truncateAddress(fullAddress);
        }
        
        // Update display
        walletAddressElement.textContent = walletAddress;
        walletAddressElement.className = 'wallet-address';
        
        // Add click handler for full address
        walletAddressElement.onclick = () => {
            console.log('Full wallet info:', zkAgent.getWallet ? zkAgent.getWallet() : 'getWallet() not available');
        };
        
    } catch (error) {
        console.error('Failed to get wallet address:', error);
        walletAddressElement.textContent = 'No Wallet';
        walletAddressElement.className = 'wallet-address error';
    }
}

/**
 * Refresh wallet display (called by refresh button)
 */
async function refreshWalletDisplay() {
    console.log('🔄 Refreshing wallet display...');
    await updateWalletDisplay();
}

/**
 * Truncate wallet address for display
 */
function truncateAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Set up console debugging methods for judges
 */
function setupWalletConsoleDebug() {
    // Enhanced global zkAgent object for debugging
    if (!window.zkAgent) {
        window.zkAgent = {};
    }
    
    // Add debug methods
    window.zkAgent.getWallet = () => {
        if (zkAgent && zkAgent.getWallet) {
            return zkAgent.getWallet();
        } else if (zkAgent && zkAgent.wallet) {
            return zkAgent.wallet;
        } else {
            console.warn('Wallet not available. Try clicking an ad first to initialize.');
            return null;
        }
    };
    
    window.zkAgent.getWalletShort = () => {
        if (zkAgent && zkAgent.getWalletShort) {
            return zkAgent.getWalletShort();
        } else {
            const wallet = window.zkAgent.getWallet();
            return wallet ? truncateAddress(wallet.address) : 'No wallet';
        }
    };
    
    // ensureWalletAndProfile is already set up by zkAffinityAgent.js
    // No need to override it here
    
    window.zkAgent.getProfile = () => {
        if (zkAgent && zkAgent.getProfileSummary) {
            return zkAgent.getProfileSummary();
        } else {
            console.warn('Profile functionality not available');
            return null;
        }
    };
    
    window.zkAgent.refreshWallet = () => {
        refreshWalletDisplay();
    };
    
    // Log available debug commands
    console.log('🔧 Wallet Debug Commands Available:');
    console.log('  window.zkAgent.getWallet() - Get full wallet object');
    console.log('  window.zkAgent.getWalletShort() - Get truncated address');
    console.log('  window.zkAgent.ensureWalletAndProfile() - Initialize Privy wallet');
    console.log('  window.zkAgent.getProfile() - Get profile summary');
    console.log('  window.zkAgent.refreshWallet() - Refresh wallet display');
}

// ========== ZOOKIES DEMO INTEGRATION HOOKS ==========

// Expose attestation functions for ZooKies integration
window.getAttestations = function() {
    return {
        all: JSON.parse(localStorage.getItem('zk_attestations') || '[]'),
        finance: JSON.parse(localStorage.getItem('zk_finance_clicks') || '[]'),
        count: userAttestations.length,
        financeCount: financeArticleClicks.length
    };
};

// Get finance articles information
window.getFinanceArticles = function() {
    const financeArticles = document.querySelectorAll('[data-article-tag="finance"]');
    return Array.from(financeArticles).map(article => ({
        id: article.id,
        title: article.querySelector('h2')?.textContent?.replace(/💰 Finance$/, '').trim(),
        tag: article.getAttribute('data-article-tag'),
        element: article
    }));
};

// Demo mode toggle for highlighting finance articles
window.toggleDemoMode = function() {
    const body = document.body;
    const isDemoMode = body.classList.contains('demo-mode');
    
    if (isDemoMode) {
        body.classList.remove('demo-mode');
        console.log('Demo mode disabled');
    } else {
        body.classList.add('demo-mode');
        console.log('Demo mode enabled - finance articles highlighted');
        
        // Add demo mode styles
        if (!document.getElementById('demo-mode-styles')) {
            const styles = document.createElement('style');
            styles.id = 'demo-mode-styles';
            styles.textContent = `
                .demo-mode .finance-article {
                    border: 3px solid #ffeb3b !important;
                    background: linear-gradient(135deg, #fff9c4, #fff59d) !important;
                    transform: scale(1.02) !important;
                    box-shadow: 0 8px 25px rgba(255, 235, 59, 0.3) !important;
                }
                .demo-mode .finance-badge {
                    background: #4caf50 !important;
                    color: white !important;
                    padding: 4px 8px !important;
                    border-radius: 12px !important;
                    font-size: 0.8rem !important;
                    animation: pulse 2s infinite !important;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    return !isDemoMode;
};

// Force trigger finance article click for demo
window.simulateFinanceClick = function() {
    const financeArticle = document.querySelector('[data-article-tag="finance"]');
    if (financeArticle) {
        financeArticle.click();
        return true;
    }
    return false;
};

// Check if user qualifies for ads
window.checkAdQualification = function() {
    const financeClicks = JSON.parse(localStorage.getItem('zk_finance_clicks') || '[]');
    const qualified = financeClicks.length >= 2;
    
    console.log(`User ${qualified ? 'QUALIFIES' : 'does not qualify'} for ads:`, {
        financeClicks: financeClicks.length,
        threshold: 2,
        qualified,
        recentClicks: financeClicks.slice(-5)
    });
    
    return {
        qualified,
        financeClicks: financeClicks.length,
        threshold: 2
    };
};

// Reset demo state
window.resetDemoState = function() {
    localStorage.removeItem('zk_attestations');
    localStorage.removeItem('zk_finance_clicks');
    sessionStorage.removeItem('zk_session_id');
    
    financeArticleClicks.length = 0;
    userAttestations.length = 0;
    
    updateProfileDisplay();
    
    console.log('Demo state reset - all attestations and finance clicks cleared');
    return true;
};

// Demo stats
window.getDemoStats = function() {
    const attestations = JSON.parse(localStorage.getItem('zk_attestations') || '[]');
    const financeClicks = JSON.parse(localStorage.getItem('zk_finance_clicks') || '[]');
    
    return {
        totalAttestations: attestations.length,
        financeClicks: financeClicks.length,
        qualified: financeClicks.length >= 2,
        lastActivity: attestations.length > 0 ? attestations[attestations.length - 1].timestamp : null,
        sessionId: sessionStorage.getItem('zk_session_id'),
        site: 'themodernbyte.com'
    };
};

console.log('🎯 ZooKies demo integration hooks loaded:');
console.log('- window.getAttestations() - Get all attestations');
console.log('- window.getFinanceArticles() - Get finance articles info');
console.log('- window.toggleDemoMode() - Toggle demo highlighting');
console.log('- window.simulateFinanceClick() - Simulate finance click');
console.log('- window.checkAdQualification() - Check if user qualifies');
console.log('- window.resetDemoState() - Reset all demo data');
console.log('- window.getDemoStats() - Get current demo statistics');