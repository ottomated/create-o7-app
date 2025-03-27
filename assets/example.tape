
Output example.gif

Require pnpm

Set Shell "bash"
Set FontSize 20
Set Width 1200
Set Height 600

# Setup
Hide
Type "rm -rf my-o7-app && clear"
Enter
Sleep 1s
Show

Sleep 500ms
Type "bun create o7-app"
Sleep 500ms
Enter

Wait+Screen /Where should/
Sleep 2s Enter

Sleep 1s Type "y" Sleep 200ms Enter 
Sleep 1s Enter

Sleep 1s
Down
Sleep 500ms
Enter

Sleep 1s
Enter
Sleep 1s
Enter

Sleep 1s Type "y" Sleep 200ms Enter
Sleep 1s Type "y" Sleep 200ms Enter
Sleep 1s Type "y" Sleep 200ms Enter

Wait+Line
Sleep 3s

# Cleanup
Hide
Type "rm -rf my-o7-app"
Enter
