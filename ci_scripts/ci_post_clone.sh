#!/bin/sh
set -e

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"
echo "Repository root: $CI_PRIMARY_REPOSITORY_PATH"

# Navigate to iOS project directory
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile/ios"
echo "Changed to: $(pwd)"

# Install CocoaPods if not available
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    brew install cocoapods
fi

echo "CocoaPods version: $(pod --version)"
echo "Running pod install..."
pod install --repo-update

echo "=== Pod install complete ==="
ls -la Pods/
