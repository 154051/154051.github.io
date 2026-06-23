const questions = window.QUIZ_QUESTIONS || [];
    const state = new Map(questions.map((question) => [
      question.id,
      { selected: new Set(), confirmed: false, correct: false }
    ]));

    const quizList = document.getElementById("quizList");
    const emptyState = document.getElementById("emptyState");
    const searchBox = document.getElementById("searchBox");
    const filterButtons = Array.from(document.querySelectorAll(".filter"));
    let activeFilter = "all";

    function answerLabel(question) {
      return question.answer
        .map((key) => {
          const option = question.options.find((item) => item.key === key);
          return option ? `${key}. ${option.text}` : key;
        })
        .join("；");
    }

    function isExactMatch(selected, answer) {
      return selected.size === answer.length && answer.every((key) => selected.has(key));
    }

    function render() {
      const term = searchBox.value.trim().toLowerCase();
      const fragment = document.createDocumentFragment();
      let visibleCount = 0;

      questions.forEach((question, index) => {
        const record = state.get(question.id);
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
        fragment.appendChild(renderQuestion(question, index + 1, record));
      });

      quizList.replaceChildren(fragment);
      emptyState.classList.toggle("show", visibleCount === 0);
      updateStats();
    }

    function renderQuestion(question, globalNumber, record) {
      const card = document.createElement("article");
      card.className = "question-card";
      card.dataset.id = question.id;
      if (record.confirmed) {
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

      const actions = document.createElement("div");
      actions.className = "question-actions";

      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "primary";
      confirm.textContent = "确认";
      confirm.disabled = record.confirmed;
      confirm.addEventListener("click", () => confirmQuestion(question.id));

      const reset = document.createElement("button");
      reset.type = "button";
      reset.textContent = "复位";
      reset.addEventListener("click", () => resetQuestion(question.id));

      actions.append(confirm, reset);
      header.append(titleWrap, actions);

      const optionList = document.createElement("div");
      optionList.className = "options";

      question.options.forEach((option) => {
        const label = document.createElement("label");
        label.className = "option";
        label.dataset.key = option.key;

        const input = document.createElement("input");
        input.type = question.type === "single" ? "radio" : "checkbox";
        input.name = `q-${question.id}`;
        input.value = option.key;
        input.checked = record.selected.has(option.key);
        input.disabled = record.confirmed;
        input.addEventListener("change", (event) => {
          const item = event.currentTarget;
          const next = state.get(question.id);
          if (question.type === "single") {
            next.selected.clear();
            if (item.checked) next.selected.add(option.key);
          } else if (item.checked) {
            next.selected.add(option.key);
          } else {
            next.selected.delete(option.key);
          }
        });

        const key = document.createElement("span");
        key.className = "option-key";
        key.textContent = option.key;

        const text = document.createElement("span");
        text.textContent = option.text;

        if (record.confirmed && question.answer.includes(option.key)) {
          label.classList.add("correct-choice");
        }
        if (record.confirmed && record.selected.has(option.key) && !question.answer.includes(option.key)) {
          label.classList.add("wrong-choice");
        }

        label.append(input, key, text);
        optionList.appendChild(label);
      });

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      if (record.confirmed) {
        feedback.classList.add("show", record.correct ? "ok" : "no");
        feedback.innerHTML = `${record.correct ? "回答正确" : "回答错误"}<br><span class="answer-text">正确答案：${answerLabel(question)}</span>`;
      }

      card.append(header, optionList, feedback);
      return card;
    }

    function confirmQuestion(id) {
      const question = questions.find((item) => item.id === id);
      const record = state.get(id);
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

    function resetQuestion(id) {
      const record = state.get(id);
      record.selected.clear();
      record.confirmed = false;
      record.correct = false;
      render();
    }

    function updateStats() {
      let checked = 0;
      let correct = 0;
      let wrong = 0;

      state.forEach((record) => {
        if (!record.confirmed) return;
        checked += 1;
        if (record.correct) correct += 1;
        else wrong += 1;
      });

      document.getElementById("statChecked").textContent = checked;
      document.getElementById("statCorrect").textContent = correct;
      document.getElementById("statWrong").textContent = wrong;
    }

    searchBox.addEventListener("input", render);
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        filterButtons.forEach((item) => item.classList.toggle("active", item === button));
        render();
      });
    });

    render();
