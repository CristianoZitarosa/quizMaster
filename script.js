let tutteLeDomande = [], mazzoAttuale = [], erroriGlobali = [], erroriRound = [], indiceCorrente = 0, round = 1;
let modalitaScelta = 'all';
let ultimaDisposizione = "";

document.getElementById('fileInput').onchange = function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        const testo = reader.result;
        const blocchi = testo.split(/\n(?=\d+\.)/); 
        tutteLeDomande = [];

        blocchi.forEach(blocco => {
            const idMatch = blocco.match(/^(\d+)\./);
            const rispostaMatch = blocco.match(/Risposta(?:\s+corretta)?:\s*([a-eA-E])/i);
            
            if (idMatch && rispostaMatch) {
                const id = idMatch[1];
                const letteraCorretta = rispostaMatch[1].toUpperCase();
                const lines = blocco.split('\n');
                let testoDomanda = "", opzioni = [], testoRispostaCorretta = "";

                lines.forEach(line => {
                    const opzMatch = line.match(/^([A-E])\)\s*(.*)/i);
                    if (opzMatch) {
                        const lettr = opzMatch[1].toUpperCase();
                        const testoOpz = opzMatch[2].trim();
                        opzioni.push(testoOpz);
                        if (lettr === letteraCorretta) testoRispostaCorretta = testoOpz;
                    } else if (!line.match(/^\d+\./) && !line.match(/Risposta/i) && line.trim() !== "") {
                        if (opzioni.length === 0) testoDomanda += line.trim() + " ";
                    } else if (line.match(/^\d+\./)) {
                        testoDomanda = line.replace(/^\d+\.\s*/, '').trim() + " ";
                    }
                });

                if (opzioni.length > 0) {
                    tutteLeDomande.push({
                        id: id, domanda: testoDomanda.trim(),
                        opzioniOriginali: [...opzioni], corretta: testoRispostaCorretta
                    });
                }
            }
        });

        if (tutteLeDomande.length > 0) {
            document.getElementById('info-totale').innerText = `Caricate ${tutteLeDomande.length} domande.`;
            document.getElementById('endRange').value = tutteLeDomande.length;
            document.getElementById('options-menu').classList.remove('hidden');
            generaChecklist();
        } else {
            alert("Formato non riconosciuto. Usa '1.' per le domande e 'a)' per le opzioni.");
        }
    };
    reader.readAsText(e.target.files[0]);
};

function showMode(m) {
    modalitaScelta = m;
    document.getElementById('range-area').classList.toggle('hidden', m !== 'range');
    document.getElementById('manual-area').classList.toggle('hidden', m !== 'manual');
}

function generaChecklist() {
    const container = document.getElementById('manual-selection');
    container.innerHTML = '';
    tutteLeDomande.forEach((q, index) => {
        const label = document.createElement('label');
        label.className = 'check-item';
        label.setAttribute('data-text', q.id + " " + q.domanda.toLowerCase());
        label.innerHTML = `<input type="checkbox" class="quiz-check" value="${index}" onchange="updateCounter()"> ${q.id}`;
        container.appendChild(label);
    });
}

function filterManual() {
    const val = document.getElementById('searchManual').value.toLowerCase();
    document.querySelectorAll('.check-item').forEach(item => {
        item.style.display = item.getAttribute('data-text').includes(val) ? 'flex' : 'none';
    });
}

function toggleFiltrati(select) {
    document.querySelectorAll('.check-item').forEach(item => {
        if (item.style.display !== 'none') item.querySelector('input').checked = select;
    });
    updateCounter();
}

function updateCounter() {
    document.getElementById('counter-manual').innerText = `Selezionate: ${document.querySelectorAll('.quiz-check:checked').length}`;
}

function preparaQuiz() {
    if (modalitaScelta === 'all') mazzoAttuale = [...tutteLeDomande];
    else if (modalitaScelta === 'range') {
        const s = parseInt(document.getElementById('startRange').value) - 1;
        const e = parseInt(document.getElementById('endRange').value);
        mazzoAttuale = tutteLeDomande.slice(Math.max(0, s), e);
    } else {
        mazzoAttuale = Array.from(document.querySelectorAll('.quiz-check:checked')).map(cb => tutteLeDomande[cb.value]);
    }
    if (mazzoAttuale.length === 0) return alert("Seleziona almeno una domanda!");
    indiceCorrente = 0; round = 1; erroriGlobali = []; erroriRound = [];
    shuffle(mazzoAttuale);
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('quiz').classList.remove('hidden');
    mostraDomanda();
}

function mostraDomanda() {
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('btnProssima').classList.add('hidden');
    const container = document.getElementById('opzioni-container');
    container.innerHTML = '';

    if (indiceCorrente >= mazzoAttuale.length) {
        if (erroriRound.length > 0) {
            mazzoAttuale = [...erroriRound]; erroriRound = [];
            shuffle(mazzoAttuale); indiceCorrente = 0; round++;
            alert(`Round ${round}: Recupero Errori.`);
        } else {
            document.getElementById('quiz').classList.add('hidden');
            document.getElementById('finale').classList.remove('hidden');
            document.getElementById('btnDownload').style.display = erroriGlobali.length > 0 ? 'inline-block' : 'none';
            return;
        }
    }

    const q = mazzoAttuale[indiceCorrente];
    document.getElementById('roundNum').innerText = round;
    document.getElementById('remainNum').innerText = mazzoAttuale.length - indiceCorrente;
    document.getElementById('errorNum').innerText = erroriRound.length;
    document.getElementById('idDomanda').innerText = `DOMANDA N. ${q.id}`;
    document.getElementById('testoDomanda').innerText = q.domanda;

    let opzioniDaMostrare = [...q.opzioniOriginali];
    if (opzioniDaMostrare.length > 1) {
        let tentativi = 0, disposizioneAttuale = "";
        do { shuffle(opzioniDaMostrare); disposizioneAttuale = opzioniDaMostrare.join('|'); tentativi++; } 
        while (disposizioneAttuale === ultimaDisposizione && tentativi < 10);
        ultimaDisposizione = disposizioneAttuale;
    }

    opzioniDaMostrare.forEach(testo => {
        const btn = document.createElement('button');
        btn.className = 'opzione-btn';
        btn.innerText = testo;
        btn.onclick = () => controllaRisposta(btn, testo, q.corretta);
        container.appendChild(btn);
    });
}

function controllaRisposta(btnSelezionato, testoScelto, testoCorretto) {
    if (!document.getElementById('btnProssima').classList.contains('hidden')) return;
    const f = document.getElementById('feedback');
    const buttons = document.querySelectorAll('.opzione-btn');
    f.classList.remove('hidden');

    if (testoScelto === testoCorretto) {
        f.innerText = "✅ CORRETTO!";
        f.className = "feedback success";
        btnSelezionato.classList.add('corretta-evidenziata');
    } else {
        f.innerText = "❌ SBAGLIATO!";
        f.className = "feedback error";
        btnSelezionato.classList.add('errata-evidenziata');
        buttons.forEach(b => { if(b.innerText === testoCorretto) b.classList.add('corretta-evidenziata'); });
        const q = mazzoAttuale[indiceCorrente];
        erroriRound.push(q);
        if (!erroriGlobali.find(e => e.id === q.id)) erroriGlobali.push(q);
    }
    document.getElementById('btnProssima').classList.remove('hidden');
}

function prossimaDomanda() { indiceCorrente++; mostraDomanda(); }

function scaricaErrori() {
    let out = "PANIERE ERRORI (FORMATO ORIGINALE)\n\n";
    erroriGlobali.forEach(q => {
        out += `${q.id}. ${q.domanda}\n`;
        q.opzioniOriginali.forEach((opt, i) => { out += `${String.fromCharCode(65 + i)}) ${opt}\n`; });
        const letteraOrig = String.fromCharCode(65 + q.opzioniOriginali.indexOf(q.corretta));
        out += `Risposta: ${letteraOrig}\n\n`;
    });
    const blob = new Blob([out], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'errori_quiz.txt';
    a.click();
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }