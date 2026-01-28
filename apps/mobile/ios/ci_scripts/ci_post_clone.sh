#!/bin/zsh
set -eo pipefail

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Use Xcode Cloud environment variable for repo root
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
else
    REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
fi

echo "Repo root: $REPO_ROOT"

# Install dependencies via Homebrew
echo ""
echo "=== Installing Node.js, pnpm, cmake, and CocoaPods via Homebrew ==="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install node pnpm cmake cocoapods

# Update PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo "Pod version: $(pod --version)"
echo "Node path: $(which node)"

# Install JS dependencies
cd "$REPO_ROOT"
echo ""
echo "=== Installing JS dependencies with pnpm ==="
pnpm install --frozen-lockfile

# Build workspace packages (protocol, crypto, etc.)
# These need to be compiled before Metro can resolve them
echo ""
echo "=== Building workspace packages ==="
pnpm build

# Navigate to mobile app
MOBILE_DIR="$REPO_ROOT/apps/mobile"
cd "$MOBILE_DIR"

# Run expo prebuild with CI env var fix
# Xcode Cloud sets CI='TRUE' which causes GetEnv.NoBoolean error
echo ""
echo "=== Running expo prebuild --clean --platform ios ==="
CI="true" npx expo prebuild --clean --platform ios

# Navigate to iOS directory
IOS_DIR="$MOBILE_DIR/ios"
cd "$IOS_DIR"

# Fix NODE_BINARY path for Xcode Cloud
# expo prebuild may create .xcode.env.local with incorrect path
echo ""
echo "=== Fixing .xcode.env.local for Xcode Cloud ==="
NODE_PATH=$(which node)
echo "export NODE_BINARY=${NODE_PATH}" > "$IOS_DIR/.xcode.env.local"
cat "$IOS_DIR/.xcode.env.local"

# CRITICAL: Restore Podfile.properties.json with static frameworks
# expo prebuild --clean overwrites this file with defaults, losing our settings
echo ""
echo "=== Restoring Podfile.properties.json with static frameworks ==="
cat > "$IOS_DIR/Podfile.properties.json" << 'PODFILE_PROPS'
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.useFrameworks": "static"
}
PODFILE_PROPS
cat "$IOS_DIR/Podfile.properties.json"

# Run pod install
echo ""
echo "=== Running pod install ==="
pod install --repo-update

# Verify
echo ""
echo "=== Verifying Pods directory ==="
ls -la Pods/ | head -10

echo ""
echo "=== Checking for Expo module maps ==="
find Pods -name "*.modulemap" | head -10

echo ""
echo "=== ci_post_clone.sh complete ==="
