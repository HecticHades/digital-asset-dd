#!/bin/bash
# Ralph for Claude Code - Autonomous AI agent loop
# Adapted from snarktank/ralph for use with Claude Code CLI
# Usage: ./ralph.sh [max_iterations] [project_dir]

set -e

MAX_ITERATIONS=${1:-10}
PROJECT_DIR=${2:-.}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# File paths - can be in script dir or project dir
PRD_FILE="${PROJECT_DIR}/prd.json"
PROGRESS_FILE="${PROJECT_DIR}/progress.txt"
PROMPT_FILE="${SCRIPT_DIR}/prompt.md"
ARCHIVE_DIR="${PROJECT_DIR}/.ralph-archive"
LAST_BRANCH_FILE="${PROJECT_DIR}/.ralph-last-branch"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_status() {
  echo -e "${BLUE}[Ralph]${NC} $1"
}

echo_success() {
  echo -e "${GREEN}[Ralph]${NC} $1"
}

echo_warning() {
  echo -e "${YELLOW}[Ralph]${NC} $1"
}

echo_error() {
  echo -e "${RED}[Ralph]${NC} $1"
}

# Check for required files
if [ ! -f "$PRD_FILE" ]; then
  echo_error "PRD file not found: $PRD_FILE"
  echo_status "Create a prd.json file with your user stories. See prd.json.example for format."
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo_error "Prompt file not found: $PROMPT_FILE"
  exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
  echo_error "jq is required but not installed."
  echo_status "Install with: brew install jq (macOS) or apt install jq (Linux)"
  exit 1
fi

# Check for claude CLI
if ! command -v claude &> /dev/null; then
  echo_error "Claude Code CLI is required but not installed."
  echo_status "Install with: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo_status "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo_status "Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Count total and completed stories
count_stories() {
  TOTAL=$(jq '.stories | length' "$PRD_FILE" 2>/dev/null || echo "0")
  COMPLETED=$(jq '[.stories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
  echo "$COMPLETED/$TOTAL"
}

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Ralph for Claude Code - Autonomous AI Agent Loop${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo_status "Max iterations: $MAX_ITERATIONS"
echo_status "Project directory: $PROJECT_DIR"
echo_status "Stories: $(count_stories)"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  # Check if all stories are complete before starting iteration
  REMAINING=$(jq '[.stories[] | select(.passes != true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo_success "All stories complete! Finished before iteration $i"
    exit 0
  fi

  echo ""
  echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│  Iteration $i of $MAX_ITERATIONS - Stories: $(count_stories)${NC}"
  echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
  echo ""

  # Build the prompt with context
  FULL_PROMPT=$(cat "$PROMPT_FILE")
  FULL_PROMPT+="\n\n---\n\n## Current PRD\n\n\`\`\`json\n$(cat "$PRD_FILE")\n\`\`\`"

  if [ -f "$PROGRESS_FILE" ]; then
    FULL_PROMPT+="\n\n---\n\n## Progress Log\n\n\`\`\`\n$(cat "$PROGRESS_FILE")\n\`\`\`"
  fi

  # Run Claude Code with the prompt
  # Using --print for non-interactive mode, --dangerously-skip-permissions for autonomous operation
  echo_status "Starting Claude Code..."

  OUTPUT=$(echo -e "$FULL_PROMPT" | claude --print --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo_success "════════════════════════════════════════════════════════════"
    echo_success "  Ralph completed all tasks!"
    echo_success "  Finished at iteration $i of $MAX_ITERATIONS"
    echo_success "════════════════════════════════════════════════════════════"
    exit 0
  fi

  # Check for explicit stop signal
  if echo "$OUTPUT" | grep -q "<promise>STOP</promise>"; then
    echo ""
    echo_warning "Ralph received stop signal."
    echo_warning "Check progress.txt for details."
    exit 0
  fi

  echo_status "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo_warning "════════════════════════════════════════════════════════════"
echo_warning "  Ralph reached max iterations ($MAX_ITERATIONS)"
echo_warning "  Not all tasks completed. Check progress.txt for status."
echo_warning "════════════════════════════════════════════════════════════"
exit 1
