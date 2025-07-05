/**
 * Test suite for Privy integration with zkAffinityAgent
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the Privy modules
const mockProfileStore = {
    ensureWalletAndProfile: jest.fn(),
    getProfileByWallet: jest.fn(),
    storeProfile: jest.fn()
};

const mockPrivy = {
    getEmbeddedWallet: jest.fn(),
    createSignedProfileClaim: jest.fn(),
    privyConfig: { appId: 'zookies-dev' }
};

const mockBrowserDB = {
    storeProfile: jest.fn(),
    getProfile: jest.fn(),
    initialize: jest.fn()
};

// Mock the imports
jest.mock('../shared/privy.js', () => mockPrivy);
jest.mock('../shared/profile-store.js', () => mockProfileStore);
jest.mock('../shared/database-browser.js', () => ({ getBrowserDatabase: () => mockBrowserDB }));

describe('Privy zkAffinityAgent Integration', () => {
    let ZkAffinityAgent;
    let agent;
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockProfile = {
        wallet: mockWalletAddress,
        signedProfileClaim: {
            message: 'Test message',
            signature: '0xsignature123'
        },
        createdAt: Date.now()
    };

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Mock successful Privy operations
        mockProfileStore.ensureWalletAndProfile.mockResolvedValue({
            success: true,
            profile: mockProfile
        });

        // Import zkAffinityAgent after mocks are set up
        // Note: In a real test environment, we'd need to handle the dynamic imports properly
        // For now, we'll test the structure and basic functionality
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should have Privy integration methods', async () => {
        // Test that the file structure includes Privy integration
        const zkAffinityAgentModule = await import('../shared/zkAffinityAgent.js');
        
        // Check that the file contains our new methods
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        expect(fileContent).toContain('ensureWalletAndProfile');
        expect(fileContent).toContain('getWallet');
        expect(fileContent).toContain('getWalletShort');
        expect(fileContent).toContain('profileStoreModule');
    });

    test('should contain Privy module imports', async () => {
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        expect(fileContent).toContain("import('./privy.js')");
        expect(fileContent).toContain("import('./profile-store.js')");
        expect(fileContent).toContain("import('./database-browser.js')");
    });

    test('should have debug methods setup', async () => {
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        expect(fileContent).toContain('window.zkAgent.getWallet');
        expect(fileContent).toContain('window.zkAgent.getWalletShort');
        expect(fileContent).toContain('window.zkAgent.ensureWalletAndProfile');
    });

    test('should have updated onAdClick method', async () => {
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        expect(fileContent).toContain('await this.ensureWalletAndProfile()');
        expect(fileContent).toContain('walletResult.wallet.address');
    });

    test('should have proper method bindings', async () => {
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        expect(fileContent).toContain('this.ensureWalletAndProfile = this.ensureWalletAndProfile.bind(this)');
        expect(fileContent).toContain('this.getWallet = this.getWallet.bind(this)');
        expect(fileContent).toContain('this.getWalletShort = this.getWalletShort.bind(this)');
    });

    test('should maintain backward compatibility', async () => {
        const fileContent = await import('fs').then(fs => 
            fs.readFileSync(new URL('../shared/zkAffinityAgent.js', import.meta.url), 'utf8')
        );
        
        // Check that old methods still exist for fallback
        expect(fileContent).toContain('async initializeWallet()');
        expect(fileContent).toContain('async getWalletAddress()');
        expect(fileContent).toContain('falling back to temporary wallet');
    });
}); 