#!/bin/bash
set -e

# Install CocoaPods dependencies for Xcode Cloud
cd "$CI_PRIMARY_REPOSITORY_PATH/apps/mobile"
npm install
cd ios
pod install
