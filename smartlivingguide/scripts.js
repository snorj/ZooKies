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