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

# Process console errors from response JSON
if echo "$BODY" | jq -e '.consoleErrors' >/dev/null 2>&1; then
  echo "Extracting console errors from response JSON..."
  echo "$BODY" | jq -c '.consoleErrors' > "${OUTPUT_DIR}/extracted-console-errors.json"
  echo "$BODY" | jq -c '.consoleErrors' > "${WORKSPACE_OUTPUT}/extracted-console-errors.json"
  echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${OUTPUT_DIR}/extracted-console-errors.txt"
  echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${WORKSPACE_OUTPUT}/extracted-console-errors.txt"
  echo "Console errors extracted and saved to files"
else
  echo "No direct console errors found in JSON. Checking if body needs parsing..."
  
  # Check if body is a string containing JSON (from Lambda response)
  # This is the case when the Lambda returns JSON inside a string in the body field
  if echo "$BODY" | grep -q '^{"success":'; then
    echo "Body appears to be a JSON string with a nested structure."
    
    # Try to extract consoleErrors from the nested JSON
    if echo "$BODY" | jq -e '.consoleErrors' >/dev/null 2>&1; then
      echo "Found console errors in the JSON body!"
      echo "$BODY" | jq -c '.consoleErrors' > "${OUTPUT_DIR}/extracted-console-errors.json"
      echo "$BODY" | jq -c '.consoleErrors' > "${WORKSPACE_OUTPUT}/extracted-console-errors.json"
      echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${OUTPUT_DIR}/extracted-console-errors.txt"
      echo "$BODY" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' > "${WORKSPACE_OUTPUT}/extracted-console-errors.txt"
      echo "Console errors extracted and saved to files"
    fi
  fi
fi

# Copy console error files if they exist
for file in /tmp/console-errors.txt /tmp/console-errors.json; do
  if [ -f "$file" ]; then
    echo "Copying $(basename $file) from /tmp to output directories..."
    cp "$file" "${OUTPUT_DIR}/"
    cp "$file" "${WORKSPACE_OUTPUT}/"
  fi
done

# Parse body if it's a JSON string
if [[ "$BODY" == \"* ]] && [[ "$BODY" == *\" ]]; then
  echo "Body appears to be a JSON string, attempting to parse..."
  PARSED_BODY=$(echo "$BODY" | sed 's/^"//; s/"$//; s/\\"/"/g; s/\\n/\n/g; s/\\\\/\\/g')
  echo "$PARSED_BODY" > "${OUTPUT_DIR}/parsed-body.txt"
  echo "$PARSED_BODY" > "${WORKSPACE_OUTPUT}/parsed-body.txt"
  BODY="$PARSED_BODY"
fi

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
  
  # Special case for Lambda responses where the body contains escaped JSON
  if [[ "$BODY" == *"\"consoleErrors\":"* ]]; then
    echo "Found console errors in body text. Attempting to extract..."
    
    # Extract all console errors with a simple regex to create a pseudo-JSON array
    ERRORS_TEXT=$(echo "$BODY" | grep -o '"consoleErrors":\[[^]]*\]' | sed 's/"consoleErrors"://g')
    if [ -n "$ERRORS_TEXT" ]; then
      echo "Successfully extracted console errors JSON array"
      echo "$ERRORS_TEXT" > "${OUTPUT_DIR}/extracted-console-errors.json"
      echo "$ERRORS_TEXT" > "${WORKSPACE_OUTPUT}/extracted-console-errors.json"
      
      # Write a formatted version for human reading (this is simplified)
      echo "$BODY" | grep -o '"type":"[^"]*","time":"[^"]*","text":"[^"]*"' | \
        sed 's/"type":"\([^"]*\)","time":"\([^"]*\)","text":"\([^"]*\)"/[\1] [\2] \3/g' > "${OUTPUT_DIR}/console-errors-formatted.txt"
      cp "${OUTPUT_DIR}/console-errors-formatted.txt" "${WORKSPACE_OUTPUT}/"
      echo "Formatted console errors extracted and saved"
    fi
  fi
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
  
  # Process console errors
  HAS_CONSOLE_ERRORS=false
  
  if [ -f "${OUTPUT_DIR}/console-errors.txt" ]; then
    HAS_CONSOLE_ERRORS=true
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## 🔴 Browser Console Errors" >> $GITHUB_STEP_SUMMARY
    echo "Browser console errors were detected during test execution:" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat "${OUTPUT_DIR}/console-errors.txt" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  elif [ -f "${OUTPUT_DIR}/console-errors-formatted.txt" ]; then
    HAS_CONSOLE_ERRORS=true
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## 🔴 Browser Console Errors (formatted)" >> $GITHUB_STEP_SUMMARY
    echo "Browser console errors were detected during test execution:" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat "${OUTPUT_DIR}/console-errors-formatted.txt" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  elif [ -f "${OUTPUT_DIR}/console-errors.json" ]; then
    HAS_CONSOLE_ERRORS=true
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## 🔴 Browser Console Errors (from JSON)" >> $GITHUB_STEP_SUMMARY
    echo "Browser console errors were detected during test execution:" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat "${OUTPUT_DIR}/console-errors.json" | jq -r '.[] | "[\(.type)] [\(.time)] \(.text)"' >> $GITHUB_STEP_SUMMARY || cat "${OUTPUT_DIR}/console-errors.json" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  elif [ -f "${OUTPUT_DIR}/all-console-errors.json" ]; then
    HAS_CONSOLE_ERRORS=true
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "## 🔴 Browser Console Errors (comprehensive)" >> $GITHUB_STEP_SUMMARY
    echo "Browser console errors were detected during test execution:" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat "${OUTPUT_DIR}/all-console-errors.json" | jq -r '.combined[] | "[\(.type)] [\(.time)] \(.text)"' >> $GITHUB_STEP_SUMMARY || cat "${OUTPUT_DIR}/all-console-errors.json" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  elif echo "$BODY" | jq -e '.consoleErrors' >/dev/null 2>&1; then
    CONSOLE_ERRORS_COUNT=$(echo "$BODY" | jq -r '.consoleErrors | length')
    if [ "$CONSOLE_ERRORS_COUNT" -gt 0 ]; then
      HAS_CONSOLE_ERRORS=true
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "## 🔴 Browser Console Errors (from response)" >> $GITHUB_STEP_SUMMARY
      echo "Browser console errors were detected during test execution:" >> $GITHUB_STEP_SUMMARY
      echo '```' >> $GITHUB_STEP_SUMMARY
      echo "$BODY" | jq -r '.consoleErrors | map("[\(.type)] [\(.time)] \(.text)") | .[0:20] | .[]' >> $GITHUB_STEP_SUMMARY
      if [ "$CONSOLE_ERRORS_COUNT" -gt 20 ]; then
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "... and $((CONSOLE_ERRORS_COUNT - 20)) more console errors" >> $GITHUB_STEP_SUMMARY
      fi
      echo '```' >> $GITHUB_STEP_SUMMARY
      
      echo "$BODY" | jq -r '.consoleErrors | map("[\(.type)] [\(.time)] \(.text)") | .[]' > "${OUTPUT_DIR}/console-errors-from-response.txt"
      echo "$BODY" | jq -r '.consoleErrors | map("[\(.type)] [\(.time)] \(.text)") | .[]' > "${WORKSPACE_OUTPUT}/console-errors-from-response.txt"
    fi
  fi
  
  if [ "$HAS_CONSOLE_ERRORS" = "true" ]; then
    echo "Console errors were found and added to the report"
  else
    echo "No console errors were found in any source"
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

# ALWAYS check for ANY console errors from ANY available source and display them
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🧪 Console Errors Check" >> $GITHUB_STEP_SUMMARY

# Check for console errors in various possible files and sources
FOUND_ERRORS=false

# Direct extraction from BODY for Lambda response structure
if [[ "$BODY" == *"\"consoleErrors\":"* ]]; then
  FOUND_ERRORS=true
  echo "Console errors found directly in response body:" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  
  # Extract console errors with grep and format them
  echo "$BODY" | grep -o '"type":"[^"]*","time":"[^"]*","text":"[^"]*"' | \
    sed 's/"type":"\([^"]*\)","time":"\([^"]*\)","text":"\([^"]*\)"/[\1] [\2] \3/g' >> $GITHUB_STEP_SUMMARY
  
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Check extracted-console-errors.txt
if [ -f "${OUTPUT_DIR}/extracted-console-errors.txt" ]; then
  FOUND_ERRORS=true
  echo "Console errors found in extracted-console-errors.txt:" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  cat "${OUTPUT_DIR}/extracted-console-errors.txt" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Check console-errors-formatted.txt
if [ -f "${OUTPUT_DIR}/console-errors-formatted.txt" ]; then
  FOUND_ERRORS=true
  echo "Console errors found in console-errors-formatted.txt:" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  cat "${OUTPUT_DIR}/console-errors-formatted.txt" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Check console-errors.txt
if [ -f "${OUTPUT_DIR}/console-errors.txt" ]; then
  FOUND_ERRORS=true
  echo "Console errors found in console-errors.txt:" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  cat "${OUTPUT_DIR}/console-errors.txt" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Check console-errors-from-response.txt
if [ -f "${OUTPUT_DIR}/console-errors-from-response.txt" ]; then
  FOUND_ERRORS=true
  echo "Console errors found in console-errors-from-response.txt:" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  cat "${OUTPUT_DIR}/console-errors-from-response.txt" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi

# Last resort - try to extract errors from Lambda body even if JSON parsing failed
if [ "$FOUND_ERRORS" = "false" ]; then
  # Save the raw body to a file for inspection
  echo "$BODY" > "${OUTPUT_DIR}/raw-body-debug.txt"
  
  # Use grep to find console errors if they're in the raw body
  if grep -q '"consoleErrors"' "${OUTPUT_DIR}/raw-body-debug.txt"; then
    FOUND_ERRORS=true
    echo "Console errors found in raw body (extracted manually):" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    
    # Try to extract and format console errors from the raw body
    grep -o '"type":"[^"]*","time":"[^"]*","text":"[^"]*"' "${OUTPUT_DIR}/raw-body-debug.txt" | \
      sed 's/"type":"\([^"]*\)","time":"\([^"]*\)","text":"\([^"]*\)"/[\1] [\2] \3/g' >> $GITHUB_STEP_SUMMARY
    
    echo '```' >> $GITHUB_STEP_SUMMARY
  fi
fi

if [ "$FOUND_ERRORS" = "false" ]; then
  echo "✅ No console errors were found in any of the available sources." >> $GITHUB_STEP_SUMMARY
  echo "Debug info: Saving raw body for inspection..." >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  echo "${BODY:0:500}..." >> $GITHUB_STEP_SUMMARY
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