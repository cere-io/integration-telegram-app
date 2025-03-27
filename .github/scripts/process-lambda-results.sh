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

# Extract console messages for display in the GitHub summary
extract_console_messages() {
  local body="$1"
  local output_file="$2"
  
  echo "Extracting console error messages..."
  
  # Create collapsible section for console errors
  echo "" >> "$output_file"
  echo "## 🛑 Console Errors" >> "$output_file"
  echo "The following errors were found in the test:" >> "$output_file"
  echo '<details><summary>Click to expand (scrollable)</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```' >> "$output_file"
  
  # Try to extract console errors directly using jq
  if echo "$body" | jq -e '.consoleErrors' >/dev/null 2>&1; then
    echo "$body" | jq -r '.consoleErrors[] | "[\(.type)] [\(.time)] \(.text)"' >> "$output_file"
  else
    # Fallback to grep if jq fails
    grep -o '"text": "[^"]*"' "${OUTPUT_DIR}/full_response.txt" | sed 's/"text": "//g; s/"$//g' >> "$output_file"
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
  
  # First attempt: Try to extract metrics from the metrics array
  if echo "$body" | grep -q '"metrics":'; then
    echo "Found metrics array in response"
    
    # Save metrics JSON for debugging
    echo "$body" | grep -o '"metrics":[^]]*]' > "${output_dir}/metrics-raw.json"
    
    # Extract metrics from JSON array
    echo "$body" | grep -o '"metrics":[^]]*]' | sed 's/"metrics"://g' > "${output_dir}/metrics.json"
    
    # Process each metric in the array
    local metrics_text=""
    if jq -e . "${output_dir}/metrics.json" >/dev/null 2>&1; then
      echo "Successfully parsed metrics JSON"
      jq -c '.[]' "${output_dir}/metrics.json" | while read -r metric; do
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
  fi
  
  # Second attempt: Try to extract from performanceMetrics field
  if [ -z "$metrics" ] && echo "$body" | grep -q '"performanceMetrics":'; then
    echo "Found performanceMetrics field in response"
    
    # Extract performanceMetrics string
    metrics=$(echo "$body" | grep -o '"performanceMetrics":"[^"]*"' | sed 's/"performanceMetrics":"//g; s/"$//g')
    echo "$metrics" > "${output_dir}/performance-metrics.txt"
    echo "$metrics" > "${workspace_output}/performance-metrics.txt"
  fi
  
  # Third attempt: Use grep to find metrics directly
  if [ -z "$metrics" ]; then
    echo "Attempting direct extraction of metrics..."
    
    # Normalize body and extract metrics patterns
    local cleaned_body=$(echo "$body" | tr -d '\r' | tr '\n' ' ')
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

# Process auth error if present
if echo "$BODY" | jq -e '.authError' >/dev/null 2>&1 && echo "$BODY" | jq -e '.authError != null' >/dev/null 2>&1; then
  AUTH_ERROR_TYPE=$(echo "$BODY" | jq -r '.authError.type')
  AUTH_ERROR_MSG=$(echo "$BODY" | jq -r '.authError.message')
  AUTH_ERROR_TIME=$(echo "$BODY" | jq -r '.authError.timestamp')
  
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## ⚠️ Authentication Error Detected" >> $GITHUB_STEP_SUMMARY
  echo "Authentication failed during test execution." >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "### Error Details" >> $GITHUB_STEP_SUMMARY
  echo "- **Type:** ${AUTH_ERROR_TYPE}" >> $GITHUB_STEP_SUMMARY
  echo "- **Message:** ${AUTH_ERROR_MSG}" >> $GITHUB_STEP_SUMMARY
  echo "- **Time:** ${AUTH_ERROR_TIME}" >> $GITHUB_STEP_SUMMARY
fi

# Extract console errors after the performance metrics
extract_console_messages "$BODY" "$GITHUB_STEP_SUMMARY"

# Add environment information
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Environment" >> $GITHUB_STEP_SUMMARY
echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
echo "- **Region:** ${REGION}" >> $GITHUB_STEP_SUMMARY
echo "- **Run ID:** [#${GITHUB_RUN_ID}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})" >> $GITHUB_STEP_SUMMARY
echo "- **Execution Time:** $(echo "$BODY" | jq -r '.executionTime // "Unknown"')" >> $GITHUB_STEP_SUMMARY

# Add debug info for troubleshooting
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Debug Information" >> $GITHUB_STEP_SUMMARY
echo "<details><summary>Click to view response details</summary>" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "- **Status Code:** $(echo "$RESPONSE" | jq -r '.StatusCode // "Unknown"')" >> $GITHUB_STEP_SUMMARY
echo "- **Success:** $(echo "$BODY" | jq -r '.success // "Unknown"')" >> $GITHUB_STEP_SUMMARY
echo "- **Error Output:** $(echo "$BODY" | jq -r '.errorOutput // "None"')" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "**Raw Response Sample:**" >> $GITHUB_STEP_SUMMARY
echo '```json' >> $GITHUB_STEP_SUMMARY
echo "$BODY" | head -n 30 >> $GITHUB_STEP_SUMMARY
echo '...' >> $GITHUB_STEP_SUMMARY
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
