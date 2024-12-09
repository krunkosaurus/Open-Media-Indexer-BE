#!/bin/bash

# Description: This script lists all .js files in the current directory (not subfolders),
# concatenates their contents, and copies the result to the macOS clipboard.

# Create a temporary file to store concatenated content
temp_file=$(mktemp)

echo "Listing and concatenating .js files in the current directory:"

# Find all .js files in the current directory (not subfolders)
for file in ./*.js; do
  # Check if the file exists (to handle case where no .js files are present)
  if [[ -f "$file" ]]; then
    echo "Processing: $file"
    cat "$file" >> "$temp_file"
  fi
done

# Copy the concatenated content to the clipboard
cat "$temp_file" | pbcopy

# Clean up the temporary file
rm "$temp_file"

echo "All .js file contents in the current directory have been copied to the clipboard!"
