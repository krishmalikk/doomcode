#!/bin/zsh
set -eo pipefail

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# Navigate to monorepo root (from ios/ci_scripts -> root)
cd ../../
REPO_ROOT=$(pwd)
echo "Repo root: $REPO_ROOT"

# Install dependencies via Homebrew
echo "Installing Node.js and CocoaPods via Homebrew..."
brew install node cocoapods

# Enable corepack for pnpm (built into Node.js, no global install needed)
echo "Enabling corepack for pnpm..."
corepack enable
corepack prepare pnpm@latest --activate

# Install JS dependencies
echo "Installing JS dependencies with pnpm..."
pnpm install --frozen-lockfile

# Navigate to iOS directory and run pod install
cd "$REPO_ROOT/apps/mobile/ios"
echo "iOS directory: $(pwd)"

echo "Running pod install..."
pod install

echo "=== ci_post_clone.sh complete ==="
