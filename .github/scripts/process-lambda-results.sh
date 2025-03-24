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

# Map AWS regions to human-readable locations and countries
get_region_info() {
  local region="$1"
  case "$region" in
    "us-east-1")
      echo "N. Virginia (US East) - United States"
      ;;
    "us-east-2")
      echo "Ohio (US East) - United States"
      ;;
    "us-west-1")
      echo "N. California (US West) - United States"
      ;;
    "us-west-2")
      echo "Oregon (US West) - United States"
      ;;
    "ca-central-1")
      echo "Central - Canada"
      ;;
    "eu-west-1")
      echo "Ireland (EU West) - Ireland"
      ;;
    "eu-west-2")
      echo "London (EU West) - United Kingdom"
      ;;
    "eu-west-3")
      echo "Paris (EU West) - France"
      ;;
    "eu-central-1")
      echo "Frankfurt (EU Central) - Germany"
      ;;
    "eu-north-1")
      echo "Stockholm (EU North) - Sweden"
      ;;
    "ap-northeast-1")
      echo "Tokyo (Asia Pacific Northeast) - Japan"
      ;;
    "ap-northeast-2")
      echo "Seoul (Asia Pacific Northeast) - South Korea"
      ;;
    "ap-southeast-1")
      echo "Singapore (Asia Pacific Southeast) - Singapore"
      ;;
    "ap-southeast-2")
      echo "Sydney (Asia Pacific Southeast) - Australia"
      ;;
    "ap-south-1")
      echo "Mumbai (Asia Pacific South) - India"
      ;;
    "sa-east-1")
      echo "São Paulo (South America East) - Brazil"
      ;;
    *)
      echo "$region - Unknown region"
      ;;
  esac
}

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

# Extract console messages (both errors and warnings) from any response format
extract_console_messages() {
  local body="$1"
  local output_dir="$2"
  local summary_file="$3"
  local message_type="$4" # "error" or "warning"
  local emoji="$5"        # 🛑 or ⚠️

  echo "🔍 Extracting console $message_type messages with direct text processing"

  # Create a section for console messages in a temporary file to be moved later
  local temp_file="${output_dir}/temp_${message_type}_report.md"
  echo "" > "$temp_file"
  echo "## $emoji Console ${message_type^}s" > "$temp_file"
  echo "The following ${message_type}s were found in the test:" >> "$temp_file"
  echo '<details><summary>Click to expand (scrollable)</summary>' >> "$temp_file"
  echo "" >> "$temp_file"
  echo '```' >> "$temp_file"

  # First attempt: extract all messages with their type, time and text
  local FORMATTED_MESSAGES=""
  if echo "$body" | jq -e '.consoleErrors' >/dev/null 2>&1; then
    FORMATTED_MESSAGES=$(echo "$body" | jq -r --arg type "$message_type" '.consoleErrors[] | select(.type==$type) | "[\(.type)] [\(.time)] \(.text)"' 2>/dev/null || echo "")
  fi

  # Second attempt: grep using multiple patterns to catch various JSON formats
  if [ -z "$FORMATTED_MESSAGES" ]; then
    # Find blocks that mention the message type we're looking for
    local TYPE_BLOCKS=$(grep -A 5 "\"type\":.*\"$message_type\"" "${output_dir}/full_response.txt" || \
                       grep -A 5 "\"type\": *\"$message_type\"" "${output_dir}/full_response.txt" || echo "")

    if [ -n "$TYPE_BLOCKS" ]; then
      # Extract text fields from those blocks
      local MESSAGE_TEXTS=$(echo "$TYPE_BLOCKS" | grep -o '"text":[^,}]*' | sed 's/"text"://; s/"//g; s/^[ \t]*//')

      # Extract time fields if available
      local TIME_STAMPS=$(echo "$TYPE_BLOCKS" | grep -o '"time":[^,}]*' | sed 's/"time"://; s/"//g; s/^[ \t]*//')

      # Combine if both available, otherwise just use texts
      if [ -n "$TIME_STAMPS" ] && [ -n "$MESSAGE_TEXTS" ]; then
        # Combine timestamps and messages (limited approach)
        FORMATTED_MESSAGES=$(paste -d " " <(echo "$TIME_STAMPS") <(echo "$MESSAGE_TEXTS") | sed "s/^/[$message_type] /")
      elif [ -n "$MESSAGE_TEXTS" ]; then
        FORMATTED_MESSAGES=$(echo "$MESSAGE_TEXTS" | sed "s/^/[$message_type] /")
      fi
    fi
  fi

  # Third attempt: simple grep for text fields in the entire response
  if [ -z "$FORMATTED_MESSAGES" ]; then
    # Find all text fields that might be errors or warnings
    local ALL_TEXTS=$(grep -o '"text": "[^"]*"' "${output_dir}/full_response.txt" || \
                     grep -o '"text":"[^"]*"' "${output_dir}/full_response.txt" || \
                     grep -o '"text":"[^,}]*' "${output_dir}/full_response.txt" || \
                     grep -o '"text": "[^,}]*' "${output_dir}/full_response.txt" || echo "")

    if [ -n "$ALL_TEXTS" ]; then
      # Clean up the format
      FORMATTED_MESSAGES=$(echo "$ALL_TEXTS" | sed 's/"text": "//g; s/"text":"//g; s/"$//g' | sed "s/^/[$message_type] /")
    fi
  fi

  # Output messages if found
  if [ -n "$FORMATTED_MESSAGES" ]; then
    echo "$FORMATTED_MESSAGES" >> "$temp_file"
    echo "Extracted console $message_type messages directly"
  else
    echo "No $message_type messages could be extracted." >> "$temp_file"
  fi

  echo '```' >> "$temp_file"
  echo '</details>' >> "$temp_file"

  # Add a debug section with raw data
  echo "" >> "$temp_file"
  echo "### 🔍 Raw $message_type Response Sample" >> "$temp_file"
  echo "For debugging purposes, here's a sample of the raw response:" >> "$temp_file"
  echo '<details><summary>Click to expand</summary>' >> "$temp_file"
  echo "" >> "$temp_file"
  echo '```json' >> "$temp_file"
  grep -A 15 -B 2 "\"type\":.*\"$message_type\"" "${output_dir}/full_response.txt" | head -n 30 >> "$temp_file"
  echo '```' >> "$temp_file"
  echo '</details>' >> "$temp_file"

  # Return the path to the temporary file for later incorporation into the report
  echo "$temp_file"
}

# Process metrics from various sources
process_metrics() {
  local body="$1"
  local output_dir="$2"
  local workspace_output="$3"

  local metrics=""

  # Try to parse metrics from JSON body
  echo "Method 1: Trying to parse body as JSON..."
  if echo "$body" | jq -e . >/dev/null 2>&1; then
    echo "Body is valid JSON"

    # Check for metrics array
    if echo "$body" | jq -e '.metrics' >/dev/null 2>&1; then
      echo "Found metrics array in body JSON"
      local metrics_json=$(echo "$body" | jq -c '.metrics')
      echo "$metrics_json" > "${output_dir}/metrics-json.json"
      echo "$metrics_json" > "${workspace_output}/metrics-json.json"

      echo "Formatting metrics from JSON array..."
      echo "" > "${output_dir}/performance-metrics.txt"
      echo "" > "${workspace_output}/performance-metrics.txt"
      echo "$metrics_json" | jq -c '.[]' | while read -r metric; do
        local name=$(echo "$metric" | jq -r '.name')
        local duration=$(echo "$metric" | jq -r '.duration')
        local faked=$(echo "$metric" | jq -r '.faked // false')

        if [ "$faked" == "true" ]; then
          local metric_line="${name} took ${duration}ms [AUTH_ERROR]"
        else
          local metric_line="${name} took ${duration}ms"
        fi

        echo "$metric_line" >> "${output_dir}/performance-metrics.txt"
        echo "$metric_line" >> "${workspace_output}/performance-metrics.txt"
      done

      metrics=$(cat "${output_dir}/performance-metrics.txt")
      echo "Metrics from JSON array: $metrics"
    elif echo "$body" | jq -e '.performanceMetrics' >/dev/null 2>&1; then
      echo "Found performanceMetrics string in body JSON"
      metrics=$(echo "$body" | jq -r '.performanceMetrics')
      echo "$metrics" > "${output_dir}/performance-metrics.txt"
      echo "$metrics" > "${workspace_output}/performance-metrics.txt"
      echo "Metrics from performanceMetrics: $metrics"
    else
      echo "No metrics fields found in JSON body"
    fi
  else
    echo "Body is not valid JSON, trying other methods..."
  fi

  # Alternative methods to extract metrics
  if [ -z "$metrics" ]; then
    echo "Method 2: Using direct grep for metrics strings..."
    # Normalize the body by removing carriage returns, replacing newlines with spaces
    local cleaned_body=$(echo "$body" | tr -d '\r' | tr '\n' ' ')

    # Extract metrics with grep
    local grep_metrics=$(echo "$cleaned_body" | grep -o '[A-Za-z ]\+ took [0-9]\+ms' || echo "")

    # Clean up any 'n' prefixes from metrics (due to newlines in the source)
    grep_metrics=$(echo "$grep_metrics" | sed 's/^n//g')

    if [ -n "$grep_metrics" ]; then
      echo "Found metrics with grep: $grep_metrics"
      # Format metrics to be one per line
      local formatted_metrics=$(echo "$grep_metrics" | sed 's/\([A-Za-z ]\+ took [0-9]\+ms\) /\1\n/g')
      echo "$formatted_metrics" > "${output_dir}/performance-metrics.txt"
      echo "$formatted_metrics" > "${workspace_output}/performance-metrics.txt"
      metrics="$formatted_metrics"
    else
      echo "No metrics found with grep"
    fi
  fi

  if [ -z "$metrics" ]; then
    echo "Method 3: Extracting from escaped JSON string..."
    # Normalize the body
    local cleaned_body=$(echo "$body" | tr -d '\r' | tr '\n' ' ')

    # Extract metrics from performance metrics string
    local escaped_metrics=$(echo "$cleaned_body" | grep -o '"performanceMetrics":"[^"]*"' | sed 's/"performanceMetrics":"//g' | sed 's/"$//g' | sed 's/\\n/\n/g')

    # Clean up any 'n' prefixes
    escaped_metrics=$(echo "$escaped_metrics" | sed 's/^n//g')

    # Format metrics to be one per line
    escaped_metrics=$(echo "$escaped_metrics" | sed 's/\([A-Za-z ]\+ took [0-9]\+ms\) /\1\n/g')

    if [ -n "$escaped_metrics" ]; then
      echo "Found metrics in escaped string: $escaped_metrics"
      echo "$escaped_metrics" > "${output_dir}/performance-metrics.txt"
      echo "$escaped_metrics" > "${workspace_output}/performance-metrics.txt"
      metrics="$escaped_metrics"
    else
      echo "No metrics found in escaped strings"
    fi
  fi

  echo "$metrics"
}

# Extract metrics from response
echo "Extracting performance metrics from Lambda response..."
METRICS=$(process_metrics "$BODY" "$OUTPUT_DIR" "$WORKSPACE_OUTPUT")

# Count how many metrics we found
METRICS_COUNT=$(echo "$METRICS" | grep -c "took" || echo "0")
echo "Found $METRICS_COUNT metrics"

# Extract console errors and warnings
echo "Extracting console errors and warnings..."
ERROR_REPORT_FILE=$(extract_console_messages "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY" "error" "🛑")
WARNING_REPORT_FILE=$(extract_console_messages "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY" "warning" "⚠️")

# Check for test errors
HAS_TEST_ERROR=false
if echo "$BODY" | jq -e '.success == false' >/dev/null 2>&1; then
  HAS_TEST_ERROR=true
  TEST_ERROR=$(echo "$BODY" | jq -r '.errorOutput // "Unknown error"')
  echo "Test error detected: $TEST_ERROR"
  echo "$TEST_ERROR" > "${OUTPUT_DIR}/error-log.txt"
fi

# Generate report for GitHub Step Summary
generate_report() {
  local metrics="$1"
  local metrics_count="$2"
  local body="$3"
  local output_dir="$4"
  local summary_file="$5"
  local environment="$6"
  local region="$7"
  local run_id="$8"
  local repository="$9"
  local error_report="${10}"
  local warning_report="${11}"
  local has_error="${12}"

  # Determine test status
  local status_emoji="✅"
  local status_text="PASSED"
  local auth_error_detected=false

  if [ "$has_error" = "true" ] || [ "$metrics_count" -lt 3 ]; then
    status_emoji="❌"
    status_text="FAILED"
  fi

  # Check for auth error
  if echo "$body" | jq -e '.authError' >/dev/null 2>&1; then
    auth_error_detected=true
  fi

  # Append error and warning reports if they exist
  if [ -f "$error_report" ]; then
    cat "$error_report" >> "$summary_file"
  fi

  if [ -f "$warning_report" ]; then
    cat "$warning_report" >> "$summary_file"
  fi

  # Add auth error information if detected
  if [ "$auth_error_detected" = "true" ]; then
    AUTH_ERROR_TYPE=$(echo "$body" | jq -r '.authError.type')
    AUTH_ERROR_MSG=$(echo "$body" | jq -r '.authError.message')
    AUTH_ERROR_TIME=$(echo "$body" | jq -r '.authError.timestamp')

    echo "" >> "$summary_file"
    echo "## ⚠️ Authentication Error Detected" >> "$summary_file"
    echo "Authentication failed during test execution. This affected the test results." >> "$summary_file"
    echo "" >> "$summary_file"
    echo "### Error Details" >> "$summary_file"
    echo "- **Type:** ${AUTH_ERROR_TYPE}" >> "$summary_file"
    echo "- **Message:** ${AUTH_ERROR_MSG}" >> "$summary_file"
    echo "- **Time:** ${AUTH_ERROR_TIME}" >> "$summary_file"
  fi

  # Add region information
  local region_info=$(get_region_info "$region")
  
  echo "" >> "$summary_file"
  echo "## Environment" >> "$summary_file"
  echo "- **Environment:** ${environment}" >> "$summary_file"
  echo "- **Region:** ${region} (${region_info})" >> "$summary_file"
  echo "- **Run ID:** [#${run_id}](https://github.com/${repository}/actions/runs/${run_id})" >> "$summary_file"
  echo "- **Execution Time:** $(echo "$body" | jq -r '.executionTime // "Unknown"')" >> "$summary_file"
}

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

    if echo "$BODY" | jq -e '.authError.consoleErrors' >/dev/null 2>&1; then
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "### Browser Console Errors" >> $GITHUB_STEP_SUMMARY
      echo "The following errors were detected in the browser console during authentication:" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "```" >> $GITHUB_STEP_SUMMARY
      echo "$BODY" | jq -r '.authError.consoleErrors[] | "[\(.type)] \(.text)"' >> $GITHUB_STEP_SUMMARY
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

  # Debug: print the full Lambda response to help troubleshoot
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## Debug: Lambda Response" >> $GITHUB_STEP_SUMMARY
  echo "<details><summary>Click to view full Lambda response</summary>" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo '```json' >> $GITHUB_STEP_SUMMARY
  echo "$BODY" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  echo "</details>" >> $GITHUB_STEP_SUMMARY

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

# Generate the final report
generate_report "$METRICS" "$METRICS_COUNT" "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY" "$ENVIRONMENT" "$REGION" "$GITHUB_RUN_ID" "$GITHUB_REPOSITORY" "$ERROR_REPORT_FILE" "$WARNING_REPORT_FILE" "$HAS_TEST_ERROR"

# Clean up temporary files
rm -f "$ERROR_REPORT_FILE" "$WARNING_REPORT_FILE"

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
