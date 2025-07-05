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

    // ========================================================================================
    // ZK PROOF GENERATION INTEGRATION
    // ========================================================================================

    /**
     * Generate zero-knowledge proof for attestation threshold
     * @param {Object} options - Proof generation options
     * @param {string} options.tag - Target tag (e.g., "defi", "privacy", "travel")
     * @param {number} options.threshold - Minimum attestation count required
     * @param {boolean} options.requiresSelfProof - Whether user must prove their own attestations
     * @returns {Promise<Object>} Proof generation result
     */
    async prove({ tag = "defi", threshold = 2, requiresSelfProof = false } = {}) {
        try {
            console.log(`🔐 Starting ZK proof generation for tag: ${tag}, threshold: ${threshold}`);
            
            // Ensure wallet and profile are initialized
            await this.ensureWalletAndProfile();
            
            if (!this.wallet) {
                throw new Error('Wallet not available for proof generation');
            }

            // Get zkProofBuilder instance
            const zkProofBuilder = this.getZkProofBuilder();
            if (!zkProofBuilder) {
                throw new Error('ZK Proof Builder not available');
            }

            // Ensure proof builder is initialized
            await zkProofBuilder.ensureInitialized();

            // Load attestations from IndexedDB
            let attestations = [];
            if (this.dbManager && this.dbManager.getAllAttestations) {
                attestations = await this.dbManager.getAllAttestations();
            } else {
                // Fallback to in-memory attestations
                attestations = [...this.attestations];
            }

            console.log(`📊 Loaded ${attestations.length} total attestations`);

            // Filter for target tag
            const matchingAttestations = attestations.filter(a => a.tag === tag);
            console.log(`🎯 Found ${matchingAttestations.length} attestations for tag: ${tag}`);

            // Check if we have enough attestations
            if (matchingAttestations.length < threshold) {
                throw new Error(`Insufficient attestations: have ${matchingAttestations.length}, need ${threshold}`);
            }

            // Prepare circuit inputs
            console.log('⚙️ Preparing circuit inputs...');
            const inputs = await zkProofBuilder.prepareZKInputs({
                tag,
                threshold,
                walletAddress: this.wallet.address
            });

            console.log('🔧 Circuit inputs prepared:', {
                targetTag: inputs.targetTag,
                threshold: inputs.threshold,
                attestationCount: inputs.attestationHashes?.length || 0
            });

            // Generate ZK proof
            console.log('🏗️ Generating zero-knowledge proof...');
            const { proof, publicSignals } = await zkProofBuilder.generateProof(inputs, (progress) => {
                console.log(`📈 Proof generation progress: ${progress}%`);
            });

            console.log('✅ ZK proof generated successfully');

            // Submit for verification
            console.log('🔍 Submitting proof for verification...');
            const verification = await zkProofBuilder.submitProof(proof, publicSignals, {
                tag,
                threshold,
                walletAddress: this.wallet.address,
                timestamp: Date.now()
            });

            console.log('✅ Proof verification completed:', verification);

            return {
                success: true,
                proof,
                publicSignals,
                verification,
                tag,
                threshold,
                attestationCount: matchingAttestations.length,
                walletAddress: this.wallet.address,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ ZK proof generation failed:', error);
            return {
                success: false,
                error: error.message,
                tag,
                threshold,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Request targeted ad based on ZK proof verification
     * NEW IMPLEMENTATION - Integrates with spotlite.news adRenderer.js
     * @param {Object} options - Ad request options
     * @param {string} options.tag - Target demographic tag (finance, travel, privacy, gaming, technology)
     * @param {number} options.threshold - Minimum attestation threshold
     * @param {boolean} options.requiresSelfProof - Whether user must prove their own attestations
     * @returns {Promise<Object>} Structured result: { success, ad: { content, tag, proofVerified }, proof: { publicSignals, verified } }
     */
    async requestAd({ tag = "finance", threshold = 2, requiresSelfProof = false } = {}) {
        try {
            console.log(`🎯 Requesting targeted ad for ${tag} (threshold: ${threshold})`);

            // Validate input parameters
            const validTags = ['finance', 'travel', 'privacy', 'gaming', 'technology'];
            if (!validTags.includes(tag)) {
                throw new Error(`Invalid tag: ${tag}. Supported tags: ${validTags.join(', ')}`);
            }

            if (typeof threshold !== 'number' || threshold < 1) {
                throw new Error(`Invalid threshold: ${threshold}. Must be a positive number`);
            }

            // Generate proof for targeting condition
            console.log('🔐 Generating ZK proof...');
            const proofResult = await this.prove({ tag, threshold, requiresSelfProof });

            // Extract proof verification status
            const isProofValid = proofResult.success && proofResult.verification && proofResult.verification.valid;
            
            if (isProofValid) {
                // User qualifies - return successful result with ad content reference
                console.log('✅ User qualifies for targeted ad');
                
                return {
                    success: true,
                    ad: {
                        content: null, // Will be loaded by adRenderer.js
                        tag: tag,
                        proofVerified: true
                    },
                    proof: {
                        publicSignals: proofResult.publicSignals || [],
                        verified: true
                    },
                    debug: {
                        attestationCount: proofResult.attestationCount || 0,
                        walletAddress: proofResult.walletAddress,
                        targetingReason: `Proven interest in ${tag} with ${proofResult.attestationCount} attestations`,
                        timestamp: Date.now()
                    }
                };
            } else {
                // User doesn't qualify - return failure result
                console.log('❌ User does not qualify for targeted ad');
                
                return {
                    success: false,
                    ad: {
                        content: null,
                        tag: tag,
                        proofVerified: false
                    },
                    proof: {
                        publicSignals: proofResult.publicSignals || [],
                        verified: false
                    },
                    error: proofResult.error || 'Proof verification failed',
                    debug: {
                        reason: proofResult.error || 'Insufficient attestations or proof verification failed',
                        attestationCount: proofResult.attestationCount || 0,
                        threshold: threshold,
                        timestamp: Date.now()
                    }
                };
            }

        } catch (error) {
            console.error('❌ Ad request failed:', error);
            
            // Return failure result with error details
            return {
                success: false,
                ad: {
                    content: null,
                    tag: tag,
                    proofVerified: false
                },
                proof: {
                    publicSignals: [],
                    verified: false
                },
                error: `Ad request error: ${error.message}`,
                debug: {
                    errorType: error.name || 'UnknownError',
                    errorMessage: error.message,
                    timestamp: Date.now()
                }
            };
        }
    }

    /**
     * Render targeted ad in the specified container
     * @param {string} tag - Ad targeting tag
     * @param {HTMLElement} adContainer - Container element for the ad
     * @param {Object} options - Rendering options
     * @returns {Promise<HTMLElement>} Rendered ad element
     */
    async renderAd(tag = "defi", adContainer = null, options = {}) {
        try {
            console.log(`🎨 Rendering ad for tag: ${tag}`);

            // Use provided container or find/create one
            const container = adContainer || 
                            document.getElementById('zk-ad-container') || 
                            document.body;

            // Request targeted ad
            const adRequest = await this.requestAd({ 
                tag, 
                threshold: options.threshold || 2,
                requiresSelfProof: options.requiresSelfProof || false
            });

            // Create ad element
            const adElement = document.createElement('div');
            adElement.className = 'zk-targeted-ad';
            adElement.setAttribute('data-tag', tag);
            adElement.setAttribute('data-qualified', adRequest.qualified);

            if (adRequest.qualified) {
                // Render targeted ad
                adElement.innerHTML = `
                    <div class="ad-content targeted">
                        <div class="ad-header">
                            <h3>🎯 Targeted Ad: ${tag.toUpperCase()}</h3>
                            <span class="zk-badge">ZK Verified</span>
                        </div>
                        <div class="ad-body">
                            ${adRequest.adContent.html || `<p>This ad was shown based on your proven interest in ${tag}</p>`}
                        </div>
                        <div class="ad-footer">
                            <button class="ad-button" onclick="console.log('Targeted ad clicked!', '${tag}')">
                                Learn More
                            </button>
                            <small class="zk-proof-info">
                                Verified with ${adRequest.proofDetails.attestationCount} attestations
                            </small>
                        </div>
                    </div>
                `;
            } else {
                // Render fallback ad
                adElement.innerHTML = `
                    <div class="ad-content fallback">
                        <div class="ad-header">
                            <h3>📢 General Ad</h3>
                            <span class="fallback-badge">Standard</span>
                        </div>
                        <div class="ad-body">
                            ${adRequest.fallbackAd.html || '<p>Discover new opportunities with ZooKies!</p>'}
                        </div>
                        <div class="ad-footer">
                            <button class="ad-button" onclick="console.log('Fallback ad clicked!')">
                                Learn More
                            </button>
                            <small class="fallback-reason">
                                ${adRequest.reason}
                            </small>
                        </div>
                    </div>
                `;
            }

            // Add basic styling
            this.addAdStyles();

            // Append to container
            container.appendChild(adElement);

            console.log('✅ Ad rendered successfully');
            return adElement;

        } catch (error) {
            console.error('❌ Ad rendering failed:', error);
            
            // Create error ad
            const errorElement = document.createElement('div');
            errorElement.className = 'zk-targeted-ad error';
            errorElement.innerHTML = `
                <div class="ad-content error">
                    <h3>⚠️ Ad Loading Error</h3>
                    <p>Unable to load targeted content</p>
                    <small>Error: ${error.message}</small>
                </div>
            `;
            
            if (adContainer) {
                adContainer.appendChild(errorElement);
            }
            
            return errorElement;
        }
    }

    /**
     * Load ad content for specific tag
     * @param {string} tag - Target tag
     * @returns {Promise<Object>} Ad content
     */
    async loadAdContent(tag) {
        // Default ad content for different tags
        const adContent = {
            defi: {
                html: `
                    <h4>🚀 DeFi Opportunities Await!</h4>
                    <p>Unlock exclusive yield farming strategies and liquidity mining rewards.</p>
                    <ul>
                        <li>✅ 15% APY on staking</li>
                        <li>✅ Zero gas fees for first month</li>
                        <li>✅ Advanced portfolio analytics</li>
                    </ul>
                `,
                cta: "Start DeFi Journey"
            },
            privacy: {
                html: `
                    <h4>🔒 Privacy-First Tools</h4>
                    <p>Protect your digital footprint with enterprise-grade privacy solutions.</p>
                    <ul>
                        <li>✅ End-to-end encryption</li>
                        <li>✅ Zero-knowledge authentication</li>
                        <li>✅ Anonymous browsing</li>
                    </ul>
                `,
                cta: "Secure Your Privacy"
            },
            travel: {
                html: `
                    <h4>✈️ Exclusive Travel Deals</h4>
                    <p>Discover hidden gems and luxury accommodations at unbeatable prices.</p>
                    <ul>
                        <li>✅ 40% off premium hotels</li>
                        <li>✅ Private jet discounts</li>
                        <li>✅ VIP travel concierge</li>
                    </ul>
                `,
                cta: "Book Your Adventure"
            },
            gaming: {
                html: `
                    <h4>🎮 Gaming Paradise</h4>
                    <p>Level up with exclusive gaming gear and early access to new releases.</p>
                    <ul>
                        <li>✅ 50% off gaming peripherals</li>
                        <li>✅ Beta access to AAA titles</li>
                        <li>✅ Professional coaching sessions</li>
                    </ul>
                `,
                cta: "Power Up Now"
            },
            technology: {
                html: `
                    <h4>💻 Tech Innovation Hub</h4>
                    <p>Stay ahead with cutting-edge technology and developer tools.</p>
                    <ul>
                        <li>✅ Cloud credits worth $500</li>
                        <li>✅ Premium API access</li>
                        <li>✅ Technical mentorship</li>
                    </ul>
                `,
                cta: "Innovate Today"
            },
            finance: {
                html: `
                    <h4>📈 Smart Investment Platform</h4>
                    <p>Maximize returns with AI-powered investment strategies and insights.</p>
                    <ul>
                        <li>✅ Automated portfolio rebalancing</li>
                        <li>✅ Real-time market analysis</li>
                        <li>✅ Tax optimization tools</li>
                    </ul>
                `,
                cta: "Invest Smarter"
            }
        };

        return adContent[tag] || adContent.defi;
    }

    /**
     * Load fallback ad content
     * @returns {Promise<Object>} Fallback ad content
     */
    async loadFallbackAd() {
        return {
            html: `
                <h4>🌟 Discover ZooKies</h4>
                <p>Privacy-first advertising platform powered by zero-knowledge proofs.</p>
                <ul>
                    <li>✅ Earn rewards for engagement</li>
                    <li>✅ Complete privacy protection</li>
                    <li>✅ Personalized without tracking</li>
                </ul>
            `,
            cta: "Join ZooKies"
        };
    }

    /**
     * Add basic styling for rendered ads
     */
    addAdStyles() {
        // Check if styles already exist
        if (document.getElementById('zk-ad-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'zk-ad-styles';
        styles.textContent = `
            .zk-targeted-ad {
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                margin: 20px 0;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .zk-targeted-ad:hover {
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }
            
            .ad-content.targeted {
                border-left: 4px solid #00d4aa;
                background: linear-gradient(135deg, #f8fffd 0%, #f0fff9 100%);
            }
            
            .ad-content.fallback {
                border-left: 4px solid #6c757d;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            }
            
            .ad-content.error {
                border-left: 4px solid #dc3545;
                background: linear-gradient(135deg, #fff5f5 0%, #ffeaea 100%);
            }
            
            .ad-header {
                padding: 16px 20px 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ad-header h3, .ad-header h4 {
                margin: 0;
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
            }
            
            .zk-badge {
                background: #00d4aa;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .fallback-badge {
                background: #6c757d;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .ad-body {
                padding: 8px 20px;
                color: #333;
            }
            
            .ad-body ul {
                margin: 12px 0;
                padding-left: 0;
                list-style: none;
            }
            
            .ad-body li {
                margin: 6px 0;
                font-size: 14px;
            }
            
            .ad-footer {
                padding: 12px 20px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ad-button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.3s ease;
            }
            
            .ad-button:hover {
                background: #0056b3;
            }
            
            .zk-proof-info, .fallback-reason {
                font-size: 12px;
                color: #666;
                font-style: italic;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Get ZkProofBuilder instance
     * @returns {Object|null} ZkProofBuilder instance or null if not available
     */
    getZkProofBuilder() {
        if (typeof window !== 'undefined' && window.getZkProofBuilder) {
            return window.getZkProofBuilder();
        }
        
        console.warn('⚠️ ZkProofBuilder not available');
        return null;
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

        // ========================================================================================
        // JUDGE-FRIENDLY ZK PROOF DEMO METHODS
        // ========================================================================================

        /**
         * Judge-friendly ZK proof demonstration
         * @param {string} tag - Target tag (default: "defi")
         * @param {number} threshold - Minimum attestations (default: 2)
         * @returns {Promise<Object>} Proof demonstration result
         */
        window.zkAffinityAgent.proveDemo = async (tag = "defi", threshold = 2) => {
            console.log("🔐 ZK Proof Demo Starting...");
            console.log(`🎯 Target: ${tag} (threshold: ${threshold})`);
            
            try {
                const result = await window.zkAffinityAgent.prove({ tag, threshold });
                
                console.log("📊 Proof Result:", result);
                
                if (result.success) {
                    console.log("✅ Proof generated successfully!");
                    console.log("🎯 Verification:", result.verification);
                    console.log("📈 Attestation count:", result.attestationCount);
                    console.log("💰 Wallet address:", result.walletAddress);
                    console.log("⏰ Generated at:", new Date(result.timestamp).toLocaleString());
                    
                    // Show proof structure (abbreviated for console readability)
                    if (result.proof && result.proof.pi_a) {
                        console.log("🔧 Proof structure:");
                        console.log("  - pi_a:", result.proof.pi_a.slice(0, 2).map(x => x.substring(0, 10) + "..."));
                        console.log("  - pi_b:", result.proof.pi_b[0].slice(0, 2).map(x => x.substring(0, 10) + "..."));
                        console.log("  - pi_c:", result.proof.pi_c.slice(0, 2).map(x => x.substring(0, 10) + "..."));
                    }
                    
                    if (result.publicSignals) {
                        console.log("📡 Public signals:", result.publicSignals);
                    }
                } else {
                    console.log("❌ Proof failed:", result.error);
                    console.log("💡 Tip: Try clicking some ads first to generate attestations!");
                }
                
                return result;
            } catch (error) {
                console.error("💥 Demo error:", error.message);
                return { success: false, error: error.message };
            }
        };

        /**
         * Demonstrate ad targeting with ZK proof
         * @param {string} tag - Target tag
         * @param {number} threshold - Minimum attestations
         * @returns {Promise<Object>} Ad targeting demonstration result
         */
        window.zkAffinityAgent.adDemo = async (tag = "defi", threshold = 2) => {
            console.log("🎯 Ad Targeting Demo Starting...");
            
            try {
                const adResult = await window.zkAffinityAgent.requestAd({ tag, threshold });
                
                console.log("📊 Ad Targeting Result:", adResult);
                
                if (adResult.qualified) {
                    console.log("✅ User qualifies for targeted ad!");
                    console.log("🎯 Targeting reason:", adResult.targetingReason);
                    console.log("📝 Ad content available:", !!adResult.adContent);
                } else {
                    console.log("❌ User does not qualify for targeted ad");
                    console.log("💬 Reason:", adResult.reason);
                    console.log("🔄 Fallback ad provided:", !!adResult.fallbackAd);
                }
                
                return adResult;
            } catch (error) {
                console.error("💥 Ad demo error:", error.message);
                return { success: false, error: error.message };
            }
        };

        /**
         * Complete end-to-end ZK advertising pipeline demonstration
         * @param {string} tag - Target tag
         * @param {number} threshold - Minimum attestations
         * @returns {Promise<Object>} Complete pipeline demonstration result
         */
        window.zkAffinityAgent.fullDemo = async (tag = "defi", threshold = 2) => {
            console.log("🚀 Full ZK Advertising Pipeline Demo Starting...");
            console.log("=" .repeat(60));
            
            try {
                // Step 1: Show current profile
                console.log("📋 Step 1: Current Profile Status");
                const profile = window.zkAffinityAgent.getProfileSummary();
                console.log("  Wallet:", profile.walletAddress ? profile.walletAddress.substring(0, 10) + "..." : "Not initialized");
                console.log("  Total attestations:", profile.totalAttestations);
                console.log("  Tag counts:", profile.tagCounts);
                console.log("");
                
                // Step 2: Generate ZK proof
                console.log("🔐 Step 2: ZK Proof Generation");
                const proofResult = await window.zkAffinityAgent.prove({ tag, threshold });
                console.log("  Proof success:", proofResult.success);
                if (proofResult.success) {
                    console.log("  Verification:", proofResult.verification?.valid ? "VALID" : "INVALID");
                    console.log("  Attestation count:", proofResult.attestationCount);
                } else {
                    console.log("  Error:", proofResult.error);
                }
                console.log("");
                
                // Step 3: Ad targeting
                console.log("🎯 Step 3: Ad Targeting");
                const adResult = await window.zkAffinityAgent.requestAd({ tag, threshold });
                console.log("  Qualified for targeted ad:", adResult.qualified);
                console.log("  Targeting reason:", adResult.targetingReason || adResult.reason);
                console.log("");
                
                // Step 4: Render ad (if in browser)
                if (typeof document !== 'undefined') {
                    console.log("🎨 Step 4: Ad Rendering");
                    
                    // Create demo container if it doesn't exist
                    let demoContainer = document.getElementById('zk-demo-container');
                    if (!demoContainer) {
                        demoContainer = document.createElement('div');
                        demoContainer.id = 'zk-demo-container';
                        demoContainer.style.cssText = 'margin: 20px; padding: 20px; border: 2px dashed #ccc; border-radius: 8px;';
                        demoContainer.innerHTML = '<h3>🎯 ZK Proof Demo Ad Container</h3>';
                        document.body.appendChild(demoContainer);
                    }
                    
                    const adElement = await window.zkAffinityAgent.renderAd(tag, demoContainer, { threshold });
                    console.log("  Ad rendered successfully:", !!adElement);
                    console.log("  Ad element class:", adElement.className);
                    console.log("");
                }
                
                console.log("✅ Full ZK Advertising Pipeline Demo Complete!");
                console.log("=" .repeat(60));
                
                return {
                    success: true,
                    steps: {
                        profile,
                        proof: proofResult,
                        targeting: adResult
                    }
                };
                
            } catch (error) {
                console.error("💥 Full demo error:", error.message);
                return { success: false, error: error.message };
            }
        };

        /**
         * Quick help guide for judges
         */
        window.zkAffinityAgent.help = () => {
            console.log("🔧 ZK Affinity Agent - Judge Demo Commands");
            console.log("=" .repeat(50));
            console.log("");
            console.log("📋 Profile & Wallet:");
            console.log("  window.zkAgent.getProfile()      - View user profile");
            console.log("  window.zkAgent.getWallet()       - Get wallet details");
            console.log("  window.zkAgent.getWalletShort()  - Get short wallet address");
            console.log("");
            console.log("🔐 ZK Proof Generation:");
            console.log("  window.zkAffinityAgent.proveDemo()                    - Basic proof demo (defi, threshold=2)");
            console.log("  window.zkAffinityAgent.proveDemo('privacy', 3)        - Custom tag and threshold");
            console.log("");
            console.log("🎯 Ad Targeting:");
            console.log("  window.zkAffinityAgent.adDemo()                       - Ad targeting demo (defi, threshold=2)");
            console.log("  window.zkAffinityAgent.adDemo('travel', 2)            - Custom targeting demo");
            console.log("");
            console.log("🚀 Complete Pipeline:");
            console.log("  window.zkAffinityAgent.fullDemo()                     - Full end-to-end demo (defi, threshold=2)");
            console.log("  window.zkAffinityAgent.fullDemo('gaming', 3)          - Custom full demo");
            console.log("");
            console.log("🎨 Ad Rendering:");
            console.log("  window.zkAffinityAgent.renderAd('defi')               - Render ad for defi tag");
            console.log("  window.zkAffinityAgent.renderAd('privacy', container) - Render in specific container");
            console.log("");
            console.log("💡 Available tags: defi, privacy, travel, gaming, technology, finance");
            console.log("💡 Try clicking ads on publisher sites first to generate attestations!");
        };

        // Add convenient shortcuts for judges
        window.zkAgent.prove = window.zkAffinityAgent.proveDemo;
        window.zkAgent.ad = window.zkAffinityAgent.adDemo;
        window.zkAgent.demo = window.zkAffinityAgent.fullDemo;
        window.zkAgent.help = window.zkAffinityAgent.help;
        
        console.log('🌐 zkAffinityAgent available globally as window.zkAffinityAgent');
        console.log('🔧 Debug methods available via window.zkAgent');
        console.log('🎯 ZK Proof demo methods available! Try: window.zkAgent.help()');
    } catch (error) {
        console.error('❌ Failed to create zkAffinityAgent singleton:', error);
        console.error('Error details:', error.message, error.stack);
    }
} 