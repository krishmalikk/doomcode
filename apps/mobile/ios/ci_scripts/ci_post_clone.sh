#!/bin/zsh
set -eo pipefail

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "CI_WORKSPACE: $CI_WORKSPACE"

# Use Xcode Cloud environment variable for repo root, with fallback
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
else
    # Fallback: navigate from ci_scripts to repo root
    REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
fi

echo "Repo root: $REPO_ROOT"
echo "Contents of repo root:"
ls -la "$REPO_ROOT"

# Install Node.js and pnpm via Homebrew
echo ""
echo "=== Installing Node.js and pnpm via Homebrew ==="
brew install node pnpm

# Update PATH to include Homebrew binaries
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"

# Navigate to repo root and install dependencies
cd "$REPO_ROOT"
echo ""
echo "=== Installing JS dependencies with pnpm ==="
pnpm install --frozen-lockfile

# Navigate to mobile app directory
MOBILE_DIR="$REPO_ROOT/apps/mobile"
cd "$MOBILE_DIR"
echo ""
echo "=== Mobile app directory: $(pwd) ==="
echo "Contents:"
ls -la

# Run expo prebuild to regenerate native code
echo ""
echo "=== Running expo prebuild --clean --platform ios ==="
npx expo prebuild --clean --platform ios

# Navigate to iOS directory
IOS_DIR="$MOBILE_DIR/ios"
cd "$IOS_DIR"
echo ""
echo "=== iOS directory: $(pwd) ==="
echo "Contents:"
ls -la

# Install CocoaPods (use gem since brew cocoapods can have issues)
echo ""
echo "=== Installing CocoaPods ==="
# Check if pod is available
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods via gem..."
    sudo gem install cocoapods
fi

echo "CocoaPods version: $(pod --version)"

# Run pod install
echo ""
echo "=== Running pod install ==="
pod install --repo-update

echo ""
echo "=== Verifying Pods directory ==="
if [ -d "Pods" ]; then
    echo "Pods directory exists"
    ls -la Pods/ | head -20
else
    echo "ERROR: Pods directory not found!"
    exit 1
fi

# Verify module maps exist
echo ""
echo "=== Checking for Expo module maps ==="
find Pods -name "*.modulemap" | head -10 || echo "Warning: No module maps found in Pods"

echo ""
echo "=== ci_post_clone.sh complete ==="
