/**
 * zkAffinityAgent - Comprehensive singleton library for managing attestations and ad interactions
 * Integrates wallet management, cryptographic attestations, database operations, and UI modals
 * Designed for browser environments with full Node.js compatibility for testing
 */

console.log('🟢 zkAffinityAgent.js file is starting to execute...');

// Browser-compatible imports with fallbacks
let ethers;

// Privy integration imports
let privyModule, profileStoreModule, databaseModule;

// Load Privy modules in browser environment
if (typeof window !== 'undefined') {
    // Dynamic imports for browser environment
    Promise.all([
        import('./privy.js'),
        import('./profile-store.js'),
        import('./database-browser.js')
    ]).then(([privy, profileStore, database]) => {
        privyModule = privy;
        profileStoreModule = profileStore;
        databaseModule = database;
        console.log('🔗 Privy modules loaded successfully');
    }).catch(error => {
        console.warn('⚠️ Privy modules not available:', error);
    });
}

// Helper functions to get references without variable conflicts
function getDatabaseManager() {
    if (typeof window !== 'undefined') {
        return window.DatabaseManager;
    } else if (typeof global !== 'undefined' && global.DatabaseManager) {
        return global.DatabaseManager;
    }
    return null;
}

function getPublisherSigner() {
    if (typeof window !== 'undefined') {
        return window.PublisherSigner;
    } else if (typeof global !== 'undefined' && global.PublisherSigner) {
        return global.PublisherSigner;
    }
    return null;
}

function getPublisherKeys() {
    if (typeof window !== 'undefined') {
        return window.PUBLISHER_KEYS;
    } else if (typeof global !== 'undefined' && global.PUBLISHER_KEYS) {
        return global.PUBLISHER_KEYS;
    }
    return null;
}

// Node.js environment imports
if (typeof module !== 'undefined' && module.exports) {
    try {
        const ethersModule = require('ethers');
        const { DatabaseManager: DBManager } = require('./database');
        const { PublisherSigner: PubSigner } = require('./cryptography');
        const { PUBLISHER_KEYS: PubKeys } = require('./publisher-keys');
        
        ethers = ethersModule;
        global.DatabaseManager = DBManager;  // Store in global for helper function
        global.PublisherSigner = PubSigner;
        global.PUBLISHER_KEYS = PubKeys;
        
        module.exports.ethers = ethers;
        module.exports.DatabaseManager = DBManager;
        module.exports.PublisherSigner = PubSigner;
        module.exports.PUBLISHER_KEYS = PubKeys;
    } catch (error) {
        console.warn('zkAffinityAgent: Node.js dependencies not available, browser mode only');
    }
} else if (typeof window !== 'undefined') {
    // Browser environment - dependencies should be loaded via script tags
    console.log('🌐 zkAffinityAgent loading in browser environment');
    console.log('Initial window check:', {
        ethers: !!window.ethers,
        DatabaseManager: !!window.DatabaseManager,
        PublisherSigner: !!window.PublisherSigner,
        PUBLISHER_KEYS: !!window.PUBLISHER_KEYS
    });
    
    ethers = window.ethers;
    // Don't assign variables - use helper functions instead to avoid conflicts
    
    console.log('After assignment:', {
        ethers: !!ethers,
        DatabaseManager: !!getDatabaseManager(),
        PublisherSigner: !!getPublisherSigner(),
        PUBLISHER_KEYS: !!getPublisherKeys()
    });
}

/**
 * Custom error classes for zkAffinityAgent operations
 */
class ZkAffinityAgentError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ZkAffinityAgentError';
    }
}

class WalletError extends ZkAffinityAgentError {
    constructor(message) {
        super(message);
        this.name = 'WalletError';
    }
}

class AttestationError extends ZkAffinityAgentError {
    constructor(message) {
        super(message);
        this.name = 'AttestationError';
    }
}

/**
 * ZkAffinityAgent Singleton Class
 * Manages the complete user journey for ad interactions and attestation creation
 * 
 * ⚠️ WALLET IMPLEMENTATION NOTE:
 * The current wallet implementation is temporary and for demonstration purposes only.
 * It will be replaced by Privy wallet integration in the production version.
 * Current limitations:
 * - Creates ephemeral wallets that don't persist across page refreshes
 * - Uses basic localStorage for demo purposes
 * - Does not support real user wallets
 * 
 * These limitations will be addressed by the Privy integration which will provide:
 * - Persistent wallet management
 * - Secure key storage
 * - Real user wallet connections
 * - Cross-session state management
 */
class ZkAffinityAgent {
    constructor() {
        console.log('🔧 ZkAffinityAgent constructor starting...');
        
        // Initialize state
        this.wallet = null;
        this.attestations = [];
        this.profileSigned = false;
        this.isInitialized = false;
        this.currentPublisher = null;
        this.currentModal = null;
        this.eventListeners = [];
        this.modal = null;
        this.modalStyles = null;
        
        console.log('🔧 ZkAffinityAgent constructor - state initialized');
        
        // Validate dependencies
        if (!ethers) {
            console.error('❌ ZkAffinityAgent constructor: ethers not available');
            throw new ZkAffinityAgentError('Ethers library not available');
        }
        if (!getDatabaseManager()) {
            console.error('❌ ZkAffinityAgent constructor: DatabaseManager not available');
            throw new ZkAffinityAgentError('DatabaseManager not available');
        }
        if (!getPublisherSigner()) {
            console.error('❌ ZkAffinityAgent constructor: PublisherSigner not available');
            throw new ZkAffinityAgentError('PublisherSigner not available');
        }
        if (!getPublisherKeys()) {
            console.error('❌ ZkAffinityAgent constructor: PUBLISHER_KEYS not available');
            throw new ZkAffinityAgentError('PUBLISHER_KEYS not available');
        }
        
        console.log('🔧 ZkAffinityAgent constructor - dependencies validated');
        
        // Initialize components
        const DatabaseManager = getDatabaseManager();
        this.dbManager = new DatabaseManager();
        // Note: PublisherSigner is created per-request in createAttestation() with proper parameters
        
        console.log('🔧 ZkAffinityAgent constructor - components initialized');
        
        // Bind methods to preserve 'this' context
        this.initializeWallet = this.initializeWallet.bind(this);
        this.ensureWalletAndProfile = this.ensureWalletAndProfile.bind(this);
        this.getWallet = this.getWallet.bind(this);
        this.getWalletShort = this.getWalletShort.bind(this);
        
        console.log('🔧 ZkAffinityAgent constructor completed successfully');
    }

    /**
     * Ensure wallet exists and profile is bound using Privy integration
     * This is the main initialization method that replaces the temporary wallet logic
     * @returns {Promise<{success: boolean, wallet?: object, profile?: object, error?: string}>}
     */
    async ensureWalletAndProfile() {
        try {
            console.log('🔗 Ensuring global wallet and profile...');

            // Try to use the global Privy wallet first
            if (typeof window !== 'undefined' && window.privyModule) {
                try {
                    console.log('🌐 Using global Privy wallet system');
                    const { getEmbeddedWallet, createSignedProfileClaim } = window.privyModule;
                    
                    // Get or create the global wallet
                    const walletResult = await getEmbeddedWallet();
                    if (walletResult.wallet) {
                        this.wallet = walletResult.wallet;
                        this.isInitialized = true;
                        
                        console.log('✅ Global wallet ensured:', this.wallet.address);
                        
                        // Ensure profile is signed
                        if (!this.profileSigned) {
                            const claimResult = await createSignedProfileClaim();
                            if (claimResult.success) {
                                this.profileSigned = true;
                                console.log('📋 Profile claim signed with global wallet');
                            }
                        }
                        
                        return {
                            success: true,
                            wallet: this.wallet,
                            isGlobal: true,
                            walletAddress: this.wallet.address
                        };
                    }
                } catch (privyError) {
                    console.warn('⚠️ Global Privy wallet failed:', privyError.message);
                }
            }

            // Fallback: Check if we have existing global wallet data
            if (typeof window !== 'undefined' && window.localStorage) {
                const globalWalletKey = 'zookies_global_wallet';
                const existingWallet = localStorage.getItem(globalWalletKey);
                
                if (existingWallet) {
                    try {
                        const walletData = JSON.parse(existingWallet);
                        if (window.ethers && walletData.privateKey) {
                            this.wallet = new window.ethers.Wallet(walletData.privateKey);
                            this.isInitialized = true;
                            
                            console.log('✅ Restored global wallet:', this.wallet.address);
                            return {
                                success: true,
                                wallet: this.wallet,
                                isGlobal: true,
                                walletAddress: this.wallet.address
                            };
                        }
                    } catch (parseError) {
                        console.warn('⚠️ Failed to parse global wallet data:', parseError.message);
                    }
                }
            }

            // Final fallback: Create new global wallet
            console.log('🔄 Creating new global wallet');
            if (window.ethers) {
                this.wallet = window.ethers.Wallet.createRandom();
                this.isInitialized = true;
                
                // Store globally for all sites
                if (typeof localStorage !== 'undefined') {
                    const globalWalletKey = 'zookies_global_wallet';
                    localStorage.setItem(globalWalletKey, JSON.stringify({
                        address: this.wallet.address,
                        privateKey: this.wallet.privateKey,
                        createdAt: Date.now(),
                        version: '1.0'
                    }));
                    console.log('🌐 New global wallet stored for all sites');
                }
                
                return {
                    success: true,
                    wallet: this.wallet,
                    isGlobal: true,
                    isNew: true,
                    walletAddress: this.wallet.address
                };
            }

            throw new WalletError('No wallet system available');

        } catch (error) {
            console.error('❌ Failed to ensure wallet and profile:', error);
            return {
                success: false,
                error: error.message || 'Failed to ensure wallet and profile'
            };
        }
    }

    /**
     * Get the current wallet instance
     * @returns {Promise<{wallet?: object, error?: string}>}
     */
    async getWallet() {
        try {
            if (this.wallet) {
                return { wallet: this.wallet };
            }

            // Try to ensure wallet and profile first
            const result = await this.ensureWalletAndProfile();
            if (result.success && result.wallet) {
                return { wallet: result.wallet };
            }

            throw new WalletError('No wallet available');
        } catch (error) {
            console.error('❌ Failed to get wallet:', error);
            return { error: error.message || 'Failed to get wallet' };
        }
    }

    /**
     * Get shortened wallet address for display (0x1234...abcd format)
     * @returns {Promise<string>}
     */
    async getWalletShort() {
        try {
            const { wallet, error } = await this.getWallet();
            if (error || !wallet) {
                return 'No wallet';
            }

            const address = wallet.address;
            if (!address || address.length < 10) {
                return 'Invalid address';
            }

            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        } catch (error) {
            console.error('❌ Failed to get short wallet address:', error);
            return 'Error';
        }
    }

    /**
     * Initialize wallet using ethers.js - creates random wallet on first interaction
     * 
     * ⚠️ TEMPORARY IMPLEMENTATION:
     * This is a temporary demo implementation that creates ephemeral wallets.
     * It will be replaced by Privy wallet integration which will:
     * - Handle persistent wallet management
     * - Allow users to connect their own wallets
     * - Manage wallet state across sessions
     * - Provide a more secure and user-friendly experience
     * 
     * @returns {Promise<string>} - Wallet address
     */
    async initializeWallet() {
        try {
            if (this.wallet) {
                console.log('🔑 Wallet already initialized:', this.wallet.address);
                return this.wallet.address;
            }

            if (!ethers) {
                throw new WalletError('Ethers.js not available. Please include ethers library.');
            }

            // TEMPORARY: Demo-only wallet persistence
            // This will be replaced by Privy wallet integration
            if (typeof window !== 'undefined') {
                const storedPrivateKey = localStorage.getItem('zkAffinity_privateKey');
                const storedAddress = localStorage.getItem('zkAffinity_walletAddress');
                
                if (storedPrivateKey && storedAddress) {
                    this.wallet = new ethers.Wallet(storedPrivateKey);
                    console.log('🔑 Wallet loaded from localStorage:', this.wallet.address);
                } else {
                    // Create random wallet for demo purposes only
                    // This will be replaced by Privy wallet connection
                    this.wallet = ethers.Wallet.createRandom();
                    console.log('🔑 New wallet created:', this.wallet.address);
                }
            } else {
                // Node.js environment - create random wallet for testing
                this.wallet = ethers.Wallet.createRandom();
                console.log('🔑 New wallet created (Node.js):', this.wallet.address);
            }

            this.isInitialized = true;
            console.log('🔑 Wallet initialized successfully');

            // Initialize database manager if in Node.js environment
            const DatabaseManager = getDatabaseManager();
            if (DatabaseManager && !this.dbManager) {
                this.dbManager = new DatabaseManager();
                await this.dbManager.initializeDatabase();
                console.log('🗃️ Database manager initialized');
            }

            return this.wallet.address;

        } catch (error) {
            const errorMsg = `Wallet initialization failed: ${error.message}`;
            console.error('❌', errorMsg);
            throw new WalletError(errorMsg);
        }
    }

    /**
     * Get current wallet address (initialize if needed)
     * @returns {Promise<string>} - Wallet address
     */
    async getWalletAddress() {
        if (!this.wallet) {
            const result = await this.ensureWalletAndProfile();
            if (!result.success || !result.wallet) {
                throw new WalletError('Failed to initialize wallet');
            }
        }
        return this.wallet.address;
    }

    /**
     * Generate new wallet (for demo reset purposes)
     * 
     * ⚠️ TEMPORARY IMPLEMENTATION:
     * This is a demo-only feature that will be removed when Privy wallet integration
     * is implemented. In the Privy implementation, wallet management will be handled
     * by Privy's secure wallet infrastructure.
     * 
     * @returns {Promise<string>} - New wallet address
     */
    async generateNewWallet() {
        try {
            if (!ethers) {
                throw new WalletError('Ethers.js not available');
            }

            const oldAddress = this.wallet ? this.wallet.address : 'none';
            // Demo-only: Create random wallet
            this.wallet = ethers.Wallet.createRandom();
            this.profileSigned = false;
            this.attestations = [];

            console.log(`🔄 Wallet reset: ${oldAddress} → ${this.wallet.address}`);
            return this.wallet.address;

        } catch (error) {
            throw new WalletError(`Failed to generate new wallet: ${error.message}`);
        }
    }

    /**
     * Complete ad click workflow - modal display, attestation creation, database storage
     * @param {string} adTag - Ad category (finance, privacy, travel, gaming)
     * @param {string} publisher - Publisher domain (optional, auto-detect from URL)
     * @returns {Promise<Object>} - Attestation creation result
     */
    async onAdClick(adTag, publisher = null) {
        try {
            console.log(`🎯 Ad click initiated: tag=${adTag}, publisher=${publisher}`);

            // Validate ad tag
            const validTags = ['finance', 'privacy', 'travel', 'gaming'];
            if (!validTags.includes(adTag)) {
                throw new AttestationError(`Invalid ad tag: ${adTag}. Must be one of: ${validTags.join(', ')}`);
            }

            // Auto-detect publisher from URL if not provided
            if (!publisher && typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                if (hostname.includes('themodernbyte')) {
                    publisher = 'themodernbyte.com';
                } else if (hostname.includes('smartlivingguide')) {
                    publisher = 'smartlivingguide.com';
                } else {
                    publisher = 'themodernbyte.com'; // Default fallback
                }
            }
            
            if (!publisher) {
                throw new AttestationError('Publisher domain not provided and cannot be auto-detected');
            }

            this.currentPublisher = publisher;

            // Ensure wallet and profile are initialized (Privy integration)
            const walletResult = await this.ensureWalletAndProfile();
            if (!walletResult.success) {
                throw new WalletError(walletResult.error || 'Failed to initialize wallet');
            }
            
            const walletAddress = walletResult.wallet.address;

            // Step 1: Show expanded ad modal
            await this.showExpandedAd(adTag, publisher);

            // Step 2: Create attestation after modal interaction
            const attestation = await this.createAttestation(adTag, walletAddress, publisher);

            // Step 3: Store in local array for browser environments
            this.attestations.push(attestation);

            // Step 4: Store in database if available
            if (this.dbManager) {
                try {
                    await this.dbManager.verifyAndStoreAttestation(attestation);
                    console.log('✅ Attestation stored in database');
                } catch (dbError) {
                    console.warn('⚠️ Database storage failed, continuing with local storage:', dbError.message);
                }
            }

            // Step 5: Show success feedback
            this.showSuccessFeedback(adTag, attestation);

            console.log('🎉 Ad click workflow completed successfully');
            return {
                success: true,
                attestation,
                walletAddress,
                tag: adTag,
                publisher
            };

        } catch (error) {
            console.error('❌ Ad click workflow failed:', error.message);
            this.showErrorMessage(`Ad interaction failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create cryptographic attestation for ad interaction
     * @param {string} adTag - Ad category
     * @param {string} walletAddress - User's wallet address
     * @param {string} publisher - Publisher domain
     * @returns {Promise<Object>} - Signed attestation
     */
    async createAttestation(adTag, walletAddress, publisher) {
        try {
            const PublisherSigner = getPublisherSigner();
            const PUBLISHER_KEYS = getPublisherKeys();
            if (!PublisherSigner || !PUBLISHER_KEYS) {
                throw new AttestationError('Cryptography modules not available');
            }

            // Get publisher's private key
            const publisherKeys = PUBLISHER_KEYS[publisher];
            if (!publisherKeys) {
                throw new AttestationError(`Publisher keys not found for: ${publisher}`);
            }

            // Create publisher signer
            const signer = new PublisherSigner(publisherKeys.privateKey, publisher);

            // Sign the attestation
            const attestation = await signer.signAttestation(adTag, walletAddress);

            console.log('✅ Attestation created and signed:', {
                tag: adTag,
                publisher,
                wallet: walletAddress,
                nonce: attestation.nonce
            });

            return attestation;

        } catch (error) {
            throw new AttestationError(`Failed to create attestation: ${error.message}`);
        }
    }

    /**
     * Show expanded ad modal with content and interaction
     * @param {string} adTag - Ad category
     * @param {string} publisher - Publisher domain
     * @returns {Promise<void>}
     */
    async showExpandedAd(adTag, publisher) {
        return new Promise((resolve) => {
            try {
                // Only create modals in browser environment
                if (typeof document === 'undefined') {
                    console.log(`📱 Modal display (Node.js mode): ${adTag} ad from ${publisher}`);
                    setTimeout(resolve, 100); // Simulate modal interaction time
                    return;
                }

                // Remove any existing modals
                this.closeCurrentModal();

                // Hide any existing HTML modal that might conflict
                const existingModal = document.getElementById('adModalOverlay');
                if (existingModal) {
                    existingModal.style.display = 'none';
                }

                // Create modal overlay
                const overlay = document.createElement('div');
                overlay.className = 'ad-modal-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                `;

                // Create modal content
                const modal = document.createElement('div');
                modal.className = 'ad-modal';
                modal.style.cssText = `
                    background: white;
                    border-radius: 15px;
                    padding: 40px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                    animation: modalSlideIn 0.3s ease;
                `;

                // Modal content based on ad tag
                const adContent = this.getAdContent(adTag, publisher);
                modal.innerHTML = `
                    <button class="modal-close" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">&times;</button>
                    <div class="ad-content">
                        ${adContent}
                    </div>
                    <div class="ad-actions" style="margin-top: 30px; text-align: center;">
                        <button id="adActionBtn" class="ad-interact-btn" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 12px 24px;
                            font-size: 16px;
                            cursor: pointer;
                            margin-right: 10px;
                        ">I'm Interested</button>
                        <button class="ad-skip-btn" style="
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            padding: 12px 24px;
                            font-size: 16px;
                            cursor: pointer;
                        ">Skip</button>
                    </div>
                `;

                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                this.currentModal = overlay;

                // Add CSS animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-50px) scale(0.9);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                `;
                document.head.appendChild(style);

                // Event listeners
                const closeModal = () => {
                    this.closeCurrentModal();
                    resolve();
                };

                const interactBtn = modal.querySelector('#adActionBtn');
                const skipBtn = modal.querySelector('.ad-skip-btn');
                const closeBtn = modal.querySelector('.modal-close');

                interactBtn.addEventListener('click', closeModal);
                skipBtn.addEventListener('click', closeModal);
                closeBtn.addEventListener('click', closeModal);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) closeModal();
                });

                // Store event listeners for cleanup
                this.eventListeners.push({ element: interactBtn, event: 'click', handler: closeModal });
                this.eventListeners.push({ element: skipBtn, event: 'click', handler: closeModal });
                this.eventListeners.push({ element: closeBtn, event: 'click', handler: closeModal });

                console.log(`📱 Modal displayed for ${adTag} ad from ${publisher}`);

            } catch (error) {
                console.error('❌ Modal display failed:', error.message);
                resolve(); // Don't block the workflow
            }
        });
    }

    /**
     * Get ad content based on tag and publisher
     * @param {string} adTag - Ad category
     * @param {string} publisher - Publisher domain
     * @returns {string} - HTML content for the ad
     */
    getAdContent(adTag, publisher) {
        const adDatabase = {
            finance: {
                'themodernbyte.com': {
                    title: 'NeoBank+ 5% APY',
                    emoji: '💰',
                    description: 'Upgrade to 5% APY with NeoBank+ - No minimums. No tricks. Just high yield.',
                    features: ['5% Annual Percentage Yield', 'No minimum balance', 'FDIC insured', 'Mobile banking']
                },
                'smartlivingguide.com': {
                    title: 'Bloom Debit Card',
                    emoji: '🏦',
                    description: 'No Hidden Fees: Meet Bloom - The interest-free debit card that pays you back.',
                    features: ['No hidden fees', 'Cashback rewards', 'Instant notifications', 'Budgeting tools']
                }
            },
            privacy: {
                'themodernbyte.com': {
                    title: 'ClearVPN Protection',
                    emoji: '🛡️',
                    description: 'Stop Trackers with ClearVPN - Browse privately. No logs. No tracking.',
                    features: ['Zero-log policy', 'Global server network', 'Ad blocking', '24/7 protection']
                },
                'smartlivingguide.com': {
                    title: 'Streamly VPN Bundle',
                    emoji: '📱',
                    description: 'Get 3 Months Free with Streamly - VPN + streaming bundle. One app, total privacy.',
                    features: ['VPN + streaming', '3 months free', 'Unlimited bandwidth', 'Multiple devices']
                }
            },
            gaming: {
                'themodernbyte.com': {
                    title: 'GameGrid Browser Games',
                    emoji: '🎮',
                    description: 'Try GameGrid – Free Browser Games - Play instantly. No downloads required.',
                    features: ['Instant play', 'No downloads', 'Multiplayer support', 'Cross-platform']
                },
                'smartlivingguide.com': {
                    title: 'PlayZone Premium',
                    emoji: '🕹️',
                    description: 'Premium Gaming Experience - Access thousands of games with PlayZone Premium.',
                    features: ['Thousands of games', 'Premium access', 'Cloud saves', 'No ads']
                }
            },
            travel: {
                'themodernbyte.com': {
                    title: 'TechTravel Pro',
                    emoji: '✈️',
                    description: 'Smart Travel Planning - AI-powered itineraries for the modern traveler.',
                    features: ['AI-powered planning', 'Smart recommendations', 'Real-time updates', 'Expense tracking']
                },
                'smartlivingguide.com': {
                    title: 'TripMate Pro',
                    emoji: '🧳',
                    description: 'Travel Smarter with TripMate Pro - AI-powered travel planning. Book once, travel seamlessly.',
                    features: ['AI travel planning', 'One-click booking', 'Seamless experience', 'Travel insights']
                }
            }
        };

        const ad = adDatabase[adTag]?.[publisher] || {
            title: 'Special Offer',
            emoji: '🎯',
            description: 'Discover something amazing with this special offer.',
            features: ['Limited time', 'Exclusive access', 'Premium features', 'Great value']
        };

        return `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">${ad.emoji}</div>
                <h2 id="adModalTitle" style="color: #333; margin-bottom: 15px;">${ad.title}</h2>
                <p style="font-size: 16px; color: #666; margin-bottom: 25px;">${ad.description}</p>
                <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                    ${ad.features.map(feature => `<li style="margin-bottom: 8px; color: #555;">${feature}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * Show success feedback after attestation creation
     * @param {string} adTag - Ad category
     * @param {Object} attestation - Created attestation
     */
    showSuccessFeedback(adTag, attestation) {
        try {
            // Only create UI feedback in browser environment
            if (typeof document === 'undefined') {
                console.log(`✅ Success feedback (Node.js mode): ${adTag} attestation created`);
                return;
            }

            // Create success toast
            const toast = document.createElement('div');
            toast.className = 'success-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                border-radius: 8px;
                padding: 15px 20px;
                z-index: 1001;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease;
            `;

            toast.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 20px; margin-right: 10px;">✅</span>
                    <div>
                        <strong>Attestation Created!</strong><br>
                        <small>Your ${adTag} interest has been recorded</small>
                    </div>
                </div>
            `;

            document.body.appendChild(toast);

            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);

            console.log(`✅ Success feedback displayed for ${adTag} attestation`);

        } catch (error) {
            console.error('❌ Success feedback failed:', error.message);
        }
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        try {
            if (typeof document === 'undefined') {
                console.error(`❌ Error message (Node.js mode): ${message}`);
                return;
            }

            const toast = document.createElement('div');
            toast.className = 'error-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 15px 20px;
                z-index: 1001;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;

            toast.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 20px; margin-right: 10px;">❌</span>
                    <div>
                        <strong>Error</strong><br>
                        <small>${message}</small>
                    </div>
                </div>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 5000);

        } catch (error) {
            console.error('❌ Error message display failed:', error.message);
        }
    }

    /**
     * Close current modal and cleanup
     */
    closeCurrentModal() {
        if (this.currentModal) {
            // Cleanup event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                } catch (e) {
                    // Element might already be removed
                }
            });
            this.eventListeners = [];

            // Remove modal from DOM
            if (this.currentModal.parentNode) {
                this.currentModal.remove();
            }
            this.currentModal = null;
        }
    }

    /**
     * Check if user has signed profile (for one-time setup)
     * @returns {boolean} - Profile signing status
     */
    hasSignedProfile() {
        return this.profileSigned;
    }

    /**
     * Sign profile claim for first-time setup
     * @returns {Promise<Object>} - Profile signature result
     */
    async signProfileClaim() {
        try {
            if (this.profileSigned) {
                console.log('📋 Profile already signed');
                return { success: true, alreadySigned: true };
            }

            const walletAddress = await this.getWalletAddress();
            
            // Create profile claim message
            const profileClaim = {
                walletAddress,
                timestamp: Math.floor(Date.now() / 1000),
                message: 'I am initializing my ZooKies attestation profile',
                version: '1.0'
            };

            // Sign with user's wallet (not publisher key)
            if (this.wallet && ethers) {
                const messageToSign = JSON.stringify(profileClaim);
                const signature = await this.wallet.signMessage(messageToSign);

                this.profileSigned = true;

                console.log('📋 Profile claim signed successfully');
                return {
                    success: true,
                    profileClaim,
                    signature,
                    walletAddress
                };
            } else {
                throw new WalletError('Wallet not available for profile signing');
            }

        } catch (error) {
            console.error('❌ Profile signing failed:', error.message);
            throw new ZkAffinityAgentError(`Profile signing failed: ${error.message}`);
        }
    }

    /**
     * Get user's attestation history
     * @returns {Array} - Array of attestations
     */
    getAttestations() {
        return [...this.attestations]; // Return copy to prevent modification
    }

    /**
     * Get user profile summary with statistics
     * @returns {Object} - Profile summary
     */
    getProfileSummary() {
        const tagCounts = {};
        const publishers = new Set();

        this.attestations.forEach(attestation => {
            tagCounts[attestation.tag] = (tagCounts[attestation.tag] || 0) + 1;
            publishers.add(attestation.publisher);
        });

        return {
            walletAddress: this.wallet ? this.wallet.address : null,
            totalAttestations: this.attestations.length,
            tagCounts,
            publishers: Array.from(publishers),
            profileSigned: this.profileSigned,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Reset profile for demo purposes (new wallet)
     * @returns {Promise<Object>} - Reset result
     */
    async resetProfile() {
        try {
            console.log('🔄 Resetting profile...');
            
            // Close any open modals
            this.closeCurrentModal();

            // Generate new wallet
            const newAddress = await this.generateNewWallet();

            // Reset database if available
            if (this.dbManager && this.wallet) {
                try {
                    await this.dbManager.resetUserProfile(this.wallet.address);
                    console.log('🗃️ Database profile reset');
                } catch (dbError) {
                    console.warn('⚠️ Database reset failed:', dbError.message);
                }
            }

            console.log('✅ Profile reset complete');
            return {
                success: true,
                newWalletAddress: newAddress,
                message: 'Profile reset successfully'
            };

        } catch (error) {
            console.error('❌ Profile reset failed:', error.message);
            throw new ZkAffinityAgentError(`Profile reset failed: ${error.message}`);
        }
    }

    /**
     * Get signer info for debugging
     * @returns {Object} - Signer information
     */
    getSignerInfo() {
        return {
            hasWallet: !!this.wallet,
            walletAddress: this.wallet ? this.wallet.address : null,
            isInitialized: this.isInitialized,
            currentPublisher: this.currentPublisher,
            attestationCount: this.attestations.length,
            profileSigned: this.profileSigned
        };
    }

    /**
     * Update user profile with new information
     * @param {Object} profileUpdate - Profile update data
     * @param {number} profileUpdate.lastActivity - Timestamp of last activity
     * @param {number} profileUpdate.interactionCount - Number of interactions
     * @param {Array<string>} profileUpdate.tags - Array of interest tags
     * @returns {Promise<Object>} Updated profile data
     */
    async updateProfile(profileUpdate) {
        try {
            if (!this.wallet) {
                throw new ZkAffinityAgentError('Wallet not initialized');
            }

            // Ensure profile is signed before updates
            if (!this.profileSigned) {
                await this.signProfileClaim();
            }

            // Get current profile data
            const currentProfile = this.getProfileSummary();

            // Merge updates with current profile
            const updatedProfile = {
                walletAddress: this.wallet.address,
                lastActivity: profileUpdate.lastActivity || Date.now(),
                interactionCount: profileUpdate.interactionCount || (currentProfile.totalAttestations + 1),
                tags: [...new Set([...(currentProfile.tagCounts ? Object.keys(currentProfile.tagCounts) : []), ...(profileUpdate.tags || [])])],
                attestationCount: currentProfile.totalAttestations,
                publishers: currentProfile.publishers,
                profileSigned: this.profileSigned,
                isInitialized: this.isInitialized
            };

            // Store in database if available
            if (this.dbManager) {
                try {
                    await this.dbManager.updateUserProfile(this.wallet.address, updatedProfile);
                    console.log('📝 Profile updated in database');
                } catch (dbError) {
                    console.warn('⚠️ Database profile update failed:', dbError.message);
                }
            }

            console.log('✅ Profile updated successfully');
            return {
                success: true,
                profile: updatedProfile
            };

        } catch (error) {
            console.error('❌ Profile update failed:', error.message);
            throw new ZkAffinityAgentError(`Profile update failed: ${error.message}`);
        }
    }

    /**
     * Update user profile (compatibility method)
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<Object>} Updated profile data
     */
    async updateUserProfile(profileData) {
        return await this.updateProfile(profileData);
    }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ZkAffinityAgent,
        ZkAffinityAgentError,
        WalletError,
        AttestationError
    };
}

// Global singleton for browser environment
if (typeof window !== 'undefined') {
    try {
        console.log('🚀 Attempting to create zkAffinityAgent singleton...');
        console.log('Dependencies check:', {
            ethers: !!ethers,
            DatabaseManager: !!getDatabaseManager(),
            PublisherSigner: !!getPublisherSigner(),
            PUBLISHER_KEYS: !!getPublisherKeys()
        });
        
        window.zkAffinityAgent = new ZkAffinityAgent();
        window.ZkAffinityAgent = ZkAffinityAgent;
        window.ZkAffinityAgentError = ZkAffinityAgentError;
        window.WalletError = WalletError;
        window.AttestationError = AttestationError;
        
        // Add debug methods for Privy integration
        window.zkAgent = window.zkAgent || {};
        window.zkAgent.getWallet = () => window.zkAffinityAgent.getWallet();
        window.zkAgent.getWalletShort = () => window.zkAffinityAgent.getWalletShort();
        window.zkAgent.ensureWalletAndProfile = () => window.zkAffinityAgent.ensureWalletAndProfile();
        window.zkAgent.getProfile = () => window.zkAffinityAgent.getProfileSummary();
        
        console.log('🌐 zkAffinityAgent available globally as window.zkAffinityAgent');
        console.log('🔧 Debug methods available via window.zkAgent');
    } catch (error) {
        console.error('❌ Failed to create zkAffinityAgent singleton:', error);
        console.error('Error details:', error.message, error.stack);
    }
} 