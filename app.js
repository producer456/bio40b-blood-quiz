// BIO 40B — Blood (Hematology) Quiz logic
// State: current question pool, index, score, missed[], mode label

const LETTERS = ["A", "B", "C", "D", "E"];

const state = {
    pool: [],          // active list of questions for this run
    index: 0,
    score: 0,
    missed: [],        // questions answered wrong (full objects)
    answered: false,   // has the user picked an answer for the current question
    modeLabel: "Quiz",
    baseMode: "ordered",
    round: 0,          // 0 = full quiz, 1+ = a retake-missed round
};

function $(id) { return document.getElementById(id); }

function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Return a run-copy of a question, optionally with its answer choices shuffled.
function prepareQuestion(q, shuffleChoices) {
    if (!shuffleChoices) return { ...q, choices: q.choices.slice() };
    const order = shuffle(q.choices.map((_, i) => i));
    const choices = order.map(i => q.choices[i]);
    const answer = order.indexOf(q.answer);
    return { ...q, choices, answer };
}

// ── Quiz lifecycle ────────────────────────────────────────────────

function startQuiz(mode) {
    state.baseMode = mode;
    const doShuffle = mode === "shuffled";
    let list = QUESTIONS.map(q => prepareQuestion(q, doShuffle));
    if (doShuffle) list = shuffle(list);
    state.pool = list;
    state.index = 0;
    state.score = 0;
    state.missed = [];
    state.answered = false;
    state.round = 0;
    state.modeLabel = doShuffle ? "Shuffled" : "Quiz";
    $("mode-label").textContent = state.modeLabel;
    showScreen("quiz");
    renderQuestion();
}

function retakeMissed() {
    if (state.missed.length === 0) return;
    // Re-prepare so shuffle mode reshuffles answer order each round.
    const doShuffle = state.baseMode === "shuffled";
    state.pool = shuffle(state.missed.map(m => prepareQuestion(m, doShuffle)));
    state.index = 0;
    state.score = 0;
    state.missed = [];
    state.answered = false;
    state.round += 1;
    state.modeLabel = "Retake · Round " + state.round;
    $("mode-label").textContent = state.modeLabel;
    showScreen("quiz");
    renderQuestion();
}

function restartSameMode() {
    startQuiz(state.baseMode);
}

function quitQuiz() {
    if (confirm("Quit this quiz? Your progress won't be saved.")) goHome();
}

function goHome() {
    showScreen("start");
}

// ── Rendering a question ──────────────────────────────────────────

function renderQuestion() {
    const q = state.pool[state.index];
    state.answered = false;

    $("topic-tag").textContent = q.topic;
    $("question-text").textContent = q.q;
    $("progress-text").textContent = `Question ${state.index + 1} of ${state.pool.length}`;
    $("score-text").textContent = `Score: ${state.score}`;
    const pct = (state.index / state.pool.length) * 100;
    $("progress-fill").style.width = pct + "%";

    const choicesEl = $("choices");
    choicesEl.innerHTML = "";
    q.choices.forEach((text, i) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.innerHTML = `<span class="letter">${LETTERS[i]}</span><span class="text"></span>`;
        btn.querySelector(".text").textContent = text;
        btn.onclick = () => pickAnswer(i);
        choicesEl.appendChild(btn);
    });

    const fb = $("feedback");
    fb.className = "feedback";
    fb.textContent = "";

    $("btn-next").disabled = true;
    $("btn-next").textContent = state.index === state.pool.length - 1 ? "Finish →" : "Next →";
}

function pickAnswer(picked) {
    if (state.answered) return;
    state.answered = true;
    const q = state.pool[state.index];
    const correct = q.answer;
    const isCorrect = picked === correct;

    const choiceEls = document.querySelectorAll(".choice");
    choiceEls.forEach((el, i) => {
        el.disabled = true;
        if (i === picked) {
            el.classList.add("selected", isCorrect ? "correct" : "wrong");
        }
        if (i === correct && !isCorrect) {
            el.classList.add("reveal-correct");
        }
    });

    const fb = $("feedback");
    if (isCorrect) {
        state.score++;
        fb.className = "feedback show correct";
        fb.textContent = "✓ Correct.";
    } else {
        state.missed.push({ ...q, picked });
        fb.className = "feedback show wrong";
        fb.textContent = `✗ Incorrect. Correct answer: ${LETTERS[correct]}. ${q.choices[correct]}`;
    }

    $("score-text").textContent = `Score: ${state.score}`;
    $("btn-next").disabled = false;
    const pct = ((state.index + 1) / state.pool.length) * 100;
    $("progress-fill").style.width = pct + "%";
}

function nextQuestion() {
    if (!state.answered) return;
    if (state.index < state.pool.length - 1) {
        state.index++;
        renderQuestion();
    } else {
        showResults();
    }
}

// ── Results ───────────────────────────────────────────────────────

function showResults() {
    const total = state.pool.length;
    $("final-score").textContent = state.score;
    $("final-total").textContent = total;
    const pct = total === 0 ? 0 : Math.round((state.score / total) * 100);
    $("final-percent").textContent = pct + "%";

    const perfect = state.missed.length === 0;
    $("results-title").textContent = state.round > 0 ? `Retake · Round ${state.round}` : "Results";
    $("perfect-banner").style.display = perfect ? "block" : "none";

    renderTopicBreakdown();
    renderMissedList();

    const btn = $("btn-retake-missed");
    btn.disabled = perfect;
    btn.textContent = perfect
        ? "All correct — nothing to retake!"
        : `Retake ${state.missed.length} Missed Question${state.missed.length === 1 ? "" : "s"}`;

    showScreen("results");
}

function renderTopicBreakdown() {
    const topics = {};
    state.pool.forEach(q => {
        if (!topics[q.topic]) topics[q.topic] = { total: 0, missed: 0 };
        topics[q.topic].total++;
    });
    state.missed.forEach(q => {
        if (topics[q.topic]) topics[q.topic].missed++;
    });

    const container = $("topic-breakdown");
    container.innerHTML = "<h3>By Topic</h3>";

    const rows = Object.entries(topics).map(([name, t]) => {
        const correct = t.total - t.missed;
        return { name, correct, total: t.total, pct: t.total ? correct / t.total : 1 };
    }).sort((a, b) => a.pct - b.pct);

    rows.forEach(r => {
        const div = document.createElement("div");
        div.className = "topic-row";
        const cls = r.pct >= 0.8 ? "" : r.pct >= 0.5 ? "mid" : "low";
        div.innerHTML = `
            <span class="topic-name"></span>
            <span class="topic-score">${r.correct} / ${r.total}</span>
            <span class="topic-bar"><span class="topic-bar-fill ${cls}" style="width:${Math.round(r.pct * 100)}%"></span></span>
        `;
        div.querySelector(".topic-name").textContent = r.name;
        container.appendChild(div);
    });
}

function renderMissedList() {
    const section = $("missed-section");
    const container = $("missed-list");
    container.innerHTML = "";
    if (state.missed.length === 0) {
        section.style.display = "none";
        return;
    }
    section.style.display = "block";
    state.missed.forEach(m => {
        const div = document.createElement("div");
        div.className = "missed-item";
        const qDiv = document.createElement("div");
        qDiv.className = "q";
        qDiv.textContent = `[${m.topic}] ${m.q}`;
        const aDiv = document.createElement("div");
        aDiv.className = "a";
        aDiv.innerHTML = `Your answer: ${LETTERS[m.picked]}. <span class="picked-text"></span><br>Correct: <strong>${LETTERS[m.answer]}. <span class="correct-text"></span></strong>`;
        aDiv.querySelector(".picked-text").textContent = m.choices[m.picked];
        aDiv.querySelector(".correct-text").textContent = m.choices[m.answer];
        div.appendChild(qDiv);
        div.appendChild(aDiv);
        container.appendChild(div);
    });
}

// Keyboard: 1-5 picks an answer, Enter/Space advances
document.addEventListener("keydown", (e) => {
    if (!$("screen-quiz").classList.contains("active")) return;
    if (!state.answered && /^[1-5]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < state.pool[state.index].choices.length) pickAnswer(idx);
    } else if (state.answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        nextQuestion();
    }
});
