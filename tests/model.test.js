// Run: node tests/model.test.js
const fs = require("fs")
const path = require("path")
const assert = require("assert")

const src = fs.readFileSync(path.join(__dirname, "..", "Model.js"), "utf8").replace(/^\.pragma library\s*/, "")
const mod = { exports: {} }
new Function("module", src)(mod)
const M = mod.exports

let failed = 0
function test(name, fn) {
  try { fn(); console.log("ok   " + name) } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message) }
}

test("resolveSettings fills defaults and clamps", () => {
  const s = M.resolveSettings({ iconSize: 99, showApps: "bogus", persistentWorkspaces: -3, groupApps: "yes" })
  assert.strictEqual(s.iconSize, 24)
  assert.strictEqual(s.showApps, "hover")
  assert.strictEqual(s.persistentWorkspaces, 0)
  assert.strictEqual(s.groupApps, false)
  assert.strictEqual(M.resolveSettings({ aiNames: true }).aiNames, true)
  assert.strictEqual(M.resolveSettings({ aiNames: "true" }).aiNames, false)
})

test("workspaceIds keeps persistent, adds occupied and active, sorted", () => {
  assert.deepStrictEqual(M.workspaceIds({ 7: 2, 2: 0 }, [9], 3, false), [1, 2, 3, 7, 9])
})

test("workspaceIds hideEmpty keeps only occupied and active", () => {
  assert.deepStrictEqual(M.workspaceIds({ 1: 0, 4: 1 }, [2], 5, true), [2, 4])
})

test("workspace labels use Chinese numerals without changing glyph and none modes", () => {
  const labels = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  assert.deepStrictEqual(labels.map((_, i) => M.workspaceLabel(i + 1, false, "number")), labels)
  assert.strictEqual(M.workspaceLabel(3, true, "none"), "")
  assert.strictEqual(M.workspaceLabel(3, true, "glyph"), "󱓻")
  assert.strictEqual(M.workspaceLabel(3, false, "glyph"), "三")
})

test("AI context changes for meaningful titles, not focus or animated spinners", () => {
  const windows = [{ appId: "firefox", title: "Movie trailer", focused: true },
                   { appId: "foot", title: "⠋ notes", focused: false }]
  assert.deepStrictEqual(M.workspaceApps(windows), ["firefox", "foot"])
  const signature = M.workspaceSignature(windows)
  assert.strictEqual(M.workspaceSignature(windows.slice().reverse().map(w => ({ ...w, focused: !w.focused, title: w.title.replace("⠋", "⠙") }))), signature)
  assert.strictEqual(M.workspaceTitle("⠙ notes"), "notes")
  assert.notStrictEqual(M.workspaceSignature([{ appId: "firefox", title: "Python documentation" }, windows[1]]), signature)
  assert.notStrictEqual(M.workspaceSignature([windows[0]]), signature)
})

test("terminal task changes trigger renaming without a terminal title change", () => {
  const windows = [{ appId: "Alacritty", title: "omarchy: gradient", pid: 42 }]
  const first = M.workspaceSignature(windows, { 42: { app: "Herdr", task: "Design bar", project: "topbar" } })
  const second = M.workspaceSignature(windows, { 42: { app: "Herdr", task: "Fix preview", project: "topbar" } })
  assert.notStrictEqual(first, second)
  assert.strictEqual(first, M.workspaceSignature(windows, { 42: { app: "Herdr", task: "Design bar", project: "topbar" } }))
})

test("unread counters, terminal animation, and music tracks do not rename a workspace", () => {
  const windows = [
    { appId: "google-chrome", title: "(6) AI News - YouTube" },
    { appId: "Alacritty", title: "π ⠋ Fix the bar", pid: 42 },
    { appId: "Spotify", title: "Artist - First Track" }
  ]
  const before = M.workspaceSignature(windows, { 42: { app: "OMP", task: "π ⠋ Fix the bar" } })
  const after = M.workspaceSignature([
    { ...windows[0], title: "(7) AI News - YouTube" },
    { ...windows[1], title: "π ⠙ Fix the bar" },
    { ...windows[2], title: "Artist - Next Track" }
  ], { 42: { app: "OMP", task: "π ⠙ Fix the bar" } })
  assert.strictEqual(after, before)
  assert.notStrictEqual(M.workspaceSignature([{ ...windows[0], title: "(7) Science News - YouTube" }, windows[1], windows[2]],
    { 42: { app: "OMP", task: "π ⠙ Fix the bar" } }), before)
})

test("each distinct activity survives topic selection, with a bounded overflow count", () => {
  const windows = [
    { appId: "google-chrome", title: "(4) AI News - YouTube" },
    { appId: "Alacritty", title: "π ⠋ Fix the bar", pid: 42 },
    { appId: "Spotify", title: "Artist - First Track" },
    { appId: "google-chrome", title: "(5) AI News - YouTube" }
  ]
  const activities = M.workspaceActivities(windows, { 42: { app: "OMP", task: "π ⠙ Fix the bar", project: "my-project" } })
  assert.strictEqual(activities.length, 3)
  assert.strictEqual(activities[1].task, "Fix the bar")
  assert.strictEqual(activities[1].project, "")
  assert.deepStrictEqual(activities.map(a => a.title), ["AI News - YouTube", "", ""])
  assert.strictEqual(M.composeActivityLabel(["AI News", "Bar Fix", "Music", "Bar Fix"]), "AI News + Bar Fix +1")
  assert.ok(M.composeActivityLabel(["Long Development Topic", "Screen Context Changes", "Music"]).length <= 36)
  const many = Array.from({ length: 10 }, (_, i) => ({ appId: "google-chrome", title: "Article " + i }))
  assert.strictEqual(M.workspaceActivities(many).length, 10)
  assert.strictEqual(M.composeActivityLabel(many.map(w => w.title)), "Article 0 + Article 1 +8")
})

test("Herdr task takes precedence over project, with project fallback", () => {
  const window = [{ appId: "Alacritty", title: "omarchy: smartspaces", pid: 55 }]
  const working = M.workspaceActivities(window, { 55: { app: "Herdr", task: "π > Troubleshoot Widget", project: "oma-smartspaces" } })
  assert.strictEqual(working[0].task, "Troubleshoot Widget")
  assert.strictEqual(working[0].project, "")
  const idle = M.workspaceActivities(window, { 55: { app: "Herdr", task: "", project: "oma-smartspaces" } })
  assert.strictEqual(idle[0].task, "")
  assert.strictEqual(idle[0].project, "oma-smartspaces")
  assert.strictEqual(M.taskTopic(working[0].task, "Smartspaces"), "Troubleshoot Widget")
  assert.strictEqual(M.taskTopic("Add Gradient Bar Plugin Preview Image", "gradient"), "Add Gradient Bar")
  assert.strictEqual(M.taskTopic(working[0].task, "Fix Widget"), "Fix Widget")
})

test("known application combinations prefer specific broad categories", () => {
  assert.strictEqual(M.categoryForApps(["Alacritty", "Google Chrome"]), "Browser")
  assert.strictEqual(M.categoryForApps(["Visual Studio Code", "Alacritty"]), "Development")
  assert.strictEqual(M.categoryForApps(["Media Player", "Google Chrome"]), "Movie")
  assert.strictEqual(M.categoryForApps(["YouTube", "Google Chrome"]), "Movie")
  assert.strictEqual(M.categoryForApps(["Google Chrome"]), "Browser")
  assert.strictEqual(M.categoryForApps(["Spotify", "Google Chrome"]), "Music")
  assert.strictEqual(M.categoryForApps(["Discord", "Google Chrome"]), "Chat")
  assert.strictEqual(M.categoryForApps(["Alacritty", "Foot"]), "Terminal")
  assert.strictEqual(M.categoryForApps(["ComfyUI", "Pinta"]), "Design")
  assert.strictEqual(M.categoryForApps(["Spotify", "Media Player"]), "")
  assert.strictEqual(M.categoryForApps(["Visual Studio Code", "Spotify"]), "")
  assert.strictEqual(M.categoryForApps(["Unlisted App"]), "")
})

test("contextual names keep topic detail but reject invalid or overlong responses", () => {
  assert.strictEqual(M.parseWorkspaceName('{"name":"Game Development"}'), "Game Development")
  assert.strictEqual(M.parseWorkspaceName('{"name":"Building a Steam Game Tutorial Today"}'), "Building a Steam Game Tutorial")
  assert.strictEqual(M.parseWorkspaceName('{"name":42}'), "")
  assert.strictEqual(M.parseWorkspaceName('nonsense'), "")
})

test("generic model names fall back to the known app category", () => {
  assert.strictEqual(M.contextName("Browser", "Game Development"), "Game Development")
  assert.strictEqual(M.contextName("Browser", "Terminal"), "Browser")
  assert.strictEqual(M.contextName("Chat", "workspace"), "Chat")
  assert.strictEqual(M.contextName("Browser", "YouTube"), "Browser")
  assert.strictEqual(M.contextName("Browser", "Watch Video"), "Browser")
  assert.strictEqual(M.contextName("Browser", ""), "Browser")
  assert.strictEqual(M.contextName("", "Music Editing"), "Music Editing")
})

test("sortWindows orders by x then y, unknown last", () => {
  const w = [{ id: "a", at: [500, 0] }, { id: "b" }, { id: "c", at: [10, 300] }, { id: "d", at: [10, 5] }]
  assert.deepStrictEqual(M.sortWindows(w).map(x => x.id), ["d", "c", "a", "b"])
})

test("iconItems groups same app and keeps focused address", () => {
  const r = M.iconItems([
    { address: "1", appId: "foot", title: "a", focused: false },
    { address: "2", appId: "zen", title: "b", focused: false },
    { address: "3", appId: "Foot", title: "c", focused: true }
  ], true, 8)
  assert.strictEqual(r.items.length, 2)
  assert.strictEqual(r.items[0].count, 2)
  assert.strictEqual(r.items[0].address, "3")
  assert.strictEqual(r.items[0].focused, true)
})

test("iconItems overflow never hides focused", () => {
  const ws = [1, 2, 3, 4, 5].map(i => ({ address: String(i), appId: "a" + i, title: "", focused: i === 5 }))
  const r = M.iconItems(ws, false, 3)
  assert.strictEqual(r.overflow, 2)
  assert.deepStrictEqual(r.items.map(i => i.address), ["1", "2", "5"])
})

test("focusedLabel uses app name for single window, title for many", () => {
  assert.strictEqual(M.focusedLabel({ focused: true, count: 1, title: "t" }, "Foot", 20), "Foot")
  assert.strictEqual(M.focusedLabel({ focused: true, count: 2, title: "long title here" }, "Foot", 6), "long …")
  assert.strictEqual(M.focusedLabel({ focused: false, count: 1 }, "Foot", 20), "")
})

test("webAppHost parses chromium app classes", () => {
  assert.strictEqual(M.webAppHost("chrome-web.whatsapp.com__-Default"), "web.whatsapp.com")
  assert.strictEqual(M.webAppHost("brave-app.hey.com__-Profile_1"), "app.hey.com")
  assert.strictEqual(M.webAppHost("chrome-x.com__home-Default"), "x.com")
  assert.strictEqual(M.webAppHost("foot"), "")
})

test("iconPathScore prefers svg then larger png", () => {
  assert.ok(M.iconPathScore("/a/scalable/apps/x.svg") > M.iconPathScore("/a/128x128/apps/x.png"))
  assert.ok(M.iconPathScore("/a/128x128/apps/x.png") > M.iconPathScore("/a/16x16/apps/x.png"))
  assert.strictEqual(M.iconNameFromPath("/a/b/zen-browser.png"), "zen-browser")
})

test("stepWorkspace wraps", () => {
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 5, 1), 1)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 1, -1), 5)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 2, 1), 5)
})

test("mergedEntry keeps id first and applies delta", () => {
  assert.deepStrictEqual(M.mergedEntry("x.y", { id: "old", a: 1 }, { b: 2 }), { id: "x.y", a: 1, b: 2 })
})

test("showsApps respects master switch and modes", () => {
  const s = (o) => M.resolveSettings(o)
  assert.strictEqual(M.showsApps(s({ showIcons: false, showApps: "all" }), true, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), true, false, false), true)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), false, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "active" }), true, false, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hover" }), true, false, true), true)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, true, false), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, false, true), true)
})

test("new settings validate", () => {
  const s = M.resolveSettings({ density: "huge", iconStyle: "mono", activeClick: "previous", settingsButton: "x" })
  assert.strictEqual(s.density, "normal")
  assert.strictEqual(s.iconStyle, "mono")
  assert.strictEqual(s.activeClick, "previous")
  assert.strictEqual(s.settingsButton, "hover")
  assert.strictEqual(s.showIcons, true)
})

test("normalizeAddress strips 0x and lowercases", () => {
  assert.strictEqual(M.normalizeAddress("0x624FAC"), "624fac")
  assert.strictEqual(M.normalizeAddress("624fac"), "624fac")
})

test("monitorArea removes reserved space in logical coords", () => {
  const a = M.monitorArea({ x: 0, y: 0, width: 3440, height: 1440, scale: 1.25, reserved: [0, 35, 0, 0] })
  assert.deepStrictEqual(a, { x: 0, y: 35, width: 2752, height: 1117 })
  assert.strictEqual(M.monitorArea(null), null)
})

test("previewLayout scales real positions and puts floating last", () => {
  const area = { x: 0, y: 0, width: 1000, height: 500 }
  const out = M.previewLayout([
    { address: "f", at: [100, 100], size: [200, 100], floating: true },
    { address: "a", at: [0, 0], size: [500, 500] },
    { address: "b", at: [500, 0], size: [500, 500] }
  ], area, 100, 50)
  assert.deepStrictEqual(out.map(p => p.address), ["a", "b", "f"])
  assert.deepStrictEqual(out[1], { address: "b", x: 50, y: 0, width: 50, height: 50, floating: false })
  assert.deepStrictEqual([out[2].x, out[2].y, out[2].width, out[2].height], [10, 10, 20, 10])
})

test("previewLayout clamps windows hanging off screen", () => {
  const out = M.previewLayout([{ address: "a", at: [-100, 0], size: [300, 100] }], { x: 0, y: 0, width: 1000, height: 1000 }, 100, 100)
  assert.deepStrictEqual([out[0].x, out[0].width], [0, 20])
})

test("previewLayout falls back to a grid without positions", () => {
  const out = M.previewLayout([{ address: "a" }, { address: "b" }, { address: "c" }], null, 100, 100)
  assert.strictEqual(out.length, 3)
  assert.strictEqual(out[0].x, 0)
  assert.ok(out[1].x > 0)
  assert.ok(out[2].y > 0)
})

test("preview settings validate", () => {
  const s = M.resolveSettings({ previewSize: "huge", previews: false })
  assert.strictEqual(s.previewSize, "medium")
  assert.strictEqual(s.previews, false)
  assert.strictEqual(s.previewLive, true)
  assert.strictEqual(M.previewWidth("large"), 520)
})

test("appIdCandidates adds the last reverse-DNS segment", () => {
  assert.deepStrictEqual(M.appIdCandidates("dev.tgomareli.logi-kvm-console"), ["dev.tgomareli.logi-kvm-console", "logi-kvm-console"])
  assert.deepStrictEqual(M.appIdCandidates("Slack"), ["Slack", "slack"])
  assert.deepStrictEqual(M.appIdCandidates(""), [])
})

test("agentStates picks the nearest window and the most urgent state", () => {
  const windows = { 100: true, 200: true, 300: true }
  const agents = {
    a: { state: "working", pids: [5, 6, 100, 200] },
    b: { state: "waiting", pids: [7, 100] },
    c: { state: "done", pids: [8, 300] },
    d: { state: "idle", pids: [9, 300] },
    e: { state: "working", pids: [10, 11] }
  }
  assert.deepStrictEqual(M.agentStates(agents, windows), { 100: "waiting", 300: "done" })
})

test("parsePids drops junk and init", () => {
  assert.deepStrictEqual(M.parsePids("12,abc,1,,34"), [12, 34])
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
