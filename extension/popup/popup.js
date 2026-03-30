const DAILY_LIMIT = 5;
const STORAGE_KEYS = {
  history: "history",
  usage: "usage"
};
const API_BASE_URL = "http://127.0.0.1:8000";

const state = {
  step: 1,
  description: "",
  personaSummary: "",
  questions: [],
  answers: ["", ""],
  recommendation: null,
  usage: {
    date: "",
    count: 0
  },
  history: [],
  loading: false,
  loadingTitle: "Thinking",
  loadingSubtitle: "Pontis is preparing the next step.",
  error: ""
};

const elements = {
  descriptionInput: document.getElementById("descriptionInput"),
  understandButton: document.getElementById("understandButton"),
  questionOneText: document.getElementById("questionOneText"),
  questionOneChips: document.getElementById("questionOneChips"),
  questionTwoText: document.getElementById("questionTwoText"),
  questionTwoChips: document.getElementById("questionTwoChips"),
  personaSummary: document.getElementById("personaSummary"),
  personaSummaryStepThree: document.getElementById("personaSummaryStepThree"),
  resultTool: document.getElementById("resultTool"),
  resultReason: document.getElementById("resultReason"),
  promptOutput: document.getElementById("promptOutput"),
  copyPromptButton: document.getElementById("copyPromptButton"),
  copyFeedback: document.getElementById("copyFeedback"),
  alsoTryList: document.getElementById("alsoTryList"),
  historyList: document.getElementById("historyList"),
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
  render();
}

function bindEvents() {
  elements.descriptionInput.addEventListener("input", (event) => {
    state.description = event.target.value;
    render();
  });

  elements.understandButton.addEventListener("click", () => {
    void handleUnderstand();
  });

  elements.copyPromptButton.addEventListener("click", () => {
    void copyPrompt();
  });

  elements.backButton.addEventListener("click", handleBack);
  elements.restartButton.addEventListener("click", restartFlow);
}

async function hydrateStorage() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.history, STORAGE_KEYS.usage]);
  state.history = Array.isArray(stored[STORAGE_KEYS.history]) ? stored[STORAGE_KEYS.history] : [];
  state.usage = normalizeUsage(stored[STORAGE_KEYS.usage]);

  await chrome.storage.local.set({
    [STORAGE_KEYS.usage]: state.usage
  });
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

  state.loading = true;
  state.loadingTitle = "Understanding your work";
  state.loadingSubtitle = "Pontis is generating two smart follow-up questions.";
  render();

  try {
    const response = await fetch(`${API_BASE_URL}/api/understand`, {
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
    if (state.answers[questionIndex] === chipValue) {
      button.classList.add("selected");
    }
    button.textContent = chipValue;
    button.addEventListener("click", () => {
      handleAnswer(questionIndex, chipValue);
    });
    container.appendChild(button);
  });
}

function handleAnswer(questionIndex, chipValue) {
  clearError();
  state.answers[questionIndex] = chipValue;

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
    const response = await fetch(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: state.description.trim(),
        answers: state.answers
      })
    });

    if (!response.ok) {
      const detail = await getErrorDetail(response);
      throw new Error(detail || "Pontis could not generate a recommendation.");
    }

    const payload = await response.json();
    state.recommendation = payload;
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
    tool: recommendation.tool,
    answers: [...state.answers],
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
  } else if (state.step === 2) {
    state.step = 1;
    state.answers = ["", ""];
  }

  render();
}

function restartFlow() {
  state.step = 1;
  state.description = "";
  state.personaSummary = "";
  state.questions = [];
  state.answers = ["", ""];
  state.recommendation = null;
  state.loading = false;
  state.error = "";
  state.loadingTitle = "Thinking";
  state.loadingSubtitle = "Pontis is preparing the next step.";
  elements.descriptionInput.value = "";
  render();
}

function render() {
  state.usage = normalizeUsage(state.usage);

  elements.usageCount.textContent = `${state.usage.count} / ${DAILY_LIMIT}`;
  elements.usageResetText.textContent = `Reset key: ${state.usage.date}`;
  elements.limitBanner.classList.toggle("hidden", !isLimitReached());
  elements.errorBanner.classList.toggle("hidden", !state.error);
  elements.errorMessage.textContent = state.error || "The request could not be completed.";

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
  elements.backButton.disabled = state.loading || state.step === 1;
  elements.restartButton.classList.toggle("hidden", state.step !== 4 || state.loading);

  elements.loadingTitle.textContent = state.loadingTitle;
  elements.loadingSubtitle.textContent = state.loadingSubtitle;

  elements.personaSummary.textContent = state.personaSummary || "Persona summary";
  elements.personaSummaryStepThree.textContent = state.personaSummary || "Persona summary";

  elements.questionOneText.textContent = state.questions[0]?.text || "Question one";
  elements.questionTwoText.textContent = state.questions[1]?.text || "Question two";

  renderQuestionChips(elements.questionOneChips, 0);
  renderQuestionChips(elements.questionTwoChips, 1);
  renderRecommendation();
  renderHistory();
}

function renderRecommendation() {
  if (!state.recommendation) {
    elements.resultTool.textContent = "Best AI tool";
    elements.resultReason.textContent = "Your recommendation will appear here.";
    elements.promptOutput.textContent = "Your Pontis context bridge prompt will appear here.";
    elements.alsoTryList.innerHTML = "";
    elements.copyFeedback.textContent = "";
    return;
  }

  elements.resultTool.textContent = state.recommendation.tool;
  elements.resultReason.textContent = state.recommendation.reason;
  elements.promptOutput.textContent = state.recommendation.prompt;

  elements.alsoTryList.innerHTML = "";
  state.recommendation.also_try.forEach((tool) => {
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
    li.innerHTML = "<strong>No routes yet</strong><span>Your last 10 Pontis recommendations will appear here.</span>";
    elements.historyList.appendChild(li);
    return;
  }

  state.history.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const li = document.createElement("li");
    li.innerHTML = `<strong>${entry.tool}</strong><span>${entry.persona_summary} | ${entry.answers.join(" | ")} | ${date.toLocaleDateString()}</span>`;
    elements.historyList.appendChild(li);
  });
}

async function copyPrompt() {
  if (!state.recommendation?.prompt) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.recommendation.prompt);
    elements.copyFeedback.textContent = "Copied!";
  } catch (error) {
    elements.copyFeedback.textContent = "Copy failed. Try again.";
  }
}

async function getErrorDetail(response) {
  try {
    const payload = await response.json();
    return payload.detail || "";
  } catch (error) {
    return "";
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
