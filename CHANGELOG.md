# Changelog

## Fork customization

- Renamed the plugin to Voyagen Spaces and assigned it the `voyagen.spaces` ID.
- Updated widget IPC, agent hook, and installation instructions to use the new ID.
- Workspace labels 1–10 now use Chinese numerals instead of Western digits.
- Added opt-in local Ollama naming for occupied workspaces, with numeral fallback.
- Contextual workspace names now use titles to describe the topic beyond broad app categories, with short model output and an app-based fallback.
- Enriches local Ollama context with running OMP/Herdr task and project metadata from terminals.
- Mixed browser and OMP/Herdr workspaces now combine separate browser and agent topics instead of dropping the terminal activity.
- Names all distinct workspace activities independently, showing two topics plus an overflow count; caches topics and ignores unread counts, terminal spinners, and Spotify track changes.
- Prefers Herdr's agent task to its project directory, using the project only if no task is available.

## 1.0.0

First stable release, ready for the Omarchy plugin marketplace.

- The plugin ID is now `tornikegomareli.spaces`, matching the repository owner.
  If you installed an earlier version, remove `insanearts.spaces`, add the plugin
  again, and update the hook paths in `~/.claude/settings.json`.
- README: screenshots from the product film, requirements, and update and
  removal instructions
- Marketplace preview image
- Verified with the bar on the top, bottom, left and right edges

## 0.3.0

- Agent status: terminals running Claude Code show a spinner while the agent
  works, a pulsing `!` when it needs input, and a check mark when it is done.
  Workspaces with a waiting agent pulse
- `hooks/claude-hook` reports agent state; see the README for setup
- Setting to turn agent status off

## 0.2.0

- Live workspace previews: hover another workspace to see a miniature of it,
  with each window where it really is. Click a window to jump to it
- The preview slides between workspaces as you move along the bar
- Hovering an app icon highlights its window in the preview
- `peek` command to open a preview from a keybinding:
  `omarchy-shell insanearts.spaces peek 3`
- Settings: turn previews on or off, preview size, live video or still frame
- Icons for apps with reverse-DNS ids, such as `dev.example.tool`
- Fix: workspaces could stay half faded after appearing

## 0.1.0

First release.

- Workspace pills that show the icons of the apps open on each workspace
- The active workspace slides open; the focused window is highlighted
- Click a workspace or an icon to focus it; scroll to switch workspaces
- Settings panel: when icons show, icon style and size, grouping by app,
  active style, labels, density, urgent highlights, tooltips, animations
- Icons for Chromium web apps and apps missing from the icon theme
