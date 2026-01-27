#!/bin/zsh
set -e

echo "=== Xcode Cloud ci_post_clone.sh ==="

# Install Node.js and pnpm
echo "Installing Node.js..."
brew install node
echo "Installing pnpm..."
npm install -g pnpm

# Navigate to monorepo root and install JS dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Monorepo root: $(pwd)"
echo "Installing JS dependencies with pnpm..."
pnpm install

# Navigate to iOS directory
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile/ios"
echo "iOS directory: $(pwd)"

# Install CocoaPods
echo "Installing CocoaPods..."
export GEM_HOME=$HOME/.gem
export PATH="$GEM_HOME/bin:$PATH"
gem install cocoapods --user-install

# Run pod install
echo "Running pod install..."
pod install --repo-update

echo "=== Complete ==="
