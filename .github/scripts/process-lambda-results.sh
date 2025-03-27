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

# Save full response to a file for analysis
echo "$BODY" > "${OUTPUT_DIR}/full_response.txt"

# Clean JSON for better parsing - handle control characters
CLEANED_JSON=$(echo "$BODY" | tr -d '\000-\037')
echo "$CLEANED_JSON" > "${OUTPUT_DIR}/cleaned_response.json"

# Extract console messages for display in the GitHub summary using safer method
extract_console_messages() {
  local body="$1"
  local output_file="$2"
  
  echo "Extracting console error messages..."
  
  # Create collapsible section for console errors
  echo "" >> "$output_file"
  echo "## 🛑 Console Errors" >> "$output_file"
  echo "The following errors were found in the test:" >> "$output_file"
  echo '<details open><summary>Click to collapse (scrollable)</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```' >> "$output_file"
  
  # Write console errors to a temp file for reliable processing
  local error_temp_file="${OUTPUT_DIR}/console_errors_temp.txt"
  
  # Try multiple methods to extract console errors
  if grep -q '"consoleErrors":' "${OUTPUT_DIR}/cleaned_response.json"; then
    # Method 1: Using jq on cleaned JSON
    echo "Extracting console errors using jq..."
    cat "${OUTPUT_DIR}/cleaned_response.json" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' 2>/dev/null > "$error_temp_file"
    
    # Check if we got any output
    if [ ! -s "$error_temp_file" ]; then
      echo "jq extraction failed, trying grep method..."
      # Method 2: Extract with grep
      grep -o '"type":"[^"]*","time":"[^"]*","text":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | \
      sed 's/"type":"\([^"]*\)","time":"\([^"]*\)","text":"\([^"]*\)"/[\1] [\2] \3/g' > "$error_temp_file"
    fi
  else
    echo "No consoleErrors field found, trying direct pattern matching..."
    # Method 3: Basic pattern matching
    grep -o '"text":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | \
    sed 's/"text":"//g; s/"$//g' > "$error_temp_file"
  fi
  
  # If we still don't have errors, try a more aggressive approach
  if [ ! -s "$error_temp_file" ]; then
    echo "All extraction methods failed, trying raw extraction..."
    # Method 4: Raw extraction of error-like text
    grep -o 'TypeError:[^"]*' "${OUTPUT_DIR}/full_response.txt" > "$error_temp_file"
  fi
  
  # Output the errors
  if [ -s "$error_temp_file" ]; then
    cat "$error_temp_file" >> "$output_file"
  else
    echo "No console errors could be extracted using automatic methods." >> "$output_file"
    echo "See Raw Response in Debug Information section for full details." >> "$output_file"
  fi
  
  echo '```' >> "$output_file"
  echo '</details>' >> "$output_file"
}

# Process metrics from Lambda response
process_metrics() {
  local body="$1"
  local output_dir="$2"
  local workspace_output="$3"
  
  local metrics=""
  
  echo "Processing metrics from Lambda response..."
  
  # First attempt: Try to extract metrics array directly from cleaned JSON
  if jq -e '.metrics' "${output_dir}/cleaned_response.json" >/dev/null 2>&1; then
    echo "Found metrics array in response"
    
    # Extract and format metrics
    local metrics_text=""
    jq -c '.metrics[]' "${output_dir}/cleaned_response.json" 2>/dev/null | while read -r metric; do
      local name=$(echo "$metric" | jq -r '.name')
      local duration=$(echo "$metric" | jq -r '.duration')
      local faked=$(echo "$metric" | jq -r '.faked // false')
      
      if [ "$faked" == "true" ]; then
        metrics_text="${metrics_text}${name} took ${duration}ms [AUTH_ERROR]\n"
      else
        metrics_text="${metrics_text}${name} took ${duration}ms\n"
      fi
    done
    
    # Save formatted metrics
    echo -e "$metrics_text" > "${output_dir}/performance-metrics.txt"
    echo -e "$metrics_text" > "${workspace_output}/performance-metrics.txt"
    metrics=$(cat "${output_dir}/performance-metrics.txt")
  fi
  
  # Second attempt: Try to extract from performanceMetrics field
  if [ -z "$metrics" ] && grep -q '"performanceMetrics":' "${output_dir}/cleaned_response.json"; then
    echo "Found performanceMetrics field in response"
    
    # Extract using grep for reliability
    local perf_metrics=$(grep -o '"performanceMetrics":"[^"]*"' "${output_dir}/cleaned_response.json" | 
                         sed 's/"performanceMetrics":"//g; s/"$//g')
    
    # Normalize line breaks in the metrics
    metrics=$(echo "$perf_metrics" | tr -d '\r' | tr '\\n' '\n')
    echo "$metrics" > "${output_dir}/performance-metrics.txt"
    echo "$metrics" > "${workspace_output}/performance-metrics.txt"
  fi
  
  # Third attempt: Use grep to find metrics directly from full response
  if [ -z "$metrics" ]; then
    echo "Attempting direct extraction of metrics..."
    
    # Normalize body and extract metrics patterns
    local cleaned_body=$(cat "${output_dir}/full_response.txt" | tr -d '\r' | tr '\n' ' ')
    local grep_metrics=$(echo "$cleaned_body" | grep -o '[A-Za-z ]\+ took [0-9]\+ms' || echo "")
    
    if [ -n "$grep_metrics" ]; then
      echo "Found metrics with direct pattern matching"
      metrics=$(echo "$grep_metrics" | sed 's/\([A-Za-z ]\+ took [0-9]\+ms\) /\1\n/g')
      echo "$metrics" > "${output_dir}/performance-metrics.txt"
      echo "$metrics" > "${workspace_output}/performance-metrics.txt"
    fi
  fi
  
  echo "$metrics"
}

# Extract metrics from response
echo "Extracting performance metrics..."
METRICS=$(process_metrics "$BODY" "$OUTPUT_DIR" "$WORKSPACE_OUTPUT")

# Count how many metrics we have
METRICS_COUNT=$(echo "$METRICS" | grep -c "took" || echo "0")
echo "Found $METRICS_COUNT metrics"

# Generate performance report
echo "# 📊 Performance Test Results" > $GITHUB_STEP_SUMMARY

if [ -z "$METRICS" ] || [ "$METRICS_COUNT" -lt 3 ]; then
  # Test is failing due to missing metrics
  echo "❌ Test is FAILED: Expected 3 metrics (Active Quests Screen, Leaderboard Screen, Library Screen)" >> $GITHUB_STEP_SUMMARY
  echo "Only found $METRICS_COUNT metrics:" >> $GITHUB_STEP_SUMMARY
  
  if [ -n "$METRICS" ]; then
    echo '```' >> $GITHUB_STEP_SUMMARY
    echo "$METRICS" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  else
    echo "No metrics found" >> $GITHUB_STEP_SUMMARY
  fi
else
  # Format successful test results
  echo "| Test | Duration | Status |" >> $GITHUB_STEP_SUMMARY
  echo "| ---- | -------- | ------ |" >> $GITHUB_STEP_SUMMARY
  
  echo "$METRICS" | while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
      continue
    fi
    
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
  
  # Add performance chart
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## Performance Chart" >> $GITHUB_STEP_SUMMARY
  echo '```mermaid' >> $GITHUB_STEP_SUMMARY
  echo 'gantt' >> $GITHUB_STEP_SUMMARY
  echo '    title Test Duration (lower is better)' >> $GITHUB_STEP_SUMMARY
  echo '    dateFormat  X' >> $GITHUB_STEP_SUMMARY
  echo '    axisFormat %s' >> $GITHUB_STEP_SUMMARY
  
  echo "$METRICS" | while IFS= read -r line; do
    if [ -z "$line" ]; then continue; fi
    
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
fi

# Extract console errors first - this places them right after the performance results
extract_console_messages "$BODY" "$GITHUB_STEP_SUMMARY"

# Process auth error if present
if jq -e '.authError != null' "${OUTPUT_DIR}/cleaned_response.json" >/dev/null 2>&1; then
  AUTH_ERROR_TYPE=$(jq -r '.authError.type' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null || echo "Unknown")
  AUTH_ERROR_MSG=$(jq -r '.authError.message' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null || echo "Unknown error")
  AUTH_ERROR_TIME=$(jq -r '.authError.timestamp' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null || echo "Unknown")
  
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## ⚠️ Authentication Error Detected" >> $GITHUB_STEP_SUMMARY
  echo "Authentication failed during test execution." >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "### Error Details" >> $GITHUB_STEP_SUMMARY
  echo "- **Type:** ${AUTH_ERROR_TYPE}" >> $GITHUB_STEP_SUMMARY
  echo "- **Message:** ${AUTH_ERROR_MSG}" >> $GITHUB_STEP_SUMMARY
  echo "- **Time:** ${AUTH_ERROR_TIME}" >> $GITHUB_STEP_SUMMARY
fi

# Add environment information
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Environment" >> $GITHUB_STEP_SUMMARY
echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
echo "- **Region:** ${REGION}" >> $GITHUB_STEP_SUMMARY
echo "- **Run ID:** [#${GITHUB_RUN_ID}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})" >> $GITHUB_STEP_SUMMARY

# Get execution time safely
EXEC_TIME=$(jq -r '.executionTime // "Unknown"' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null || echo "Unknown")
echo "- **Execution Time:** ${EXEC_TIME}" >> $GITHUB_STEP_SUMMARY

# Add detailed raw response with key issues highlighted
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Debug Information" >> $GITHUB_STEP_SUMMARY
echo "<details><summary>Click to view response details</summary>" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Extract basic info directly using grep for reliability
STATUS_CODE=$(echo "$RESPONSE" | grep -o '"StatusCode":[^,}]*' | sed 's/"StatusCode"://g; s/ //g')
SUCCESS=$(grep -o '"success":[^,}]*' "${OUTPUT_DIR}/full_response.txt" | head -1 | sed 's/"success"://g; s/ //g')
ERROR_OUTPUT=$(grep -o '"errorOutput":"[^"]*"' "${OUTPUT_DIR}/full_response.txt" | sed 's/"errorOutput":"//g; s/"$//g')

echo "- **Status Code:** ${STATUS_CODE:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Success:** ${SUCCESS:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Error Output:** ${ERROR_OUTPUT:-None}" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

echo "**Raw Response (first 100 lines):**" >> $GITHUB_STEP_SUMMARY
echo '```json' >> $GITHUB_STEP_SUMMARY
head -n 100 "${OUTPUT_DIR}/full_response.txt" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

echo "**Full console errors array:**" >> $GITHUB_STEP_SUMMARY
echo '```json' >> $GITHUB_STEP_SUMMARY
grep -A 1000 '"consoleErrors":' "${OUTPUT_DIR}/full_response.txt" | grep -B 1000 -m 1 '"region":' >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
echo "</details>" >> $GITHUB_STEP_SUMMARY

# Extra section to highlight detected errors
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🔍 Detected Issues" >> $GITHUB_STEP_SUMMARY
echo "<details><summary>Click to view detected issues</summary>" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Find TypeErrors and similar issues
echo "### TypeErrors and null references" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
grep -o "TypeError:[^\"]*" "${OUTPUT_DIR}/full_response.txt" | sort | uniq >> $GITHUB_STEP_SUMMARY
grep -o "Cannot read properties of[^\"]*" "${OUTPUT_DIR}/full_response.txt" | sort | uniq >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

echo "</details>" >> $GITHUB_STEP_SUMMARY

# Determine test status based on metrics and response
if [ "$METRICS_COUNT" -lt 3 ]; then
  echo "Test failed due to incomplete metrics" >> "${OUTPUT_DIR}/error.txt"
  exit 1
else
  echo "Tests completed with required metrics" 
  exit 0
fi
