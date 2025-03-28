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
echo "Saved response to ${OUTPUT_DIR}/full_response.txt"

# Display the content of the response for debugging
echo "Response content:"
cat "${OUTPUT_DIR}/full_response.txt" | head -50

# Clean JSON for better parsing - handle control characters
CLEANED_JSON=$(echo "$BODY" | tr -d '\000-\037')
echo "$CLEANED_JSON" > "${OUTPUT_DIR}/cleaned_response.json"
echo "Saved cleaned JSON to ${OUTPUT_DIR}/cleaned_response.json"

# Super simple console error extraction - just get text fields
extract_console_messages() {
  local output_file="$1"

  echo "Extracting console errors with simplest possible method..."

  # Create console errors section
  echo "" >> "$output_file"
  echo "## 🛑 Console Errors" >> "$output_file"
  echo "The following errors were found in the test:" >> "$output_file"
  echo '<details open><summary>Click to collapse (scrollable)</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```' >> "$output_file"

  echo "TypeErrors:" >> "$output_file"
  cat "${OUTPUT_DIR}/full_response.txt" | grep -o 'TypeError:[^"]*' | sort | uniq >> "$output_file"
  echo "" >> "$output_file"

  echo "Cannot read properties errors:" >> "$output_file"
  cat "${OUTPUT_DIR}/full_response.txt" | grep -o 'Cannot read properties[^"]*' | sort | uniq >> "$output_file"
  echo "" >> "$output_file"

  echo "Stack traces:" >> "$output_file"
  cat "${OUTPUT_DIR}/full_response.txt" | grep -o 'at [^"]*\.js:[0-9]*:[0-9]*' | sort | uniq >> "$output_file"

  echo '```' >> "$output_file"
  echo '</details>' >> "$output_file"

  # Raw console errors section
  echo "" >> "$output_file"
  echo "### Raw Console Errors" >> "$output_file"
  echo '<details><summary>Raw error data from response</summary>' >> "$output_file"
  echo "" >> "$output_file"
  echo '```json' >> "$output_file"
  sed -n '/"consoleErrors":/,/"region":/p' "${OUTPUT_DIR}/full_response.txt" >> "$output_file"
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
    cat "${output_dir}/cleaned_response.json" | grep -o '"name":"[^"]*","duration":[0-9]*' |
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

extract_json_value() {
  local file="$1"
  local key="$2"

  local value=$(grep -o "\"$key\":\"[^\"]*\"" "$file" | head -1 | sed "s/\"$key\":\"//g" | sed 's/"$//g')

  if [ -z "$value" ]; then
    value=$(grep -o "\"testConfig\":{[^}]*\"$key\":\"[^\"]*\"" "$file" | grep -o "\"$key\":\"[^\"]*\"" | head -1 | sed "s/\"$key\":\"//g" | sed 's/"$//g')
  fi

  echo "$value"
}

APP_URL=$(extract_json_value "${OUTPUT_DIR}/cleaned_response.json" "appUrl")
CAMPAIGN_ID=$(extract_json_value "${OUTPUT_DIR}/cleaned_response.json" "campaignId")

echo "Extracted URL with new method: ${APP_URL:-Unknown}"
echo "Extracted Campaign ID with new method: ${CAMPAIGN_ID:-Unknown}"

if [ -z "$APP_URL" ]; then
  echo "Trying alternative extraction method for URL..."
  APP_URL=$(cat "${OUTPUT_DIR}/cleaned_response.json" | grep -o '"testConfig".*"appUrl":"[^"]*"' | grep -o '"appUrl":"[^"]*"' | sed 's/"appUrl":"//g' | sed 's/"//g')
  echo "Alternative method result: ${APP_URL:-Still unknown}"
fi

if [ -z "$CAMPAIGN_ID" ]; then
  echo "Trying alternative extraction method for Campaign ID..."
  CAMPAIGN_ID=$(cat "${OUTPUT_DIR}/cleaned_response.json" | grep -o '"testConfig".*"campaignId":"[^"]*"' | grep -o '"campaignId":"[^"]*"' | sed 's/"campaignId":"//g' | sed 's/"//g')
  echo "Alternative method result: ${CAMPAIGN_ID:-Still unknown}"
fi

echo "Found APP_URL: ${APP_URL:-Unknown}" >> "${OUTPUT_DIR}/extraction_debug.log"
echo "Found CAMPAIGN_ID: ${CAMPAIGN_ID:-Unknown}" >> "${OUTPUT_DIR}/extraction_debug.log"

echo "" >> $GITHUB_STEP_SUMMARY
echo "## Test Configuration" >> $GITHUB_STEP_SUMMARY
echo "- **App URL:** ${APP_URL:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Campaign ID:** ${CAMPAIGN_ID:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Region:** ${REGION} (${REGION_INFO})" >> $GITHUB_STEP_SUMMARY
echo "- **Environment:** ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
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

# Extract console errors - uses simplest possible method
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

# Add target information
echo "- **Target URL:** ${APP_URL:-Unknown}" >> $GITHUB_STEP_SUMMARY
echo "- **Campaign ID:** ${CAMPAIGN_ID:-Unknown}" >> $GITHUB_STEP_SUMMARY

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

# Show a world map with region highlighted
echo "### AWS Region Map" >> $GITHUB_STEP_SUMMARY
echo '```mermaid' >> $GITHUB_STEP_SUMMARY
echo 'graph TD' >> $GITHUB_STEP_SUMMARY
echo '    subgraph "Global AWS Regions"' >> $GITHUB_STEP_SUMMARY
echo '        na[North America]' >> $GITHUB_STEP_SUMMARY
echo '        eu[Europe]' >> $GITHUB_STEP_SUMMARY
echo '        ap[Asia Pacific]' >> $GITHUB_STEP_SUMMARY
echo '        sa[South America]' >> $GITHUB_STEP_SUMMARY
echo '    end' >> $GITHUB_STEP_SUMMARY

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

# Add expected latency information
echo "" >> $GITHUB_STEP_SUMMARY
echo "## 📊 Expected Response Times by Region" >> $GITHUB_STEP_SUMMARY
echo "Typical latency expectations when accessing services from different AWS regions:" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "| User Location | Best Region | Expected Latency |" >> $GITHUB_STEP_SUMMARY
echo "| ------------- | ----------- | ---------------- |" >> $GITHUB_STEP_SUMMARY
echo "| North America | us-east-1, us-west-2 | 30-80ms |" >> $GITHUB_STEP_SUMMARY
echo "| Europe | eu-west-1, eu-central-1 | 20-60ms |" >> $GITHUB_STEP_SUMMARY
echo "| Asia | ap-northeast-1, ap-southeast-1 | 50-100ms |" >> $GITHUB_STEP_SUMMARY
echo "| Australia | ap-southeast-2 | 30-70ms |" >> $GITHUB_STEP_SUMMARY
echo "| South America | sa-east-1 | 40-90ms |" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "This test was run from **$REGION_INFO**" >> $GITHUB_STEP_SUMMARY

# Determine test status based on metrics and response
if [ "$METRICS_COUNT" -lt 3 ]; then
  echo "Test failed due to incomplete metrics" >> "${OUTPUT_DIR}/error.txt"
  exit 1
else
  echo "Tests completed with required metrics"
  exit 0
fi
