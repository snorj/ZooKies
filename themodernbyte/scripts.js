/**
 * TheModernByte - Site-specific JavaScript
 * Handles ad interactions, profile management, and attestation creation
 */

// Global variables
let zkAgent;
let currentUser = null;
let userAttestations = [];

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
        await zkAgent.initializeWallet();
        console.log('zkAffinityAgent initialized successfully');
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize profile viewer
        await initializeProfile();
        
        // Set up navigation highlighting
        setupNavigation();
        
        console.log('TheModernByte - Site initialized successfully');
    } catch (error) {
        console.error('Failed to initialize site:', error);
        showErrorMessage('Failed to initialize site functionality');
    }
});

// Set up all event listeners
function setupEventListeners() {
    // Ad click handlers
    const adCards = document.querySelectorAll('.ad-card');
    adCards.forEach(adCard => {
        adCard.addEventListener('click', handleAdCardClick);
    });
    
    // Navigation link handlers
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
    
    // Modal overlay click handler (close on outside click)
    const modalOverlay = document.getElementById('adModalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeAdModal();
            }
        });
    }
    
    // Keyboard navigation for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAdModal();
        }
    });
}

// Handle ad card clicks
async function handleAdCardClick(event) {
    event.preventDefault();
    
    const adCard = event.currentTarget;
    const adTag = adCard.getAttribute('data-tag');
    const adId = adCard.getAttribute('data-ad-id');
    const adTitle = adCard.querySelector('h3')?.textContent || '';
    const adDescription = adCard.querySelector('p')?.textContent || '';
    
    console.log('Ad clicked:', { adTag, adId, adTitle });
    
    try {
        // Show loading state
        adCard.style.opacity = '0.7';
        
        // Create attestation for ad interaction - this will handle the modal display
        const result = await zkAgent.onAdClick(adTag, 'themodernbyte.com');
        
        if (result.success) {
            console.log('Attestation created successfully:', result.attestation);
            
            // Update user profile
            await updateUserProfile(adTag);
            
            // Show success message
            showSuccessMessage('Ad interaction recorded successfully!');
        } else {
            throw new Error(result.error || 'Failed to create attestation');
        }
        
    } catch (error) {
        console.error('Error handling ad click:', error);
        showErrorMessage('Failed to record ad interaction');
    } finally {
        // Restore ad card appearance
        adCard.style.opacity = '1';
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
            userAttestations = await zkAgent.dbManager.getAllAttestations(walletAddress) || [];
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
    if (!confirm('Are you sure you want to reset your profile? This will clear all attestations and data.')) {
        return;
    }
    
    console.log('Resetting profile...');
    
    try {
        // Reset profile in zkAffinityAgent
        await zkAgent.resetProfile();
        
        // Clear local data
        currentUser = null;
        userAttestations = [];
        
        // Update display
        updateProfileDisplay();
        
        showSuccessMessage('Profile reset successfully!');
    } catch (error) {
        console.error('Error resetting profile:', error);
        showErrorMessage('Failed to reset profile');
    }
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