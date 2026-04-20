window.Puzzles = window.Puzzles || {};

window.Puzzles.colorseq = function(container, data, onComplete, onProgress) {
    const { colors, colorHex, sequence } = data;
    const SEQ_LEN = sequence.length;
    const SHOW_MS = 10000;
    let playerAnswer = [], recallStart = null, phase = 'memorize', countdown = null;

    function render() {
        container.innerHTML = `
            <div class="csq-wrap">
                <div class="csq-header">
                    <div class="csq-title" id="csq-title">MEMORIZE THE SEQUENCE</div>
                    <div class="csq-timer" id="csq-timer">10</div>
                </div>
                <div class="csq-seq" id="csq-seq">
                    ${sequence.map(c => `<div class="csq-cell" style="background:${colorHex[c]};border-color:${colorHex[c]}"></div>`).join('')}
                </div>
                <div class="csq-answer-label" id="csq-label">YOUR ANSWER</div>
                <div class="csq-answer" id="csq-answer">
                    ${Array.from({length: SEQ_LEN}, () => '<div class="csq-cell csq-empty"></div>').join('')}
                </div>
                <div class="csq-buttons" id="csq-btns">
                    ${colors.map(c => `<button class="color-btn csq-btn" data-color="${c}" style="background:${colorHex[c]}" disabled>${c}</button>`).join('')}
                    <button class="csq-back" id="csq-back" disabled>⌫</button>
                </div>
            </div>`;

        container.addEventListener('click', e => {
            if (phase !== 'recall') return;
            const btn = e.target.closest('[data-color]');
            if (btn) handleColorClick(btn.dataset.color);
            if (e.target.id === 'csq-back') handleBackspace();
        });

        startMemorize();
    }

    function startMemorize() {
        phase = 'memorize';
        let remaining = Math.ceil(SHOW_MS / 1000);
        setTimer(remaining);
        countdown = setInterval(() => {
            remaining--;
            setTimer(remaining);
            if (remaining <= 0) { clearInterval(countdown); startRecall(); }
        }, 1000);
    }

    function startRecall() {
        phase = 'recall';
        recallStart = Date.now();
        container.querySelector('#csq-seq').style.visibility = 'hidden';
        setTitle('RECREATE THE SEQUENCE');
        setTimer('');
        container.querySelector('#csq-label').style.display = 'block';
        container.querySelectorAll('[data-color]').forEach(b => b.disabled = false);
        container.querySelector('#csq-back').disabled = false;
    }

    function handleColorClick(color) {
        if (playerAnswer.length >= SEQ_LEN) return;
        playerAnswer.push(color);
        updateAnswer();
        if (onProgress) onProgress(Math.min(500, Math.floor((playerAnswer.length / SEQ_LEN) * 500)));
        if (playerAnswer.length === SEQ_LEN) finish();
    }

    function handleBackspace() {
        playerAnswer.pop();
        updateAnswer();
    }

    function updateAnswer() {
        const el = container.querySelector('#csq-answer');
        if (!el) return;
        el.innerHTML = Array.from({length: SEQ_LEN}, (_, i) => {
            if (i < playerAnswer.length)
                return `<div class="csq-cell" style="background:${colorHex[playerAnswer[i]]};border-color:${colorHex[playerAnswer[i]]}"></div>`;
            return '<div class="csq-cell csq-empty"></div>';
        }).join('');
    }

    function finish() {
        phase = 'done';
        const timeMs = Date.now() - recallStart;
        let correct = 0;
        for (let i = 0; i < SEQ_LEN; i++) if (playerAnswer[i] === sequence[i]) correct++;
        const pct = Math.round((correct / SEQ_LEN) * 100);

        container.querySelector('#csq-seq').style.visibility = 'visible';
        container.querySelector('#csq-btns').style.display = 'none';
        setTitle(`${pct}% CORRECT — ${correct} / ${SEQ_LEN}`);

        const el = container.querySelector('#csq-answer');
        if (el) el.innerHTML = Array.from({length: SEQ_LEN}, (_, i) => {
            const ok = playerAnswer[i] === sequence[i];
            const bg = playerAnswer[i] ? colorHex[playerAnswer[i]] : '#333';
            return `<div class="csq-cell ${ok ? 'csq-ok' : 'csq-wrong'}" style="background:${bg}"></div>`;
        }).join('');

        if (onProgress) onProgress(Math.min(1000, Math.floor((correct / SEQ_LEN) * 700)));
        setTimeout(() => onComplete({ result: { correct, total: SEQ_LEN }, timeMs }), 2000);
    }

    function setTitle(t) { const el = container.querySelector('#csq-title'); if (el) el.textContent = t; }
    function setTimer(v) { const el = container.querySelector('#csq-timer'); if (el) el.textContent = v; }
    render();
};
