#!/bin/bash
set -euo pipefail

CIRCUIT_NAME="ThresholdProof"
BUILD_DIR="build"
PTAU_FILE="ptau/powersOfTau28_hez_final_11.ptau"

# Trusted fallback URLs for Powers of Tau ceremony files (direct download links)
PTAU_URLS=(
    "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_11.ptau"
    "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_11.ptau"
)

# Expected file size for powersOfTau28_hez_final_11.ptau (approximately 4MB)
EXPECTED_MIN_SIZE=4000000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Starting trusted setup for ${CIRCUIT_NAME}...${NC}"

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}❌ Error: snarkjs is not installed. Please install snarkjs first.${NC}"
    echo -e "${YELLOW}💡 Install with: npm install -g snarkjs@latest${NC}"
    exit 1
fi

# Check snarkjs version
SNARKJS_VERSION=$(snarkjs --version | head -1 || true)
echo -e "${BLUE}📋 Using SnarkJS: ${SNARKJS_VERSION}${NC}"

# Check if R1CS file exists
if [ ! -f "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs" ]; then
    echo -e "${RED}❌ Error: R1CS file not found. Please run compile.sh first.${NC}"
    exit 1
fi

# Create directories
mkdir -p ptau ${BUILD_DIR}/keys

# Download Powers of Tau if not present with fallback sources
download_ptau() {
    echo -e "${YELLOW}📥 Downloading Powers of Tau ceremony file (2^11 = 2048 constraints)...${NC}"
    
    for url in "${PTAU_URLS[@]}"; do
        echo -e "${BLUE}   Trying: ${url}${NC}"
        
        # Test with HEAD request first to check if URL is valid
        if command -v curl &> /dev/null; then
            # Check content type and size with HEAD request
            response=$(curl -sI "$url" --connect-timeout 10)
            content_length=$(echo "$response" | grep -i content-length | cut -d' ' -f2 | tr -d '\r')
            content_type=$(echo "$response" | grep -i content-type | cut -d' ' -f2 | tr -d '\r')
            
            echo -e "${BLUE}   Content-Length: ${content_length:-unknown}, Content-Type: ${content_type:-unknown}${NC}"
            
            # Skip if content type suggests HTML
            if [[ "$content_type" == *"text/html"* ]]; then
                echo -e "${YELLOW}   Skipping: URL returns HTML instead of binary file${NC}"
                continue
            fi
            
            # Skip if file seems too small
            if [[ -n "$content_length" && "$content_length" -lt "$EXPECTED_MIN_SIZE" ]]; then
                echo -e "${YELLOW}   Skipping: File too small (${content_length} bytes)${NC}"
                continue
            fi
            
            # Download the file
            if curl -L -o "${PTAU_FILE}.tmp" "${url}" --progress-bar --connect-timeout 30; then
                # Verify downloaded file
                actual_size=$(wc -c < "${PTAU_FILE}.tmp")
                
                # Check if file starts with binary magic number (not HTML)
                file_type=$(file "${PTAU_FILE}.tmp" | head -1)
                
                if [[ "$file_type" == *"HTML"* || "$file_type" == *"text"* ]]; then
                    echo -e "${YELLOW}   Downloaded file is HTML/text, not binary${NC}"
                    rm -f "${PTAU_FILE}.tmp"
                    continue
                fi
                
                if [ "$actual_size" -ge "$EXPECTED_MIN_SIZE" ]; then
                    mv "${PTAU_FILE}.tmp" "${PTAU_FILE}"
                    echo -e "${GREEN}✅ Downloaded successfully: ${actual_size} bytes${NC}"
                    return 0
                else
                    echo -e "${YELLOW}   Downloaded file too small: ${actual_size} bytes${NC}"
                    rm -f "${PTAU_FILE}.tmp"
                fi
            else
                echo -e "${YELLOW}   Download failed${NC}"
                rm -f "${PTAU_FILE}.tmp"
            fi
        elif command -v wget &> /dev/null; then
            # Try with wget as fallback
            if wget --spider --timeout=10 "${url}" 2>/dev/null; then
                if wget -O "${PTAU_FILE}.tmp" "${url}" --progress=bar:force --timeout=30; then
                    actual_size=$(wc -c < "${PTAU_FILE}.tmp")
                    file_type=$(file "${PTAU_FILE}.tmp" | head -1)
                    
                    if [[ "$file_type" == *"HTML"* || "$file_type" == *"text"* ]]; then
                        echo -e "${YELLOW}   Downloaded file is HTML/text, not binary${NC}"
                        rm -f "${PTAU_FILE}.tmp"
                        continue
                    fi
                    
                    if [ "$actual_size" -ge "$EXPECTED_MIN_SIZE" ]; then
                        mv "${PTAU_FILE}.tmp" "${PTAU_FILE}"
                        echo -e "${GREEN}✅ Downloaded successfully: ${actual_size} bytes${NC}"
                        return 0
                    else
                        echo -e "${YELLOW}   Downloaded file too small: ${actual_size} bytes${NC}"
                        rm -f "${PTAU_FILE}.tmp"
                    fi
                fi
            fi
        fi
        
        echo -e "${YELLOW}   Failed, trying next source...${NC}"
    done
    
    echo -e "${RED}❌ Error: Failed to download Powers of Tau file from all sources${NC}"
    echo -e "${YELLOW}💡 Manual download option: Check https://github.com/iden3/snarkjs documentation${NC}"
    return 1
}

if [ ! -f "${PTAU_FILE}" ]; then
    if ! download_ptau; then
        echo -e "${YELLOW}⚙️  Falling back to local generation (this may take a while)...${NC}"
        echo -e "${BLUE}   Creating 2^11 (2048) constraint Powers of Tau file for development${NC}"
        
        # Generate new Powers of Tau ceremony locally as fallback
        snarkjs powersoftau new bn128 11 ptau/powersOfTau28_hez_initial_11.ptau -v
        
        # Contribute to the ceremony
        snarkjs powersoftau contribute ptau/powersOfTau28_hez_initial_11.ptau ptau/powersOfTau28_hez_contribute_11.ptau \
            --name="Development Setup $(date +%Y%m%d_%H%M%S)" -v
        
        # Prepare for phase 2
        snarkjs powersoftau prepare phase2 ptau/powersOfTau28_hez_contribute_11.ptau "${PTAU_FILE}" -v
        
        # Clean up intermediate files
        rm ptau/powersOfTau28_hez_initial_11.ptau ptau/powersOfTau28_hez_contribute_11.ptau
        
        echo -e "${GREEN}✅ Powers of Tau file generated locally${NC}"
    fi
else
    echo -e "${BLUE}📋 Powers of Tau file already exists${NC}"
fi

# Check file size and basic validation
PTAU_SIZE=$(wc -c < "${PTAU_FILE}")
echo -e "${BLUE}   Powers of Tau file size: ${PTAU_SIZE} bytes${NC}"

# Basic sanity check - file should be at least 1MB for powers of tau 11
if [ $PTAU_SIZE -lt 1000000 ]; then
    echo -e "${YELLOW}⚠️  Warning: Powers of Tau file seems too small, may be corrupted${NC}"
    echo -e "${YELLOW}   Removing and attempting re-download...${NC}"
    rm -f "${PTAU_FILE}"
    download_ptau
fi

# Phase 1: Circuit-specific setup
echo -e "${YELLOW}⚙️  Phase 1: Circuit-specific setup...${NC}"
snarkjs groth16 setup \
    "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs" \
    "${PTAU_FILE}" \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_0000.zkey"

if [ ! -f "${BUILD_DIR}/keys/${CIRCUIT_NAME}_0000.zkey" ]; then
    echo -e "${RED}❌ Phase 1 setup failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Phase 1 setup completed${NC}"

# Phase 2: Contribute to ceremony (automated for development)
echo -e "${YELLOW}🎲 Phase 2: Contributing to ceremony...${NC}"
# Generate random entropy for development
ENTROPY=$(openssl rand -hex 32)
snarkjs zkey contribute \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_0000.zkey" \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey" \
    --name="Development Setup $(date +%Y%m%d_%H%M%S)" \
    -e="${ENTROPY}"

if [ ! -f "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey" ]; then
    echo -e "${RED}❌ Phase 2 contribution failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Phase 2 contribution completed${NC}"

# Verify final proving key
echo -e "${YELLOW}🔍 Verifying final proving key...${NC}"
if snarkjs zkey verify \
    "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs" \
    "${PTAU_FILE}" \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey"; then
    echo -e "${GREEN}✅ Final proving key verification successful${NC}"
else
    echo -e "${RED}❌ Final proving key verification failed${NC}"
    exit 1
fi

# Export verification key
echo -e "${YELLOW}📤 Exporting verification key...${NC}"
snarkjs zkey export verificationkey \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey" \
    "${BUILD_DIR}/keys/verification_key.json"

if [ ! -f "${BUILD_DIR}/keys/verification_key.json" ]; then
    echo -e "${RED}❌ Verification key export failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verification key exported${NC}"

# Generate Solidity verifier (optional, useful for future on-chain verification)
echo -e "${YELLOW}📄 Generating Solidity verifier...${NC}"
snarkjs zkey export solidityverifier \
    "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey" \
    "${BUILD_DIR}/keys/verifier.sol"

if [ ! -f "${BUILD_DIR}/keys/verifier.sol" ]; then
    echo -e "${YELLOW}⚠️  Solidity verifier generation failed (non-critical)${NC}"
else
    echo -e "${GREEN}✅ Solidity verifier generated${NC}"
fi

# Display key information
echo -e "${BLUE}📊 Setup Statistics:${NC}"
ZKEY_SIZE=$(wc -c < "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey")
VKEY_SIZE=$(wc -c < "${BUILD_DIR}/keys/verification_key.json")
echo -e "   Proving key size: ${ZKEY_SIZE} bytes"
echo -e "   Verification key size: ${VKEY_SIZE} bytes"

# Test proof generation with sample input
if [ -f "inputs/test/valid_threshold.json" ] && [ -f "${BUILD_DIR}/witness/test.wtns" ]; then
    echo -e "${YELLOW}🧪 Testing proof generation...${NC}"
    
    if snarkjs groth16 prove \
        "${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey" \
        "${BUILD_DIR}/witness/test.wtns" \
        "${BUILD_DIR}/proofs/test_proof.json" \
        "${BUILD_DIR}/proofs/test_public.json"; then
        
        echo -e "${GREEN}✅ Test proof generation successful${NC}"
        
        # Test verification
        if snarkjs groth16 verify \
            "${BUILD_DIR}/keys/verification_key.json" \
            "${BUILD_DIR}/proofs/test_public.json" \
            "${BUILD_DIR}/proofs/test_proof.json"; then
            echo -e "${GREEN}✅ Test proof verification successful${NC}"
        else
            echo -e "${RED}❌ Test proof verification failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Test proof generation failed (non-critical during setup)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping proof test - missing witness file${NC}"
fi

echo -e "${GREEN}🎉 Trusted setup completed successfully!${NC}"
echo -e "${BLUE}📋 Generated files:${NC}"
echo -e "   • ${BUILD_DIR}/keys/${CIRCUIT_NAME}_final.zkey (proving key)"
echo -e "   • ${BUILD_DIR}/keys/verification_key.json (verification key)"
echo -e "   • ${BUILD_DIR}/keys/verifier.sol (Solidity verifier)"

if [ -f "${BUILD_DIR}/proofs/test_proof.json" ]; then
    echo -e "   • ${BUILD_DIR}/proofs/test_proof.json (test proof)"
fi

echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Run 'npm test' to execute comprehensive tests"
echo -e "   2. Use proof generation scripts in scripts/ directory"
echo -e "   3. Integrate with your application using verification_key.json" 