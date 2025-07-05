/**
 * Smart Living Guide - Site-specific JavaScript
 * Handles ad interactions, profile management, and attestation creation
 */

// Global variables
let currentUser = null;
let userAttestations = [];
let zkAgent = null;

// Ensure zkAgent is available globally
window.zkAgent = null;

// Initialize site-specific functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Smart Living Guide - Site initializing...');
    
    try {
        // Get zkAffinityAgent singleton
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

// Show error message
function showErrorMessage(message) {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message error';
    messageDiv.textContent = message;
    container.appendChild(messageDiv);

    // Remove the message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Show success message
function showSuccessMessage(message) {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.textContent = message;
    container.appendChild(messageDiv);

    // Remove the message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Show ad modal with content
function showAdModal(title, content) {
    const modal = document.getElementById('adModalOverlay');
    const modalTitle = document.getElementById('adModalTitle');
    const modalContent = document.getElementById('adModalContent');
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modal.style.display = 'flex';
}

// Close ad modal
function closeAdModal() {
    const modal = document.getElementById('adModalOverlay');
    modal.style.display = 'none';
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

// Handle ad card click
async function handleAdCardClick(event) {
    const adCard = event.target.closest('.ad-card');
    if (!adCard) return;
    
    const adId = adCard.getAttribute('data-ad-id');
    const adTag = adCard.getAttribute('data-tag');
    
    try {
        // Show loading state
        adCard.style.opacity = '0.7';
        
        // Use zkAffinityAgent's onAdClick method - this will handle the modal display
        const result = await zkAgent.onAdClick(adTag, 'smartlivingguide.com');
        
        if (result.success) {
            console.log('Attestation created successfully:', result.attestation);
            
            // Update user profile
            await updateUserProfile(adTag);
            
            // Show success message
            showSuccessMessage('Ad interaction recorded successfully!');
        } else {
            throw new Error('Failed to create attestation');
        }
    } catch (error) {
        console.error('Error handling ad click:', error);
        showErrorMessage('Failed to process ad interaction. Please try again.');
    } finally {
        // Reset loading state
        adCard.style.opacity = '1';
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to all ad cards
    document.querySelectorAll('.ad-card').forEach(card => {
        card.addEventListener('click', handleAdCardClick);
    });

    // Add click handler to modal close button
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAdModal);
    }

    // Add click handler to modal action button
    const actionBtn = document.getElementById('adActionBtn');
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            showSuccessMessage('Action completed successfully!');
            closeAdModal();
        });
    }
}); 