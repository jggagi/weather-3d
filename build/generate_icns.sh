#!/bin/bash
set -e

# Make sure we're in the project root containing build/ directory
# Target directory for the iconset
ICONSET_DIR="build/icon.iconset"
mkdir -p "$ICONSET_DIR"

echo "Rendering base 1024x1024 PNG from SVG..."
# Step 1: Render SVG to 1024x1024 base PNG using qlmanage
cp build/icon.svg build/base_1024.svg
qlmanage -t -s 1024 -o build/ build/base_1024.svg > /dev/null 2>&1
mv build/base_1024.svg.png build/base_1024.png
rm build/base_1024.svg

echo "Generating iconset with sips..."
# Step 2: Use sips to scale the base PNG to various sizes
sips -z 16 16     build/base_1024.png --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
sips -z 32 32     build/base_1024.png --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 32 32     build/base_1024.png --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
sips -z 64 64     build/base_1024.png --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128   build/base_1024.png --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
sips -z 256 256   build/base_1024.png --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   build/base_1024.png --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
sips -z 512 512   build/base_1024.png --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   build/base_1024.png --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
sips -z 1024 1024 build/base_1024.png --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

echo "Compiling to icns using iconutil..."
# Step 3: Run iconutil to create the icns file
iconutil -c icns "$ICONSET_DIR"

echo "Cleaning up temp files..."
# Step 4: Clean up
rm -rf "$ICONSET_DIR" build/base_1024.png

echo "Success! build/icon.icns created successfully."
