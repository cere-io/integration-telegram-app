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
CAMPAIGN="${10:-Unknown}"

# Map AWS regions to human-readable locations and countries
get_region_info() {
  local region="$1"
  case "$region" in
    "us-east-1")
      echo "N. Virginia (US East) - United States 🇺🇸"
      ;;
    "us-east-2")
      echo "Ohio (US East) - United States 🇺🇸"
      ;;
    "us-west-1")
      echo "N. California (US West) - United States 🇺🇸"
      ;;
    "us-west-2")
      echo "Oregon (US West) - United States 🇺🇸"
      ;;
    "ca-central-1")
      echo "Central - Canada 🇨🇦"
      ;;
    "eu-west-1")
      echo "Ireland (EU West) - Ireland 🇮🇪"
      ;;
    "eu-west-2")
      echo "London (EU West) - United Kingdom 🇬🇧"
      ;;
    "eu-west-3")
      echo "Paris (EU West) - France 🇫🇷"
      ;;
    "eu-central-1")
      echo "Frankfurt (EU Central) - Germany 🇩🇪"
      ;;
    "eu-north-1")
      echo "Stockholm (EU North) - Sweden 🇸🇪"
      ;;
    "ap-northeast-1")
      echo "Tokyo (Asia Pacific Northeast) - Japan 🇯🇵"
      ;;
    "ap-northeast-2")
      echo "Seoul (Asia Pacific Northeast) - South Korea 🇰🇷"
      ;;
    "ap-southeast-1")
      echo "Singapore (Asia Pacific Southeast) - Singapore 🇸🇬"
      ;;
    "ap-southeast-2")
      echo "Sydney (Asia Pacific Southeast) - Australia 🇦🇺"
      ;;
    "ap-south-1")
      echo "Mumbai (Asia Pacific South) - India 🇮🇳"
      ;;
    "sa-east-1")
      echo "São Paulo (South America East) - Brazil 🇧🇷"
      ;;
    *)
      echo "$region - Unknown region"
      ;;
  esac
}

# Function to get continent from region code
get_continent() {
  local region="$1"
  case "$region" in
    "us-"*|"ca-"*)
      echo "North America"
      ;;
    "eu-"*)
      echo "Europe"
      ;;
    "ap-"*)
      echo "Asia-Pacific"
      ;;
    "sa-"*)
      echo "South America"
      ;;
    "me-"*)
      echo "Middle East"
      ;;
    "af-"*)
      echo "Africa"
      ;;
    *)
      echo "Other"
      ;;
  esac
}

# Get continent for current region
CONTINENT=$(get_continent "$REGION")
REGION_INFO=$(get_region_info "$REGION")

IS_GITHUB_ACTIONS="${GITHUB_ACTIONS:-false}"
if [ "$IS_GITHUB_ACTIONS" = "true" ]; then
  echo "Running in GitHub Actions environment"
else
  echo "Running in local environment"
fi

# Try to extract campaign information directly from response
if [ "$CAMPAIGN" = "Unknown" ]; then
  DETECTED_CAMPAIGN=$(grep -o '"campaign":"[^"]*"' "${OUTPUT_DIR}/full_response.txt" 2>/dev/null | sed 's/"campaign":"//g; s/"$//g' || echo "")
  if [ -n "$DETECTED_CAMPAIGN" ]; then
    CAMPAIGN="$DETECTED_CAMPAIGN"
    echo "Detected campaign: $CAMPAIGN"
  fi
fi

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
echo "Saved response to ${OUTPUT_DIR}/full_response.txt"

# Clean JSON for better parsing - handle control characters
CLEANED_JSON=$(echo "$BODY" | tr -d '\000-\037')
echo "$CLEANED_JSON" > "${OUTPUT_DIR}/cleaned_response.json"
echo "Saved cleaned JSON to ${OUTPUT_DIR}/cleaned_response.json"

# Extract campaign if not provided
if [ "$CAMPAIGN" = "Unknown" ]; then
  CAMPAIGN=$(grep -o '"campaign":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null | sed 's/"campaign":"//g; s/"$//g' || echo "Unknown")
  echo "Detected campaign from response: $CAMPAIGN"
fi

# Ultra-reliable console error extraction - multiple approaches combined
extract_console_messages() {
  local output_file="$1"

  echo "Extracting console errors with multiple reliable methods..."

  # Create console errors section
  echo "" >> "$output_file"
  echo "## 🛑 Console Errors" >> "$output_file"
  echo "The following errors were found in the test:" >> "$output_file"
  echo '<details open><summary>Click to collapse (scrollable)</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```' >> "$output_file"

  # Method 1: Extract error messages directly
  echo "Error messages:" >> "$output_file"
  grep -o '"text":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" |
    sed 's/"text":"//g; s/"$//g' |
    grep -v "^at " |
    grep -v "^    at " |
    sort | uniq >> "$output_file" || echo "No error messages found"
  echo "" >> "$output_file"

  # Method 2: Extract specific error types
  echo "TypeError errors:" >> "$output_file"
  grep -o 'TypeError:[^"]*' "${OUTPUT_DIR}/cleaned_response.json" | sort | uniq >> "$output_file" || echo "No TypeError errors found"
  echo "" >> "$output_file"

  echo "Cannot read properties errors:" >> "$output_file"
  grep -o 'Cannot read properties[^"]*' "${OUTPUT_DIR}/cleaned_response.json" | sort | uniq >> "$output_file" || echo "No property access errors found"
  echo "" >> "$output_file"

  # Method 3: Extract stack traces
  echo "Stack traces:" >> "$output_file"
  grep -o '"stack":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" |
    sed 's/"stack":"//g; s/"$//g' |
    tr '\\n' '\n' >> "$output_file" || echo "No stack traces found"

  echo '```' >> "$output_file"
  echo '</details>' >> "$output_file"

  # Raw error data
  echo "" >> "$output_file"
  echo "### Raw Console Errors" >> "$output_file"
  echo '<details><summary>Click to view raw error data</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```json' >> "$output_file"
  sed -n '/"consoleErrors":/,/"region":/p' "${OUTPUT_DIR}/cleaned_response.json" >> "$output_file" || echo "No consoleErrors section found"
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
  if grep -q '"metrics":\[' "${output_dir}/cleaned_response.json"; then
    echo "Found metrics array in response"

    # Save the metrics JSON for examination
    grep -o '"metrics":\[.*\]' "${output_dir}/cleaned_response.json" > "${output_dir}/metrics_array.json"

    # Extract metrics with simple grep approach
    local metrics_text=""
    grep -o '"name":"[^"]*","duration":[0-9]*' "${output_dir}/cleaned_response.json" |
    while read -r line; do
      local name=$(echo "$line" | grep -o '"name":"[^"]*' | sed 's/"name":"//g')
      local duration=$(echo "$line" | grep -o '"duration":[0-9]*' | sed 's/"duration"://g')
      metrics_text="${metrics_text}${name} took ${duration}ms\n"
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
    local cleaned_body=$(cat "${output_dir}/cleaned_response.json" | tr -d '\r' | tr '\n' ' ')
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

# Generate performance report with region and campaign information
echo "# 📊 Performance Test Results: ${CAMPAIGN} Campaign" > $GITHUB_STEP_SUMMARY
echo "Testing from: **$REGION_INFO**" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Extract runtime information if available
if grep -q '"runtimeInfo":' "${OUTPUT_DIR}/cleaned_response.json"; then
  echo "## 🧪 Test Environment" >> $GITHUB_STEP_SUMMARY
  echo "<details><summary>Click to view environment details</summary>" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY

  # Browser version
  BROWSER_VERSION=$(grep -o '"browser":[^,}]*' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"browser"://g; s/[" ]//g' || echo "Unknown")
  echo "- **Browser:** ${BROWSER_VERSION}" >> $GITHUB_STEP_SUMMARY

  # Node version
  NODE_VERSION=$(grep -o '"nodeVersion":[^,}]*' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"nodeVersion"://g; s/[" ]//g' || echo "Unknown")
  echo "- **Node.js:** ${NODE_VERSION}" >> $GITHUB_STEP_SUMMARY

  # Platform
  PLATFORM=$(grep -o '"platform":[^,}]*' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"platform"://g; s/[" ]//g' || echo "Unknown")
  echo "- **Platform:** ${PLATFORM}" >> $GITHUB_STEP_SUMMARY

  # Runtime (lambda vs local)
  RUNTIME=$(grep -o '"runtime":[^,}]*' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"runtime"://g; s/[" ]//g' || echo "Unknown")
  echo "- **Runtime:** ${RUNTIME}" >> $GITHUB_STEP_SUMMARY

  echo "</details>" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
fi

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
  echo '    title Test Duration for '$CAMPAIGN' from '$REGION' ('$CONTINENT') - lower is better' >> $GITHUB_STEP_SUMMARY
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

# Extract console errors - uses multiple reliable methods
extract_console_messages "$GITHUB_STEP_SUMMARY"

# Process auth error if present
if grep -q '"authError":[^n]' "${OUTPUT_DIR}/cleaned_response.json"; then
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "## ⚠️ Authentication Error Detected" >> $GITHUB_STEP_SUMMARY
  echo "Authentication failed during test execution." >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "### Error Details" >> $GITHUB_STEP_SUMMARY

  # Extract auth error details with grep
  AUTH_ERROR_TYPE=$(grep -o '"authError":{[^}]*"type":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g; s/"$//g')
  AUTH_ERROR_MSG=$(grep -o '"authError":{[^}]*"message":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | grep -o '"message":"[^"]*"' | sed 's/"message":"//g; s/"$//g')
  AUTH_ERROR_TIME=$(grep -o '"authError":{[^}]*"timestamp":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | grep -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"//g; s/"$//g')

  echo "- **Type:** ${AUTH_ERROR_TYPE:-Unknown}" >> $GITHUB_STEP_SUMMARY
  echo "- **Message:** ${AUTH_ERROR_MSG:-Unknown error}" >> $GITHUB_STEP_SUMMARY
  echo "- **Time:** ${AUTH_ERROR_TIME:-Unknown}" >> $GITHUB_STEP_SUMMARY
fi

# Add enhanced environment information with geographic details
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🌎 Environment & Location" >> $GITHUB_STEP_SUMMARY
echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
echo "- **Campaign:** ${CAMPAIGN}" >> $GITHUB_STEP_SUMMARY
echo "- **Run Mode:** ${IS_GITHUB_ACTIONS:+GitHub Actions}${IS_GITHUB_ACTIONS:-Local}" >> $GITHUB_STEP_SUMMARY

# Create a region badge based on continent
case "$CONTINENT" in
  "North America")
    BADGE_COLOR="blue"
    ;;
  "Europe")
    BADGE_COLOR="green"
    ;;
  "Asia-Pacific")
    BADGE_COLOR="orange"
    ;;
  "South America")
    BADGE_COLOR="yellow"
    ;;
  *)
    BADGE_COLOR="lightgrey"
    ;;
esac

# Add region information with badge
echo "- **Region:** ![${REGION}](https://img.shields.io/badge/${REGION}-${BADGE_COLOR})" >> $GITHUB_STEP_SUMMARY
echo "- **Location:** ${REGION_INFO}" >> $GITHUB_STEP_SUMMARY
echo "- **Run ID:** [#${GITHUB_RUN_ID}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})" >> $GITHUB_STEP_SUMMARY

# Get execution time safely
EXEC_TIME=$(grep -o '"executionTime":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"executionTime":"//g; s/"$//g')
echo "- **Execution Time:** ${EXEC_TIME:-Unknown}" >> $GITHUB_STEP_SUMMARY

# Add network latency information
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🌐 Region Information" >> $GITHUB_STEP_SUMMARY
echo "This test was run from **$REGION_INFO**. AWS regions in the same continent generally have better connectivity to users in that region." >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Add comparison between local and GitHub Actions runs
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🖥️ Local vs GitHub Actions" >> $GITHUB_STEP_SUMMARY
echo "Test results can differ between local execution and GitHub Actions due to:" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "- **Network conditions**: GitHub Actions runs in cloud data centers with different connectivity" >> $GITHUB_STEP_SUMMARY
echo "- **System resources**: Different CPU/memory configurations" >> $GITHUB_STEP_SUMMARY
echo "- **Browser versions**: Possibly different browser or Node.js versions" >> $GITHUB_STEP_SUMMARY
echo "- **Environmental factors**: Different timezone, locale settings, etc." >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "This test was run in **${IS_GITHUB_ACTIONS:+GitHub Actions}${IS_GITHUB_ACTIONS:-local}** mode." >> $GITHUB_STEP_SUMMARY

# Show a world map with region highlighted
echo "### AWS Region Map" >> $GITHUB_STEP_SUMMARY
echo '```mermaid' >> $GITHUB_STEP_SUMMARY
echo 'graph TD' >> $GITHUB_STEP_SUMMARY
echo '    subgraph "Global AWS Regions"' >> $GITHUB_STEP_SUMMARY
echo '        na[North America]' >> $GITHUB_STEP_SUMMARY
echo '        eu[Europe]' >> $GITHUB_STEP_SUMMARY
echo '        ap[Asia-Pacific]' >> $GITHUB_STEP_SUMMARY
echo '        sa[South America]' >> $GITHUB_STEP_SUMMARY
echo '    end' >> $GITHUB_STEP_SUMMARY

# Highlight current region
case "$CONTINENT" in
  "North America")
    echo '    na:::highlight --> current["'$REGION': '$REGION_INFO'"]:::current' >> $GITHUB_STEP_SUMMARY
    ;;
  "Europe")
    echo '    eu:::highlight --> current["'$REGION': '$REGION_INFO'"]:::current' >> $GITHUB_STEP_SUMMARY
    ;;
  "Asia-Pacific")
    echo '    ap:::highlight --> current["'$REGION': '$REGION_INFO'"]:::current' >> $GITHUB_STEP_SUMMARY
    ;;
  "South America")
    echo '    sa:::highlight --> current["'$REGION': '$REGION_INFO'"]:::current' >> $GITHUB_STEP_SUMMARY
    ;;
esac

echo '    classDef highlight fill:#f96,stroke:#333,stroke-width:2px;' >> $GITHUB_STEP_SUMMARY
echo '    classDef current fill:#9f6,stroke:#333,stroke-width:4px;' >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

# Add detailed raw response with key issues highlighted
echo "" >> $GITHUB_STEP_SUMMARY
echo "## Debug Information" >> $GITHUB_STEP_SUMMARY
echo "<details><summary>Click to view response details</summary>" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Extract basic info directly using grep for reliability
STATUS_CODE=$(echo "$RESPONSE" | grep -o '"StatusCode":[^,}]*' | sed 's/"StatusCode"://g; s/ //g')
SUCCESS=$(grep -o '"success":[^,}]*' "${OUTPUT_DIR}/cleaned_response.json" | head -1 | sed 's/"success"://g; s/ //g')
ERROR_OUTPUT=$(grep -o '"errorOutput":"[^"]*"' "${OUTPUT_DIR}/cleaned_response.json" | sed 's/"errorOutput":"//g; s/"$//g')

echo "- **Status Code:** ${STATUS_CODE:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Success:** ${SUCCESS:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Error Output:** ${ERROR_OUTPUT:-None}" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

echo "**Raw Response (first 40 lines):**" >> $GITHUB_STEP_SUMMARY
echo '```json' >> $GITHUB_STEP_SUMMARY
head -n 40 "${OUTPUT_DIR}/cleaned_response.json" >> $GITHUB_STEP_SUMMARY
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
