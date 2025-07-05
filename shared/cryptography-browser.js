/**
 * Browser-compatible cryptography module for ECDSA signing and verification
 * Exposes PublisherSigner class to window object for use in browser environment
 */

// Check if we're in a browser environment
if (typeof window !== 'undefined' && window.ethers) {
    const ethers = window.ethers;

    // Browser-compatible UUID generation
    function generateUUID() {
        // Use crypto.randomUUID if available, otherwise fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback: Generate UUID-like string manually
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Custom error classes for cryptographic operations
     */
    class CryptographyError extends Error {
        constructor(message) {
            super(message);
            this.name = 'CryptographyError';
        }
    }

    class SignatureVerificationError extends CryptographyError {
        constructor(message) {
            super(message);
            this.name = 'SignatureVerificationError';
        }
    }

    class AttestationValidationError extends CryptographyError {
        constructor(message) {
            super(message);
            this.name = 'AttestationValidationError';
        }
    }

    /**
     * Publisher Signer class for ECDSA secp256k1 cryptographic operations
     */
    class PublisherSigner {
        constructor(privateKey, publisherDomain) {
            if (!privateKey || typeof privateKey !== 'string') {
                throw new CryptographyError('Private key is required and must be a string');
            }
            
            if (!publisherDomain || typeof publisherDomain !== 'string') {
                throw new CryptographyError('Publisher domain is required and must be a string');
            }

            if (privateKey.length !== 66 || !privateKey.startsWith('0x')) {
                throw new CryptographyError('Private key must be 66-character hex string starting with 0x');
            }

            try {
                this.wallet = new ethers.Wallet(privateKey);
                this.privateKey = privateKey;
                this.publisherDomain = publisherDomain;
                this.publicKey = this.wallet.publicKey;
                this.address = this.wallet.address;
            } catch (error) {
                throw new CryptographyError(`Failed to initialize wallet: ${error.message}`);
            }
        }

        static generateNonce() {
            try {
                return generateUUID();
            } catch (error) {
                throw new CryptographyError(`UUID generation failed: ${error.message}`);
            }
        }

        formatMessage(tag, userWallet, timestamp, nonce) {
            const messageData = {
                tag: tag,
                timestamp: timestamp,
                nonce: nonce,
                userWallet: userWallet,
                publisherDomain: this.publisherDomain
            };

            const sortedData = {};
            Object.keys(messageData).sort().forEach(key => {
                sortedData[key] = messageData[key];
            });

            return JSON.stringify(sortedData);
        }

        async signAttestation(tag, userWallet) {
            if (!tag || typeof tag !== 'string') {
                throw new CryptographyError('Tag is required and must be a string');
            }

            if (!userWallet || typeof userWallet !== 'string') {
                throw new CryptographyError('User wallet address is required and must be a string');
            }

            const allowedTags = ['finance', 'privacy', 'travel', 'gaming'];
            if (!allowedTags.includes(tag)) {
                throw new CryptographyError(`Invalid tag: ${tag}. Must be one of: ${allowedTags.join(', ')}`);
            }

            if (!userWallet.startsWith('0x') || userWallet.length !== 42) {
                throw new CryptographyError('Invalid wallet address format');
            }

            try {
                const timestamp = Math.floor(Date.now() / 1000);
                const nonce = PublisherSigner.generateNonce();
                const message = this.formatMessage(tag, userWallet, timestamp, nonce);
                const signature = await this.wallet.signMessage(message);

                return {
                    tag: tag,
                    timestamp: timestamp,
                    nonce: nonce,
                    signature: signature,
                    publisher: this.publisherDomain,
                    user_wallet: userWallet,
                    message: message,
                    signer_address: this.address
                };

            } catch (error) {
                throw new CryptographyError(`Attestation signing failed: ${error.message}`);
            }
        }

        static verifyAttestation(attestation, expectedPublicKeyOrAddress) {
            try {
                if (!attestation || typeof attestation !== 'object') {
                    throw new AttestationValidationError('Attestation must be an object');
                }

                const requiredFields = ['tag', 'timestamp', 'nonce', 'signature', 'publisher', 'user_wallet'];
                for (const field of requiredFields) {
                    if (!attestation[field]) {
                        throw new AttestationValidationError(`Missing required field: ${field}`);
                    }
                }

                // Recreate the message that was signed
                const messageData = {
                    tag: attestation.tag,
                    timestamp: attestation.timestamp,
                    nonce: attestation.nonce,
                    userWallet: attestation.user_wallet,
                    publisherDomain: attestation.publisher
                };

                const sortedData = {};
                Object.keys(messageData).sort().forEach(key => {
                    sortedData[key] = messageData[key];
                });
                const expectedMessage = JSON.stringify(sortedData);

                // Verify the signature
                const recoveredAddress = ethers.utils.verifyMessage(expectedMessage, attestation.signature);

                // Check if recovered address matches expected
                if (expectedPublicKeyOrAddress.startsWith('0x') && expectedPublicKeyOrAddress.length === 42) {
                    // It's an address
                    return recoveredAddress.toLowerCase() === expectedPublicKeyOrAddress.toLowerCase();
                } else {
                    // It's a public key - derive address from it
                    const addressFromPubKey = ethers.utils.computeAddress(expectedPublicKeyOrAddress);
                    return recoveredAddress.toLowerCase() === addressFromPubKey.toLowerCase();
                }

            } catch (error) {
                console.error('Signature verification failed:', error.message);
                return false;
            }
        }

        getSignerInfo() {
            return {
                publicKey: this.publicKey,
                address: this.address,
                domain: this.publisherDomain
            };
        }
    }

    // Expose to window object
    window.PublisherSigner = PublisherSigner;
    window.CryptographyError = CryptographyError;
    window.SignatureVerificationError = SignatureVerificationError;
    window.AttestationValidationError = AttestationValidationError;

    console.log('✅ PublisherSigner available on window object');
} 