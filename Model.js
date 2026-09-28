.pragma library

// Pure helpers for the Spaces widget. Nothing here touches QML
// objects beyond plain property reads, so the logic can be exercised with
// node (see tests/model.test.js).

var DEFAULTS = {
  showIcons: true,            // master switch: app icons visible or hidden
  showApps: "hover",          // "all" | "active" | "hover" (active + hovered) | "hoverOnly"
  persistentWorkspaces: 5,    // workspaces 1..N are always shown
  hideEmpty: false,           // hide empty workspaces, even persistent ones
  perMonitor: false,          // only list workspaces on this bar's monitor
  iconSize: 16,
  maxIcons: 8,                // overflow collapses into a "+N" chip
  groupApps: false,           // one icon per app, with a window count
  dimUnfocused: true,         // dim other windows on the active workspace
  focusedTitle: false,        // show the focused window's title next to its icon
  titleLength: 24,
  activeStyle: "subtle",      // "subtle" | "solid" | "accent"
  labelStyle: "number",       // "number" (Chinese numerals) | "glyph" | "none"
  aiNames: false,             // label occupied workspaces with local Ollama names
  animations: true,
  animationSpeed: "normal",   // "slow" | "normal" | "fast"
  scrollSwitch: true,
  iconStyle: "color",         // "color" | "mono"
  urgentHighlight: true,      // pulse workspaces whose windows ask for attention
  middleClickClose: false,    // middle-click an icon closes that window
  tooltips: true,
  density: "normal",          // "compact" | "normal" | "roomy"
  activeClick: "none",        // clicking the active pill: "none" | "previous"
  settingsButton: "hover",    // gear button: "hover" | "always" | "never"
  previews: true,             // live preview of a workspace on hover
  previewSize: "medium",      // "small" | "medium" | "large"
  previewLive: true,          // keep previews streaming; false = one frame
  agentStatus: true           // badges for coding agents running in terminals
}

var SHOW_APPS = ["all", "active", "hover", "hoverOnly"]
var ICON_STYLES = ["color", "mono"]
var DENSITIES = ["compact", "normal", "roomy"]
var ACTIVE_CLICKS = ["none", "previous"]
var SETTINGS_BUTTONS = ["hover", "always", "never"]
var PREVIEW_SIZES = ["small", "medium", "large"]
var ACTIVE_STYLES = ["subtle", "solid", "accent"]
var LABEL_STYLES = ["number", "glyph", "none"]
var SPEEDS = ["slow", "normal", "fast"]

function clampInt(value, min, max, fallback) {
  var n = Math.round(Number(value))
  if (!isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function oneOf(value, allowed, fallback) {
  return allowed.indexOf(String(value)) !== -1 ? String(value) : fallback
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback
}

// Normalizes a raw shell.json entry into a complete, valid settings object.
function resolveSettings(raw) {
  var s = raw || {}
  var d = DEFAULTS
  return {
    showIcons: bool(s.showIcons, d.showIcons),
    showApps: oneOf(s.showApps, SHOW_APPS, d.showApps),
    persistentWorkspaces: clampInt(s.persistentWorkspaces, 0, 10, d.persistentWorkspaces),
    hideEmpty: bool(s.hideEmpty, d.hideEmpty),
    perMonitor: bool(s.perMonitor, d.perMonitor),
    iconSize: clampInt(s.iconSize, 12, 24, d.iconSize),
    maxIcons: clampInt(s.maxIcons, 1, 20, d.maxIcons),
    groupApps: bool(s.groupApps, d.groupApps),
    dimUnfocused: bool(s.dimUnfocused, d.dimUnfocused),
    focusedTitle: bool(s.focusedTitle, d.focusedTitle),
    titleLength: clampInt(s.titleLength, 8, 60, d.titleLength),
    activeStyle: oneOf(s.activeStyle, ACTIVE_STYLES, d.activeStyle),
    labelStyle: oneOf(s.labelStyle, LABEL_STYLES, d.labelStyle),
    aiNames: bool(s.aiNames, d.aiNames),
    animations: bool(s.animations, d.animations),
    animationSpeed: oneOf(s.animationSpeed, SPEEDS, d.animationSpeed),
    scrollSwitch: bool(s.scrollSwitch, d.scrollSwitch),
    iconStyle: oneOf(s.iconStyle, ICON_STYLES, d.iconStyle),
    urgentHighlight: bool(s.urgentHighlight, d.urgentHighlight),
    middleClickClose: bool(s.middleClickClose, d.middleClickClose),
    tooltips: bool(s.tooltips, d.tooltips),
    density: oneOf(s.density, DENSITIES, d.density),
    activeClick: oneOf(s.activeClick, ACTIVE_CLICKS, d.activeClick),
    settingsButton: oneOf(s.settingsButton, SETTINGS_BUTTONS, d.settingsButton),
    previews: bool(s.previews, d.previews),
    previewSize: oneOf(s.previewSize, PREVIEW_SIZES, d.previewSize),
    previewLive: bool(s.previewLive, d.previewLive),
    agentStatus: bool(s.agentStatus, d.agentStatus)
  }
}

function durationFor(settings, base) {
  if (!settings.animations) return 0
  var factor = settings.animationSpeed === "slow" ? 1.6 : (settings.animationSpeed === "fast" ? 0.55 : 1)
  return Math.round(base * factor)
}

// Whether a workspace pill should reveal its app icons.
function showsApps(settings, occupied, active, hovered) {
  if (!settings.showIcons || !occupied) return false
  switch (settings.showApps) {
  case "all": return true
  case "active": return active
  case "hoverOnly": return hovered
  default: return active || hovered
  }
}

// Spacing between pills and inside them, in unscaled px.
function densityMetrics(density) {
  if (density === "compact") return { gap: 2, pad: 5, iconGap: 1 }
  if (density === "roomy") return { gap: 7, pad: 10, iconGap: 5 }
  return { gap: 4, pad: 7, iconGap: 3 }
}

// Hyprland reports addresses with or without the 0x prefix depending on source.
function normalizeAddress(address) {
  return String(address || "").toLowerCase().replace(/^0x/, "")
}

// Workspace ids to render. `occupied` maps id -> window count for every
// normal (positive id) workspace Hyprland knows about. `activeIds` are
// workspaces that must stay visible even when empty (focused / on-screen).
function workspaceIds(occupied, activeIds, persistent, hideEmpty) {
  var ids = []
  function add(id) {
    if (id > 0 && ids.indexOf(id) === -1) ids.push(id)
  }

  if (!hideEmpty) for (var p = 1; p <= persistent; p++) add(p)
  for (var key in occupied) {
    var id = Number(key)
    if (occupied[key] > 0 || !hideEmpty) add(id)
  }
  for (var a = 0; a < activeIds.length; a++) add(activeIds[a])

  ids.sort(function(l, r) { return l - r })
  return ids
}

// Label text for a workspace pill. The built-in workspace range is 1–10.
var WORKSPACE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
function workspaceLabel(id, focused, style) {
  if (style === "none") return ""
  if (style === "glyph" && focused) return "󱓻"
  return WORKSPACE_NUMERALS[id - 1] || String(id)
}

// App IDs are stable across window ordering and focus changes.
function workspaceApps(windows) {
  var apps = []
  for (var i = 0; i < windows.length; i++) {
    var app = String(windows[i].appId || "")
    if (app && apps.indexOf(app) === -1) apps.push(app)
  }
  return apps.sort()
}

// Keep activity identity stable across title counters, animated spinners, and
// music-track changes. Video and document titles remain meaningful inputs.
function workspaceTitle(title, appId) {
  if (/spotify|cliamp/i.test(String(appId || ""))) return ""
  return String(title || "").replace(/[\u2800-\u28ff]/g, "")
    .replace(/^\(\d+\)\s*/, "").replace(/\s*\(\d+\)$/, "").trim().slice(0, 120)
}

function workspaceActivities(windows, terminalContexts) {
  var activities = [], seen = {}
  for (var i = 0; i < windows.length; i++) {
    var w = windows[i], terminal = terminalContexts && terminalContexts[w.pid]
    var task = terminal ? workspaceTitle(terminal.task).replace(/^π\s*(?:[>›→-]\s*)?/, "").trim() : ""
    var activity = {
      appId: String(w.appId || ""),
      title: terminal ? "" : workspaceTitle(w.title, w.appId),
      task: task,
      project: terminal && !task ? String(terminal.project || terminal.space || "") : ""
    }
    var key = JSON.stringify(activity)
    if (seen[key]) continue
    seen[key] = true
    activities.push(activity)
  }
  return activities
}

function workspaceSignature(windows, terminalContexts) {
  return workspaceActivities(windows, terminalContexts).map(function(a) {
    return JSON.stringify(a)
  }).sort().join("\n")
}

function composeActivityLabel(topics) {
  var unique = [], seen = {}
  for (var i = 0; i < topics.length; i++) {
    var topic = String(topics[i] || "").trim().slice(0, 24)
    if (!topic || seen[topic.toLowerCase()]) continue
    seen[topic.toLowerCase()] = true
    unique.push(topic)
  }
  if (!unique.length) return ""
  var parts = unique.slice(0, 2), overflow = unique.length > 2 ? " +" + (unique.length - 2) : ""
  while (parts.join(" + ").length + overflow.length > 36) {
    var n = parts.length === 2 && parts[1].length > parts[0].length ? 1 : 0
    var lastSpace = parts[n].lastIndexOf(" ")
    if (lastSpace > 0) parts[n] = parts[n].slice(0, lastSpace)
    else parts[n] = parts[n].slice(0, -1)
  }
  return parts.join(" + ") + overflow
}

function taskTopic(task, proposed) {
  if (!task || String(proposed || "").trim().split(/\s+/).length > 1) return proposed
  return String(task).trim().split(/\s+/).slice(0, 3).join(" ")
}

// Installed-app categories provide a label before or without Ollama;
// its contextual name can replace them when titles have more detail.
var APP_CATEGORIES = {
  "visual studio code": "Development", "neovim": "Development", "docker": "Development",
  "google chrome": "Browser", "chromium": "Browser",
  "alacritty": "Terminal", "foot": "Terminal", "foot client": "Terminal", "foot server": "Terminal",
  "spotify": "Music", "cliamp": "Music",
  "media player": "Movie", "mpv media player": "Movie", "iptvnator": "Movie",
  "youtube": "Movie", "kdenlive": "Movie", "omacut": "Movie",
  "discord": "Chat", "whatsapp": "Chat", "zoom": "Chat", "google messages": "Chat", "hey": "Chat",
  "counter-strike 2": "Gaming", "steam": "Gaming", "moonlight": "Gaming",
  "comfyui": "Design", "pinta": "Design", "xournal++": "Design",
  "obsidian": "Writing", "omawrite": "Writing", "libreoffice writer": "Writing",
  "libreoffice": "Office", "libreoffice calc": "Office", "libreoffice impress": "Office",
  "google photos": "Photos", "image viewer": "Photos",
  "files": "Files", "localsend": "Files",
  "aether": "System", "disk usage": "System", "disks": "System", "btop++": "System",
  "tailscale": "System"
}

function categoryForApps(apps) {
  var specific = ""
  var generic = ""
  var unknown = false
  for (var i = 0; i < apps.length; i++) {
    var category = APP_CATEGORIES[String(apps[i]).toLowerCase()]
    if (typeof category !== "string") { unknown = true; continue }
    if (category === "Browser" || category === "Terminal") {
      if (category === "Browser") generic = "Browser"
      else if (!generic) generic = "Terminal"
    } else if (specific && specific !== category) {
      return ""
    } else {
      specific = category
    }
  }
  return specific || (!unknown ? generic : "")
}

function parseWorkspaceName(text) {
  try {
    var name = JSON.parse(text).name
    if (typeof name !== "string") return ""
    return name.replace(/[\r\n]+/g, " ").replace(/^[\s"'`]+|[\s"'`.!]+$/g, "")
      .split(/\s+/).slice(0, 5).join(" ").slice(0, 36)
  } catch (error) {
    return ""
  }
}

function contextName(fallback, proposed) {
  if (!proposed || /^(browser|terminal|workspace|x11|youtube|watch(?: video)?)$/i.test(proposed))
    return fallback || (/^(browser|terminal)$/i.test(proposed) ? proposed : "")
  return proposed
}

// Stable key identifying "the same app" across windows.
function appKey(appId) {
  return String(appId || "").toLowerCase()
}

// Orders windows the way they sit on screen: left to right, then top to
// bottom. Windows without a known position keep their relative order.
function sortWindows(windows) {
  var indexed = windows.map(function(w, i) { return { w: w, i: i } })
  indexed.sort(function(l, r) {
    var la = l.w.at, ra = r.w.at
    if (la && ra) {
      if (la[0] !== ra[0]) return la[0] - ra[0]
      if (la[1] !== ra[1]) return la[1] - ra[1]
    } else if (la && !ra) {
      return -1
    } else if (!la && ra) {
      return 1
    }
    return l.i - r.i
  })
  return indexed.map(function(x) { return x.w })
}

// Turns a sorted window list into render items.
//   windows: [{ address, appId, title, focused }]
// Returns { items: [{ key, address, appId, title, focused, count }], overflow }
function iconItems(windows, groupApps, maxIcons) {
  var items = []
  if (groupApps) {
    var byApp = {}
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var k = appKey(w.appId) || w.address
      var existing = byApp[k]
      if (!existing) {
        existing = { key: k, address: w.address, appId: w.appId, title: w.title, focused: w.focused, count: 1, addresses: [w.address] }
        byApp[k] = existing
        items.push(existing)
      } else {
        existing.count++
        existing.addresses.push(w.address)
        if (w.focused) {
          existing.focused = true
          existing.address = w.address
          existing.title = w.title
        }
      }
    }
  } else {
    for (var j = 0; j < windows.length; j++) {
      var x = windows[j]
      items.push({ key: x.address, address: x.address, appId: x.appId, title: x.title, focused: x.focused, count: 1, addresses: [x.address] })
    }
  }

  var overflow = Math.max(0, items.length - maxIcons)
  if (overflow > 0) {
    // Never hide the focused window behind the overflow chip.
    var visible = items.slice(0, maxIcons)
    var focusedIdx = -1
    for (var f = maxIcons; f < items.length; f++) if (items[f].focused) focusedIdx = f
    if (focusedIdx !== -1) visible[visible.length - 1] = items[focusedIdx]
    items = visible
  }
  return { items: items, overflow: overflow }
}

function truncate(text, max) {
  var t = String(text || "")
  return t.length > max ? t.slice(0, Math.max(1, max - 1)) + "…" : t
}

// Title shown next to the focused icon. The app name when
// the app has a single window in the workspace, else the window title.
function focusedLabel(item, appName, maxLength) {
  if (!item || !item.focused) return ""
  var text = item.count > 1 || !appName ? item.title : appName
  return truncate(text, maxLength)
}

// Lookup keys for an app id, most specific first. Reverse-DNS ids such as
// "dev.example.my-tool" often ship a desktop file named after the last part.
function appIdCandidates(appId) {
  var id = String(appId || "")
  if (id === "") return []
  var out = [id]
  function add(v) { if (v && out.indexOf(v) === -1) out.push(v) }
  add(id.toLowerCase())
  var dot = id.lastIndexOf(".")
  if (dot > 0 && dot < id.length - 1) {
    add(id.slice(dot + 1))
    add(id.slice(dot + 1).toLowerCase())
  }
  return out
}

// Chromium-family --app windows use classes like
// "chrome-web.whatsapp.com__-Default" or "brave-app.hey.com__-Profile_1".
// Returns the host ("web.whatsapp.com") or "" when the class is not one.
function webAppHost(appId) {
  var m = /^(?:chrome|chromium|brave|msedge|vivaldi|helium|opera)-([^_]+?)(?:__|_).*-(?:Default|Profile_\d+)$/i.exec(String(appId || ""))
  return m ? m[1] : ""
}

// Icon candidates scanned from disk: prefer scalable, then the largest raster.
function iconPathScore(path) {
  var p = String(path || "")
  if (/\.svg$/i.test(p)) return 100000
  var m = /\/(\d+)x\d+\//.exec(p)
  if (m) return Number(m[1])
  return /\/pixmaps\//.test(p) ? 48 : 1
}

function iconNameFromPath(path) {
  var value = String(path || "")
  var slash = value.lastIndexOf("/")
  var file = slash >= 0 ? value.slice(slash + 1) : value
  var dot = file.lastIndexOf(".")
  return dot > 0 ? file.slice(0, dot) : file
}

// Width of the workspace miniature, in unscaled px.
function previewWidth(size) {
  if (size === "small") return 260
  if (size === "large") return 520
  return 380
}

// Usable area of a monitor in logical layout coordinates, i.e. without the
// space reserved by bars. `monitor`: { x, y, width, height, scale, reserved }
// where width/height are physical pixels and reserved is [l, t, r, b].
function monitorArea(monitor) {
  if (!monitor || !monitor.width || !monitor.height) return null
  var scale = monitor.scale > 0 ? monitor.scale : 1
  var r = monitor.reserved && monitor.reserved.length === 4 ? monitor.reserved : [0, 0, 0, 0]
  var w = monitor.width / scale
  var h = monitor.height / scale
  return {
    x: (monitor.x || 0) + r[0],
    y: (monitor.y || 0) + r[1],
    width: Math.max(1, w - r[0] - r[2]),
    height: Math.max(1, h - r[1] - r[3])
  }
}

// Places windows inside a width x height miniature of `area`, where they
// really are on screen. Floating windows come last so they draw on top.
// Windows without a known position are laid out in an even grid instead.
//   windows: [{ address, at: [x, y] | null, size: [w, h] | null, floating }]
function previewLayout(windows, area, width, height) {
  var placed = []
  var known = area && windows.length > 0 && windows.every(function(w) { return w.at && w.size })

  if (known) {
    var sx = width / area.width
    var sy = height / area.height
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var x = (w.at[0] - area.x) * sx
      var y = (w.at[1] - area.y) * sy
      var ww = w.size[0] * sx
      var hh = w.size[1] * sy
      // Clamp into the miniature; windows can hang off the edge.
      var cx = Math.max(0, Math.min(width - 4, x))
      var cy = Math.max(0, Math.min(height - 4, y))
      placed.push({
        address: w.address,
        x: cx, y: cy,
        width: Math.max(4, Math.min(width - cx, ww - (cx - x))),
        height: Math.max(4, Math.min(height - cy, hh - (cy - y))),
        floating: !!w.floating
      })
    }
  } else {
    var n = windows.length
    var cols = Math.max(1, Math.ceil(Math.sqrt(n)))
    var rows = Math.max(1, Math.ceil(n / cols))
    var gap = 4
    var cw = (width - gap * (cols - 1)) / cols
    var ch = (height - gap * (rows - 1)) / rows
    for (var j = 0; j < n; j++) {
      placed.push({
        address: windows[j].address,
        x: (j % cols) * (cw + gap), y: Math.floor(j / cols) * (ch + gap),
        width: cw, height: ch,
        floating: false
      })
    }
  }

  placed.sort(function(l, r) { return (l.floating ? 1 : 0) - (r.floating ? 1 : 0) })
  return placed
}

// Maps window PIDs to agent states. `agents`: { session: { state, pids } }
// where pids run from the agent up to init. The nearest ancestor that is a
// window owns the agent, since terminals can be nested in other terminals.
// When several agents share a window, "waiting" beats "working" beats "done".
var AGENT_RANK = { waiting: 3, working: 2, done: 1 }

function agentStates(agents, windowPids) {
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var rank = AGENT_RANK[agent.state] || 0
    if (!rank) continue
    for (var i = 0; i < agent.pids.length; i++) {
      var pid = agent.pids[i]
      if (!windowPids[pid]) continue
      if (!out[pid] || AGENT_RANK[out[pid]] < rank) out[pid] = agent.state
      break
    }
  }
  return out
}

function parsePids(csv) {
  return String(csv || "").split(",").map(function(v) { return Number(v) }).filter(function(n) { return n > 1 })
}

// Next workspace id when scrolling; wraps around.
function stepWorkspace(ids, current, delta) {
  if (!ids.length) return current
  var idx = ids.indexOf(current)
  if (idx === -1) return ids[0]
  var next = (idx + (delta > 0 ? 1 : -1) + ids.length) % ids.length
  return ids[next]
}

// Merges a settings delta into an entry for shell.json.
function mergedEntry(moduleName, current, delta) {
  var entry = { id: moduleName }
  for (var k in current) if (k !== "id") entry[k] = current[k]
  for (var d in delta) entry[d] = delta[d]
  return entry
}

// node / CommonJS export for tests; ignored by QML.
if (typeof module !== "undefined") {
  module.exports = {
    DEFAULTS: DEFAULTS, resolveSettings: resolveSettings, showsApps: showsApps,
    densityMetrics: densityMetrics, normalizeAddress: normalizeAddress,
    agentStates: agentStates, parsePids: parsePids,
    previewWidth: previewWidth, monitorArea: monitorArea, previewLayout: previewLayout, durationFor: durationFor,
    workspaceIds: workspaceIds, workspaceLabel: workspaceLabel, workspaceApps: workspaceApps,
    workspaceTitle: workspaceTitle, workspaceActivities: workspaceActivities,
    workspaceSignature: workspaceSignature, composeActivityLabel: composeActivityLabel,
    taskTopic: taskTopic,
    categoryForApps: categoryForApps, parseWorkspaceName: parseWorkspaceName,
    contextName: contextName,
    appKey: appKey,
    sortWindows: sortWindows, iconItems: iconItems, truncate: truncate,
    focusedLabel: focusedLabel, webAppHost: webAppHost, appIdCandidates: appIdCandidates, iconPathScore: iconPathScore,
    iconNameFromPath: iconNameFromPath, stepWorkspace: stepWorkspace, mergedEntry: mergedEntry
  }
}
