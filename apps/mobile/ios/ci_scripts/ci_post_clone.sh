#!/bin/sh
set -e

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# Navigate to iOS project directory (one level up from ci_scripts)
cd "$(dirname "$0")/.."
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
