#!/usr/bin/env bash

# 1. Check if exactly 3 arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <search_string> <replace_string> <filename>"
    exit 1
fi

SEARCH="$1"
REPLACE="$2"
FILE="$3"

# 2. Check if the target file actually exists
if [ ! -f "$FILE" ]; then
    echo "Error: File '$FILE' does not exist."
    exit 1
fi

# 3. Execute the replacement based on the operating system
# We use the '|' delimiter in sed instead of '/' so it doesn't break if your strings contain file paths.
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS (BSD sed requires an empty string extension after -i)
    sed -i '' "s|$SEARCH|$REPLACE|g" "$FILE"
else
    # Linux (GNU sed does not want the empty string)
    sed -i "s|$SEARCH|$REPLACE|g" "$FILE"
fi

echo "Successfully replaced all instances of '$SEARCH' with '$REPLACE' in '$FILE'."
