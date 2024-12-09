#!/bin/bash

# Description: This script lists all .js files in the current working directory (CWD),
# concatenates their contents, and copies the result to the macOS clipboard.

# Create a temporary file to store concatenated content
temp_file=$(mktemp)

# Find all .js files in the CWD, list them, and concatenate their contents into the temporary file
echo "Processing .js files in CWD:"
find . -maxdepth 1 -type f -name "*.js" | while read -r file; do
  echo "Adding file: $file"
  cat "$file" >> "$temp_file"
done

# Copy the concatenated content to the clipboard
cat "$temp_file" | pbcopy

# Clean up the temporary file
rm "$temp_file"

echo "All .js file contents have been copied to the clipboard!"
