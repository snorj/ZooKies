#!/bin/bash
set -euo pipefail

CIRCUIT_NAME="ThresholdProof"
BUILD_DIR="build"
PTAU_FILE="ptau/powersOfTau28_hez_final_20.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau"

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
SNARKJS_VERSION=$(snarkjs --version | head -1)
echo -e "${BLUE}📋 Using SnarkJS: ${SNARKJS_VERSION}${NC}"

# Check if R1CS file exists
if [ ! -f "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs" ]; then
    echo -e "${RED}❌ Error: R1CS file not found. Please run compile.sh first.${NC}"
    exit 1
fi

# Create directories
mkdir -p ptau ${BUILD_DIR}/keys

# Download Powers of Tau if not present
if [ ! -f "${PTAU_FILE}" ]; then
    echo -e "${YELLOW}📥 Downloading Powers of Tau ceremony file...${NC}"
    echo -e "${BLUE}   Source: ${PTAU_URL}${NC}"
    
    if command -v wget &> /dev/null; then
        wget -O "${PTAU_FILE}" "${PTAU_URL}" --progress=bar:force
    elif command -v curl &> /dev/null; then
        curl -L -o "${PTAU_FILE}" "${PTAU_URL}" --progress-bar
    else
        echo -e "${RED}❌ Error: Neither wget nor curl found. Please install one of them.${NC}"
        exit 1
    fi
    
    if [ ! -f "${PTAU_FILE}" ]; then
        echo -e "${RED}❌ Error: Failed to download Powers of Tau file${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Powers of Tau file downloaded successfully${NC}"
else
    echo -e "${BLUE}📋 Powers of Tau file already exists${NC}"
fi

# Check file size (should be around 288MB for 2^20)
PTAU_SIZE=$(wc -c < "${PTAU_FILE}")
EXPECTED_SIZE=288558080  # Approximate size for 2^20 constraints
if [ $PTAU_SIZE -lt $((EXPECTED_SIZE - 1000000)) ] || [ $PTAU_SIZE -gt $((EXPECTED_SIZE + 1000000)) ]; then
    echo -e "${YELLOW}⚠️  Warning: Powers of Tau file size (${PTAU_SIZE} bytes) differs from expected size${NC}"
fi

# Verify Powers of Tau file integrity
echo -e "${YELLOW}🔍 Verifying Powers of Tau file integrity...${NC}"
if snarkjs powersoftau verify "${PTAU_FILE}"; then
    echo -e "${GREEN}✅ Powers of Tau verification successful${NC}"
else
    echo -e "${RED}❌ Powers of Tau verification failed${NC}"
    echo -e "${YELLOW}💡 Try re-downloading the file with: rm ${PTAU_FILE} && ./scripts/setup.sh${NC}"
    exit 1
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