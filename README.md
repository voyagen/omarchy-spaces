<h1 align="center">Voyagen Spaces</h1>

<h3 align="center">See what runs on every workspace.</h3>

<p align="center">
  <img src=".github/assets/film-apps.png" width="100%" alt="The Omarchy bar with Spaces: five workspaces, each showing the app icons open on it" />
</p>

Voyagen Spaces is a customized fork of [Tornike Gomareli's Spaces](https://github.com/tornikegomareli/omarchy-spaces), a workspace switcher for the [Omarchy](https://omarchy.org) bar. Each workspace shows the icons of the apps open on it. The active one slides open, and the focused window is highlighted.

## Peek before you jump

Hover another workspace to see it live, laid out the way it is on screen. Click a window in the preview to jump to it.

<p align="center">
  <img src=".github/assets/film-preview.png" width="100%" alt="Hovering workspace 2 opens a live preview with omarchy.org and Neovim side by side" />
</p>

## Know when your agent needs you

Terminals running Claude Code get a badge: a spinner while the agent works, a pulsing `!` when it needs your input, and a check mark when it is done. A workspace with an agent waiting on you pulses too.

<p align="center">
  <img src=".github/assets/film-agent.png" width="100%" alt="A terminal icon on workspace 4 with an orange exclamation badge: the agent needs input" />
</p>

To turn it on, add these hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/voyagen.spaces/hooks/claude-hook working", "async": true }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/voyagen.spaces/hooks/claude-hook working", "async": true }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/voyagen.spaces/hooks/claude-hook waiting", "async": true }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/voyagen.spaces/hooks/claude-hook done", "async": true }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/voyagen.spaces/hooks/claude-hook end", "async": true }] }]
  }
}
```

Other agents can report the same way: `omarchy-shell voyagen.spaces agent <session> <working|waiting|done|end> <pids>`, where `<pids>` lists the agent's process and its parents, comma-separated.

## Install

```sh
omarchy plugin add https://github.com/voyagen/omarchy-spaces.git --enable
omarchy plugin disable omarchy.workspaces   # optional: replace the built-in switcher
```

Requirements:

- Omarchy 4 with the Quickshell bar (Hyprland 0.56 or newer)
- `jq` for the agent hook (installed with Omarchy)
- Claude Code, only for agent status

Works with the bar on any edge of the screen. Tested on a single monitor.

To update, then load the new code:

```sh
omarchy plugin update voyagen.spaces
omarchy restart shell
```

## Remove

```sh
omarchy plugin remove voyagen.spaces
omarchy plugin enable omarchy.workspaces   # bring back the built-in switcher
```

If you added the agent hooks or the settings key below, delete those lines from `~/.claude/settings.json` and `~/.config/hypr/bindings.lua`.

## Using it

- Click a workspace to go there. Click an icon to focus that window.
- Scroll over the widget to move between workspaces.
- Hover an icon to see the window title.
- Hover another workspace to preview it. Click a window in the preview to focus it.
- Right-click the widget, or click the gear that shows on hover, to open settings.

## Settings

<img src=".github/assets/settings.png" width="330" align="right" alt="Spaces settings panel" />

Choose when icons show (always, active, on hover, or never), icon style and size, grouping by app, previews, agent status, the active workspace style, density, and more. Settings are saved to `~/.config/omarchy/shell.json`.

Workspace numbers 1–10 display as 一 二 三 四 五 六 七 八 九 十. The “Glyph” setting replaces the active workspace's numeral with a glyph.

### Optional AI names

Install Ollama and download `qwen3:1.7b` once with `ollama pull qwen3:1.7b`. In Spaces settings, turn on **AI workspace names** (off by default). Occupied workspaces then show their Chinese numeral and a short generated name, such as `一 · Research`. Empty workspaces keep their numerals. If Ollama is stopped or the model is unavailable, the numeral remains.

The widget sends app IDs and up to eight window titles per workspace to Ollama at `127.0.0.1:11434`. It waits for window changes to settle and does not block workspace switching while generating names. Names stay in memory, not in `shell.json`; turning the switch off stops new requests and restores the original labels. Window titles may contain private data; nothing is sent to a hosted AI service.

To open settings with a key, add this to `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + CTRL + ALT + S", "Voyagen Spaces settings", "omarchy-shell voyagen.spaces toggle")
```

To preview a workspace from a key or script, without hovering:

```sh
omarchy-shell voyagen.spaces peek 3
```

Settings can also be set from a script:

```sh
omarchy bar set voyagen.spaces showApps all
```

<br clear="right" />

## Development

From a clone of this repository, link it into Omarchy and run the tests:

```sh
ln -sfn "$PWD" ~/.config/omarchy/plugins/voyagen.spaces
omarchy plugin enable voyagen.spaces
node tests/model.test.js
```

After code changes, run `omarchy restart shell`.

## License

[MIT License](LICENSE).
