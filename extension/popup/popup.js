const DAILY_LIMIT = 5;
const STORAGE_KEYS = {
  history: "history",
  usage: "usage",
  savedWorkflows: "savedWorkflows",
  metrics: "metrics",
  workflowProgress: "workflowProgress"
};
const API_BASE_URL = "https://pontis-4bio.onrender.com";

const state = {
  step: 1,
  description: "",
  inputSource: "",
  personaSummary: "",
  questions: [],
  answers: ["", ""],
  answerKinds: ["", ""],
  customAnswers: ["", ""],
  recommendation: null,
  activeWorkflowId: "",
  usage: {
    date: "",
    count: 0
  },
  history: [],
  savedWorkflows: [],
  workflowProgress: {},
  metrics: {
    contextClicks: 0,
    manualStarts: 0,
    insertClicks: 0,
    copyClicks: 0,
    workflow_started: 0,
    step_completed: 0,
    workflow_completed: 0
  },
  loading: false,
  loadingTitle: "Thinking",
  loadingSubtitle: "Pontis is preparing the next step.",
  error: "",
  lastAction: ""
};

const elements = {
  descriptionInput: document.getElementById("descriptionInput"),
  usePageContextButton: document.getElementById("usePageContextButton"),
  understandButton: document.getElementById("understandButton"),
  retryButton: document.getElementById("retryButton"),
  questionOneText: document.getElementById("questionOneText"),
  questionOneChips: document.getElementById("questionOneChips"),
  questionOneCustomWrap: document.getElementById("questionOneCustomWrap"),
  questionOneCustomInput: document.getElementById("questionOneCustomInput"),
  questionOneCustomButton: document.getElementById("questionOneCustomButton"),
  questionTwoText: document.getElementById("questionTwoText"),
  questionTwoChips: document.getElementById("questionTwoChips"),
  questionTwoCustomWrap: document.getElementById("questionTwoCustomWrap"),
  questionTwoCustomInput: document.getElementById("questionTwoCustomInput"),
  questionTwoCustomButton: document.getElementById("questionTwoCustomButton"),
  personaSummary: document.getElementById("personaSummary"),
  personaSummaryStepThree: document.getElementById("personaSummaryStepThree"),
  resultTitle: document.getElementById("resultTitle"),
  resultTag: document.getElementById("resultTag"),
  resultReason: document.getElementById("resultReason"),
  workflowProgress: document.getElementById("workflowProgress"),
  workflowProgressValue: document.getElementById("workflowProgressValue"),
  workflowCompleteBanner: document.getElementById("workflowCompleteBanner"),
  resetWorkflowButton: document.getElementById("resetWorkflowButton"),
  workflowSteps: document.getElementById("workflowSteps"),
  copyFeedback: document.getElementById("copyFeedback"),
  saveWorkflowButton: document.getElementById("saveWorkflowButton"),
  alsoTryList: document.getElementById("alsoTryList"),
  historyList: document.getElementById("historyList"),
  savedWorkflowList: document.getElementById("savedWorkflowList"),
  savedWorkflowCount: document.getElementById("savedWorkflowCount"),
  usageCount: document.getElementById("usageCount"),
  usageResetText: document.getElementById("usageResetText"),
  backButton: document.getElementById("backButton"),
  restartButton: document.getElementById("restartButton"),
  progressDots: Array.from(document.querySelectorAll("[data-progress]")),
  screens: Array.from(document.querySelectorAll("[data-screen]")),
  limitBanner: document.getElementById("limitBanner"),
  errorBanner: document.getElementById("errorBanner"),
  errorMessage: document.getElementById("errorMessage"),
  loadingTitle: document.getElementById("loadingTitle"),
  loadingSubtitle: document.getElementById("loadingSubtitle")
};

init().catch((error) => {
  showError(error instanceof Error ? error.message : "Popup failed to initialize.");
});

async function init() {
  await hydrateStorage();
  bindEvents();
  void warmBackend();
  render();
}

function bindEvents() {
  elements.descriptionInput.addEventListener("input", (event) => {
    state.description = event.target.value;
    if (state.description.trim().length) {
      state.inputSource = "manual";
    }
    render();
  });

  elements.usePageContextButton.addEventListener("click", () => {
    void usePageContext();
  });

  elements.understandButton.addEventListener("click", () => {
    void handleUnderstand();
  });

  elements.questionOneCustomInput.addEventListener("input", (event) => {
    state.customAnswers[0] = event.target.value;
    render();
  });

  elements.questionTwoCustomInput.addEventListener("input", (event) => {
    state.customAnswers[1] = event.target.value;
    render();
  });

  elements.questionOneCustomButton.addEventListener("click", () => {
    handleCustomAnswer(0);
  });

  elements.questionTwoCustomButton.addEventListener("click", () => {
    handleCustomAnswer(1);
  });

  elements.saveWorkflowButton.addEventListener("click", () => {
    void saveWorkflow();
  });

  elements.backButton.addEventListener("click", handleBack);
  elements.restartButton.addEventListener("click", restartFlow);
  elements.resetWorkflowButton.addEventListener("click", () => {
    void resetActiveWorkflow();
  });
  if (elements.retryButton) {
    elements.retryButton.addEventListener("click", () => {
      void retryLastAction();
    });
  }
}

async function hydrateStorage() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.history,
    STORAGE_KEYS.usage,
    STORAGE_KEYS.savedWorkflows,
    STORAGE_KEYS.metrics,
    STORAGE_KEYS.workflowProgress
  ]);
  state.history = Array.isArray(stored[STORAGE_KEYS.history]) ? stored[STORAGE_KEYS.history] : [];
  state.usage = normalizeUsage(stored[STORAGE_KEYS.usage]);
  state.savedWorkflows = Array.isArray(stored[STORAGE_KEYS.savedWorkflows])
    ? stored[STORAGE_KEYS.savedWorkflows]
    : [];
  state.metrics = normalizeMetrics(stored[STORAGE_KEYS.metrics]);
  state.workflowProgress = normalizeWorkflowProgress(stored[STORAGE_KEYS.workflowProgress]);

  await chrome.storage.local.set({
    [STORAGE_KEYS.usage]: state.usage
  });
}

function normalizeMetrics(rawMetrics) {
  const defaults = {
    contextClicks: 0,
    manualStarts: 0,
    insertClicks: 0,
    copyClicks: 0
  };

  if (!rawMetrics || typeof rawMetrics !== "object") {
    return { ...defaults };
  }

  return {
    contextClicks: typeof rawMetrics.contextClicks === "number" ? rawMetrics.contextClicks : 0,
    manualStarts: typeof rawMetrics.manualStarts === "number" ? rawMetrics.manualStarts : 0,
    insertClicks: typeof rawMetrics.insertClicks === "number" ? rawMetrics.insertClicks : 0,
    copyClicks: typeof rawMetrics.copyClicks === "number" ? rawMetrics.copyClicks : 0,
    workflow_started: typeof rawMetrics.workflow_started === "number" ? rawMetrics.workflow_started : 0,
    step_completed: typeof rawMetrics.step_completed === "number" ? rawMetrics.step_completed : 0,
    workflow_completed: typeof rawMetrics.workflow_completed === "number" ? rawMetrics.workflow_completed : 0
  };
}

function normalizeWorkflowProgress(rawProgress) {
  if (!rawProgress || typeof rawProgress !== "object") {
    return {};
  }

  const normalized = {};
  Object.entries(rawProgress).forEach(([workflowId, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }
    const completedSteps = Array.isArray(value.completedSteps)
      ? value.completedSteps.filter((step) => Number.isFinite(step))
      : [];
    normalized[workflowId] = {
      completedSteps,
      startedAt: typeof value.startedAt === "string" ? value.startedAt : "",
      completedAt: typeof value.completedAt === "string" ? value.completedAt : ""
    };
  });
  return normalized;
}

async function bumpMetric(key) {
  state.metrics = normalizeMetrics(state.metrics);
  if (typeof state.metrics[key] === "number") {
    state.metrics[key] += 1;
    await chrome.storage.local.set({
      [STORAGE_KEYS.metrics]: state.metrics
    });
  }
}

function normalizeUsage(rawUsage) {
  const today = new Date().toISOString().slice(0, 10);
  if (!rawUsage || rawUsage.date !== today) {
    return { date: today, count: 0 };
  }

  return {
    date: today,
    count: typeof rawUsage.count === "number" ? rawUsage.count : 0
  };
}

function isLimitReached() {
  state.usage = normalizeUsage(state.usage);
  return state.usage.count >= DAILY_LIMIT;
}

async function handleUnderstand() {
  clearError();

  if (isLimitReached()) {
    render();
    return;
  }

  const description = state.description.trim();
  if (description.length < 8) {
    showError("Please describe who you are and what you do in a little more detail.");
    return;
  }

  if (state.inputSource !== "context") {
    await bumpMetric("manualStarts");
  }

  state.loading = true;
  state.loadingTitle = "Understanding your work";
  state.loadingSubtitle = "Pontis is generating two smart follow-up questions.";
  render();

  try {
    state.lastAction = "understand";
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/understand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description })
    });

    if (!response.ok) {
      const detail = await getErrorDetail(response);
      throw new Error(detail || "Pontis could not understand your description.");
    }

    const payload = await response.json();
    state.personaSummary = payload.persona_summary;
    state.questions = payload.questions;
    state.answers = ["", ""];
    state.answerKinds = ["", ""];
    state.customAnswers = ["", ""];
    state.step = 2;
  } catch (error) {
    showError(error instanceof Error ? error.message : "The understand request failed.");
  } finally {
    state.loading = false;
    render();
  }
}

function renderQuestionChips(container, questionIndex) {
  container.innerHTML = "";

  const question = state.questions[questionIndex];
  if (!question) {
    return;
  }

  question.chips.forEach((chipValue) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-chip";
    if (state.answerKinds[questionIndex] === "chip" && state.answers[questionIndex] === chipValue) {
      button.classList.add("selected");
    }
    button.textContent = chipValue;
    button.addEventListener("click", () => {
      handleAnswer(questionIndex, chipValue);
    });
    container.appendChild(button);
  });

  const customButton = document.createElement("button");
  customButton.type = "button";
  customButton.className = "answer-chip";
  if (state.answerKinds[questionIndex] === "custom") {
    customButton.classList.add("selected");
  }
  customButton.textContent = "Something else";
  customButton.addEventListener("click", () => {
    activateCustomAnswer(questionIndex);
  });
  container.appendChild(customButton);
}

function handleAnswer(questionIndex, chipValue) {
  clearError();
  state.answers[questionIndex] = chipValue;
  state.answerKinds[questionIndex] = "chip";

  if (questionIndex === 0) {
    state.step = 3;
    render();
    return;
  }

  void handleRecommend();
}

function activateCustomAnswer(questionIndex) {
  clearError();
  state.answerKinds[questionIndex] = "custom";
  state.answers[questionIndex] = state.customAnswers[questionIndex].trim();
  render();
}

function handleCustomAnswer(questionIndex) {
  clearError();
  const value = state.customAnswers[questionIndex].trim();
  if (value.length < 3) {
    showError("Please type a little more detail so Pontis can understand your answer.");
    return;
  }

  state.answerKinds[questionIndex] = "custom";
  state.answers[questionIndex] = value;

  if (questionIndex === 0) {
    state.step = 3;
    render();
    return;
  }

  void handleRecommend();
}

async function handleRecommend() {
  if (isLimitReached()) {
    render();
    return;
  }

  state.loading = true;
  state.loadingTitle = "Finding the best AI stack";
  state.loadingSubtitle = "Pontis is choosing the best fit for this exact workflow.";
  render();

  try {
    state.lastAction = "recommend";
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: state.description.trim(),
        answers: getResolvedAnswers()
      })
    });

    if (!response.ok) {
      const detail = await getErrorDetail(response);
      throw new Error(detail || "Pontis could not generate a recommendation.");
    }

    const payload = await response.json();
    state.recommendation = payload;
    state.activeWorkflowId = `wf_${Date.now()}`;
    state.step = 4;
    await persistRoute(payload);
  } catch (error) {
    showError(error instanceof Error ? error.message : "The recommendation request failed.");
  } finally {
    state.loading = false;
    render();
  }
}

async function persistRoute(recommendation) {
  state.usage = normalizeUsage(state.usage);
  state.usage.count += 1;

  const entry = {
    persona_summary: state.personaSummary,
    description: state.description.trim(),
    workflow_title: recommendation.workflow_title,
    answers: getResolvedAnswers(),
    timestamp: Date.now()
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, 10);

  await chrome.storage.local.set({
    [STORAGE_KEYS.usage]: state.usage,
    [STORAGE_KEYS.history]: state.history
  });
}

function handleBack() {
  clearError();

  if (state.loading) {
    return;
  }

  if (state.step === 4) {
    state.step = 3;
  } else if (state.step === 3) {
    state.step = 2;
    state.answers[1] = "";
    state.answerKinds[1] = "";
    state.customAnswers[1] = "";
  } else if (state.step === 2) {
    state.step = 1;
    state.answers = ["", ""];
    state.answerKinds = ["", ""];
    state.customAnswers = ["", ""];
  }

  render();
}

function restartFlow() {
  state.step = 1;
  state.description = "";
  state.inputSource = "";
  state.personaSummary = "";
  state.questions = [];
  state.answers = ["", ""];
  state.answerKinds = ["", ""];
  state.customAnswers = ["", ""];
  state.recommendation = null;
  state.activeWorkflowId = "";
  state.loading = false;
  state.error = "";
  state.loadingTitle = "Thinking";
  state.loadingSubtitle = "Pontis is preparing the next step.";
  state.lastAction = "";
  elements.descriptionInput.value = "";
  elements.questionOneCustomInput.value = "";
  elements.questionTwoCustomInput.value = "";
  render();
}

function render() {
  state.usage = normalizeUsage(state.usage);

  elements.usageCount.textContent = `${state.usage.count} / ${DAILY_LIMIT}`;
  elements.usageResetText.textContent = `Reset key: ${state.usage.date}`;
  elements.limitBanner.classList.toggle("hidden", !isLimitReached());
  elements.errorBanner.classList.toggle("hidden", !state.error);
  elements.errorMessage.textContent = state.error || "The request could not be completed.";
  if (elements.retryButton) {
    elements.retryButton.classList.toggle("hidden", !state.error);
  }

  const screenKey = state.loading ? "loading" : String(state.step);
  elements.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenKey);
  });

  const activeDot = state.loading ? Math.min(state.step, 4) : state.step;
  elements.progressDots.forEach((dot) => {
    const index = Number(dot.dataset.progress);
    dot.classList.toggle("active", index === activeDot);
    dot.classList.toggle("complete", index < activeDot);
  });

  elements.understandButton.disabled = state.loading || isLimitReached() || state.description.trim().length < 8;
  elements.usePageContextButton.disabled = state.loading;
  elements.backButton.disabled = state.loading || state.step === 1;
  elements.restartButton.classList.toggle("hidden", state.step !== 4 || state.loading);
  elements.saveWorkflowButton.disabled = state.loading || !state.recommendation;
  elements.resetWorkflowButton.disabled = state.loading || !state.recommendation;

  elements.loadingTitle.textContent = state.loadingTitle;
  elements.loadingSubtitle.textContent = state.loadingSubtitle;

  elements.personaSummary.textContent = state.personaSummary || "Persona summary";
  elements.personaSummaryStepThree.textContent = state.personaSummary || "Persona summary";

  elements.questionOneText.textContent = state.questions[0]?.text || "Question one";
  elements.questionTwoText.textContent = state.questions[1]?.text || "Question two";
  elements.questionOneCustomInput.value = state.customAnswers[0];
  elements.questionTwoCustomInput.value = state.customAnswers[1];
  elements.questionOneCustomWrap.classList.toggle("hidden", state.answerKinds[0] !== "custom");
  elements.questionTwoCustomWrap.classList.toggle("hidden", state.answerKinds[1] !== "custom");
  elements.questionOneCustomButton.disabled = state.customAnswers[0].trim().length < 3;
  elements.questionTwoCustomButton.disabled = state.customAnswers[1].trim().length < 3;

  renderQuestionChips(elements.questionOneChips, 0);
  renderQuestionChips(elements.questionTwoChips, 1);
  renderRecommendation();
  renderHistory();
  renderSavedWorkflows();
}

function renderRecommendation() {
  if (!state.recommendation) {
    elements.resultTitle.textContent = "Best workflow";
    elements.resultTag.textContent = "Workflow tag";
    elements.resultReason.textContent = "Your workflow recommendation will appear here.";
    elements.workflowProgressValue.textContent = "0/0 complete";
    elements.workflowProgress.classList.add("hidden");
    elements.workflowCompleteBanner.classList.add("hidden");
    elements.workflowSteps.innerHTML = "";
    elements.alsoTryList.innerHTML = "";
    elements.copyFeedback.textContent = "";
    return;
  }

  const steps = Array.isArray(state.recommendation.workflow_steps)
    ? state.recommendation.workflow_steps
    : [];
  const workflowId = state.activeWorkflowId;
  const progress = ensureWorkflowProgress(workflowId);
  const completedSteps = new Set(progress.completedSteps);

  elements.resultTitle.textContent = state.recommendation.workflow_title || "Best workflow";
  elements.resultTag.textContent = state.recommendation.workflow_tag || "Workflow";
  elements.resultReason.textContent = state.recommendation.reason;
  elements.workflowSteps.innerHTML = "";
  elements.workflowProgress.classList.toggle("hidden", !steps.length);

  if (!steps.length) {
    const li = document.createElement("li");
    li.className = "workflow-step";
    const title = document.createElement("strong");
    title.textContent = "Workflow steps are missing";
    const copy = document.createElement("p");
    copy.textContent = "Restart the flow so Pontis can regenerate the workflow steps.";
    li.appendChild(title);
    li.appendChild(copy);
    elements.workflowSteps.appendChild(li);
  }

  const progressText = `${Math.min(completedSteps.size, steps.length)}/${steps.length} complete`;
  elements.workflowProgressValue.textContent = progressText;
  elements.workflowCompleteBanner.classList.toggle(
    "hidden",
    !(steps.length && completedSteps.size >= steps.length)
  );

  steps.forEach((workflowStep) => {
    const li = document.createElement("li");
    li.className = "workflow-step";
    const header = document.createElement("div");
    header.className = "workflow-step-header";

    const headerText = document.createElement("div");
    const stepLabel = document.createElement("span");
    stepLabel.className = "step-label-inline";
    stepLabel.textContent = `Step ${workflowStep.step}`;
    const stepTool = document.createElement("strong");
    stepTool.textContent = workflowStep.tool;
    headerText.appendChild(stepLabel);
    headerText.appendChild(stepTool);

    const actions = document.createElement("div");
    actions.className = "step-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "step-copy-btn";
    copyButton.textContent = "Copy step";

    const insertButton = document.createElement("button");
    insertButton.type = "button";
    insertButton.className = "step-copy-btn";
    insertButton.textContent = "Insert";

    const checkLabel = document.createElement("label");
    checkLabel.className = "step-check";
    const checkInput = document.createElement("input");
    checkInput.type = "checkbox";
    checkInput.checked = completedSteps.has(workflowStep.step);
    checkInput.addEventListener("change", () => {
      void toggleStepCompletion(workflowId, workflowStep.step, checkInput.checked, steps.length);
    });
    checkLabel.appendChild(checkInput);
    checkLabel.appendChild(document.createTextNode("Done"));

    actions.appendChild(copyButton);
    actions.appendChild(insertButton);
    actions.appendChild(checkLabel);

    header.appendChild(headerText);
    header.appendChild(actions);

    const purpose = document.createElement("p");
    purpose.textContent = `Purpose: ${workflowStep.purpose}`;

    const instruction = document.createElement("p");
    instruction.textContent = `Instruction: ${workflowStep.instruction}`;

    const prompt = document.createElement("div");
    prompt.className = "workflow-prompt";
    prompt.textContent = workflowStep.prompt;

    li.appendChild(header);
    li.appendChild(purpose);
    li.appendChild(instruction);
    li.appendChild(prompt);

    copyButton.addEventListener("click", () => {
      void copyWorkflowStep(workflowStep);
    });
    insertButton.addEventListener("click", () => {
      void insertWorkflowStep(workflowStep);
    });

    elements.workflowSteps.appendChild(li);
  });

  elements.alsoTryList.innerHTML = "";
  (state.recommendation.also_try || []).forEach((tool) => {
    const chip = document.createElement("div");
    chip.className = "alt-chip";
    chip.textContent = tool;
    elements.alsoTryList.appendChild(chip);
  });
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  if (!state.history.length) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = "No routes yet";
    const copy = document.createElement("span");
    copy.textContent = "Your last 10 Pontis recommendations will appear here.";
    li.appendChild(title);
    li.appendChild(copy);
    elements.historyList.appendChild(li);
    return;
  }

  state.history.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = entry.workflow_title;
    const copy = document.createElement("span");
    copy.textContent = `${entry.persona_summary} | ${entry.answers.join(" | ")} | ${date.toLocaleDateString()}`;
    li.appendChild(title);
    li.appendChild(copy);
    elements.historyList.appendChild(li);
  });
}

function renderSavedWorkflows() {
  elements.savedWorkflowList.innerHTML = "";
  elements.savedWorkflowCount.textContent = `${state.savedWorkflows.length} saved`;

  if (!state.savedWorkflows.length) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = "No saved workflows";
    const copy = document.createElement("span");
    copy.textContent = "Save a strong Pontis workflow here and run it again later.";
    li.appendChild(title);
    li.appendChild(copy);
    elements.savedWorkflowList.appendChild(li);
    return;
  }

  state.savedWorkflows.forEach((workflow) => {
    const date = new Date(workflow.createdAt);
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = workflow.workflow_title;

    const copy = document.createElement("span");
    copy.textContent = `${workflow.workflow_tag} | ${date.toLocaleDateString()}`;

    const actions = document.createElement("div");
    actions.className = "saved-workflow-actions";

    const stepCount = document.createElement("span");
    const savedSteps = Array.isArray(workflow.recommendation?.workflow_steps)
      ? workflow.recommendation.workflow_steps
      : [];
    stepCount.textContent = `${savedSteps.length} steps ready`;

    const runButton = document.createElement("button");
    runButton.type = "button";
    runButton.className = "saved-run-btn";
    runButton.textContent = "Run again";

    actions.appendChild(stepCount);
    actions.appendChild(runButton);

    li.appendChild(title);
    li.appendChild(copy);
    li.appendChild(actions);

    runButton.addEventListener("click", () => {
      runSavedWorkflow(workflow.id);
    });

    elements.savedWorkflowList.appendChild(li);
  });
}

async function copyWorkflowStep(workflowStep) {
  if (!workflowStep?.prompt) {
    return;
  }

  try {
    const text = `${workflowStep.instruction}\n\n${workflowStep.prompt}`;
    await navigator.clipboard.writeText(text);
    await bumpMetric("copyClicks");
    elements.copyFeedback.textContent = `Step ${workflowStep.step} copied!`;
  } catch (error) {
    elements.copyFeedback.textContent = "Copy failed. Try again.";
  }
}

async function insertWorkflowStep(workflowStep) {
  if (!workflowStep?.prompt) {
    return;
  }

  try {
    const injected = await insertIntoActivePage(`${workflowStep.instruction}\n\n${workflowStep.prompt}`);
    if (!injected) {
      showError("Pontis could not find an active text box to insert into.");
      return;
    }
    await bumpMetric("insertClicks");
    elements.copyFeedback.textContent = `Step ${workflowStep.step} inserted!`;
  } catch (error) {
    showError("Pontis could not insert into the page.");
  }
}

async function saveWorkflow() {
  if (!state.recommendation) {
    return;
  }

  const workflowId = `wf_${Date.now()}`;
  const workflow = {
    id: workflowId,
    workflow_title: state.recommendation.workflow_title,
    workflow_tag: state.recommendation.workflow_tag,
    description: state.description.trim(),
    persona_summary: state.personaSummary,
    answers: getResolvedAnswers(),
    recommendation: state.recommendation,
    createdAt: new Date().toISOString()
  };

  state.savedWorkflows = state.savedWorkflows.filter((entry) => entry.workflow_title !== workflow.workflow_title);
  state.savedWorkflows.unshift(workflow);
  state.savedWorkflows = state.savedWorkflows.slice(0, 12);

  await chrome.storage.local.set({
    [STORAGE_KEYS.savedWorkflows]: state.savedWorkflows
  });

  elements.copyFeedback.textContent = "Workflow saved.";
  renderSavedWorkflows();
}

function runSavedWorkflow(workflowId) {
  const workflow = state.savedWorkflows.find((entry) => entry.id === workflowId);
  if (!workflow) {
    return;
  }

  state.description = workflow.description;
  state.personaSummary = workflow.persona_summary;
  state.answers = Array.isArray(workflow.answers) ? workflow.answers.slice(0, 2) : ["", ""];
  state.answerKinds = ["", ""];
  state.customAnswers = ["", ""];
  state.recommendation = workflow.recommendation;
  state.activeWorkflowId = workflow.id;
  state.step = 4;
  state.error = "";
  elements.descriptionInput.value = workflow.description;
  render();
}

function ensureWorkflowProgress(workflowId) {
  if (!workflowId) {
    return { completedSteps: [], startedAt: "", completedAt: "" };
  }

  state.workflowProgress = normalizeWorkflowProgress(state.workflowProgress);
  if (!state.workflowProgress[workflowId]) {
    state.workflowProgress[workflowId] = {
      completedSteps: [],
      startedAt: new Date().toISOString(),
      completedAt: ""
    };
    void bumpMetric("workflow_started");
    void chrome.storage.local.set({
      [STORAGE_KEYS.workflowProgress]: state.workflowProgress
    });
  }

  return state.workflowProgress[workflowId];
}

async function toggleStepCompletion(workflowId, stepNumber, isComplete, totalSteps) {
  if (!workflowId) {
    return;
  }

  const progress = ensureWorkflowProgress(workflowId);
  const completed = new Set(progress.completedSteps);
  const wasComplete = completed.has(stepNumber);

  if (isComplete) {
    completed.add(stepNumber);
    if (!wasComplete) {
      await bumpMetric("step_completed");
    }
  } else {
    completed.delete(stepNumber);
  }

  progress.completedSteps = Array.from(completed).sort((a, b) => a - b);
  const allDone = totalSteps > 0 && completed.size >= totalSteps;
  if (allDone && !progress.completedAt) {
    progress.completedAt = new Date().toISOString();
    await bumpMetric("workflow_completed");
  }
  if (!allDone) {
    progress.completedAt = "";
  }

  state.workflowProgress[workflowId] = progress;
  await chrome.storage.local.set({
    [STORAGE_KEYS.workflowProgress]: state.workflowProgress
  });
  render();
}

async function resetActiveWorkflow() {
  const workflowId = state.activeWorkflowId;
  if (!workflowId) {
    return;
  }

  state.workflowProgress = normalizeWorkflowProgress(state.workflowProgress);
  state.workflowProgress[workflowId] = {
    completedSteps: [],
    startedAt: new Date().toISOString(),
    completedAt: ""
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.workflowProgress]: state.workflowProgress
  });
  render();
}

async function usePageContext() {
  clearError();

  state.loading = true;
  state.loadingTitle = "Reading this page";
  state.loadingSubtitle = "Pontis is pulling context from the active tab.";
  render();

  try {
    const context = await getActiveTabContext();
    if (!context || context.trim().length < 5) {
      throw new Error("Page context looks too short.");
    }
    state.description = context.trim();
    state.inputSource = "context";
    elements.descriptionInput.value = state.description;
    await bumpMetric("contextClicks");
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    showError("Pontis could not read page context. Try typing instead.");
  } finally {
    state.loading = false;
    render();
  }
}

async function getActiveTabContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (!tabId) {
    return "";
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const clone = document.body ? document.body.cloneNode(true) : null;
      if (!clone) {
        return "";
      }
      const selectors = [
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        "svg",
        "canvas",
        "img"
      ];
      selectors.forEach((selector) => {
        clone.querySelectorAll(selector).forEach((el) => el.remove());
      });
      clone.querySelectorAll("[role='navigation'], [role='banner'], [role='contentinfo'], [aria-hidden='true']").forEach((el) => {
        el.remove();
      });

      const title = document.title || "";
      const rawText = clone.innerText || clone.textContent || "";
      const cleaned = rawText.replace(/\s+/g, " ").trim();
      const merged = `${title}\n\n${cleaned}`.trim();
      return merged.slice(0, 4000);
    }
  });

  return results?.[0]?.result || "";
}

async function insertIntoActivePage(text) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (!tabId) {
    return false;
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    args: [text],
    func: (payload) => {
      const isEditable = (el) => {
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName?.toLowerCase();
        if (tag === "textarea") return true;
        if (tag === "input") {
          const type = (el.getAttribute("type") || "text").toLowerCase();
          return ["text", "search", "email", "url"].includes(type);
        }
        return false;
      };

      const findEditableInShadow = (root) => {
        if (!root) return null;
        const queue = [root];
        while (queue.length) {
          const node = queue.shift();
          if (!node) continue;
          if (isEditable(node)) {
            return node;
          }
          if (node.shadowRoot) {
            queue.push(node.shadowRoot);
          }
          if (node.children && node.children.length) {
            queue.push(...node.children);
          }
        }
        return null;
      };

      let target = document.activeElement;
      if (!isEditable(target)) {
        target = findEditableInShadow(document.activeElement);
      }
      if (!isEditable(target)) {
        target = findEditableInShadow(document);
      }
      if (!isEditable(target)) {
        target = document.querySelector(
          "textarea, [contenteditable='true'], [role='textbox'], input[type='text'], input[type='search'], input[type='email'], input[type='url']"
        );
      }

      if (!isEditable(target)) {
        return false;
      }

      target.focus();
      if (target.isContentEditable) {
        const existing = target.innerText || "";
        if (existing.trim().length) {
          target.innerText = `${existing.trim()}\n\n${payload}`;
        } else {
          target.innerText = payload;
        }
      } else {
        const existing = target.value || "";
        if (existing.trim().length) {
          target.value = `${existing.trim()}\n\n${payload}`;
        } else {
          target.value = payload;
        }
      }
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  });

  return Boolean(results?.[0]?.result);
}

async function getErrorDetail(response) {
  try {
    const payload = await response.json();
    return payload.detail || "";
  } catch (error) {
    return "";
  }
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Request timed out."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function fetchWithTimeout(url, options) {
  try {
    return await withTimeout(fetch(url, options), 10000);
  } catch (error) {
    if (error instanceof Error && error.message === "Request timed out.") {
      throw new Error("This is taking longer than usual. Please try again.");
    }
    throw error;
  }
}

async function retryLastAction() {
  if (state.lastAction === "understand") {
    await handleUnderstand();
    return;
  }
  if (state.lastAction === "recommend") {
    await handleRecommend();
  }
}

async function warmBackend() {
  try {
    await fetch(`${API_BASE_URL}/health`, { method: "GET" });
  } catch (error) {
    // Ignore warm-up failures.
  }
}

function showError(message) {
  state.error = message;
  state.loading = false;
  render();
}

function clearError() {
  state.error = "";
}

function getResolvedAnswers() {
  return state.answers.map((answer, index) => {
    if (state.answerKinds[index] === "custom") {
      return state.customAnswers[index].trim();
    }
    return answer;
  });
}
