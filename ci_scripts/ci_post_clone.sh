#!/bin/sh
set -e

echo "Running CocoaPods install for iOS project..."
cd apps/mobile/ios
pod install
