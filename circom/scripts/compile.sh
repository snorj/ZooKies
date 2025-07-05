#!/bin/bash
set -euo pipefail

# Configuration
CIRCUIT_NAME="ThresholdProof"
BUILD_DIR="build"
PTAU_FILE="ptau/powersOfTau28_hez_final_20.ptau"
CIRCUIT_DIR="circuits"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Starting Circom compilation pipeline...${NC}"

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo -e "${RED}❌ Error: circom is not installed. Please install circom first.${NC}"
    echo -e "${YELLOW}💡 Install with: npm install -g circom@latest${NC}"
    exit 1
fi

# Check circom version
CIRCOM_VERSION=$(circom --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
echo -e "${BLUE}📋 Using Circom version: ${CIRCOM_VERSION}${NC}"

# Create build directories
echo -e "${YELLOW}📁 Creating build directories...${NC}"
mkdir -p ${BUILD_DIR}/{circuits,witness,proofs,keys}

# Check if circuit file exists
if [ ! -f "${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom" ]; then
    echo -e "${RED}❌ Error: Circuit file ${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom not found${NC}"
    exit 1
fi

# Clean previous build artifacts
echo -e "${YELLOW}🧹 Cleaning previous build artifacts...${NC}"
rm -rf ${BUILD_DIR}/circuits/${CIRCUIT_NAME}*

# Compile circuit with optimization flags
echo -e "${YELLOW}⚙️  Compiling circuit with optimization...${NC}"
circom ${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    --O2 \
    --output ${BUILD_DIR}/circuits/ \
    --verbose

# Verify compilation success
if [ ! -f "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs" ]; then
    echo -e "${RED}❌ Compilation failed: R1CS file not generated${NC}"
    exit 1
fi

if [ ! -f "${BUILD_DIR}/circuits/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" ]; then
    echo -e "${RED}❌ Compilation failed: WASM file not generated${NC}"
    exit 1
fi

# Display circuit statistics
echo -e "${BLUE}📊 Circuit Statistics:${NC}"
R1CS_SIZE=$(wc -c < "${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs")
echo -e "   R1CS file size: ${R1CS_SIZE} bytes"

if command -v snarkjs &> /dev/null; then
    echo -e "${YELLOW}📈 Analyzing circuit constraints...${NC}"
    snarkjs r1cs info ${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs | grep -E "(Constraints|Private inputs|Public inputs|Outputs)"
else
    echo -e "${YELLOW}⚠️  snarkjs not found - skipping constraint analysis${NC}"
fi

# Test witness generation with sample input
if [ -f "inputs/test/valid_threshold.json" ]; then
    echo -e "${YELLOW}🧪 Testing witness generation...${NC}"
    cd ${BUILD_DIR}/circuits/${CIRCUIT_NAME}_js
    
    if node generate_witness.js ${CIRCUIT_NAME}.wasm ../../../inputs/test/valid_threshold.json ../witness/test.wtns; then
        echo -e "${GREEN}✅ Witness generation successful${NC}"
        
        # Check witness file size
        WITNESS_SIZE=$(wc -c < "../witness/test.wtns")
        echo -e "   Witness file size: ${WITNESS_SIZE} bytes"
    else
        echo -e "${RED}❌ Witness generation failed${NC}"
        cd ../../..
        exit 1
    fi
    
    cd ../../..
else
    echo -e "${YELLOW}⚠️  Test input file not found - skipping witness generation test${NC}"
fi

echo -e "${GREEN}🎉 Compilation completed successfully!${NC}"
echo -e "${BLUE}📋 Generated files:${NC}"
echo -e "   • ${BUILD_DIR}/circuits/${CIRCUIT_NAME}.r1cs"
echo -e "   • ${BUILD_DIR}/circuits/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo -e "   • ${BUILD_DIR}/circuits/${CIRCUIT_NAME}.sym"

if [ -f "${BUILD_DIR}/witness/test.wtns" ]; then
    echo -e "   • ${BUILD_DIR}/witness/test.wtns (test witness)"
fi

echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Run './scripts/setup.sh' to perform trusted setup"
echo -e "   2. Run 'npm test' to execute circuit tests" 