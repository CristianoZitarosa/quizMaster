let tutteLeDomande = [], mazzoAttuale = [], erroriGlobali = [], erroriRound = [], indiceCorrente = 0, round = 1;
let modalitaScelta = 'all';
let sessionType = 'test'; 
let ultimaDisposizione = "";

// Variabili per Modalità Apprendimento Progressivo
let blocchiStudio = [];
let indiceBloccoCorrente = 0;
let indiceStudioInBlocco = 0;
let dimensioneBlocco = 5; 
let stepCorrenteAprendimento = 0; 
let maxStepBlocco = 1;

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
                
                let testoDomanda = "";
                let opzioni = [];
                let testoRispostaCorretta = "";

                lines.forEach(line => {
                    const opzMatch = line.match(/^([A-E])[\)\.]\s*(.*)/i);
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
                    const distrazioni = opzioni.filter(o => o !== testoRispostaCorretta);
                    shuffle(distrazioni);

                    tutteLeDomande.push({
                        id: id,
                        domanda: testoDomanda.trim(),
                        opzioniOriginali: [...opzioni],
                        corretta: testoRispostaCorretta,
                        distrazioniOrdina: distrazioni
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
            alert("Formato non riconosciuto. Assicurati che le domande inizino con '1.' e le opzioni con 'a)'/'a.' o 'A)'/'A.'");
        }
    };
    reader.readAsText(e.target.files[0]);
};

function setSessionType(type) {
    sessionType = type;
    document.getElementById('typeTest').classList.toggle('active-type', type === 'test');
    document.getElementById('typeLearn').classList.toggle('active-type', type === 'learn');
    
    const blockContainer = document.getElementById('block-size-container');
    if (type === 'learn') {
        blockContainer.classList.remove('hidden');
    } else {
        blockContainer.classList.add('hidden');
    }
}

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
    let mazzoIniziale = [];
    if (modalitaScelta === 'all') mazzoIniziale = [...tutteLeDomande];
    else if (modalitaScelta === 'range') {
        const s = parseInt(document.getElementById('startRange').value) - 1;
        const e = parseInt(document.getElementById('endRange').value);
        mazzoIniziale = tutteLeDomande.slice(Math.max(0, s), e);
    } else {
        mazzoIniziale = Array.from(document.querySelectorAll('.quiz-check:checked')).map(cb => tutteLeDomande[cb.value]);
    }
    
    if (mazzoIniziale.length === 0) return alert("Seleziona almeno una domanda!");
    
    indiceCorrente = 0; round = 1; erroriGlobali = []; erroriRound = [];
    document.getElementById('setup').classList.add('hidden');

    if (sessionType === 'learn') {
        dimensioneBlocco = parseInt(document.getElementById('blockSizeSelect').value);
        blocchiStudio = [];
        for (let i = 0; i < mazzoIniziale.length; i += dimensioneBlocco) {
            blocchiStudio.push(mazzoIniziale.slice(i, i + dimensioneBlocco));
        }
        indiceBloccoCorrente = 0;
        avviaFaseStudio();
    } else {
        mazzoAttuale = [...mazzoIniziale];
        shuffle(mazzoAttuale);
        document.getElementById('quiz').classList.remove('hidden');
        mostraDomanda();
    }
}

/* Gestione Modalità Apprendimento Progressivo */
function avviaFaseStudio() {
    document.getElementById('quiz').classList.add('hidden');
    document.getElementById('study-view').classList.remove('hidden');
    indiceStudioInBlocco = 0;
    stepCorrenteAprendimento = 0;
    
    const blocco = blocchiStudio[indiceBloccoCorrente];
    maxStepBlocco = Math.max(...blocco.map(q => q.opzioniOriginali.length)) - 1;

    mostraSchedaStudio();
}

function mostraSchedaStudio() {
    const bloccoAttuale = blocchiStudio[indiceBloccoCorrente];
    const q = bloccoAttuale[indiceStudioInBlocco];

    document.getElementById('studyBlockNum').innerText = `${indiceBloccoCorrente + 1}/${blocchiStudio.length}`;
    document.getElementById('studyCardNum').innerText = indiceStudioInBlocco + 1;
    document.getElementById('studyTotalBlock').innerText = bloccoAttuale.length;
    document.getElementById('studyIdDomanda').innerText = `DOMANDA N. ${q.id}`;
    document.getElementById('studyTestoDomanda').innerText = q.domanda;
    document.getElementById('studyTestoRisposta').innerText = q.corretta;
}

function prossimaSchedaStudio() {
    const bloccoAttuale = blocchiStudio[indiceBloccoCorrente];
    indiceStudioInBlocco++;

    if (indiceStudioInBlocco < bloccoAttuale.length) {
        mostraSchedaStudio();
    } else {
        document.getElementById('study-view').classList.add('hidden');
        document.getElementById('quiz').classList.remove('hidden');
        
        stepCorrenteAprendimento = 1;
        avviaStepApprendimento();
    }
}

function avviaStepApprendimento() {
    mazzoAttuale = [...blocchiStudio[indiceBloccoCorrente]];
    shuffle(mazzoAttuale);
    indiceCorrente = 0;
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
        } else if (sessionType === 'learn') {
            if (stepCorrenteAprendimento < maxStepBlocco) {
                stepCorrenteAprendimento++;
                alert(`Perfetto! Passiamo allo Step ${stepCorrenteAprendimento + 1} (${stepCorrenteAprendimento + 1} opzioni).`);
                avviaStepApprendimento();
                return;
            } else if (indiceBloccoCorrente + 1 < blocchiStudio.length) {
                indiceBloccoCorrente++;
                alert(`Blocco ${indiceBloccoCorrente} completato! Passiamo allo studio del Blocco ${indiceBloccoCorrente + 1}.`);
                avviaFaseStudio();
                return;
            } else {
                document.getElementById('quiz').classList.add('hidden');
                document.getElementById('finale').classList.remove('hidden');
                document.getElementById('btnDownload').style.display = erroriGlobali.length > 0 ? 'inline-block' : 'none';
                return;
            }
        } else {
            document.getElementById('quiz').classList.add('hidden');
            document.getElementById('finale').classList.remove('hidden');
            document.getElementById('btnDownload').style.display = erroriGlobali.length > 0 ? 'inline-block' : 'none';
            return;
        }
    }

    const q = mazzoAttuale[indiceCorrente];
    
    if (sessionType === 'learn') {
        document.getElementById('labelRound').innerText = `Step: ${stepCorrenteAprendimento + 1}/${maxStepBlocco + 1}`;
    } else {
        document.getElementById('labelRound').innerText = `Round: ${round}`;
    }
    
    document.getElementById('remainNum').innerText = mazzoAttuale.length - indiceCorrente;
    document.getElementById('errorNum').innerText = erroriRound.length;
    document.getElementById('idDomanda').innerText = `DOMANDA N. ${q.id}`;
    document.getElementById('testoDomanda').innerText = q.domanda;

    let opzioniDaMostrare = [];

    if (sessionType === 'learn') {
        const numDistrazioni = Math.min(stepCorrenteAprendimento, q.distrazioniOrdina.length);
        const distrazioniStep = q.distrazioniOrdina.slice(0, numDistrazioni);
        opzioniDaMostrare = [q.corretta, ...distrazioniStep];
    } else {
        opzioniDaMostrare = [...q.opzioniOriginali];
    }

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
    
    buttons.forEach(b => b.disabled = true);
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

/* Gestione Tema Chiaro/Scuro */
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const btn = document.getElementById('themeBtn');
    if (isLight) {
        btn.innerText = "🌙 Scuro";
        localStorage.setItem('quizTheme', 'light');
    } else {
        btn.innerText = "☀️ Chiaro";
        localStorage.setItem('quizTheme', 'dark');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('quizTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const btn = document.getElementById('themeBtn');
        if (btn) btn.innerText = "🌙 Scuro";
    }
});
