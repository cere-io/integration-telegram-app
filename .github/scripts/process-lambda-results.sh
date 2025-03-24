#!/bin/bash
set -e

OUTPUT_DIR="$1"
WORKSPACE_OUTPUT="$2"
BODY="$3"
RESPONSE="$4"
GITHUB_STEP_SUMMARY="$5"
ENVIRONMENT="$6"
REGION="$7"
GITHUB_RUN_ID="$8"
GITHUB_REPOSITORY="$9"

# First, detect if BODY is a Lambda response with escaped JSON and fix it
echo "Checking if Lambda response body needs unescaping..."
if [[ "$BODY" == *"\"consoleErrors\":"* ]] || [[ "$BODY" == *"\\\"consoleErrors\\\":\["* ]]; then
  echo "Detected Lambda response with potential double escaping"
  
  # First level of unescaping - from Lambda format
  UNESCAPED_BODY=$(echo "$BODY" | sed 's/^"//; s/"$//; s/\\"/"/g; s/\\n/\n/g; s/\\\\/\\/g')
  echo "Created unescaped version of the body"
  
  # Save both formats
  echo "$BODY" > "${OUTPUT_DIR}/original-lambda-body.json"
  echo "$UNESCAPED_BODY" > "${OUTPUT_DIR}/unescaped-lambda-body.json"
  echo "$UNESCAPED_BODY" > "${WORKSPACE_OUTPUT}/unescaped-lambda-body.json"
  
  # Use the unescaped version for further processing
  BODY="$UNESCAPED_BODY"
  echo "Using unescaped version for processing"
fi

# Special direct function to extract console errors from any response format
# This function does not rely on JSON parsing which can fail with nested/escaped JSON
force_extract_console_errors() {
  local body="$1"
  local output_dir="$2"
  local summary_file="$3"
  
  echo "🔍 Extracting console errors with direct text processing"
  
  # Save processed body to file for extraction
  TEMP_FILE="${output_dir}/processed_response_body.txt"
  echo "$body" > "$TEMP_FILE"
  
  # Check if we can find the consoleErrors section
  if grep -q '"consoleErrors"' "$TEMP_FILE"; then
    echo "Found consoleErrors section in response"
    
    # Extract console errors with simplified approach (already unescaped)
    echo "" >> "$summary_file"
    echo "## 🛑 Console Errors" >> "$summary_file" 
    echo "The following errors were found in the test:" >> "$summary_file"
    echo '```' >> "$summary_file"
    
    # Use direct approach with explicit search for the text field
    grep -o '"text":"[^"]*"' "$TEMP_FILE" | sed 's/"text":"//g; s/"$//g' >> "$summary_file" || \
    echo "Failed to extract error texts" >> "$summary_file"
    
    echo '```' >> "$summary_file"
    
    # Try to extract detailed error info 
    echo "" >> "$summary_file"
    echo "## 📊 Detailed Console Errors" >> "$summary_file"
    echo '```' >> "$summary_file"
    
    # Extract type, time and text fields with a robust pattern
    grep -o '"type":"[^"]*"[^{]*"text":"[^"]*"' "$TEMP_FILE" | \
    sed -E 's/"type":"([^"]*)".+"time":"([^"]*)".+"text":"([^"]*)"/[\1] [\2] \3/g; s/"type":"([^"]*)".+"text":"([^"]*)".+"time":"([^"]*)"/[\1] [\3] \2/g; s/"type":"([^"]*)".+"text":"([^"]*)"/[\1] \2/g' >> "$summary_file" || \
    echo "Failed to extract detailed error information" >> "$summary_file"
    
    echo '```' >> "$summary_file"
    
    return 0
  fi
  
  # No consoleErrors section found, try alternative extraction
  if grep -q '"text":"' "$TEMP_FILE"; then
    echo "Found text fields but no consoleErrors section"
    
    # Try to extract just the error texts directly
    echo "" >> "$summary_file"
    echo "## 🛑 Console Errors (Alternative Extraction)" >> "$summary_file" 
    echo "The following errors were found in the test:" >> "$summary_file"
    echo '```' >> "$summary_file"
    grep -o '"text":"[^"]*"' "$TEMP_FILE" | sed 's/"text":"//g; s/"$//g' >> "$summary_file"
    echo '```' >> "$summary_file"
    
    return 0
  fi
  
  # No errors found with any method
  echo "" >> "$summary_file"
  echo "## ⚠️ Debug Information" >> "$summary_file"
  echo "Failed to extract console errors. Showing first part of response body:" >> "$summary_file"
  echo '```' >> "$summary_file"
  head -n 30 "$TEMP_FILE" >> "$summary_file"
  echo '```' >> "$summary_file"
  
  return 1
}

# Process console errors from response JSON using jq
if echo "$BODY" | jq -e '.consoleErrors' >/dev/null 2>&1; then
  echo "Extracting console errors from response JSON using jq..."
  echo "$BODY" | jq -c '.consoleErrors' > "${OUTPUT_DIR}/extracted-console-errors.json"
  echo "$BODY" | jq -c '.consoleErrors' > "${WORKSPACE_OUTPUT}/extracted-console-errors.json"
  echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${OUTPUT_DIR}/extracted-console-errors.txt"
  echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${WORKSPACE_OUTPUT}/extracted-console-errors.txt"
  echo "Console errors extracted and saved to files using jq"
fi

# ALWAYS force extract console errors regardless of anything else
force_extract_console_errors "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY"

# Copy console error files if they exist
for file in /tmp/console-errors.txt /tmp/console-errors.json; do
  if [ -f "$file" ]; then
    echo "Copying $(basename $file) from /tmp to output directories..."
    cp "$file" "${OUTPUT_DIR}/"
    cp "$file" "${WORKSPACE_OUTPUT}/"
  fi
done

METRICS=""

# Try to parse metrics from JSON body
echo "Method 1: Trying to parse body as JSON..."
if echo "$BODY" | jq -e . >/dev/null 2>&1; then
  echo "Body is valid JSON"

  # Check for metrics array
  if echo "$BODY" | jq -e '.metrics' >/dev/null 2>&1; then
    echo "Found metrics array in body JSON"
    METRICS_JSON=$(echo "$BODY" | jq -c '.metrics')
    echo "$METRICS_JSON" > "${OUTPUT_DIR}/metrics-json.json"
    echo "$METRICS_JSON" > "${WORKSPACE_OUTPUT}/metrics-json.json"

    echo "Formatting metrics from JSON array..."
    echo "" > "${OUTPUT_DIR}/performance-metrics.txt"
    echo "" > "${WORKSPACE_OUTPUT}/performance-metrics.txt"
    echo "$METRICS_JSON" | jq -c '.[]' | while read -r metric; do
      NAME=$(echo "$metric" | jq -r '.name')
      DURATION=$(echo "$metric" | jq -r '.duration')
      FAKED=$(echo "$metric" | jq -r '.faked // false')
      
      if [ "$FAKED" == "true" ]; then
        METRIC_LINE="${NAME} took ${DURATION}ms [AUTH_ERROR]"
      else
        METRIC_LINE="${NAME} took ${DURATION}ms"
      fi
      
      echo "$METRIC_LINE" >> "${OUTPUT_DIR}/performance-metrics.txt"
      echo "$METRIC_LINE" >> "${WORKSPACE_OUTPUT}/performance-metrics.txt"
    done

    METRICS=$(cat "${OUTPUT_DIR}/performance-metrics.txt")
    echo "Metrics from JSON array: $METRICS"
  elif echo "$BODY" | jq -e '.performanceMetrics' >/dev/null 2>&1; then
    echo "Found performanceMetrics string in body JSON"
    METRICS=$(echo "$BODY" | jq -r '.performanceMetrics')
    echo "$METRICS" > "${OUTPUT_DIR}/performance-metrics.txt"
    echo "$METRICS" > "${WORKSPACE_OUTPUT}/performance-metrics.txt"
    echo "Metrics from performanceMetrics: $METRICS"
  else
    echo "No metrics fields found in JSON body"
  fi

  # Check for auth error
  if echo "$BODY" | jq -e '.authError' >/dev/null 2>&1; then
    echo "Found authentication error in response"
    AUTH_ERROR=$(echo "$BODY" | jq -c '.authError')
    echo "$AUTH_ERROR" > "${OUTPUT_DIR}/auth-error.json"
    echo "$AUTH_ERROR" > "${WORKSPACE_OUTPUT}/auth-error.json"
    echo "Authentication error saved to files"
    
    AUTH_ERROR_TYPE=$(echo "$AUTH_ERROR" | jq -r '.type')
    AUTH_ERROR_MSG=$(echo "$AUTH_ERROR" | jq -r '.message')
    AUTH_ERROR_TIME=$(echo "$AUTH_ERROR" | jq -r '.timestamp')
    
    echo "Auth error details - Type: $AUTH_ERROR_TYPE, Message: $AUTH_ERROR_MSG, Time: $AUTH_ERROR_TIME"
  fi
else
  echo "Body is not valid JSON, trying other methods..."
fi

# Alternative methods to extract metrics
if [ -z "$METRICS" ]; then
  echo "Method 2: Using direct grep for metrics strings..."
  # Normalize the body by removing carriage returns, replacing newlines with spaces
  CLEANED_BODY=$(echo "$BODY" | tr -d '\r' | tr '\n' ' ')
  
  # Extract metrics with grep
  GREP_METRICS=$(echo "$CLEANED_BODY" | grep -o '[A-Za-z ]\+ took [0-9]\+ms' || echo "")
  
  # Clean up any 'n' prefixes from metrics (due to newlines in the source)
  GREP_METRICS=$(echo "$GREP_METRICS" | sed 's/^n//g')

  if [ -n "$GREP_METRICS" ]; then
    echo "Found metrics with grep: $GREP_METRICS"
    # Format metrics to be one per line
    FORMATTED_METRICS=$(echo "$GREP_METRICS" | sed 's/\([A-Za-z ]\+ took [0-9]\+ms\) /\1\n/g')
    echo "$FORMATTED_METRICS" > "${OUTPUT_DIR}/performance-metrics.txt"
    echo "$FORMATTED_METRICS" > "${WORKSPACE_OUTPUT}/performance-metrics.txt"
    METRICS="$FORMATTED_METRICS"
  else
    echo "No metrics found with grep"
  fi
fi

if [ -z "$METRICS" ]; then
  echo "Method 3: Extracting from escaped JSON string..."
  # Normalize the body
  CLEANED_BODY=$(echo "$BODY" | tr -d '\r' | tr '\n' ' ')
  
  # Extract metrics from performance metrics string
  ESCAPED_METRICS=$(echo "$CLEANED_BODY" | grep -o '"performanceMetrics":"[^"]*"' | sed 's/"performanceMetrics":"//g' | sed 's/"$//g' | sed 's/\\n/\n/g')
  
  # Clean up any 'n' prefixes
  ESCAPED_METRICS=$(echo "$ESCAPED_METRICS" | sed 's/^n//g')
  
  # Format metrics to be one per line
  ESCAPED_METRICS=$(echo "$ESCAPED_METRICS" | sed 's/\([A-Za-z ]\+ took [0-9]\+ms\) /\1\n/g')

  if [ -n "$ESCAPED_METRICS" ]; then
    echo "Found metrics in escaped string: $ESCAPED_METRICS"
    echo "$ESCAPED_METRICS" > "${OUTPUT_DIR}/performance-metrics.txt"
    echo "$ESCAPED_METRICS" > "${WORKSPACE_OUTPUT}/performance-metrics.txt"
    METRICS="$ESCAPED_METRICS"
  else
    echo "No metrics found in escaped strings"
  fi
fi

# Count metrics regardless of how they are formatted
METRICS_COUNT=$(echo "$METRICS" | grep -o "took [0-9]\+ms" | wc -l)
echo "Found $METRICS_COUNT metrics"

# Handle case with missing or incomplete metrics
if [ -z "$METRICS" ] || [ "$METRICS_COUNT" -lt 3 ]; then
  echo "Metrics missing or incomplete, test is considered FAILED"
  echo "# ❌ Performance Test Results" >> $GITHUB_STEP_SUMMARY
  echo "Test is FAILED: Expected 3 metrics (Active Quests Screen, Leaderboard Screen, Library Screen)" >> $GITHUB_STEP_SUMMARY
  echo "Only found $METRICS_COUNT metrics:" >> $GITHUB_STEP_SUMMARY
  
  if [ -n "$METRICS" ]; then
    echo '```' >> $GITHUB_STEP_SUMMARY
    echo "$METRICS" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  else
    echo "No metrics found" >> $GITHUB_STEP_SUMMARY
  fi
  
  # Process auth error details
  if echo "$BODY" | jq -e '.authError' >/dev/null 2>&1; then
    AUTH_ERROR_TYPE=$(echo "$BODY" | jq -r '.authError.type')
    AUTH_ERROR_MSG=$(echo "$BODY" | jq -r '.authError.message')
    AUTH_ERROR_TIME=$(echo "$BODY" | jq -r '.authError.timestamp')
    
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## ⚠️ Authentication Error Detected" >> $GITHUB_STEP_SUMMARY
    echo "Authentication failed during test execution. This prevented testing of Leaderboard and Library screens." >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Error Details" >> $GITHUB_STEP_SUMMARY
    echo "- **Type:** ${AUTH_ERROR_TYPE}" >> $GITHUB_STEP_SUMMARY
    echo "- **Message:** ${AUTH_ERROR_MSG}" >> $GITHUB_STEP_SUMMARY
    echo "- **Time:** ${AUTH_ERROR_TIME}" >> $GITHUB_STEP_SUMMARY
    
    if echo "$AUTH_ERROR" | jq -e '.consoleErrors' >/dev/null 2>&1; then
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "### Browser Console Errors" >> $GITHUB_STEP_SUMMARY
      echo "The following errors were detected in the browser console during authentication:" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "```" >> $GITHUB_STEP_SUMMARY
      echo "$AUTH_ERROR" | jq -r '.consoleErrors[] | "[\(.type)] \(.text)"' >> $GITHUB_STEP_SUMMARY
      echo "```" >> $GITHUB_STEP_SUMMARY
    fi
    
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Troubleshooting Steps" >> $GITHUB_STEP_SUMMARY
    echo "1. Check if the web3auth service is working properly" >> $GITHUB_STEP_SUMMARY
    echo "2. Verify that the test credentials (email and OTP) are still valid" >> $GITHUB_STEP_SUMMARY
    echo "3. Check for any recent changes to the authentication flow" >> $GITHUB_STEP_SUMMARY
    echo "4. Run the test locally with npx playwright test --debug to see detailed steps" >> $GITHUB_STEP_SUMMARY
  elif [ -f "${OUTPUT_DIR}/error-log.txt" ]; then
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## ⚠️ Test Errors" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat "${OUTPUT_DIR}/error-log.txt" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  fi
  
  echo "## Environment" >> $GITHUB_STEP_SUMMARY
  echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
  echo "- **Region:** ${REGION}" >> $GITHUB_STEP_SUMMARY
  echo "- **Run ID:** [#${GITHUB_RUN_ID}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})" >> $GITHUB_STEP_SUMMARY
  
  # This will make the workflow fail
  echo "Test failed due to incomplete metrics" >> "${OUTPUT_DIR}/error.txt"
  exit 1
fi

# Generate performance report for successful tests
if [ -n "$METRICS" ]; then
  echo "Creating performance report in GitHub Summary..."

  echo "# 📊 Performance Test Results" >> $GITHUB_STEP_SUMMARY
  echo "| Test | Duration | Status |" >> $GITHUB_STEP_SUMMARY
  echo "| ---- | -------- | ------ |" >> $GITHUB_STEP_SUMMARY

  echo "$METRICS" | while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
      continue
    fi
    
    # Remove any leading 'n' character (from newlines)
    line=$(echo "$line" | sed 's/^n//')
    
    if [[ "$line" =~ ([A-Za-z\ ]+)\ took\ ([0-9]+)ms ]]; then
      TEST_NAME="${BASH_REMATCH[1]}"
      DURATION="${BASH_REMATCH[2]}"

      if [[ "$line" =~ \[AUTH_ERROR\] ]]; then
        STATUS="⛔️ Auth Error"
      elif [ "$DURATION" -lt 1000 ]; then
        STATUS="✅ Excellent"
      elif [ "$DURATION" -lt 5000 ]; then
        STATUS="✅ Good"
      elif [ "$DURATION" -lt 10000 ]; then
        STATUS="⚠️ Acceptable"
      else
        STATUS="🔴 Slow"
      fi

      echo "| $TEST_NAME | ${DURATION}ms | $STATUS |" >> $GITHUB_STEP_SUMMARY
    fi
  done

  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## Environment" >> $GITHUB_STEP_SUMMARY
  echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
  echo "- **Region:** ${REGION}" >> $GITHUB_STEP_SUMMARY
  echo "- **Run ID:** [#${GITHUB_RUN_ID}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})" >> $GITHUB_STEP_SUMMARY

  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## Performance Chart" >> $GITHUB_STEP_SUMMARY
  echo '```mermaid' >> $GITHUB_STEP_SUMMARY
  echo 'gantt' >> $GITHUB_STEP_SUMMARY
  echo '    title Test Duration (lower is better)' >> $GITHUB_STEP_SUMMARY
  echo '    dateFormat  X' >> $GITHUB_STEP_SUMMARY
  echo '    axisFormat %s' >> $GITHUB_STEP_SUMMARY

  echo "$METRICS" | while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
      continue
    fi
    
    # Remove any leading 'n' character (from newlines)
    line=$(echo "$line" | sed 's/^n//')
    
    if [[ "$line" =~ ([A-Za-z\ ]+)\ took\ ([0-9]+)ms ]]; then
      TEST_NAME="${BASH_REMATCH[1]}"
      DURATION="${BASH_REMATCH[2]}"

      DURATION_SEC=$(awk "BEGIN {printf \"%.1f\", $DURATION/1000}")
      
      if [[ "$line" =~ \[AUTH_ERROR\] ]]; then
        echo "    ${TEST_NAME} (Auth Error) :crit, 0, 0.1s" >> $GITHUB_STEP_SUMMARY
      else
        echo "    ${TEST_NAME} :0, ${DURATION_SEC}s" >> $GITHUB_STEP_SUMMARY
      fi
    fi
  done

  echo '```' >> $GITHUB_STEP_SUMMARY
else
  echo "# ❌ Performance Test Results" >> $GITHUB_STEP_SUMMARY
  echo "No performance metrics were found in the Lambda response." >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## Debug Information" >> $GITHUB_STEP_SUMMARY
  echo "- Status Code: $(echo "$RESPONSE" | jq -r '.StatusCode // "Unknown"')" >> $GITHUB_STEP_SUMMARY
  echo "- Function Error: $(echo "$RESPONSE" | jq -r '.FunctionError // "None"')" >> $GITHUB_STEP_SUMMARY
  echo "- Response Body: First 200 chars of body" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  echo "${BODY:0:200}..." >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Check test result
if echo "$BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  echo "Tests completed successfully (found success:true in response body)"
  exit 0
elif echo "$RESPONSE" | jq -e '.StatusCode == 200' >/dev/null 2>&1; then
  echo "Tests completed with status 200 (found StatusCode:200 in response)"
  exit 0
else
  echo "Tests failed. Check output for details."
  exit 1
fi 