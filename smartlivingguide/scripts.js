/**
 * Smart Living Guide - Site-specific JavaScript
 * Handles ad interactions, profile management, and attestation creation
 */

// Global variables
let zkAgent;
let currentUser = null;
let userAttestations = [];

// Initialize site-specific functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Smart Living Guide - Site initializing...');
    
    try {
        // Use the global zkAffinityAgent singleton
        zkAgent = window.zkAffinityAgent;
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
        
        console.log('Smart Living Guide - Site initialized successfully');
    } catch (error) {
        console.error('Failed to initialize site:', error);
        showMessage('Failed to initialize site functionality', 'error');
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
    
    console.log('Ad clicked:', { adTag, adId });
    
    try {
        // Show loading state
        adCard.style.opacity = '0.7';
        
        // Create attestation for ad interaction
        const attestationData = {
            action: 'ad_click',
            tag: adTag,
            adId: adId,
            timestamp: Date.now(),
            publisher: 'smartlivingguide',
            context: {
                article: getClosestArticleTitle(adCard),
                userAgent: navigator.userAgent,
                referrer: document.referrer || 'direct'
            }
        };
        
        // Use zkAffinityAgent's onAdClick method
        const result = await zkAgent.onAdClick(adTag, 'smartlivingguide.com');
        
        if (result.success) {
            console.log('Attestation created successfully:', result.attestation);
            
            // Update user profile
            await updateUserProfile(adTag);
            
            // Show success message
            showMessage('Ad interaction recorded successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to create attestation');
        }
        
    } catch (error) {
        console.error('Error handling ad click:', error);
        showMessage('Failed to record ad interaction', 'error');
    } finally {
        // Restore ad card appearance
        adCard.style.opacity = '1';
    }
}

// Show ad modal with specific content
function showAdModal(adTag, adId, adCard) {
    const modalOverlay = document.getElementById('adModalOverlay');
    const modalTitle = document.getElementById('adModalTitle');
    const modalContent = document.getElementById('adModalContent');
    const actionBtn = document.getElementById('adActionBtn');
    
    // Get ad content from the card
    const adTitle = adCard.querySelector('h3').textContent;
    const adDescription = adCard.querySelector('p').textContent;
    
    // Set modal content based on ad type
    modalTitle.textContent = adTitle;
    
    let modalHtml = '';
    let actionUrl = '#';
    let actionText = 'Visit Site';
    
    switch (adId) {
        case 'tripmate-pro':
            modalHtml = `
                <div class="ad-detail">
                    <h4>✈️ TripMate Pro AI Travel Planning</h4>
                    <p>${adDescription}</p>
                    <ul class="ad-features">
                        <li>✓ AI-powered itinerary optimization</li>
                        <li>✓ Real-time flight and hotel monitoring</li>
                        <li>✓ Automatic rebooking for disruptions</li>
                        <li>✓ Integrated expense tracking</li>
                        <li>✓ Travel document management</li>
                        <li>✓ 24/7 concierge support</li>
                    </ul>
                    <div class="pricing-info">
                        <p><strong>Special Offer:</strong> 50% off first year - $49/year (normally $99)</p>
                    </div>
                    <p class="ad-disclaimer">Limited time offer. Terms and conditions apply.</p>
                </div>
            `;
            actionUrl = 'https://tripmate.example.com/pro-signup';
            actionText = 'Start Free Trial';
            break;
            
        case 'bloom':
            modalHtml = `
                <div class="ad-detail">
                    <h4>🏦 Bloom Interest-Free Banking</h4>
                    <p>${adDescription}</p>
                    <ul class="ad-features">
                        <li>✓ No monthly fees or minimums</li>
                        <li>✓ 2% cashback on all purchases</li>
                        <li>✓ Interest-free overdraft protection</li>
                        <li>✓ Instant payment notifications</li>
                        <li>✓ Budgeting and savings tools</li>
                        <li>✓ Free ATM access worldwide</li>
                    </ul>
                    <div class="pricing-info">
                        <p><strong>New User Bonus:</strong> $50 signup bonus + first month free</p>
                    </div>
                    <p class="ad-disclaimer">FDIC insured. No credit check required.</p>
                </div>
            `;
            actionUrl = 'https://bloom.example.com/signup';
            actionText = 'Open Account';
            break;
            
        case 'streamly':
            modalHtml = `
                <div class="ad-detail">
                    <h4>📱 Streamly VPN + Streaming Bundle</h4>
                    <p>${adDescription}</p>
                    <ul class="ad-features">
                        <li>✓ Premium VPN with 80+ countries</li>
                        <li>✓ Access to 15+ streaming platforms</li>
                        <li>✓ No logs, military-grade encryption</li>
                        <li>✓ Unlimited bandwidth and devices</li>
                        <li>✓ Ad-free streaming experience</li>
                        <li>✓ 4K streaming supported</li>
                    </ul>
                    <div class="pricing-info">
                        <p><strong>Limited Offer:</strong> 3 months free + 70% off annual plan</p>
                    </div>
                    <p class="ad-disclaimer">Cancel anytime. No commitments.</p>
                </div>
            `;
            actionUrl = 'https://streamly.example.com/bundle';
            actionText = 'Start Free Trial';
            break;
    }
    
    // Set modal content
    modalContent.innerHTML = modalHtml;
    
    // Set action button
    actionBtn.textContent = actionText;
    actionBtn.onclick = function() {
        // In a real implementation, this would open the advertiser's site
        console.log('Would redirect to:', actionUrl);
        showMessage(`Would redirect to ${actionUrl}`, 'info');
        closeAdModal();
    };
    
    // Show modal
    modalOverlay.style.display = 'flex';
    modalOverlay.setAttribute('aria-hidden', 'false');
    
    // Focus management for accessibility
    const modal = document.getElementById('adModal');
    modal.focus();
}

// Close ad modal
function closeAdModal() {
    const modalOverlay = document.getElementById('adModalOverlay');
    modalOverlay.style.display = 'none';
    modalOverlay.setAttribute('aria-hidden', 'true');
}

// Get closest article title for context
function getClosestArticleTitle(adCard) {
    const article = adCard.previousElementSibling;
    if (article && article.classList.contains('article-card')) {
        const title = article.querySelector('h2');
        return title ? title.textContent : 'Unknown Article';
    }
    return 'Unknown Article';
}

// Initialize profile viewer
async function initializeProfile() {
    try {
        console.log('🔍 Starting profile initialization...');
        
        // Skip user profile for now (method doesn't exist)
        currentUser = null;
        
        // Get user attestations from database
        console.log('💳 Getting wallet address...');
        const walletAddress = await zkAgent.getWalletAddress();
        console.log('✅ Wallet address:', walletAddress);
        
        console.log('🗄️ Checking database manager...');
        if (zkAgent.dbManager) {
            console.log('📋 Fetching attestations from database...');
            userAttestations = await zkAgent.dbManager.getAllAttestations(walletAddress) || [];
            console.log(`✅ Found ${userAttestations.length} attestations`);
        } else {
            console.log('⚠️ No database manager, using local attestations');
            userAttestations = zkAgent.getAttestations() || [];
        }
        
        // Update profile display
        console.log('🖼️ Updating profile display...');
        updateProfileDisplay();
        console.log('✅ Profile initialization complete');
        
    } catch (error) {
        console.error('❌ Failed to initialize profile:', error);
        // Set default values
        currentUser = null;
        userAttestations = [];
        updateProfileDisplay();
    }
}

// Update profile display
function updateProfileDisplay() {
    const attestationCount = document.getElementById('attestationCount');
    const lastActivity = document.getElementById('lastActivity');
    const userInterests = document.getElementById('userInterests');
    
    // Update attestation count
    if (attestationCount) {
        attestationCount.textContent = userAttestations.length;
    }
    
    // Update last activity
    if (lastActivity && userAttestations.length > 0) {
        const latest = userAttestations[userAttestations.length - 1];
        const date = new Date(latest.timestamp);
        lastActivity.textContent = date.toLocaleDateString();
    } else if (lastActivity) {
        lastActivity.textContent = 'None';
    }
    
    // Update interests based on attestations
    if (userInterests) {
        const interests = extractInterests();
        userInterests.textContent = interests.length > 0 ? interests.join(', ') : 'None detected';
    }
}

// Extract interests from attestations
function extractInterests() {
    const interestCounts = {};
    
    userAttestations.forEach(attestation => {
        if (attestation.tag) {
            interestCounts[attestation.tag] = (interestCounts[attestation.tag] || 0) + 1;
        }
    });
    
    // Sort by frequency and return top interests
    return Object.keys(interestCounts)
        .sort((a, b) => interestCounts[b] - interestCounts[a])
        .slice(0, 3)
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
}

// Update user profile with new tag
async function updateUserProfile(tag) {
    try {
        const profileData = {
            lastActivity: Date.now(),
            interests: [...(currentUser?.interests || []), tag],
            publisher: 'smartlivingguide'
        };
        
        const result = await zkAgent.updateUserProfile(profileData);
        
        if (result.success) {
            currentUser = result.profile;
            // Refresh attestations from database
            const walletAddress = await zkAgent.getWalletAddress();
            if (zkAgent.dbManager) {
                userAttestations = await zkAgent.dbManager.getAllAttestations(walletAddress) || [];
            } else {
                userAttestations = zkAgent.getAttestations() || [];
            }
            updateProfileDisplay();
        }
        
    } catch (error) {
        console.error('Failed to update user profile:', error);
    }
}

// Refresh profile data
async function refreshProfile() {
    try {
        showMessage('Refreshing profile...', 'info');
        await initializeProfile();
        showMessage('Profile refreshed successfully', 'success');
    } catch (error) {
        console.error('Failed to refresh profile:', error);
        showMessage('Failed to refresh profile', 'error');
    }
}

// Reset user profile
async function resetProfile() {
    try {
        const confirmation = confirm('Are you sure you want to reset your profile? This will clear all attestation data.');
        
        if (confirmation) {
            const result = await zkAgent.resetUserProfile();
            
            if (result.success) {
                currentUser = null;
                userAttestations = [];
                updateProfileDisplay();
                showMessage('Profile reset successfully', 'success');
            } else {
                throw new Error(result.error || 'Failed to reset profile');
            }
        }
    } catch (error) {
        console.error('Failed to reset profile:', error);
        showMessage('Failed to reset profile', 'error');
    }
}

// Handle navigation clicks
function handleNavClick(event) {
    event.preventDefault();
    
    const targetId = event.target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        // Smooth scroll to target
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

// Set up navigation highlighting based on scroll position
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.article-card');
    
    // Intersection Observer for scroll-based navigation highlighting
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                
                // Update active nav link
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.6,
        rootMargin: '-100px 0px'
    });
    
    // Observe all sections
    sections.forEach(section => {
        observer.observe(section);
    });
}

// Show success/error messages
function showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type} ${type}-message`;
    messageElement.textContent = message;
    
    container.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Get advertising statistics (for debugging/analytics)
function getAdStats() {
    const stats = {
        totalAttestations: userAttestations.length,
        adsByTag: {},
        topInterests: extractInterests(),
        publisher: 'smartlivingguide'
    };
    
    userAttestations.forEach(attestation => {
        if (attestation.tag) {
            stats.adsByTag[attestation.tag] = (stats.adsByTag[attestation.tag] || 0) + 1;
        }
    });
    
    return stats;
} 