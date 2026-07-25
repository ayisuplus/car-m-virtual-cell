#!/bin/bash
# =============================================================================
# CAR-M Virtual Cell - Asset Generation Script
# =============================================================================
# This script generates high-quality images and 3D models for the CAR-M Simulator
# using RunningHub (images) and Meshy (3D models) APIs.
#
# Prerequisites:
#   1. RunningHub API key configured: rh auth set-key <KEY>
#   2. Meshy API key: export MESHY_API_KEY=msy_YOUR_KEY
#   3. rh CLI installed: cd /path/to/RH_CLI && pip install .
#
# Usage:
#   bash scripts/generate-assets.sh [all|images|models|dna-helix]
# =============================================================================

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/app/public"
IMAGES_DIR="$PUBLIC_DIR/images"
MODELS_DIR="$PUBLIC_DIR/models"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check rh CLI
    if ! command -v rh &> /dev/null; then
        log_error "rh CLI not found. Install with: cd /path/to/RH_CLI && pip install ."
        return 1
    fi
    
    # Check RunningHub API key
    if ! rh check &> /dev/null; then
        log_error "RunningHub API key not configured. Run: rh auth set-key YOUR_KEY"
        return 1
    fi
    
    # Check Meshy API key
    if [ -z "$MESHY_API_KEY" ]; then
        log_warn "MESHY_API_KEY not set. 3D model generation will be skipped."
        MESHY_AVAILABLE=false
    else
        MESHY_AVAILABLE=true
    fi
    
    log_success "Prerequisites check passed"
    return 0
}

# Generate hero background image
generate_hero_background() {
    log_info "Generating hero background image..."
    
    local prompt="Futuristic bioluminescent tumor microenvironment, dark blue background with glowing cyan and purple cellular structures, floating immune cells with neon outlines, scientific visualization style, highly detailed, 8k resolution, no text, no labels, no watermark"
    
    rh image -p "$prompt" -m 1 --param resolution=2k --param aspectRatio=16:9 -o "$IMAGES_DIR/hero-bg-new.jpg"
    
    if [ -f "$IMAGES_DIR/hero-bg-new.jpg" ]; then
        log_success "Hero background generated: hero-bg-new.jpg"
        # Backup old file
        if [ -f "$IMAGES_DIR/hero-bg.jpg" ]; then
            mv "$IMAGES_DIR/hero-bg.jpg" "$IMAGES_DIR/hero-bg-old.jpg"
            mv "$IMAGES_DIR/hero-bg-new.jpg" "$IMAGES_DIR/hero-bg.jpg"
            log_info "Old hero background backed up as hero-bg-old.jpg"
        fi
    else
        log_error "Failed to generate hero background"
    fi
}

# Generate scientific illustration images
generate_scientific_images() {
    log_info "Generating scientific illustration images..."
    
    # M1/M2 Polarization diagram
    local m1m2_prompt="Scientific illustration of macrophage polarization spectrum, M1 pro-inflammatory phenotype on left in red/orange tones, M2 anti-inflammatory phenotype on right in blue/cyan tones, transition gradient in middle, cellular morphology shown, dark background, bioluminescent glow effect, no text, no labels"
    
    rh image -p "$m1m2_prompt" -m 1 --param resolution=2k --param aspectRatio=16:9 -o "$IMAGES_DIR/m1-m2-polarization-new.png"
    
    # Phagocytosis mechanism
    local phago_prompt="Scientific illustration of phagocytosis mechanism, macrophage engulfing tumor cell, 'eat me' signals in green, 'don't eat me' signals in red, cellular membrane dynamics shown, dark background with bioluminescent effects, no text, no labels"
    
    rh image -p "$phago_prompt" -m 1 --param resolution=2k --param aspectRatio=16:9 -o "$IMAGES_DIR/phagocytosis-mechanism-new.png"
    
    # TME ecosystem
    local tme_prompt="Tumor microenvironment ecosystem visualization, multiple cell types interacting: macrophages, T cells, tumor cells, fibroblasts, cytokine network shown as glowing connections, dark scientific background, bioluminescent style, no text, no labels"
    
    rh image -p "$tme_prompt" -m 1 --param resolution=2k --param aspectRatio=16:9 -o "$IMAGES_DIR/tme-ecosystem-new.png"
    
    log_success "Scientific illustrations generated"
}

# Generate 3D model using Meshy
generate_3d_model() {
    local prompt="$1"
    local texture_prompt="$2"
    local output_name="$3"
    
    if [ "$MESHY_AVAILABLE" != "true" ]; then
        log_warn "Skipping 3D model generation (Meshy API key not set)"
        return 0
    fi
    
    log_info "Generating 3D model: $output_name"
    
    # Step 1: Create preview task
    local preview_response=$(curl -s -X POST \
        -H "Authorization: Bearer $MESHY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"mode\":\"preview\",\"prompt\":\"$prompt\",\"target_formats\":[\"glb\"],\"ai_model\":\"latest\"}" \
        "https://api.meshy.ai/openapi/v2/text-to-3d")
    
    local preview_task_id=$(echo "$preview_response" | python -c "import sys,json; print(json.load(sys.stdin)['result'])" 2>/dev/null)
    
    if [ -z "$preview_task_id" ]; then
        log_error "Failed to create preview task for $output_name"
        return 1
    fi
    
    log_info "Preview task created: $preview_task_id"
    
    # Step 2: Poll preview until SUCCEEDED
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local status_response=$(curl -s -H "Authorization: Bearer $MESHY_API_KEY" \
            "https://api.meshy.ai/openapi/v2/text-to-3d/$preview_task_id")
        
        local status=$(echo "$status_response" | python -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
        local progress=$(echo "$status_response" | python -c "import sys,json; print(json.load(sys.stdin)['progress'])" 2>/dev/null)
        
        if [ "$status" = "SUCCEEDED" ]; then
            log_success "Preview completed for $output_name"
            break
        elif [ "$status" = "FAILED" ]; then
            log_error "Preview failed for $output_name"
            return 1
        fi
        
        log_info "Preview progress: $progress% (attempt $attempt/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Preview timed out for $output_name"
        return 1
    fi
    
    # Step 3: Create refine task
    local refine_response=$(curl -s -X POST \
        -H "Authorization: Bearer $MESHY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"mode\":\"refine\",\"preview_task_id\":\"$preview_task_id\",\"texture_prompt\":\"$texture_prompt\"}" \
        "https://api.meshy.ai/openapi/v2/text-to-3d")
    
    local refine_task_id=$(echo "$refine_response" | python -c "import sys,json; print(json.load(sys.stdin)['result'])" 2>/dev/null)
    
    if [ -z "$refine_task_id" ]; then
        log_error "Failed to create refine task for $output_name"
        return 1
    fi
    
    log_info "Refine task created: $refine_task_id"
    
    # Step 4: Poll refine until SUCCEEDED
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local status_response=$(curl -s -H "Authorization: Bearer $MESHY_API_KEY" \
            "https://api.meshy.ai/openapi/v2/text-to-3d/$refine_task_id")
        
        local status=$(echo "$status_response" | python -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
        local progress=$(echo "$status_response" | python -c "import sys,json; print(json.load(sys.stdin)['progress'])" 2>/dev/null)
        
        if [ "$status" = "SUCCEEDED" ]; then
            log_success "Refine completed for $output_name"
            
            # Step 5: Download .glb file
            local glb_url=$(echo "$status_response" | python -c "import sys,json; print(json.load(sys.stdin)['model_urls']['glb'])" 2>/dev/null)
            
            if [ -n "$glb_url" ]; then
                curl -L -o "$MODELS_DIR/$output_name.glb" "$glb_url"
                log_success "Downloaded: $output_name.glb"
            else
                log_error "Failed to get GLB URL for $output_name"
            fi
            
            break
        elif [ "$status" = "FAILED" ]; then
            log_error "Refine failed for $output_name"
            return 1
        fi
        
        log_info "Refine progress: $progress% (attempt $attempt/$max_attempts)"
        sleep 15
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Refine timed out for $output_name"
        return 1
    fi
}

# Generate DNA helix 3D model
generate_dna_helix_model() {
    log_info "Generating DNA helix 3D model..."
    
    local prompt="Detailed DNA double helix structure, bioluminescent glow effect, cyan and purple color scheme, scientific visualization style, smooth strands with connecting rungs, suitable for web display"
    local texture_prompt="Bioluminescent DNA helix with glowing cyan and purple strands, translucent rungs, dark background, scientific visualization style"
    
    generate_3d_model "$prompt" "$texture_prompt" "dna-helix"
}

# Generate cell 3D models
generate_cell_models() {
    log_info "Generating enhanced cell 3D models..."
    
    # Enhanced macrophage model
    local macro_prompt="Detailed macrophage immune cell, bioluminescent green glow, surface receptors visible, scientific visualization style, suitable for web display"
    local macro_texture="Bioluminescent macrophage with glowing green surface, translucent membrane, internal organelles visible, dark background"
    
    generate_3d_model "$macro_prompt" "$macro_texture" "macrophage-enhanced"
    
    # Enhanced tumor cell model
    local tumor_prompt="Detailed tumor cell with HER2 surface markers, bioluminescent purple glow, irregular shape, scientific visualization style, suitable for web display"
    local tumor_texture="Bioluminescent tumor cell with glowing purple surface, HER2 markers visible, irregular morphology, dark background"
    
    generate_3d_model "$tumor_prompt" "$tumor_texture" "tumor-cell-enhanced"
}

# Main function
main() {
    local target=${1:-"all"}
    
    log_info "Starting asset generation for CAR-M Virtual Cell Simulator"
    log_info "Target: $target"
    
    # Create directories if they don't exist
    mkdir -p "$IMAGES_DIR" "$MODELS_DIR"
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi
    
    case "$target" in
        "all")
            generate_hero_background
            generate_scientific_images
            generate_dna_helix_model
            generate_cell_models
            ;;
        "images")
            generate_hero_background
            generate_scientific_images
            ;;
        "models")
            generate_dna_helix_model
            generate_cell_models
            ;;
        "dna-helix")
            generate_dna_helix_model
            ;;
        *)
            log_error "Unknown target: $target"
            echo "Usage: $0 [all|images|models|dna-helix]"
            exit 1
            ;;
    esac
    
    log_success "Asset generation completed!"
    log_info "Generated files are in:"
    log_info "  Images: $IMAGES_DIR"
    log_info "  Models: $MODELS_DIR"
}

# Run main function
main "$@"
