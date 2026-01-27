#!/bin/zsh
set -eo pipefail

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# Navigate to monorepo root (from apps/mobile/ios/ci_scripts -> root)
cd ../../../../
REPO_ROOT=$(pwd)
echo "Repo root: $REPO_ROOT"

# Install dependencies via Homebrew
echo "Installing Node.js, pnpm, and CocoaPods via Homebrew..."
brew install node pnpm cocoapods

# Install JS dependencies
echo "Installing JS dependencies with pnpm..."
pnpm install --frozen-lockfile

# Navigate to iOS directory and run pod install
cd "$REPO_ROOT/apps/mobile/ios"
echo "iOS directory: $(pwd)"

echo "Running pod install..."
pod install

echo "=== ci_post_clone.sh complete ==="
