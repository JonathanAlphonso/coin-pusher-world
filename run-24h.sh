#!/bin/bash

PROMPT_FILE="prompt.md"
MAX_ITERATIONS=500  # Adjust based on your needs

# Create prompt file
cat > "$PROMPT_FILE" << 'EOF'
Continue working on this project. Check the current state, review any errors or incomplete features, and keep building. 

Rules:
- Make a git commit after each meaningful change
- If tests fail, fix them before moving on
- If you get stuck, try a different approach
- Never stop - always find the next thing to improve
- Check the docs folder for remaining tasks

When done with current task, find the next one and continue.
EOF

for i in $(seq 1 $MAX_ITERATIONS); do
    echo "=== Iteration $i started at $(date) ==="
    
    claude -p "$(cat $PROMPT_FILE)" \
        --dangerously-skip-permissions \
        --max-turns 50
    
    echo "=== Iteration $i completed, sleeping 10s ==="
    sleep 10
done