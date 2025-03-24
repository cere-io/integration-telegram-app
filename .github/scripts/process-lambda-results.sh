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

# Generate the test results report
generate_report() {
  local metrics="$1"
  local metrics_count="$2"
  local body="$3"
  local output_dir="$4"
  local github_step_summary="$5"
  local environment="$6"
  local region="$7"
  local github_run_id="$8"
  local github_repository="$9"
  local error_report_file="${10}"
  local warning_report_file="${11}"
  local has_test_error="${12}"
  
  # Get human-readable region info
  local region_info=$(get_region_info "$region")
  
  # Start with a clear summary file
  > "$github_step_summary"
  
  # Handle case with missing or incomplete metrics (ALWAYS FIRST)
  if [ -z "$metrics" ] || [ "$metrics_count" -lt 3 ]; then
    echo "Metrics missing or incomplete, test is considered FAILED"
    echo "# ❌ Performance Test Results" >> $github_step_summary
    echo "Test is FAILED: Expected 3 metrics (Active Quests Screen, Leaderboard Screen, Library Screen)" >> $github_step_summary
    echo "Only found $metrics_count metrics:" >> $github_step_summary
    
    if [ -n "$metrics" ]; then
      echo '```' >> $github_step_summary
      echo "$metrics" >> $github_step_summary
      echo '```' >> $github_step_summary
    else
      echo "No metrics found" >> $github_step_summary
    fi
    
    # Add environment info (always present)
    echo "" >> $github_step_summary
    echo "## 🌐 Environment" >> $github_step_summary
    echo "- **Environment:** ${environment}" >> $github_step_summary
    echo "- **Region:** ${region} (${region_info})" >> $github_step_summary
    echo "- **Run ID:** [#${github_run_id}](https://github.com/${github_repository}/actions/runs/${github_run_id})" >> $github_step_summary
    
    # Append the error report if it exists
    if [ -f "$error_report_file" ]; then
      cat "$error_report_file" >> $github_step_summary
    fi
    
    # Append the warning report if it exists
    if [ -f "$warning_report_file" ]; then
      cat "$warning_report_file" >> $github_step_summary
    fi
    
    # Process auth error details
    if echo "$body" | jq -e '.authError' >/dev/null 2>&1; then
      local auth_error_type=$(echo "$body" | jq -r '.authError.type')
      local auth_error_msg=$(echo "$body" | jq -r '.authError.message')
      local auth_error_time=$(echo "$body" | jq -r '.authError.timestamp')
      
      echo "" >> $github_step_summary
      echo "## ⚠️ Authentication Error Detected" >> $github_step_summary
      echo "Authentication failed during test execution. This prevented testing of Leaderboard and Library screens." >> $github_step_summary
      echo "" >> $github_step_summary
      echo "### Error Details" >> $github_step_summary
      echo "- **Type:** ${auth_error_type}" >> $github_step_summary
      echo "- **Message:** ${auth_error_msg}" >> $github_step_summary
      echo "- **Time:** ${auth_error_time}" >> $github_step_summary
      
      if echo "$body" | jq -e '.authError.consoleErrors' >/dev/null 2>&1; then
        echo "" >> $github_step_summary
        echo "### Browser Console Errors" >> $github_step_summary
        echo "The following errors were detected in the browser console during authentication:" >> $github_step_summary
        echo "" >> $github_step_summary
        echo '<details><summary>Click to expand</summary>' >> $github_step_summary
        echo "" >> $github_step_summary
        echo "```" >> $github_step_summary
        echo "$body" | jq -r '.authError.consoleErrors[] | "[\(.type)] \(.text)"' >> $github_step_summary
        echo "```" >> $github_step_summary
        echo '</details>' >> $github_step_summary
      fi
      
      echo "" >> $github_step_summary
      echo "### Troubleshooting Steps" >> $github_step_summary
      echo "1. Check if the web3auth service is working properly" >> $github_step_summary
      echo "2. Verify that the test credentials (email and OTP) are still valid" >> $github_step_summary
      echo "3. Check for any recent changes to the authentication flow" >> $github_step_summary
      echo "4. Run the test locally with npx playwright test --debug to see detailed steps" >> $github_step_summary
    elif [ "$has_test_error" = true ]; then
      echo "" >> $github_step_summary
      echo "## ⚠️ Test Errors" >> $github_step_summary
      echo '<details><summary>Click to expand</summary>' >> $github_step_summary
      echo "" >> $github_step_summary
      echo '```' >> $github_step_summary
      cat "${output_dir}/error-log.txt" >> $github_step_summary
      echo '```' >> $github_step_summary
      echo '</details>' >> $github_step_summary
    fi
  else
    # Generate performance report for successful tests
    echo "Creating performance report in GitHub Summary..."

    echo "# 📊 Performance Test Results" >> $github_step_summary
    echo "| Test | Duration | Status |" >> $github_step_summary
    echo "| ---- | -------- | ------ |" >> $github_step_summary

    echo "$metrics" | while IFS= read -r line; do
      # Skip empty lines
      if [ -z "$line" ]; then
        continue
      fi
      
      # Remove any leading 'n' character (from newlines)
      line=$(echo "$line" | sed 's/^n//')
      
      if [[ "$line" =~ ([A-Za-z\ ]+)\ took\ ([0-9]+)ms ]]; then
        local test_name="${BASH_REMATCH[1]}"
        local duration="${BASH_REMATCH[2]}"

        if [[ "$line" =~ \[AUTH_ERROR\] ]]; then
          local status="⛔️ Auth Error"
        elif [ "$duration" -lt 1000 ]; then
          local status="✅ Excellent"
        elif [ "$duration" -lt 5000 ]; then
          local status="✅ Good"
        elif [ "$duration" -lt 10000 ]; then
          local status="⚠️ Acceptable"
        else
          local status="🔴 Slow"
        fi

        echo "| $test_name | ${duration}ms | $status |" >> $github_step_summary
      fi
    done
  
    # Add environment info
    echo "" >> $github_step_summary
    echo "## 🌐 Environment" >> $github_step_summary
    echo "- **Environment:** ${environment}" >> $github_step_summary
    echo "- **Region:** ${region} (${region_info})" >> $github_step_summary
    echo "- **Run ID:** [#${github_run_id}](https://github.com/${github_repository}/actions/runs/${github_run_id})" >> $github_step_summary

    # Add performance chart
    echo "" >> $github_step_summary
    echo "## 📈 Performance Chart" >> $github_step_summary
    echo '```mermaid' >> $github_step_summary
    echo 'gantt' >> $github_step_summary
    echo '    title Test Duration (lower is better)' >> $github_step_summary
    echo '    dateFormat  X' >> $github_step_summary
    echo '    axisFormat %s' >> $github_step_summary

    echo "$metrics" | while IFS= read -r line; do
      # Skip empty lines
      if [ -z "$line" ]; then
        continue
      fi
      
      # Remove any leading 'n' character (from newlines)
      line=$(echo "$line" | sed 's/^n//')
      
      if [[ "$line" =~ ([A-Za-z\ ]+)\ took\ ([0-9]+)ms ]]; then
        local test_name="${BASH_REMATCH[1]}"
        local duration="${BASH_REMATCH[2]}"

        local duration_sec=$(awk "BEGIN {printf \"%.1f\", $duration/1000}")
        
        if [[ "$line" =~ \[AUTH_ERROR\] ]]; then
          echo "    ${test_name} (Auth Error) :crit, 0, 0.1s" >> $github_step_summary
        else
          echo "    ${test_name} :0, ${duration_sec}s" >> $github_step_summary
        fi
      fi
    done

    echo '```' >> $github_step_summary
    
    # Append the error report if it exists
    if [ -f "$error_report_file" ]; then
      cat "$error_report_file" >> $github_step_summary
    fi
    
    # Append the warning report if it exists
    if [ -f "$warning_report_file" ]; then
      cat "$warning_report_file" >> $github_step_summary
    fi
  fi
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

# Copy console error files if they exist
for file in /tmp/console-errors.txt /tmp/console-errors.json; do
  if [ -f "$file" ]; then
    echo "Copying $(basename $file) from /tmp to output directories..."
    cp "$file" "${OUTPUT_DIR}/"
    cp "$file" "${WORKSPACE_OUTPUT}/"
  fi
done

# Extract errors and warnings
ERROR_REPORT_FILE=$(extract_console_messages "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY" "error" "🛑")
WARNING_REPORT_FILE=$(extract_console_messages "$BODY" "$OUTPUT_DIR" "$GITHUB_STEP_SUMMARY" "warning" "⚠️")

# Process metrics
METRICS=$(process_metrics "$BODY" "$OUTPUT_DIR" "$WORKSPACE_OUTPUT")

# Count metrics regardless of how they are formatted
METRICS_COUNT=$(echo "$METRICS" | grep -o "took [0-9]\+ms" | wc -l)
echo "Found $METRICS_COUNT metrics"

# Check for test errors
HAS_TEST_ERROR=false
if [ -f "${OUTPUT_DIR}/error-log.txt" ]; then
  HAS_TEST_ERROR=true
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
  if [ -z "$METRICS" ] || [ "$METRICS_COUNT" -lt 3 ]; then
    # This will make the workflow fail
    echo "Test failed due to incomplete metrics" >> "${OUTPUT_DIR}/error.txt"
    exit 1
  fi
  exit 1
fi 