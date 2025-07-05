/**
 * Comprehensive test suite for Privy integration
 * Tests the profile store, browser database, and Privy SDK integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock idb for testing
const mockDB = {
    get: jest.fn(),
    put: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    transaction: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    close: jest.fn()
};

const mockOpenDB = jest.fn().mockResolvedValue(mockDB);

// Mock the idb module
jest.mock('idb', () => ({
    openDB: mockOpenDB
}));

// Mock Privy modules
jest.mock('../shared/privy.js', () => ({
    getEmbeddedWallet: jest.fn(),
    createSignedProfileClaim: jest.fn(),
    PrivyProvider: jest.fn(),
    useWallets: jest.fn()
}));

describe('Privy Integration Tests', () => {
    let profileStore, browserDB;
    const mockWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockProfile = {
        wallet: mockWalletAddress,
        signedProfileClaim: {
            message: 'Test message',
            signature: '0xsignature123'
        },
        createdAt: Date.now()
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset mock database
        mockDB.get.mockReset();
        mockDB.put.mockReset();
        mockDB.add.mockReset();
        mockDB.getAll.mockReset();
        mockDB.clear.mockReset();
        mockDB.count.mockReset();
        mockDB.delete.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Profile Store Module', () => {
        beforeEach(async () => {
            // Import after mocks are set up
            profileStore = await import('../shared/profile-store.js');
        });

        test('should ensure wallet and profile creation', async () => {
            const { getEmbeddedWallet, createSignedProfileClaim } = await import('../shared/privy.js');
            
            // Mock successful wallet retrieval
            getEmbeddedWallet.mockResolvedValue({
                wallet: { address: mockWalletAddress },
                error: null
            });

            // Mock successful profile claim creation
            createSignedProfileClaim.mockResolvedValue({
                success: true,
                claim: mockProfile,
                error: null
            });

            // Mock profile doesn't exist yet
            mockDB.get.mockResolvedValue(null);

            const result = await profileStore.ensureWalletAndProfile();

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(mockProfile);
            expect(getEmbeddedWallet).toHaveBeenCalled();
            expect(createSignedProfileClaim).toHaveBeenCalled();
        });

        test('should return existing valid profile', async () => {
            const { getEmbeddedWallet } = await import('../shared/privy.js');
            
            getEmbeddedWallet.mockResolvedValue({
                wallet: { address: mockWalletAddress },
                error: null
            });

            // Mock existing profile
            mockDB.get.mockResolvedValue({ profile: mockProfile });

            const result = await profileStore.ensureWalletAndProfile();

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(mockProfile);
        });

        test('should handle wallet creation failure', async () => {
            const { getEmbeddedWallet } = await import('../shared/privy.js');
            
            getEmbeddedWallet.mockResolvedValue({
                wallet: null,
                error: 'Failed to create wallet'
            });

            const result = await profileStore.ensureWalletAndProfile();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to create wallet');
        });

        test('should store profile correctly', async () => {
            mockDB.put.mockResolvedValue();

            const result = await profileStore.storeProfile(mockProfile);

            expect(result.success).toBe(true);
            expect(mockDB.put).toHaveBeenCalledWith('profiles', mockProfile);
        });

        test('should get profile by wallet address', async () => {
            mockDB.get.mockResolvedValue(mockProfile);

            const result = await profileStore.getProfileByWallet(mockWalletAddress);

            expect(result.profile).toEqual(mockProfile);
            expect(mockDB.get).toHaveBeenCalledWith('profiles', mockWalletAddress);
        });

        test('should add attestation to profile', async () => {
            const attestation = {
                tag: 'finance',
                publisher: 'test.com',
                timestamp: Date.now()
            };

            mockDB.get.mockResolvedValue(mockProfile);
            mockDB.put.mockResolvedValue();
            mockDB.add.mockResolvedValue(1);

            const result = await profileStore.addAttestation(mockWalletAddress, attestation);

            expect(result.success).toBe(true);
            expect(mockDB.put).toHaveBeenCalled();
            expect(mockDB.add).toHaveBeenCalled();
        });
    });

    describe('Browser Database Manager', () => {
        beforeEach(async () => {
            // Import browser database module
            const browserDBModule = await import('../shared/database-browser.js');
            browserDB = new browserDBModule.BrowserDatabaseManager();
        });

        test('should initialize database with proper schema', async () => {
            await browserDB.initialize();

            expect(mockOpenDB).toHaveBeenCalledWith(
                'zookies_privy_cache',
                2,
                expect.objectContaining({
                    upgrade: expect.any(Function)
                })
            );
        });

        test('should store profile with validation', async () => {
            mockDB.put.mockResolvedValue();

            await browserDB.storeProfile(mockProfile);

            expect(mockDB.put).toHaveBeenCalledWith(
                'profiles',
                expect.objectContaining({
                    wallet: mockWalletAddress,
                    lastUpdated: expect.any(Number),
                    isActive: true,
                    version: 1
                })
            );
        });

        test('should reject invalid wallet address', async () => {
            const invalidProfile = {
                wallet: 'invalid-address',
                signedProfileClaim: mockProfile.signedProfileClaim
            };

            await expect(browserDB.storeProfile(invalidProfile))
                .rejects
                .toThrow('Invalid wallet address format');
        });

        test('should store attestation with validation', async () => {
            const attestation = {
                tag: 'finance',
                timestamp: Date.now(),
                nonce: 'test-nonce',
                signature: '0xsignature',
                publisher: 'test.com',
                user_wallet: mockWalletAddress
            };

            mockDB.add.mockResolvedValue(1);

            const id = await browserDB.storeAttestation(attestation);

            expect(id).toBe(1);
            expect(mockDB.add).toHaveBeenCalledWith(
                'attestations',
                expect.objectContaining({
                    ...attestation,
                    walletAddress: mockWalletAddress,
                    storedAt: expect.any(Number),
                    verified: false
                })
            );
        });

        test('should get attestations by wallet address', async () => {
            const mockTransaction = {
                objectStore: jest.fn().mockReturnValue({
                    index: jest.fn().mockReturnValue({
                        getAll: jest.fn().mockResolvedValue([
                            { tag: 'finance', timestamp: 2, user_wallet: mockWalletAddress },
                            { tag: 'privacy', timestamp: 1, user_wallet: mockWalletAddress }
                        ])
                    })
                })
            };

            mockDB.transaction.mockReturnValue(mockTransaction);

            const attestations = await browserDB.getAttestations(mockWalletAddress);

            expect(attestations).toHaveLength(2);
            // Should be sorted by timestamp (newest first)
            expect(attestations[0].timestamp).toBe(2);
            expect(attestations[1].timestamp).toBe(1);
        });

        test('should filter attestations by tag', async () => {
            const mockTransaction = {
                objectStore: jest.fn().mockReturnValue({
                    index: jest.fn().mockReturnValue({
                        getAll: jest.fn().mockResolvedValue([
                            { tag: 'finance', timestamp: 2, user_wallet: mockWalletAddress },
                            { tag: 'privacy', timestamp: 1, user_wallet: mockWalletAddress }
                        ])
                    })
                })
            };

            mockDB.transaction.mockReturnValue(mockTransaction);

            const attestations = await browserDB.getAttestations(mockWalletAddress, 'finance');

            expect(attestations).toHaveLength(1);
            expect(attestations[0].tag).toBe('finance');
        });

        test('should store and retrieve sessions', async () => {
            const sessionKey = 'test-session';
            const sessionData = { userId: '123', type: 'auth' };

            mockDB.put.mockResolvedValue();
            mockDB.get.mockResolvedValue({
                key: sessionKey,
                data: sessionData,
                expiresAt: Date.now() + 3600000, // 1 hour from now
                createdAt: Date.now()
            });

            await browserDB.storeSession(sessionKey, sessionData);
            const retrievedData = await browserDB.getSession(sessionKey);

            expect(mockDB.put).toHaveBeenCalledWith(
                'sessions',
                expect.objectContaining({
                    key: sessionKey,
                    data: sessionData,
                    expiresAt: expect.any(Number),
                    createdAt: expect.any(Number)
                })
            );
            expect(retrievedData).toEqual(sessionData);
        });

        test('should remove expired sessions', async () => {
            const expiredSession = {
                key: 'expired-session',
                expiresAt: Date.now() - 1000 // Expired 1 second ago
            };

            mockDB.get.mockResolvedValue(expiredSession);
            mockDB.delete.mockResolvedValue();

            const result = await browserDB.getSession('expired-session');

            expect(result).toBeNull();
            expect(mockDB.delete).toHaveBeenCalledWith('sessions', 'expired-session');
        });

        test('should get database statistics', async () => {
            mockDB.count
                .mockResolvedValueOnce(5) // profiles
                .mockResolvedValueOnce(10) // attestations
                .mockResolvedValueOnce(3); // sessions

            const stats = await browserDB.getStats();

            expect(stats).toEqual({
                profiles: 5,
                attestations: 10,
                sessions: 3,
                lastUpdated: expect.any(Number)
            });
        });

        test('should clear all data', async () => {
            const mockTransaction = {
                objectStore: jest.fn().mockReturnValue({
                    clear: jest.fn().mockResolvedValue()
                }),
                done: Promise.resolve()
            };

            mockDB.transaction.mockReturnValue(mockTransaction);

            await browserDB.clearAll();

            expect(mockDB.transaction).toHaveBeenCalledWith(
                ['profiles', 'attestations', 'sessions', 'preferences'],
                'readwrite'
            );
        });
    });

    describe('Integration Tests', () => {
        test('should work together for complete profile management', async () => {
            const { getEmbeddedWallet, createSignedProfileClaim } = await import('../shared/privy.js');
            const profileStore = await import('../shared/profile-store.js');
            
            // Mock successful wallet and profile creation
            getEmbeddedWallet.mockResolvedValue({
                wallet: { address: mockWalletAddress },
                error: null
            });

            createSignedProfileClaim.mockResolvedValue({
                success: true,
                claim: mockProfile,
                error: null
            });

            // Mock database operations
            mockDB.get.mockResolvedValue(null); // No existing profile
            mockDB.put.mockResolvedValue(); // Successful storage

            // Test the full flow
            const result = await profileStore.ensureWalletAndProfile();

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(mockProfile);
            expect(getEmbeddedWallet).toHaveBeenCalled();
            expect(createSignedProfileClaim).toHaveBeenCalled();
        });
    });
}); 