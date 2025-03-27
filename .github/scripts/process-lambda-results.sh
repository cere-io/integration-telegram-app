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

# Extremely reliable console error extraction
extract_console_messages() {
  local body="$1"
  local output_file="$2"

  echo "Extracting console errors with ultra-reliable method..."

  # Create section for console errors
  echo "" >> "$output_file"
  echo "## 🛑 Console Errors" >> "$output_file"
  echo "The following errors were found in the test:" >> "$output_file"
  echo '<details open><summary>Click to collapse (scrollable)</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```' >> "$output_file"

  # Very basic approach - just dump all relevant parts of the response
  echo "TEST_CONSOLE_ERROR entries:" >> "$output_file"
  echo "$body" | grep -o "TEST_CONSOLE_ERROR[^\"]*" >> "$output_file"
  echo "" >> "$output_file"

  echo "TypeError entries:" >> "$output_file"
  echo "$body" | grep -o "TypeError[^\"]*" >> "$output_file"
  echo "" >> "$output_file"

  echo "Cannot read properties entries:" >> "$output_file"
  echo "$body" | grep -o "Cannot read properties[^\"]*" >> "$output_file"

  echo '```' >> "$output_file"
  echo '</details>' >> "$output_file"

  # Add raw console errors section
  echo "" >> "$output_file"
  echo "### Raw console errors" >> "$output_file"
  echo '<details><summary>Click to view raw console errors JSON</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```json' >> "$output_file"
  echo "$body" | sed -n '/"consoleErrors":/,/"region":/p' >> "$output_file"
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

# Generate performance report with region information
echo "# 📊 Performance Test Results - $CONTINENT Region" > $GITHUB_STEP_SUMMARY
echo "Testing from: **$REGION_INFO**" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

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
  echo '    title Test Duration from '$REGION' ('$CONTINENT') - lower is better' >> $GITHUB_STEP_SUMMARY
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

# Add enhanced environment information with geographic details
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🌎 Environment & Location" >> $GITHUB_STEP_SUMMARY
echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY

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
EXEC_TIME=$(jq -r '.executionTime // "Unknown"' "${OUTPUT_DIR}/cleaned_response.json" 2>/dev/null || echo "Unknown")
echo "- **Execution Time:** ${EXEC_TIME}" >> $GITHUB_STEP_SUMMARY

# Add network latency information
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🌐 Region Information" >> $GITHUB_STEP_SUMMARY
echo "This test was run from **$REGION_INFO**. AWS regions in the same continent generally have better connectivity to users in that region." >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

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

# Add improved region visualization - world map with AWS regions
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 🗺️ Global AWS Region Distribution" >> $GITHUB_STEP_SUMMARY
echo '```mermaid' >> $GITHUB_STEP_SUMMARY
echo 'flowchart TD' >> $GITHUB_STEP_SUMMARY
echo '  World((🌍 World))' >> $GITHUB_STEP_SUMMARY
echo '  World --> NA[North America]' >> $GITHUB_STEP_SUMMARY
echo '  World --> EU[Europe]' >> $GITHUB_STEP_SUMMARY
echo '  World --> APAC[Asia Pacific]' >> $GITHUB_STEP_SUMMARY
echo '  World --> SA[South America]' >> $GITHUB_STEP_SUMMARY

# North America regions
echo '  NA --> us-east-1[us-east-1: N. Virginia 🇺🇸]' >> $GITHUB_STEP_SUMMARY
echo '  NA --> us-east-2[us-east-2: Ohio 🇺🇸]' >> $GITHUB_STEP_SUMMARY
echo '  NA --> us-west-1[us-west-1: N. California 🇺🇸]' >> $GITHUB_STEP_SUMMARY
echo '  NA --> us-west-2[us-west-2: Oregon 🇺🇸]' >> $GITHUB_STEP_SUMMARY
echo '  NA --> ca-central-1[ca-central-1: Central 🇨🇦]' >> $GITHUB_STEP_SUMMARY

# Europe regions
echo '  EU --> eu-west-1[eu-west-1: Ireland 🇮🇪]' >> $GITHUB_STEP_SUMMARY
echo '  EU --> eu-west-2[eu-west-2: London 🇬🇧]' >> $GITHUB_STEP_SUMMARY
echo '  EU --> eu-west-3[eu-west-3: Paris 🇫🇷]' >> $GITHUB_STEP_SUMMARY
echo '  EU --> eu-central-1[eu-central-1: Frankfurt 🇩🇪]' >> $GITHUB_STEP_SUMMARY
echo '  EU --> eu-north-1[eu-north-1: Stockholm 🇸🇪]' >> $GITHUB_STEP_SUMMARY

# Asia Pacific regions
echo '  APAC --> ap-northeast-1[ap-northeast-1: Tokyo 🇯🇵]' >> $GITHUB_STEP_SUMMARY
echo '  APAC --> ap-northeast-2[ap-northeast-2: Seoul 🇰🇷]' >> $GITHUB_STEP_SUMMARY
echo '  APAC --> ap-southeast-1[ap-southeast-1: Singapore 🇸🇬]' >> $GITHUB_STEP_SUMMARY
echo '  APAC --> ap-southeast-2[ap-southeast-2: Sydney 🇦🇺]' >> $GITHUB_STEP_SUMMARY
echo '  APAC --> ap-south-1[ap-south-1: Mumbai 🇮🇳]' >> $GITHUB_STEP_SUMMARY

# South America regions
echo '  SA --> sa-east-1[sa-east-1: São Paulo 🇧🇷]' >> $GITHUB_STEP_SUMMARY

# Highlight current region
echo "  $REGION:::current" >> $GITHUB_STEP_SUMMARY
echo '  classDef current fill:#f96,stroke:#333,stroke-width:4px;' >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

## Add expected latency information
#echo "" >> $GITHUB_STEP_SUMMARY
#echo "## 📊 Expected Response Times by Region" >> $GITHUB_STEP_SUMMARY
#echo "Typical latency expectations when accessing services from different AWS regions:" >> $GITHUB_STEP_SUMMARY
#echo "" >> $GITHUB_STEP_SUMMARY
#echo "| User Location | Best Region | Expected Latency |" >> $GITHUB_STEP_SUMMARY
#echo "| ------------- | ----------- | ---------------- |" >> $GITHUB_STEP_SUMMARY
#echo "| North America | us-east-1, us-west-2 | 30-80ms |" >> $GITHUB_STEP_SUMMARY
#echo "| Europe | eu-west-1, eu-central-1 | 20-60ms |" >> $GITHUB_STEP_SUMMARY
#echo "| Asia | ap-northeast-1, ap-southeast-1 | 50-100ms |" >> $GITHUB_STEP_SUMMARY
#echo "| Australia | ap-southeast-2 | 30-70ms |" >> $GITHUB_STEP_SUMMARY
#echo "| South America | sa-east-1 | 40-90ms |" >> $GITHUB_STEP_SUMMARY
#echo "" >> $GITHUB_STEP_SUMMARY
#echo "This test was run from **$REGION_INFO**" >> $GITHUB_STEP_SUMMARY

# Determine test status based on metrics and response
if [ "$METRICS_COUNT" -lt 3 ]; then
  echo "Test failed due to incomplete metrics" >> "${OUTPUT_DIR}/error.txt"
  exit 1
else
  echo "Tests completed with required metrics"
  exit 0
fi
