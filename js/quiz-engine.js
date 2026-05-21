(function () {
  'use strict';

  const DATA_FILES = [
    'data/m1-m2-questions.json',
    'data/m3-questions.json',
    'data/m4-questions.json',
    'data/m5-m6-questions.json'
  ];

  const MODULE_NAMES = {
    M1: 'Mô đun 1: Hiểu biết về CNTT',
    M2: 'Mô đun 2: Sử dụng máy tính cơ bản',
    M3: 'Mô đun 3: Xử lý văn bản cơ bản (Word)',
    M4: 'Mô đun 4: Sử dụng bảng tính cơ bản (Excel)',
    M5: 'Mô đun 5: Sử dụng trình chiếu (PowerPoint)',
    M6: 'Mô đun 6: Sử dụng Internet cơ bản'
  };

  let allQuestions = {};
  let currentQuiz = null;

  async function loadQuestions() {
    if (window.__QUIZ_DATA__) {
      Object.assign(allQuestions, window.__QUIZ_DATA__);
    } else {
      for (const file of DATA_FILES) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          Object.assign(allQuestions, data);
        } catch (_) { /* file not ready yet */ }
      }
    }
    updateCounts();
  }

  function updateCounts() {
    for (const mod of Object.keys(MODULE_NAMES)) {
      const el = document.getElementById('count-' + mod);
      if (el) {
        const count = allQuestions[mod] ? allQuestions[mod].length : 0;
        el.textContent = count + ' câu';
      }
    }
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Quiz State ---
  function startQuiz(moduleKey) {
    const questions = allQuestions[moduleKey];
    if (!questions || questions.length === 0) {
      alert('Chưa có dữ liệu cho mô đun này. Vui lòng thử lại sau.');
      return;
    }

    const numQ = parseInt(document.getElementById('num-questions').value);
    const timeLimit = parseInt(document.getElementById('time-limit').value);
    const shouldShuffle = document.getElementById('shuffle-questions').checked;

    let selected = [...questions];
    if (shouldShuffle) selected = shuffle(selected);
    if (numQ > 0 && numQ < selected.length) selected = selected.slice(0, numQ);

    currentQuiz = {
      module: moduleKey,
      questions: selected,
      answers: new Array(selected.length).fill(null),
      currentIndex: 0,
      timeLimit: timeLimit * 60,
      timeRemaining: timeLimit * 60,
      timerId: null,
      submitted: false
    };

    showScreen('quiz-screen');
    renderQuiz();
    if (timeLimit > 0) startTimer();
  }

  function renderQuiz() {
    const q = currentQuiz.questions[currentQuiz.currentIndex];
    const idx = currentQuiz.currentIndex;
    const total = currentQuiz.questions.length;

    document.getElementById('current-module').textContent = MODULE_NAMES[currentQuiz.module];
    document.getElementById('question-progress').textContent = 'Câu ' + (idx + 1) + ' / ' + total;
    document.getElementById('question-text').textContent = 'Câu ' + q.id + ': ' + q.question;

    const optContainer = document.getElementById('options-container');
    optContainer.innerHTML = '';

    const oldFeedback = document.querySelector('.feedback-correct, .feedback-wrong');
    if (oldFeedback) oldFeedback.remove();

    const userAns = currentQuiz.answers[idx];
    const alreadyAnswered = userAns !== null;

    for (const key of ['A', 'B', 'C', 'D']) {
      if (!q.options[key]) continue;
      const btn = document.createElement('button');
      btn.className = 'option';
      if (alreadyAnswered) {
        btn.style.pointerEvents = 'none';
        if (key === q.answer) btn.classList.add('correct');
        if (key === userAns && userAns !== q.answer) btn.classList.add('wrong');
        if (key === userAns) btn.classList.add('selected');
      }
      btn.innerHTML = '<span class="option-label">' + key + '.</span> ' + escapeHtml(q.options[key]);
      btn.addEventListener('click', function () { selectAnswer(key); });
      optContainer.appendChild(btn);
    }

    if (alreadyAnswered) {
      const feedbackEl = document.createElement('div');
      feedbackEl.className = userAns === q.answer ? 'feedback-correct' : 'feedback-wrong';
      feedbackEl.textContent = userAns === q.answer ? 'Chính xác!' : 'Sai! Đáp án đúng là ' + q.answer;
      document.getElementById('question-container').appendChild(feedbackEl);
    }

    document.getElementById('btn-prev').disabled = idx === 0;
    document.getElementById('btn-next').textContent = idx === total - 1 ? 'Nộp bài' : 'Tiếp →';

    renderDots();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderDots() {
    const container = document.getElementById('question-dots');
    container.innerHTML = '';
    currentQuiz.questions.forEach(function (_, i) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (i === currentQuiz.currentIndex) dot.classList.add('current');
      if (currentQuiz.answers[i] !== null) dot.classList.add('answered');
      dot.textContent = i + 1;
      dot.addEventListener('click', function () { goToQuestion(i); });
      container.appendChild(dot);
    });
    var currentDot = container.querySelector('.current');
    if (currentDot) currentDot.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function selectAnswer(key) {
    if (currentQuiz.submitted) return;
    const idx = currentQuiz.currentIndex;
    if (currentQuiz.answers[idx] !== null) return;
    currentQuiz.answers[idx] = key;
    showFeedback(key);
  }

  function showFeedback(selectedKey) {
    const idx = currentQuiz.currentIndex;
    const q = currentQuiz.questions[idx];
    const correctKey = q.answer;
    const buttons = document.querySelectorAll('#options-container .option');

    buttons.forEach(function (btn) {
      btn.style.pointerEvents = 'none';
      const label = btn.querySelector('.option-label').textContent.charAt(0);
      if (label === correctKey) {
        btn.classList.add('correct');
      }
      if (label === selectedKey && selectedKey !== correctKey) {
        btn.classList.add('wrong');
      }
    });

    renderDots();

    const feedbackEl = document.createElement('div');
    feedbackEl.className = selectedKey === correctKey ? 'feedback-correct' : 'feedback-wrong';
    feedbackEl.textContent = selectedKey === correctKey ? 'Chính xác!' : 'Sai! Đáp án đúng là ' + correctKey;
    document.getElementById('question-container').appendChild(feedbackEl);
  }

  function goToQuestion(index) {
    currentQuiz.currentIndex = index;
    renderQuiz();
  }

  function nextQuestion() {
    if (currentQuiz.currentIndex < currentQuiz.questions.length - 1) {
      currentQuiz.currentIndex++;
      renderQuiz();
    } else {
      submitQuiz();
    }
  }

  function prevQuestion() {
    if (currentQuiz.currentIndex > 0) {
      currentQuiz.currentIndex--;
      renderQuiz();
    }
  }

  // --- Timer ---
  function startTimer() {
    updateTimerDisplay();
    currentQuiz.timerId = setInterval(function () {
      currentQuiz.timeRemaining--;
      updateTimerDisplay();
      if (currentQuiz.timeRemaining <= 0) {
        clearInterval(currentQuiz.timerId);
        submitQuiz();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const t = currentQuiz.timeRemaining;
    const m = Math.floor(t / 60);
    const s = t % 60;
    const el = document.getElementById('timer');
    el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    el.className = 'timer';
    if (t <= 60) el.classList.add('danger');
    else if (t <= 300) el.classList.add('warning');
  }

  // --- Submit & Results ---
  function submitQuiz() {
    if (currentQuiz.submitted) return;

    const unanswered = currentQuiz.answers.filter(function (a) { return a === null; }).length;
    if (unanswered > 0 && currentQuiz.timeRemaining > 0) {
      if (!confirm('Bạn còn ' + unanswered + ' câu chưa trả lời. Bạn có chắc muốn nộp bài?')) return;
    }

    currentQuiz.submitted = true;
    if (currentQuiz.timerId) clearInterval(currentQuiz.timerId);

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    currentQuiz.questions.forEach(function (q, i) {
      const userAns = currentQuiz.answers[i];
      if (userAns === null) skipped++;
      else if (userAns === q.answer) correct++;
      else wrong++;
    });

    const total = currentQuiz.questions.length;
    const score = Math.round((correct / total) * 10 * 10) / 10;

    document.getElementById('score-value').textContent = score;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = wrong;
    document.getElementById('unanswered-count').textContent = skipped;

    const circle = document.querySelector('.score-circle');
    if (score >= 5) {
      circle.style.borderColor = 'var(--success)';
      document.getElementById('score-value').style.color = 'var(--success)';
    } else {
      circle.style.borderColor = 'var(--danger)';
      document.getElementById('score-value').style.color = 'var(--danger)';
    }

    document.getElementById('review-container').classList.add('hidden');
    showScreen('result-screen');
  }

  function showReview() {
    const container = document.getElementById('review-container');
    container.classList.remove('hidden');
    container.innerHTML = '';

    currentQuiz.questions.forEach(function (q, i) {
      const userAns = currentQuiz.answers[i];
      const isCorrect = userAns === q.answer;
      const isSkipped = userAns === null;

      let itemClass = 'review-item';
      if (isSkipped) itemClass += ' skipped-item';
      else if (isCorrect) itemClass += ' correct-item';
      else itemClass += ' wrong-item';

      const div = document.createElement('div');
      div.className = itemClass;

      let html = '<div class="review-question">Câu ' + q.id + ': ' + escapeHtml(q.question) + '</div>';
      html += '<ul class="review-options">';

      for (const key of ['A', 'B', 'C', 'D']) {
        if (!q.options[key]) continue;
        let liClass = '';
        if (key === q.answer) liClass = 'is-correct';
        if (key === userAns && !isCorrect) liClass += ' is-wrong';
        if (key === userAns) liClass += ' is-selected';
        html += '<li class="' + liClass.trim() + '">' + key + '. ' + escapeHtml(q.options[key]) + '</li>';
      }

      html += '</ul>';
      div.innerHTML = html;
      container.appendChild(div);
    });
  }

  // --- Screen Management ---
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function goHome() {
    if (currentQuiz && currentQuiz.timerId) clearInterval(currentQuiz.timerId);
    currentQuiz = null;
    showScreen('home-screen');
  }

  // --- Event Listeners ---
  let selectedModule = null;

  document.querySelectorAll('.module-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.module-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      selectedModule = card.dataset.module;
      startQuiz(selectedModule);
    });
  });

  document.getElementById('btn-next').addEventListener('click', nextQuestion);
  document.getElementById('btn-prev').addEventListener('click', prevQuestion);
  document.getElementById('btn-submit').addEventListener('click', submitQuiz);
  document.getElementById('btn-review').addEventListener('click', showReview);
  document.getElementById('btn-home').addEventListener('click', goHome);

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (!currentQuiz || currentQuiz.submitted) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') nextQuestion();
    else if (e.key === 'ArrowLeft') prevQuestion();
    else if (['a', 'A', '1'].includes(e.key)) selectAnswer('A');
    else if (['b', 'B', '2'].includes(e.key)) selectAnswer('B');
    else if (['c', 'C', '3'].includes(e.key)) selectAnswer('C');
    else if (['d', 'D', '4'].includes(e.key)) selectAnswer('D');
  });

  // Init
  loadQuestions();
})();
