const questions = window.QUIZ_QUESTIONS || [];
const shortAnswers = window.SHORT_ANSWERS || [];
const practiceState = new Map(questions.map((question) => [
  question.id,
  { selected: new Set(), confirmed: false, correct: false }
]));
const shortAnswerState = new Map(shortAnswers.map((item) => [item.id, false]));

const quizList = document.getElementById("quizList");
const emptyState = document.getElementById("emptyState");
const searchBox = document.getElementById("searchBox");
const practiceFilters = document.getElementById("practiceFilters");
const filterButtons = Array.from(document.querySelectorAll(".filter"));
const modeButtons = Array.from(document.querySelectorAll(".mode-tab"));
const examPanel = document.getElementById("examPanel");
const examBottomPanel = document.getElementById("examBottomPanel");
const submitExamButton = document.getElementById("submitExam");
const refreshExamButton = document.getElementById("refreshExam");
const submitExamBottomButton = document.getElementById("submitExamBottom");
const refreshExamBottomButton = document.getElementById("refreshExamBottom");
const examScore = document.getElementById("examScore");
const examMeta = document.getElementById("examMeta");
const examResult = document.getElementById("examResult");

let activeMode = "practice";
let activeFilter = "all";
let exam = createEmptyExam();

function createEmptyExam() {
  return {
    questions: [],
    state: new Map(),
    submitted: false,
  };
}

function answerLabel(question, options = question.options) {
  return options
    .filter((option) => question.answer.includes(option.key))
    .map((option) => {
      const label = option.displayKey || option.key;
      return `${label}. ${option.text}`;
    })
    .join("；");
}

function isExactMatch(selected, answer) {
  return selected.size === answer.length && answer.every((key) => selected.has(key));
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sample(items, count) {
  return shuffle(items).slice(0, count);
}

function startExam() {
  const singles = sample(questions.filter((question) => question.type === "single"), 20);
  const multiples = sample(questions.filter((question) => question.type === "multiple"), 5);
  const paper = shuffle([...singles, ...multiples]).map((question) => ({
    ...question,
    displayOptions: shuffle(question.options).map((option, index) => ({
      ...option,
      displayKey: String.fromCharCode(65 + index),
    })),
  }));

  exam = {
    questions: paper,
    state: new Map(paper.map((question) => [
      question.id,
      { selected: new Set(), confirmed: false, correct: false }
    ])),
    submitted: false,
  };

  render();
}

function render() {
  const isExam = activeMode === "exam";
  const isShort = activeMode === "short";
  searchBox.hidden = isExam || isShort;
  practiceFilters.hidden = isExam || isShort;
  examPanel.hidden = !isExam;
  examBottomPanel.hidden = !isExam;

  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === activeMode);
  });

  if (isExam) {
    if (exam.questions.length === 0) {
      startExam();
      return;
    }
    renderExam();
  } else if (isShort) {
    renderShortAnswers();
  } else {
    renderPractice();
  }

  updateStats();
}

function renderPractice() {
  const term = searchBox.value.trim().toLowerCase();
  const fragment = document.createDocumentFragment();
  let visibleCount = 0;

  questions.forEach((question, index) => {
    const record = practiceState.get(question.id);
    const textBlob = `${question.question} ${question.options.map((option) => option.text).join(" ")}`.toLowerCase();
    const termMatch = !term || textBlob.includes(term);
    const filterMatch =
      activeFilter === "all" ||
      activeFilter === question.type ||
      (activeFilter === "unconfirmed" && !record.confirmed) ||
      (activeFilter === "wrong" && record.confirmed && !record.correct);

    if (!termMatch || !filterMatch) {
      return;
    }

    visibleCount += 1;
    fragment.appendChild(renderQuestion(question, index + 1, record, {
      mode: "practice",
      options: question.options,
      submitted: record.confirmed,
    }));
  });

  quizList.replaceChildren(fragment);
  emptyState.classList.toggle("show", visibleCount === 0);
}

function renderExam() {
  const fragment = document.createDocumentFragment();

  exam.questions.forEach((question, index) => {
    const record = exam.state.get(question.id);
    fragment.appendChild(renderQuestion(question, index + 1, record, {
      mode: "exam",
      options: question.displayOptions,
      submitted: exam.submitted,
    }));
  });

  quizList.replaceChildren(fragment);
  emptyState.classList.remove("show");
  submitExamButton.disabled = exam.submitted;
  submitExamBottomButton.disabled = exam.submitted;
  updateExamPanel();
}

function renderShortAnswers() {
  const fragment = document.createDocumentFragment();

  shortAnswers.forEach((item, index) => {
    const shown = shortAnswerState.get(item.id);
    const card = document.createElement("article");
    card.className = "question-card short-answer-card";
    card.dataset.id = item.id;

    const header = document.createElement("header");
    header.className = "question-head";

    const titleWrap = document.createElement("div");
    const meta = document.createElement("div");
    meta.className = "question-meta";
    meta.innerHTML = `<span class="badge">第 ${index + 1} 题</span><span class="badge">简答</span>`;

    const title = document.createElement("h2");
    title.className = "question-title";
    title.textContent = item.question;

    titleWrap.append(meta, title);

    const actions = document.createElement("div");
    actions.className = "question-actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = shown ? "" : "primary";
    toggle.textContent = shown ? "隐藏答案" : "显示答案";
    toggle.addEventListener("click", () => {
      shortAnswerState.set(item.id, !shortAnswerState.get(item.id));
      render();
    });

    actions.appendChild(toggle);
    header.append(titleWrap, actions);

    const answer = document.createElement("div");
    answer.className = "short-answer-content";
    answer.hidden = !shown;
    answer.textContent = item.answer;

    card.append(header, answer);
    fragment.appendChild(card);
  });

  quizList.replaceChildren(fragment);
  emptyState.classList.remove("show");
}

function renderQuestion(question, globalNumber, record, context) {
  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.id = question.id;
  if (context.submitted) {
    card.classList.add(record.correct ? "correct" : "wrong");
  }

  const header = document.createElement("header");
  header.className = "question-head";

  const titleWrap = document.createElement("div");
  const meta = document.createElement("div");
  meta.className = "question-meta";
  meta.innerHTML = `<span class="badge">第 ${globalNumber} 题</span><span class="badge">${question.type === "single" ? "单选" : "多选"}</span>`;

  const title = document.createElement("h2");
  title.className = "question-title";
  title.textContent = question.question;

  titleWrap.append(meta, title);
  header.appendChild(titleWrap);

  if (context.mode === "practice") {
    const actions = document.createElement("div");
    actions.className = "question-actions";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary";
    confirm.textContent = "确认";
    confirm.disabled = record.confirmed;
    confirm.addEventListener("click", () => confirmPracticeQuestion(question.id));

    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "复位";
    reset.addEventListener("click", () => resetPracticeQuestion(question.id));

    actions.append(confirm, reset);
    header.appendChild(actions);
  }

  const optionList = document.createElement("div");
  optionList.className = "options";

  context.options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "option";
    label.dataset.key = option.key;

    const input = document.createElement("input");
    input.type = question.type === "single" ? "radio" : "checkbox";
    input.name = `${context.mode}-${question.id}`;
    input.value = option.key;
    input.checked = record.selected.has(option.key);
    input.disabled = context.submitted;
    input.addEventListener("change", (event) => {
      updateSelection(question, record, option.key, event.currentTarget.checked);
      if (context.mode === "exam") {
        updateStats();
        updateExamPanel();
      }
    });

    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = option.displayKey || option.key;

    const text = document.createElement("span");
    text.textContent = option.text;

    if (context.submitted && question.answer.includes(option.key)) {
      label.classList.add("correct-choice");
    }
    if (context.submitted && record.selected.has(option.key) && !question.answer.includes(option.key)) {
      label.classList.add("wrong-choice");
    }

    label.append(input, key, text);
    optionList.appendChild(label);
  });

  const feedback = document.createElement("div");
  feedback.className = "feedback";
  if (context.submitted) {
    feedback.classList.add("show", record.correct ? "ok" : "no");
    const result = record.selected.size === 0 ? "未作答" : (record.correct ? "回答正确" : "回答错误");
    feedback.innerHTML = `${result}<br><span class="answer-text">正确答案：${answerLabel(question, context.options)}</span>`;
  }

  card.append(header, optionList, feedback);
  return card;
}

function updateSelection(question, record, key, checked) {
  if (question.type === "single") {
    record.selected.clear();
    if (checked) record.selected.add(key);
    return;
  }

  if (checked) {
    record.selected.add(key);
  } else {
    record.selected.delete(key);
  }
}

function confirmPracticeQuestion(id) {
  const question = questions.find((item) => item.id === id);
  const record = practiceState.get(id);
  const card = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  const feedback = card.querySelector(".feedback");

  if (record.selected.size === 0) {
    feedback.className = "feedback show warn";
    feedback.textContent = "未选择选项";
    return;
  }

  record.confirmed = true;
  record.correct = isExactMatch(record.selected, question.answer);
  render();
}

function resetPracticeQuestion(id) {
  const record = practiceState.get(id);
  record.selected.clear();
  record.confirmed = false;
  record.correct = false;
  render();
}

function submitExam() {
  if (exam.submitted) return;

  exam.questions.forEach((question) => {
    const record = exam.state.get(question.id);
    record.confirmed = true;
    record.correct = isExactMatch(record.selected, question.answer);
  });
  exam.submitted = true;
  render();
}

function updateExamPanel() {
  const answered = Array.from(exam.state.values()).filter((record) => record.selected.size > 0).length;
  const correct = exam.submitted
    ? Array.from(exam.state.values()).filter((record) => record.correct).length
    : 0;
  const wrong = exam.submitted ? exam.questions.length - correct : 0;

  examMeta.textContent = `${answered}/${exam.questions.length} 已作答`;
  examScore.textContent = exam.submitted ? `${correct}/${exam.questions.length} 正确` : "未交卷";
  examResult.hidden = !exam.submitted;
  if (exam.submitted) {
    examResult.textContent = `本次试卷：正确 ${correct} 题，错误 ${wrong} 题。`;
  }
}

function updateStats() {
  if (activeMode === "short") {
    const shown = Array.from(shortAnswerState.values()).filter(Boolean).length;
    document.getElementById("statTotal").textContent = shortAnswers.length;
    document.getElementById("statChecked").textContent = shown;
    document.getElementById("statCorrect").textContent = shortAnswers.length - shown;
    document.getElementById("statWrong").textContent = "-";
    document.getElementById("statTotalLabel").textContent = "简答题数";
    document.getElementById("statCheckedLabel").textContent = "已显示";
    document.getElementById("statCorrectLabel").textContent = "仍隐藏";
    document.getElementById("statWrongLabel").textContent = "无判分";
    return;
  }

  if (activeMode === "exam") {
    const records = Array.from(exam.state.values());
    const answered = records.filter((record) => record.selected.size > 0).length;
    const correct = exam.submitted ? records.filter((record) => record.correct).length : 0;
    const wrong = exam.submitted ? exam.questions.length - correct : 0;

    document.getElementById("statTotal").textContent = exam.questions.length || 25;
    document.getElementById("statChecked").textContent = answered;
    document.getElementById("statCorrect").textContent = correct;
    document.getElementById("statWrong").textContent = wrong;
    document.getElementById("statTotalLabel").textContent = "试卷题数";
    document.getElementById("statCheckedLabel").textContent = "已作答";
    document.getElementById("statCorrectLabel").textContent = "正确";
    document.getElementById("statWrongLabel").textContent = "错误";
    return;
  }

  let checked = 0;
  let correct = 0;
  let wrong = 0;

  practiceState.forEach((record) => {
    if (!record.confirmed) return;
    checked += 1;
    if (record.correct) correct += 1;
    else wrong += 1;
  });

  document.getElementById("statTotal").textContent = questions.length;
  document.getElementById("statChecked").textContent = checked;
  document.getElementById("statCorrect").textContent = correct;
  document.getElementById("statWrong").textContent = wrong;
  document.getElementById("statTotalLabel").textContent = "总题数";
  document.getElementById("statCheckedLabel").textContent = "已确认";
  document.getElementById("statCorrectLabel").textContent = "正确";
  document.getElementById("statWrongLabel").textContent = "错误";
}

searchBox.addEventListener("input", render);
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeMode = button.dataset.mode;
    render();
  });
});

submitExamButton.addEventListener("click", submitExam);
refreshExamButton.addEventListener("click", startExam);
submitExamBottomButton.addEventListener("click", submitExam);
refreshExamBottomButton.addEventListener("click", startExam);

render();
