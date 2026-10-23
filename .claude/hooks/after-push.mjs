// PostToolUse hook (Bash): after a `git push`, remind Claude to update the team task sheet (see CLAUDE.md).
let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = JSON.parse(input).tool_input?.command ?? '';
  } catch {
    return;
  }
  if (!/\bgit\s+push\b/.test(command)) return;
  console.log(
    JSON.stringify({
      systemMessage: 'Push detectat: Claude actualizează sheet-ul Bridge checklist.',
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          'A git push just ran. Before replying, update the Bridge checklist Google Sheet as described in CLAUDE.md, section "Tracking task-uri": find the pusher\'s tab and the task(s) from the pushed commits, then set Status, Început/Terminat and Note. If the Google Sheets connector is unavailable, tell the user what to fill in by hand.',
      },
    }),
  );
});
