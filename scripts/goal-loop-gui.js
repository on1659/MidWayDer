#!/usr/bin/env node
/* goal-loop-gui.js — local browser GUI for scripts/goal-loop.sh */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const rootDir = findRepoRoot();
process.chdir(rootDir);

const args = process.argv.slice(2);
const noOpen = args.includes("--no-open");
const portArg = readArg("--port");
const port = Number(portArg || process.env.GOAL_LOOP_GUI_PORT || 8787);
const statePath = path.join(rootDir, ".symphony/goal-state.json");

const runs = new Map();
let activeRunId = null;
let lastRunId = null;
let goalState = loadGoalState();

loadLatestRunFromLog();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
      return sendHtml(res, pageHtml());
    }

    if (req.method === "GET" && url.pathname === "/api/template") {
      const templatePath = path.join(rootDir, "docs/harness/goal-prompt-template.md");
      const prompt = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, "utf8") : "";
      return sendJson(res, { prompt });
    }

    if (req.method === "GET" && url.pathname === "/api/status") {
      const id = url.searchParams.get("id") || activeRunId || lastRunId;
      return sendJson(res, { activeRunId, lastRunId, goalState, run: id ? serializeRun(runs.get(id)) : null });
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      return sendJson(res, { goalState });
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
      const body = await readJson(req);
      const run = startRun(body);
      return sendJson(res, { id: run.id });
    }

    if (req.method === "POST" && url.pathname === "/api/continue") {
      const body = await readJson(req).catch(() => ({}));
      const run = startRun({
        promptMode: "advanced",
        prompt: buildContinuePrompt(goalState, body.goal || ""),
        maxLoops: body.maxLoops || 3,
        auto: body.auto !== false,
        agentCmd: body.agentCmd || "",
        chain: body.chain === true,
        chainLimit: body.chainLimit || 5,
        push: body.push === true,
      });
      return sendJson(res, { id: run.id });
    }

    if (req.method === "POST" && url.pathname === "/api/verify") {
      const body = await readJson(req).catch(() => ({}));
      const run = startRun({
        promptMode: "advanced",
        prompt: buildVerifyPrompt(goalState, body.goal || ""),
        maxLoops: body.maxLoops || 1,
        auto: body.auto !== false,
        agentCmd: body.agentCmd || "",
        chain: body.chain === true,
        chainLimit: body.chainLimit || 5,
        push: body.push === true,
      });
      return sendJson(res, { id: run.id });
    }

    if (req.method === "POST" && url.pathname === "/api/stop") {
      const body = await readJson(req).catch(() => ({}));
      const id = body.id || activeRunId;
      const run = id ? runs.get(id) : null;
      if (run && run.child && !run.done) {
        run.output += "\n[목표 루프 GUI] 중지 요청됨.\n";
        stopChild(run);
      }
      return sendJson(res, { ok: true });
    }

    sendJson(res, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(res, { error: error.message || String(error) }, 500);
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/`;
  console.log(`Goal Loop GUI: ${url}`);
  if (!noOpen && process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  }
});

function startRun(body) {
  if (activeRunId) {
    const active = runs.get(activeRunId);
    if (active && !active.done) {
      throw new Error("이미 실행 중인 목표 루프가 있습니다.");
    }
  }

  const rawPrompt = String(body.prompt || "").trim();
  const promptMode = body.promptMode === "advanced" ? "advanced" : "goal";
  const prompt = promptMode === "advanced" ? rawPrompt : buildGoalPrompt(rawPrompt);
  if (!prompt) {
    throw new Error("목표를 입력해야 합니다.");
  }
  if (hasUnfilledTemplate(prompt)) {
    throw new Error("템플릿의 빈 항목이 아직 남아 있습니다. `...`를 구체적인 목표, 완료 조건, 검증 항목으로 바꿔 주세요.");
  }

  const maxLoops = normalizePositiveInt(body.maxLoops, 3);
  const auto = body.auto !== false;
  const agentCmd = String(body.agentCmd || "").trim();
  const chain = body.chain === true;
  const chainLimit = normalizePositiveInt(body.chainLimit, 5);
  const chainRemaining = normalizePositiveInt(body.chainRemaining, chainLimit);
  const push = body.push === true;
  const id = makeRunId();
  const logDir = path.join(rootDir, ".symphony/logs/goal-loop-gui");
  fs.mkdirSync(logDir, { recursive: true });

  const promptPath = path.join(logDir, `${id}.prompt.md`);
  fs.writeFileSync(promptPath, `${prompt}\n`, "utf8");

  const runArgs = ["scripts/goal-loop.sh", "--max-loops", String(maxLoops)];
  if (auto) runArgs.push("--auto");
  if (agentCmd) runArgs.push("--agent", agentCmd);
  runArgs.push(promptPath);

  const run = {
    id,
    promptPath,
    startedAt: new Date().toISOString(),
    endedAt: null,
    done: false,
    exitCode: null,
    signal: null,
    output: "",
    command: `bash ${runArgs.map(shellWord).join(" ")}`,
    child: null,
    stopRequested: false,
    maxLoops,
    auto,
    agentCmd,
    chain,
    chainRemaining,
    push,
  };

  const child = spawn("bash", runArgs, {
    cwd: rootDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  run.child = child;
  runs.set(id, run);
  activeRunId = id;
  lastRunId = id;

  child.stdout.on("data", (chunk) => appendOutput(run, chunk));
  child.stderr.on("data", (chunk) => appendOutput(run, chunk));
  child.on("error", (error) => appendOutput(run, `\n[goal-loop-gui] ${error.message}\n`));
  child.on("close", (code, signal) => {
    run.done = true;
    run.exitCode = code;
    run.signal = signal;
    run.endedAt = new Date().toISOString();
    appendOutput(run, `\n[goal-loop-gui] exited code=${code} signal=${signal || ""}\n`);
    updateGoalStateFromRun(run);
    if (activeRunId === id) activeRunId = null;
    lastRunId = id;
    const startedNext = maybeStartNextRun(run);
    if (!startedNext) maybeCommitAndPush(run);
  });

  return run;
}

function maybeStartNextRun(run) {
  if (!run.chain || run.stopRequested || run.exitCode !== 0) return false;
  if (goalState.status !== "continue") return false;
  if (run.chainRemaining <= 1) return false;
  setTimeout(() => {
    try {
      startRun({
        promptMode: "advanced",
        prompt: buildContinuePrompt(goalState, ""),
        maxLoops: run.maxLoops,
        auto: run.auto,
        agentCmd: run.agentCmd,
        chain: true,
        chainRemaining: run.chainRemaining - 1,
        push: run.push,
      });
    } catch (error) {
      goalState = {
        ...goalState,
        status: "blocked",
        risks: mergeUnique(goalState.risks, [`자동 조종이 다음 실행을 시작하지 못했습니다: ${error.message || String(error)}`]),
        updatedAt: new Date().toISOString(),
      };
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(goalState, null, 2) + "\n", "utf8");
    }
  }, 1000).unref();
  return true;
}

function maybeCommitAndPush(run) {
  if (!run.push || run.stopRequested || run.exitCode !== 0) return;
  appendOutput(run, "\n[목표 루프 GUI] 커밋/푸시를 시작합니다.\n");
  const branch = gitOutput(["branch", "--show-current"]).trim() || "main";
  const beforeStatus = gitOutput(["status", "--porcelain"]).trim();
  if (!beforeStatus) {
    appendOutput(run, "[목표 루프 GUI] 커밋할 변경 사항이 없습니다.\n");
    return;
  }

  const add = runGit(["add", "-A", "--", "."]);
  appendOutput(run, add.output);
  if (add.status !== 0) {
    appendOutput(run, `[목표 루프 GUI] git add 실패: ${add.status}\n`);
    return;
  }

  const staged = gitOutput(["diff", "--cached", "--name-only"]).trim();
  if (!staged) {
    appendOutput(run, "[목표 루프 GUI] 배포에 올릴 staged 변경이 없습니다.\n");
    return;
  }

  const commit = runGit(["commit", "-m", "chore: update goal loop progress"]);
  appendOutput(run, commit.output);
  if (commit.status !== 0) {
    appendOutput(run, `[목표 루프 GUI] git commit 실패: ${commit.status}\n`);
    return;
  }

  const pushResult = runGit(["push", "origin", branch]);
  appendOutput(run, pushResult.output);
  if (pushResult.status !== 0) {
    appendOutput(run, `[목표 루프 GUI] git push 실패: ${pushResult.status}\n`);
    return;
  }
  appendOutput(run, `[목표 루프 GUI] origin/${branch}에 push 완료. Railway 배포가 시작될 수 있습니다.\n`);
}

function gitOutput(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return {
    status: result.status ?? 1,
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

function loadLatestRunFromLog() {
  const logDir = path.join(rootDir, ".symphony/logs/goal-loop");
  if (!fs.existsSync(logDir)) return;
  const files = fs
    .readdirSync(logDir)
    .filter((name) => /^\d{8}-\d{6}\.log$/.test(name))
    .sort();
  let latest = "";
  let output = "";
  for (const file of files.toReversed()) {
    const candidatePath = path.join(logDir, file);
    const candidateOutput = trimOutput(fs.readFileSync(candidatePath, "utf8"));
    const dashboard = parseDashboard(candidateOutput);
    const jsonState = parseJsonState(candidateOutput);
    if (
      dashboard.markers.length ||
      dashboard.completed.length ||
      dashboard.evidence.length ||
      dashboard.filesChanged.length ||
      jsonState.completed?.length ||
      jsonState.evidence?.length ||
      jsonState.filesChanged?.length
    ) {
      latest = file;
      output = candidateOutput;
      break;
    }
  }
  if (!latest) return;

  const id = latest.replace(".log", "").replace(/[-]/g, "");
  const logPath = path.join(logDir, latest);
  const run = {
    id,
    promptPath: path.join(logDir, latest.replace(".log", ".prompt.md")),
    startedAt: "",
    endedAt: "",
    done: true,
    exitCode: null,
    signal: null,
    output,
    command: "loaded from " + logPath,
    child: null,
  };
  runs.set(id, run);
  lastRunId = id;
  updateGoalStateFromRun(run);
}

function loadGoalState() {
  if (!fs.existsSync(statePath)) return emptyGoalState();
  try {
    return { ...emptyGoalState(), ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    return emptyGoalState();
  }
}

function emptyGoalState() {
  return {
    goal: "",
    status: "idle",
    lastRunId: "",
    updatedAt: "",
    completed: [],
    remaining: [],
    evidence: [],
    risks: [],
    filesChanged: [],
    nextSlice: "",
    runs: [],
  };
}

function updateGoalStateFromRun(run) {
  if (!run) return;
  const dashboard = parseDashboard(run.output || "");
  const jsonState = parseJsonState(run.output || "");
  const marker = dashboard.markers.at(-1) || "";
  const runSummary = {
    id: run.id,
    startedAt: run.startedAt || "",
    endedAt: run.endedAt || "",
    result: jsonState.result || dashboard.result || marker || (run.done ? "finished" : "running"),
    marker,
    nextSlice: jsonState.nextSlice || dashboard.nextSlice || "",
  };

  goalState = {
    ...goalState,
    goal: jsonState.goal || dashboard.goal || goalState.goal,
    status: run.done ? statusFromMarker(marker, runSummary.result) : "running",
    lastRunId: run.id || goalState.lastRunId,
    updatedAt: new Date().toISOString(),
    completed: mergeUnique(goalState.completed, jsonState.completed, dashboard.completed),
    remaining: latestNonEmpty(jsonState.remaining, dashboard.remaining, goalState.remaining),
    evidence: mergeUnique(goalState.evidence, jsonState.evidence, dashboard.evidence),
    risks: mergeUnique(goalState.risks, jsonState.risks, dashboard.risks),
    filesChanged: mergeUnique(goalState.filesChanged, jsonState.filesChanged, dashboard.filesChanged),
    nextSlice: jsonState.nextSlice || dashboard.nextSlice || goalState.nextSlice,
    runs: [...(goalState.runs || []).filter((item) => item.id !== run.id), runSummary].slice(-20),
  };

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(goalState, null, 2) + "\n", "utf8");
}

function parseJsonState(output) {
  const text = String(output || "");
  const fenced = [...text.matchAll(/```json\s*([\s\S]*?)```/g)]
    .map((match) => match[1])
    .filter((body) => body.includes("nextSlice") || body.includes("filesChanged") || body.includes("completed"));
  const raw = fenced.at(-1);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return {
      goal: stringValue(parsed.goal),
      completed: arrayValue(parsed.completed),
      remaining: arrayValue(parsed.remaining),
      evidence: arrayValue(parsed.evidence),
      risks: arrayValue(parsed.risks),
      nextSlice: stringValue(parsed.nextSlice),
      result: stringValue(parsed.result),
      filesChanged: arrayValue(parsed.filesChanged),
    };
  } catch {
    return {};
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function mergeUnique(...groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const value = String(item || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }
  }
  return out.slice(-40);
}

function latestNonEmpty(...groups) {
  for (const group of groups) {
    if (Array.isArray(group) && group.length) return mergeUnique(group);
  }
  return [];
}

function statusFromMarker(marker, result) {
  if (marker === "GOAL_LOOP_DONE") return "done";
  if (marker === "GOAL_LOOP_BLOCKED") return "blocked";
  if (marker === "GOAL_LOOP_HUMAN_REVIEW") return "human_review";
  if (/blocked/i.test(result || "")) return "blocked";
  if (/done|complete/i.test(result || "")) return "done";
  if (/continue/i.test(result || "")) return "continue";
  return "idle";
}

function buildContinuePrompt(state, fallbackGoal) {
  const goal = state.goal || String(fallbackGoal || "").trim();
  if (!goal) throw new Error("이어갈 저장된 목표가 없습니다. 먼저 목표를 시작해 주세요.");
  return `Goal Loop로 계속 진행해줘. 이 실행은 기존 goal-state를 이어받는 다음 slice다.

Goal:
- ${goal}

Completed so far:
${formatItems(state.completed)}

Remaining:
${formatItems(state.remaining.length ? state.remaining : ["이전 run의 dashboard와 diff를 보고 다음으로 가장 가치 있는 slice를 정한다."])}

Evidence so far:
${formatItems(state.evidence)}

Known risks:
${formatItems(state.risks)}

Suggested next slice:
- ${state.nextSlice || "가장 작은 다음 구현/검증 slice를 선택한다."}

Rules:
- 실제 코드 변경 또는 검증을 하나의 bounded slice로 수행한다.
- 전체 goal이 아직 남아 있으면 stop marker를 출력하지 말고 Continue: yes로 끝낸다.
- 전체 goal이 완료됐거나 사람 검토가 필요한 경계에 도달했을 때만 stop marker를 출력한다.
- 마지막에 Goal Loop Check와 아래 필드를 가진 GOAL_LOOP_STATE_JSON fenced json block을 출력한다:
  {"goal":"","completed":[],"remaining":[],"evidence":[],"risks":[],"nextSlice":"","result":"continue|human_review|done|blocked","filesChanged":[]}`;
}

function buildVerifyPrompt(state, fallbackGoal) {
  const goal = state.goal || String(fallbackGoal || "").trim() || "현재 Goal Loop 변경의 모바일 UX 검증";
  return `Goal Loop 검증 slice로 진행해줘.

Goal:
- ${goal}

Verification target:
- 375px 모바일 viewport에서 최근 모바일 UX 변경이 겹침/잘림/CTA 위치 문제 없이 보이는지 확인한다.
- 가능하면 dev server와 Playwright/mobile screenshot 검증을 실행한다.
- 환경 제약으로 브라우저 검증이 불가능하면, 이유와 대체 검증을 명확히 남긴다.

Recent files:
${formatItems(state.filesChanged)}

Rules:
- 검증과 필요한 최소 수정만 수행한다.
- Detour/API/provider 계약은 변경하지 않는다.
- 마지막에 Goal Loop Check와 아래 필드를 가진 GOAL_LOOP_STATE_JSON fenced json block을 출력한다:
  {"goal":"","completed":[],"remaining":[],"evidence":[],"risks":[],"nextSlice":"","result":"continue|human_review|done|blocked","filesChanged":[]}`;
}

function formatItems(items) {
  const list = Array.isArray(items) && items.length ? items : ["없음"];
  return list.map((item) => `- ${item}`).join("\n");
}

function stopChild(run) {
  if (!run.child || run.done) return;
  run.stopRequested = true;
  try {
    if (process.platform !== "win32") {
      process.kill(-run.child.pid, "SIGTERM");
    } else {
      run.child.kill("SIGTERM");
    }
  } catch {
    try {
      run.child.kill("SIGTERM");
    } catch {
      // Process may have already exited.
    }
  }

  setTimeout(() => {
    if (!run.done && run.child) {
      try {
        if (process.platform !== "win32") {
          process.kill(-run.child.pid, "SIGKILL");
        } else {
          run.child.kill("SIGKILL");
        }
      } catch {
        // Process may have already exited.
      }
    }
  }, 3000).unref();
}

function appendOutput(run, chunk) {
  run.output = trimOutput(run.output + chunk.toString());
}

function trimOutput(output) {
  const text = String(output || "");
  return text.length > 250000 ? text.slice(-200000) : text;
}

function serializeRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    promptPath: run.promptPath,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    done: run.done,
    exitCode: run.exitCode,
    signal: run.signal,
    command: run.command,
    output: run.output,
    dashboard: parseDashboard(run.output),
  };
}

function parseDashboard(output) {
  const text = String(output || "");
  const check = lastSection(text, "## Goal Loop Check") || lastSection(text, "**Goal Loop Check**");
  const closeout = lastSection(text, "## Goal Loop Closeout") || lastSection(text, "**Goal Loop Closeout**");
  const markers = extractStopMarkers(text);

  const completed = parseListField(check, "Completed Criteria");
  const remaining = parseListField(check, "Remaining Criteria");
  const evidence = parseListField(check, "Evidence");
  const risks = parseListField(check, "New Risks");
  const nextSlice = parseScalarField(check, "Next Slice");
  const continueState = parseScalarField(check, "Continue");
  const filesChanged = parseListField(closeout, "Files Changed");
  const result = parseScalarField(closeout, "Result");
  const route = parseScalarField(closeout, "Route");
  const goal = parseScalarField(closeout, "Goal") || parsePromptGoal(text);
  const sliceMatches = [...text.matchAll(/== Goal Loop slice\s+(\d+)\/(\d+)\s+==/g)];
  const currentSlice = sliceMatches.length ? sliceMatches.at(-1)[1] : "";
  const maxSlices = sliceMatches.length ? sliceMatches.at(-1)[2] : "";

  return {
    goal,
    route,
    result,
    markers,
    completed,
    remaining,
    evidence,
    risks,
    nextSlice,
    continueState,
    filesChanged,
    currentSlice,
    maxSlices,
  };
}

function lastSection(text, heading) {
  const start = text.lastIndexOf(heading);
  if (start === -1) return "";
  const rest = text.slice(start + heading.length);
  const next = rest.search(/\n##\s+/);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function parseListField(section, label) {
  const block = parseFieldBlock(section, label);
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith("-") || line.startsWith("  -"))
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseScalarField(section, label) {
  const block = parseFieldBlock(section, label);
  if (!block) return "";
  const first = block
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return first ? first.replace(/^\s*-\s*/, "").trim() : "";
}

function parseFieldBlock(section, label) {
  if (!section) return "";
  const pattern = new RegExp(`(?:^|\\n)-\\s+${escapeRegExp(label)}:\\s*`);
  const match = pattern.exec(section);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = section.slice(start);
  const next = rest.search(/\n-\s+[A-Za-z0-9가-힣 /()_-]+:/);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function parsePromptGoal(text) {
  const match = text.match(/\nGoal:\n-\s+(.+?)(?:\n\n|\nDone when:)/s);
  return match ? match[1].trim().split("\n")[0] : "";
}

function extractStopMarkers(text) {
  return [...String(text || "").matchAll(/^[ \t]*(GOAL_LOOP_DONE|GOAL_LOOP_BLOCKED|GOAL_LOOP_HUMAN_REVIEW)(?::|[ \t]|$)/gm)]
    .map((match) => match[1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGoalPrompt(goal) {
  const cleanGoal = String(goal || "").trim();
  if (!cleanGoal) return "";
  if (/Goal Loop로 진행해줘|^Goal:/m.test(cleanGoal)) return cleanGoal;

  return `Goal Loop로 진행해줘. 이 목표를 운영 대상으로 보고, 전체 목표가 끝날 때까지 여러 bounded slice로 나눠 계속 진행해줘.

Goal:
- ${cleanGoal}

Done when:
- 전체 목표를 달성하기 위한 현재 상태와 남은 작업을 판단한다.
- 매 slice마다 가장 효과 큰 다음 구현 범위를 하나만 선택한다.
- 선택한 slice는 실제 코드 변경과 검증까지 수행한다.
- 375px 모바일 viewport에서 텍스트, 버튼, 패널이 겹치지 않도록 한다.
- Detour score 계산식과 정렬 기준은 근거 없이 변경하지 않는다.
- API response shape와 map-provider abstraction은 근거 없이 변경하지 않는다.
- 각 slice 끝에는 완료한 일, 남은 일, 다음 slice를 정리한다.
- 각 slice 끝에는 아래 필드를 가진 GOAL_LOOP_STATE_JSON fenced json block을 출력한다:
  {"goal":"","completed":[],"remaining":[],"evidence":[],"risks":[],"nextSlice":"","result":"continue|human_review|done|blocked","filesChanged":[]}
- 전체 목표가 아직 남아 있으면 stop marker를 출력하지 말고 Continue: yes로 끝낸다.
- 전체 목표가 완료됐거나 사람이 검토해야 할 경계에 도달했을 때만 \`GOAL_LOOP_HUMAN_REVIEW\`를 출력한다.

Constraints:
- 네이버 지도 UI를 픽셀 단위로 베끼거나 브랜드 요소를 복제하지 않는다.
- 전체 앱 리디자인을 한 번에 하지 않는다.
- 각 slice에서는 목표와 직접 관련된 가장 작은 범위만 구현한다.
- secret/env/API key는 노출하지 않는다.
- destructive action은 사용자 승인 없이 하지 않는다.
- 파일 전문을 길게 출력하지 말고 변경 요약과 파일 경로 중심으로 보고한다.
- 한 slice가 끝났다는 이유만으로 \`GOAL_LOOP_HUMAN_REVIEW\`를 출력하지 않는다.
- 남은 구현 slice가 명확하면 다음 slice를 계속 진행한다.

Preferred evidence:
- 변경 파일 목록
- npm run type-check 또는 실행 불가 사유
- 관련 테스트 또는 수동 검증 포인트
- 375px 모바일 확인 포인트
- 다음 slice 제안`;
}

function hasUnfilledTemplate(prompt) {
  return /(^|\n)\s*-\s*\.\.\.\s*(\n|$)/.test(prompt) || /<[^>\n]+>/.test(prompt);
}

function pageHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MidWayDer 목표 루프</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0f14;
      --panel: #121821;
      --panel-soft: #171f2a;
      --field: #0f151d;
      --text: #e7edf4;
      --muted: #94a3b8;
      --line: #273241;
      --accent: #14b8a6;
      --accent-strong: #2dd4bf;
      --danger: #fb7185;
      --code: #080c10;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    main {
      display: grid;
      grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr);
      gap: 18px;
      width: min(1360px, calc(100vw - 32px));
      margin: 16px auto;
      height: calc(100vh - 32px);
      min-height: 640px;
      overflow: hidden;
    }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      min-width: 0;
      overflow: hidden;
    }
    .form, .output {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h1, h2 {
      margin: 0;
      font-size: 16px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .status {
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }
    .status-wrap {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }
    .traffic {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 7px;
      background: var(--field);
    }
    .lamp {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      opacity: 0.22;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
    }
    .lamp.red { background: #fb7185; }
    .lamp.yellow { background: #facc15; }
    .lamp.green { background: #22c55e; }
    .lamp.on {
      opacity: 1;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.06), 0 0 16px currentColor;
    }
    .lamp.green.on {
      color: #22c55e;
      animation: pulseLamp 1.4s ease-in-out infinite;
    }
    .lamp.yellow.on { color: #facc15; }
    .lamp.red.on { color: #fb7185; }
    @keyframes pulseLamp {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.16); }
    }
    .body {
      padding: 14px 16px;
      display: grid;
      gap: 12px;
      min-height: 0;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    textarea, input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--text);
      background: var(--field);
      font: inherit;
      line-height: 1.45;
      padding: 10px 11px;
    }
    textarea {
      min-height: 430px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    .modebar {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .modebar button {
      padding: 7px 10px;
      font-size: 13px;
    }
    .modebar button.active {
      background: rgba(20, 184, 166, 0.16);
      border-color: rgba(45, 212, 191, 0.52);
      color: var(--accent-strong);
    }
    .row {
      display: grid;
      grid-template-columns: 120px 120px 1fr;
      gap: 10px;
      align-items: end;
    }
    .checkrow {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      font-size: 13px;
    }
    .checkrow input { width: 18px; height: 18px; }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 0 16px 16px;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--field);
      color: var(--text);
      padding: 9px 12px;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #06231f;
    }
    button.primary:hover { background: var(--accent-strong); }
    button.danger {
      color: var(--danger);
      border-color: rgba(251, 113, 133, 0.42);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    pre {
      flex: 1;
      min-height: 0;
      max-height: 100%;
      margin: 0;
      padding: 14px 16px;
      background: var(--code);
      color: #d7e0ea;
      overflow: scroll;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre;
      word-break: normal;
    }
    .meta {
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      padding: 10px 16px;
      min-height: 38px;
    }
    .dashboard {
      border-bottom: 1px solid var(--line);
      padding: 12px 14px;
      display: grid;
      gap: 10px;
      max-height: 42%;
      overflow: auto;
      background: #0f151d;
    }
    .dash-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .dash-card {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-soft);
      padding: 9px 10px;
      min-width: 0;
    }
    .dash-card.full { grid-column: 1 / -1; }
    .dash-title {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.2;
    }
    .dash-value {
      margin: 0;
      color: var(--text);
      font-size: 13px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .dash-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 5px;
    }
    .dash-list li {
      color: var(--text);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .dash-empty {
      color: var(--muted);
      font-size: 12px;
    }
    .pillrow {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pill {
      border: 1px solid rgba(45, 212, 191, 0.36);
      border-radius: 999px;
      padding: 4px 8px;
      color: #99f6e4;
      background: rgba(20, 184, 166, 0.12);
      font-size: 12px;
      line-height: 1.1;
    }
    @media (max-width: 880px) {
      main {
        grid-template-columns: 1fr;
        height: auto;
        min-height: calc(100vh - 32px);
        overflow: visible;
      }
      .form { min-height: 0; height: auto; }
      .output { height: min(620px, 75vh); min-height: 420px; }
      .dashboard { max-height: 260px; }
      .dash-grid { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="form">
      <header>
        <h1>MidWayDer 목표 루프</h1>
        <div class="status-wrap">
          <div id="traffic" class="traffic" title="회색은 대기 또는 완료, 초록은 실행 중, 노랑은 이어갈 수 있는 대기 상태, 빨강은 막힘 상태입니다." aria-label="Goal Loop 상태 신호등">
            <span id="lampRed" class="lamp red" aria-hidden="true"></span>
            <span id="lampYellow" class="lamp yellow" aria-hidden="true"></span>
            <span id="lampGreen" class="lamp green" aria-hidden="true"></span>
          </div>
          <span id="runState" class="status">대기</span>
        </div>
      </header>
      <div class="body">
        <div class="modebar" aria-label="입력 방식">
          <button id="goalMode" class="active" type="button" title="짧은 목표 한 줄만 입력하는 기본 모드입니다. 목표 루프가 자동으로 실행 프롬프트를 만들어 줍니다.">목표</button>
          <button id="advancedMode" type="button" title="Done when, Constraints 같은 상세 조건까지 직접 적는 고급 입력 모드입니다.">상세 프롬프트</button>
        </div>
        <label title="하고 싶은 목표를 적는 곳입니다. 기본 모드에서는 한 문장만 넣어도 됩니다."><span id="promptLabel">목표</span>
          <textarea id="prompt" spellcheck="false" title="예: MidWayDer 모바일 UX를 375px 기준으로 계속 개선해줘."></textarea>
        </label>
        <div class="row">
          <label title="한 번의 실행 안에서 Codex가 몇 개의 작은 작업 단위까지 이어서 처리할지 정합니다. 보통 10이면 충분합니다.">한 실행 안의 최대 루프
            <input id="maxLoops" type="number" min="1" max="20" value="10" title="값이 클수록 한 번 누른 뒤 더 오래 작업합니다. 너무 크게 잡으면 검토 전 변경이 많아질 수 있습니다." />
          </label>
          <label title="실행이 끝났는데 상태가 '이어가기 가능'이면 다음 실행을 자동으로 몇 번까지 이어갈지 정합니다.">자동 실행 횟수
            <input id="chainLimit" type="number" min="1" max="20" value="5" title="버튼을 다시 누르지 않고 이어달릴 최대 횟수입니다. 크게 잡을수록 더 자동화되지만 중간 검토 기회는 줄어듭니다." />
          </label>
          <label title="목표 루프를 실제로 수행할 명령입니다. 비워두면 기본 Codex 실행 명령을 사용합니다.">실행 명령
            <input id="agentCmd" placeholder="codex exec --cd '${escapeHtml(rootDir)}' --sandbox workspace-write -" title="고급 사용자용입니다. 특별한 이유가 없으면 비워두거나 기본값 그대로 두면 됩니다." />
          </label>
        </div>
        <label class="checkrow" title="한 실행 안에서 다음 작은 작업으로 넘어갈 때 매번 물어보지 않고 자동으로 진행합니다.">
          <input id="auto" type="checkbox" checked title="켜두면 한 실행 안에서 다음 작은 작업으로 자동 진행합니다." />
          실행 안에서 자동으로 이어가기
        </label>
        <label class="checkrow" title="한 실행이 끝난 뒤에도 상태가 '이어가기 가능'이면 다음 실행을 자동으로 시작합니다. 사람 검토, 막힘, 완료 상태에서는 멈춥니다.">
          <input id="autopilot" type="checkbox" checked title="켜두면 다음 실행까지 자동으로 이어갑니다. 사람 검토, 막힘, 완료 상태에서는 멈춥니다." />
          자동 조종: 검토가 필요할 때까지 계속 실행
        </label>
        <label class="checkrow" title="실행이 멈춘 뒤 변경 사항을 자동으로 커밋하고 현재 브랜치를 origin에 push합니다. Railway가 GitHub 연동이면 배포가 이어서 시작됩니다.">
          <input id="push" type="checkbox" checked title="켜두면 작업 종료 시 git add, commit, push를 자동으로 실행합니다. .symphony 로그와 screenlog.0은 제외합니다." />
          완료 후 자동 커밋/푸시
        </label>
      </div>
      <div class="actions">
        <button id="loadTemplate" title="상세 프롬프트용 템플릿을 불러옵니다. 목표, 완료 조건, 제약 조건을 직접 세밀하게 적고 싶을 때 씁니다.">템플릿 불러오기</button>
        <button id="start" class="primary" title="입력한 목표로 목표 루프를 시작합니다. 자동 조종이 켜져 있으면 이후 실행도 자동으로 이어갑니다.">시작</button>
        <button id="continue" disabled title="저장된 이전 목표 상태를 이어받아 다음 작은 작업을 진행합니다. 노란불 상태에서 주로 사용합니다.">다음 작업 이어가기</button>
        <button id="verify" disabled title="최근 변경이 375px 모바일 화면에서 겹치거나 잘리지 않는지 검증하는 작업을 시작합니다.">375px 검증</button>
        <button id="stop" class="danger" disabled title="현재 실행 중인 목표 루프와 그 하위 Codex 프로세스를 중지합니다.">중지</button>
      </div>
    </section>
    <section class="output">
      <header>
        <h2 title="Codex 실행 로그입니다. 긴 줄은 줄바꿈하지 않고 가로 스크롤로 확인합니다.">실행 로그</h2>
        <span id="runId" class="status">실행 없음</span>
      </header>
      <div id="dashboard" class="dashboard"></div>
      <pre id="output"></pre>
      <div id="meta" class="meta"></div>
    </section>
  </main>
  <script>
    const promptEl = document.getElementById("prompt");
    const outputEl = document.getElementById("output");
    const runStateEl = document.getElementById("runState");
    const runIdEl = document.getElementById("runId");
    const metaEl = document.getElementById("meta");
    const dashboardEl = document.getElementById("dashboard");
    const startButton = document.getElementById("start");
    const continueButton = document.getElementById("continue");
    const verifyButton = document.getElementById("verify");
    const stopButton = document.getElementById("stop");
    const lampRed = document.getElementById("lampRed");
    const lampYellow = document.getElementById("lampYellow");
    const lampGreen = document.getElementById("lampGreen");
    const goalModeButton = document.getElementById("goalMode");
    const advancedModeButton = document.getElementById("advancedMode");
    const promptLabel = document.getElementById("promptLabel");
    let promptMode = "goal";
    let currentRunId = null;
    let timer = null;

    async function loadTemplate() {
      const res = await fetch("/api/template");
      const data = await res.json();
      setPromptMode("advanced");
      promptEl.value = data.prompt || "";
    }

    async function startRun() {
      outputEl.textContent = "";
      if (!promptEl.value.trim()) {
        throw new Error(promptMode === "goal" ? "목표를 입력해야 합니다." : "프롬프트를 입력해야 합니다.");
      }
      if (promptMode === "advanced" && hasUnfilledTemplate(promptEl.value)) {
        throw new Error("템플릿의 빈 항목이 아직 남아 있습니다. 시작하기 전에 모든 ... 항목을 구체적으로 채워 주세요.");
      }
      const payload = {
        prompt: promptEl.value,
        promptMode,
        maxLoops: Number(document.getElementById("maxLoops").value || 3),
        chainLimit: Number(document.getElementById("chainLimit").value || 5),
        agentCmd: document.getElementById("agentCmd").value,
        auto: document.getElementById("auto").checked,
        chain: document.getElementById("autopilot").checked,
        push: document.getElementById("push").checked,
      };
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "시작하지 못했습니다.");
      currentRunId = data.id;
      updateControls(true, data.goalState);
      poll();
      timer = setInterval(poll, 1000);
    }

    async function continueRun() {
      return startManagedRun("/api/continue");
    }

    async function verifyRun() {
      return startManagedRun("/api/verify");
    }

    async function startManagedRun(endpoint) {
      outputEl.textContent = "";
      const payload = {
        goal: promptEl.value,
        maxLoops: Number(document.getElementById("maxLoops").value || 3),
        chainLimit: Number(document.getElementById("chainLimit").value || 5),
        agentCmd: document.getElementById("agentCmd").value,
        auto: document.getElementById("auto").checked,
        chain: document.getElementById("autopilot").checked,
        push: document.getElementById("push").checked,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "시작하지 못했습니다.");
      currentRunId = data.id;
      updateControls(true, data.goalState);
      poll();
      timer = setInterval(poll, 1000);
    }

    async function stopRun() {
      await fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentRunId }),
      });
      poll();
    }

    async function poll() {
      const statusUrl = currentRunId ? "/api/status?id=" + encodeURIComponent(currentRunId) : "/api/status";
      const res = await fetch(statusUrl);
      const data = await res.json();
      const run = data.run;
      const isRunning = Boolean(run && !run.done);
      if (run) {
        outputEl.textContent = run.output || "";
        outputEl.scrollTop = outputEl.scrollHeight;
        runIdEl.textContent = run.id;
        metaEl.textContent = run.command + (run.promptPath ? " | " + run.promptPath : "");
      } else {
        runIdEl.textContent = "실행 없음";
        metaEl.textContent = "";
      }
      const dashboard = normalizeDashboard(data.goalState || {}, run ? run.dashboard || {} : {});
      renderDashboard(dashboard);
      const visibleStatus = isRunning ? "running" : (dashboard.status || "idle");
      runStateEl.textContent = statusLabel(visibleStatus);
      renderSignal(visibleStatus);
      updateControls(isRunning, data.goalState);
      if (run && run.done) {
        currentRunId = null;
        if (timer) clearInterval(timer);
        timer = null;
      }
    }

    function normalizeDashboard(state, runDashboard) {
      const dashboard = runDashboard || {};
      return {
        goal: state.goal || dashboard.goal || "",
        status: state.status || "",
        route: dashboard.route || "",
        result: dashboard.result || state.status || "",
        markers: dashboard.markers || [],
        completed: state.completed && state.completed.length ? state.completed : dashboard.completed,
        remaining: state.remaining && state.remaining.length ? state.remaining : dashboard.remaining,
        evidence: state.evidence && state.evidence.length ? state.evidence : dashboard.evidence,
        risks: state.risks && state.risks.length ? state.risks : dashboard.risks,
        nextSlice: state.nextSlice || dashboard.nextSlice || "",
        filesChanged: state.filesChanged && state.filesChanged.length ? state.filesChanged : dashboard.filesChanged,
        currentSlice: dashboard.currentSlice || "",
        maxSlices: dashboard.maxSlices || "",
        updatedAt: state.updatedAt || "",
        lastRunId: state.lastRunId || "",
      };
    }

    function updateControls(isRunning, state) {
      const hasSavedGoal = Boolean(state && state.goal);
      startButton.disabled = isRunning;
      continueButton.disabled = isRunning || !hasSavedGoal;
      verifyButton.disabled = isRunning || !hasSavedGoal;
      stopButton.disabled = !isRunning;
    }

    function renderSignal(status) {
      const state = String(status || "idle").toLowerCase();
      lampRed.classList.toggle("on", state === "blocked");
      lampYellow.classList.toggle("on", state === "continue" || state === "human_review");
      lampGreen.classList.toggle("on", state === "running");
      const description = {
        running: "초록: 지금 Codex가 실행 중입니다. 로그가 계속 늘어날 수 있습니다.",
        continue: "노랑: 현재는 멈춰 있지만 다음 작업을 이어갈 수 있습니다.",
        human_review: "노랑: 사람 검토가 필요한 상태입니다. 현황판과 변경 파일을 확인하세요.",
        blocked: "빨강: 막힌 상태입니다. 위험/주의 또는 실행 로그에서 이유를 확인하세요.",
        done: "회색: 목표가 완료된 상태입니다.",
        idle: "회색: 아직 실행 중인 작업이 없습니다.",
      };
      document.getElementById("traffic").title = description[state] || description.idle;
    }

    function statusLabel(status) {
      const labels = {
        running: "실행 중",
        continue: "이어가기 가능",
        human_review: "사람 검토 필요",
        blocked: "막힘",
        done: "완료",
        idle: "대기",
        finished: "종료됨",
      };
      return labels[String(status || "idle").toLowerCase()] || String(status || "대기");
    }

    function renderDashboard(dashboard) {
      const markers = dashboard.markers || [];
      const slice = dashboard.currentSlice && dashboard.maxSlices
        ? dashboard.currentSlice + "/" + dashboard.maxSlices
        : "시작 전";
      const updated = dashboard.updatedAt ? new Date(dashboard.updatedAt).toLocaleString() : "";
      dashboardEl.innerHTML = [
        '<div class="dash-grid">',
        card("목표", dashboard.goal || "불러온 목표 없음", "full", "현재 목표 루프가 추적 중인 전체 목표입니다."),
        card("상태", statusLabel(dashboard.status || "idle"), "", "실행 중인지, 이어갈 수 있는지, 검토가 필요한지 보여줍니다."),
        card("루프 위치", slice, "", "현재 실행 안에서 몇 번째 작은 작업인지 보여줍니다."),
        card("경로 / 결과", [dashboard.route, dashboard.result].filter(Boolean).join(" / ") || "실행 중 또는 결과 없음", "", "목표 루프가 판단한 처리 경로와 마무리 결과입니다."),
        card("마지막 실행", [dashboard.lastRunId, updated].filter(Boolean).join(" | ") || "없음", "full", "가장 최근 실행 id와 갱신 시각입니다."),
        listCard("완료한 일", dashboard.completed, "", "지금까지 완료된 조건과 구현 내용을 누적해서 보여줍니다."),
        listCard("남은 일", dashboard.remaining, "", "아직 남아 있는 작업이나 검증 항목입니다."),
        listCard("검증 증거", dashboard.evidence, "", "테스트 통과, 타입 체크, 수동 확인 같은 근거입니다."),
        listCard("위험/주의", dashboard.risks, "", "실패한 검증, 환경 제약, 조심해야 할 계약을 보여줍니다."),
        card("다음 작업", dashboard.nextSlice || "아직 정해지지 않음", "full", "다음에 이어서 실행할 가장 작은 작업 단위입니다."),
        listCard("변경 파일", dashboard.filesChanged, "full", "이번 목표 진행 중 수정되었거나 관련된 파일 목록입니다."),
        '<div class="dash-card full" title="목표 루프가 명시적으로 멈추는 신호입니다. 완료는 전체 목표 완료, 막힘은 진행 불가, 사람 검토는 사용자가 확인해야 하는 상태입니다."><p class="dash-title">종료 신호</p><div class="pillrow">',
        markers.length ? markers.map((marker) => '<span class="pill">' + escapeHtmlClient(markerLabel(marker)) + '</span>').join("") : '<span class="dash-empty">아직 없음</span>',
        '</div></div>',
        '</div>',
      ].join("");
    }

    function card(title, value, extraClass, help) {
      return '<div class="dash-card ' + (extraClass || "") + '" title="' + escapeHtmlClient(help || title) + '"><p class="dash-title">' +
        escapeHtmlClient(title) + '</p><p class="dash-value">' + escapeHtmlClient(value) + '</p></div>';
    }

    function listCard(title, items, extraClass, help) {
      const list = Array.isArray(items) ? items.filter(Boolean) : [];
      return '<div class="dash-card ' + (extraClass || "") + '" title="' + escapeHtmlClient(help || title) + '"><p class="dash-title">' +
        escapeHtmlClient(title) + '</p>' +
        (list.length
          ? '<ul class="dash-list">' + list.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("") + '</ul>'
          : '<span class="dash-empty">아직 없음</span>') +
        '</div>';
    }

    function markerLabel(marker) {
      const labels = {
        GOAL_LOOP_DONE: "완료",
        GOAL_LOOP_BLOCKED: "막힘",
        GOAL_LOOP_HUMAN_REVIEW: "사람 검토",
      };
      return labels[marker] || marker;
    }

    function escapeHtmlClient(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function setPromptMode(nextMode) {
      promptMode = nextMode === "advanced" ? "advanced" : "goal";
      goalModeButton.classList.toggle("active", promptMode === "goal");
      advancedModeButton.classList.toggle("active", promptMode === "advanced");
      promptLabel.textContent = promptMode === "goal" ? "목표" : "상세 프롬프트";
      promptEl.placeholder = promptMode === "goal"
        ? "예: 미드웨이더 모바일 UX를 네이버 지도처럼 익숙한 지도 앱 패턴에 가깝게 계속 개선해줘"
        : "목표 루프 전체 프롬프트를 직접 작성";
    }

    document.getElementById("loadTemplate").addEventListener("click", () => loadTemplate().catch(showError));
    startButton.addEventListener("click", () => startRun().catch(showError));
    continueButton.addEventListener("click", () => continueRun().catch(showError));
    verifyButton.addEventListener("click", () => verifyRun().catch(showError));
    stopButton.addEventListener("click", () => stopRun().catch(showError));
    goalModeButton.addEventListener("click", () => setPromptMode("goal"));
    advancedModeButton.addEventListener("click", () => setPromptMode("advanced"));

    function showError(error) {
      outputEl.textContent += "\\n[goal-loop-gui] " + (error.message || String(error)) + "\\n";
    }

    function hasUnfilledTemplate(prompt) {
      return /(^|\\n)\\s*-\\s*\\.\\.\\.\\s*(\\n|$)/.test(prompt) || /<[^>\\n]+>/.test(prompt);
    }

    setPromptMode("goal");
    renderDashboard({});
    renderSignal("idle");
    poll().catch(showError);
  </script>
</body>
</html>`;
}

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function makeRunId() {
  const base = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
  if (!runs.has(base)) return base;
  let suffix = 1;
  while (runs.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value || fallback);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 100);
}

function shellWord(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function findRepoRoot() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "AGENTS.md"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function sendHtml(res, html) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
