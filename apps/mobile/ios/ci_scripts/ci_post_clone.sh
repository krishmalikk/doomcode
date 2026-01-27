#!/bin/zsh
set -e

echo "=== Xcode Cloud ci_post_clone.sh ==="
echo "Current directory: $(pwd)"
echo "Script location: $0"

# Navigate to iOS project directory (one level up from ci_scripts)
cd "$(dirname "$0")/.."
echo "Changed to: $(pwd)"
echo "Contents:"
ls -la

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "ERROR: Podfile not found in $(pwd)"
    exit 1
fi

# Install CocoaPods using gem (more reliable on Xcode Cloud)
echo "Installing CocoaPods via gem..."
export GEM_HOME=$HOME/.gem
export PATH="$GEM_HOME/bin:$PATH"
gem install cocoapods --user-install

echo "CocoaPods version: $(pod --version)"
echo "Running pod install..."
pod install --repo-update --verbose

echo "=== Pod install complete ==="
ls -la Pods/ || echo "WARNING: Pods directory not created"
