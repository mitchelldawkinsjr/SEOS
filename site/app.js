const STEPS = [
  {
    id: "intent",
    label: "Intent",
    conceptual: "A human decides what should change and why.",
    irl: "You open a GitHub issue. Auto applies needs-spec unless you opted out with no-agent.",
    actor: "human",
    gate: "Gate 0 — you open the issue",
  },
  {
    id: "planning",
    label: "Planning",
    conceptual: "The Planning Agent turns intent into a concrete, reviewable spec.",
    irl: "issue-auto-triage / issue-spec.yml calls OpenAI with composed ai-spec-context.md, posts a Spec comment, and applies spec-added.",
    actor: "agent",
  },
  {
    id: "spec-ready",
    label: "Ready",
    conceptual: "Work is approved to enter implementation.",
    irl: "Default: auto-ready after the spec. With agent-manual (or AGENT_AUTO_READY_ENABLED=false), you add the ready label yourself.",
    actor: "system",
    gate: "Gate 1 — optional human pause",
  },
  {
    id: "route",
    label: "Route",
    conceptual: "The Agent Runtime chooses where implementation runs.",
    irl: "packages/dispatch reads seos.yml. cursor-only goes straight to Cursor Cloud. local-first posts a job to the VPS control plane.",
    actor: "system",
  },
  {
    id: "implement",
    label: "Implement",
    conceptual: "The Coding Agent produces a small, reversible change.",
    irl: "Local-first: VPS queues → Mac worker claims → local model codes and tests. Fallback statuses escalate to Cursor Cloud with a branch-preserving handoff.",
    actor: "agent",
  },
  {
    id: "pr",
    label: "Draft PR",
    conceptual: "Implementation is visible and reviewable.",
    irl: "The agent opens a draft PR with Fixes #N and applies pr-opened. It never merges.",
    actor: "agent",
  },
  {
    id: "merge",
    label: "Merge",
    conceptual: "Only a human ships to main.",
    irl: "You review the diff and CI. Merge is always a human gate.",
    actor: "human",
    gate: "Gate 2 — always human",
  },
];

const LAYERS = [
  {
    layer: "Core Runtime",
    concept: "Orchestration entry point",
    today: "Workflows + dispatch scripts",
  },
  {
    layer: "Workflow Engine",
    concept: "Triggers and sequences work",
    today: "GitHub Actions (issue-*.yml)",
  },
  {
    layer: "Context Engine",
    concept: "Repo-specific agent context",
    today: "AGENT.md + rules → agent:compose",
  },
  {
    layer: "Agent Runtime",
    concept: "Dispatch bounded roles",
    today: "OpenAI (spec) + @seos/dispatch",
  },
  {
    layer: "Knowledge Engine",
    concept: "Capture and reuse lessons",
    today: "agent-knowledge/ scaffold",
  },
  {
    layer: "Plugin System",
    concept: "Stack adapters via config",
    today: "vite-react · nextjs · generic",
  },
  {
    layer: "Repository layer",
    concept: "Product-specific config only",
    today: "Consumer .github/seos.yml + AGENT.md",
  },
];

const TOPO = [
  {
    id: "human",
    title: "You",
    role: "Permanent gates",
    detail:
      "Open issues. Optionally pause on ready. Always review and merge. Own secrets, production, and product direction.",
  },
  {
    id: "github",
    title: "GitHub Actions",
    role: "Event source",
    detail:
      "Issue and label events drive the pipeline. Spec and implement are chained in one workflow because bot-applied labels do not re-trigger other workflows.",
  },
  {
    id: "vps",
    title: "Control plane",
    role: "Local-first queue",
    detail:
      "Optional VPS service that accepts implement jobs, tracks worker heartbeats, assigns work when a Mac is healthy, and escalates to Cursor Cloud on failure.",
  },
  {
    id: "mac",
    title: "Mac worker",
    role: "Local implementer",
    detail:
      "Registers with capabilities, claims one heavy job at a time, runs planning/coding/testing locally, and returns a structured result for success or fallback.",
  },
  {
    id: "cursor",
    title: "Cursor Cloud",
    role: "Default / fallback",
    detail:
      "Default implement path today, or escalation when the Mac is offline, times out, or fails validation. Continues from the local branch with a preserved handoff.",
  },
  {
    id: "consumer",
    title: "Consumer repo",
    role: "Product surface",
    detail:
      "Your application installs SEOS. Product rules and knowledge live here. The framework never imports product logic — Fasted is the first proving ground.",
  },
];

const state = {
  stepIndex: 0,
  strategy: "local-first",
  gateMode: "auto",
  mac: "healthy",
  topo: "github",
};

function implementPath() {
  if (state.strategy === "cursor-only") {
    return {
      path: "Cursor Cloud",
      tone: "info",
      why: "seos.yml strategy is cursor-only (the default). No control-plane hop.",
    };
  }
  if (state.mac === "offline") {
    return {
      path: "Control plane → Cursor Cloud",
      tone: "warn",
      why: "local-first, but the Mac heartbeat is stale or offline — escalate.",
    };
  }
  return {
    path: "Control plane → Mac worker",
    tone: "ok",
    why: "local-first with a healthy Mac — the control plane assigns the job locally.",
  };
}

function effectiveActor(step) {
  if (step.id === "spec-ready" && state.gateMode === "manual") return "human";
  return step.actor;
}

function renderPipeline() {
  const track = document.getElementById("pipeline-track");
  const route = implementPath();
  track.innerHTML = STEPS.map((step, i) => {
    const active = i === state.stepIndex ? "active" : "";
    const done = i < state.stepIndex ? "done" : "";
    const actor = effectiveActor(step);
    let sub = "";
    if (step.id === "spec-ready" && state.gateMode === "manual") {
      sub = `<span class="step-sub">waits for you</span>`;
    }
    if (step.id === "route" || step.id === "implement") {
      sub = `<span class="step-sub">${route.path}</span>`;
    }
    return `
      <li>
        <button type="button" class="step ${active} ${done}" data-index="${i}" aria-current="${
          i === state.stepIndex ? "step" : "false"
        }">
          <span class="step-label">${step.label}</span>
          <span class="step-meta">
            <span class="pill ${actor}">${actor}</span>
            ${sub}
          </span>
        </button>
      </li>`;
  }).join("");

  track.querySelectorAll(".step").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.stepIndex = Number(btn.dataset.index);
      render();
    });
  });
}

function renderDetail() {
  const step = STEPS[state.stepIndex];
  const actor = effectiveActor(step);
  const route = implementPath();

  document.getElementById("step-title").textContent = step.label;
  const actorEl = document.getElementById("step-actor");
  actorEl.textContent = actor;
  actorEl.className = `pill ${actor}`;
  document.getElementById("step-concept").textContent = step.conceptual;
  document.getElementById("step-irl").textContent = step.irl;

  const gate = document.getElementById("gate-banner");
  if (step.gate) {
    gate.hidden = false;
    gate.textContent = `${step.gate}. Humans own accountability at this boundary.`;
  } else {
    gate.hidden = true;
  }

  const routeBanner = document.getElementById("route-banner");
  if (step.id === "route" || step.id === "implement") {
    routeBanner.hidden = false;
    routeBanner.className = `route-banner ${route.tone === "ok" ? "" : route.tone}`.trim();
    routeBanner.innerHTML = `<strong>Runs on: ${route.path}</strong><br />${route.why}`;
  } else {
    routeBanner.hidden = true;
  }

  document.getElementById("step-count").textContent = `Step ${
    state.stepIndex + 1
  } / ${STEPS.length}`;
  document.getElementById("progress-fill").style.width = `${
    ((state.stepIndex + 1) / STEPS.length) * 100
  }%`;
  document.getElementById("btn-back").disabled = state.stepIndex === 0;
  document.getElementById("btn-next").disabled =
    state.stepIndex >= STEPS.length - 1;

  document.getElementById("toggle-effects").innerHTML = `
    <li><strong>Strategy:</strong> ${
      state.strategy === "local-first"
        ? "Actions posts to the control plane; a Mac claims when healthy."
        : "Actions calls Cursor Cloud directly via @cursor/sdk."
    }</li>
    <li><strong>Ready:</strong> ${
      state.gateMode === "auto"
        ? "The spec job chains into implement in the same workflow."
        : "The pipeline stops at spec-added until you add ready."
    }</li>
    <li><strong>Mac:</strong> ${
      state.mac === "healthy"
        ? "Heartbeat fresh → claim → local model."
        : "Stale or offline → Cursor fallback recommended."
    }</li>`;
}

function renderLayers() {
  const grid = document.getElementById("layers-grid");
  grid.innerHTML = LAYERS.map(
    (l) => `
    <article class="layer">
      <h3>${l.layer}</h3>
      <p>${l.concept}</p>
      <p class="today">${l.today}</p>
    </article>`
  ).join("");
}

function renderTopo() {
  const nodes = document.getElementById("topo-nodes");
  const order = TOPO.map((n) => n.id);
  const selectedIndex = order.indexOf(state.topo);

  nodes.innerHTML = TOPO.map((n) => {
    const i = order.indexOf(n.id);
    const near = Math.abs(i - selectedIndex) <= 1;
    const active = n.id === state.topo;
    return `
      <button type="button" class="topo-node ${active ? "active" : ""} ${
        near ? "near" : ""
      }" data-id="${n.id}" role="listitem">
        <strong>${n.title}</strong>
        <span>${n.role}</span>
      </button>`;
  }).join("");

  nodes.querySelectorAll(".topo-node").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.topo = btn.dataset.id;
      renderTopo();
    });
  });

  const node = TOPO.find((n) => n.id === state.topo) ?? TOPO[1];
  document.getElementById("topo-title-el").textContent = node.title;
  document.getElementById("topo-role").textContent = node.role;
  document.getElementById("topo-body").textContent = node.detail;
}

function wireSwitch(id, labelId, onValue, offValue, get, set) {
  const btn = document.getElementById(id);
  const label = document.getElementById(labelId);

  const sync = () => {
    const on = get() === onValue;
    btn.setAttribute("aria-pressed", String(on));
    label.textContent = on ? onValue : offValue;
  };

  btn.addEventListener("click", () => {
    set(get() === onValue ? offValue : onValue);
    sync();
    render();
  });

  sync();
}

function render() {
  renderPipeline();
  renderDetail();
}

function init() {
  wireSwitch(
    "strategy-toggle",
    "strategy-label",
    "local-first",
    "cursor-only",
    () => state.strategy,
    (v) => {
      state.strategy = v;
    }
  );
  wireSwitch(
    "gate-toggle",
    "gate-label",
    "agent-manual",
    "auto-ready",
    () => (state.gateMode === "manual" ? "agent-manual" : "auto-ready"),
    (v) => {
      state.gateMode = v === "agent-manual" ? "manual" : "auto";
    }
  );
  wireSwitch(
    "mac-toggle",
    "mac-label",
    "healthy",
    "offline",
    () => state.mac,
    (v) => {
      state.mac = v;
    }
  );

  document.getElementById("btn-back").addEventListener("click", () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    render();
  });
  document.getElementById("btn-next").addEventListener("click", () => {
    state.stepIndex = Math.min(STEPS.length - 1, state.stepIndex + 1);
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    state.stepIndex = 0;
    render();
  });

  renderLayers();
  renderTopo();
  render();
}

init();
