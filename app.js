// ============================================
// APP.JS — Kombinierte Datei für GitHub Pages
// Teil 1: Firebase + Spiel-Logik
// Teil 2: 3D-Hintergrund / Animationen
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
    getDatabase, ref, onValue, set, update
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyAZtcxhboviR0Wk6xD3SAyYoLr4PDC2beI",
    authDomain: "wahrheit-pflicht-7ecf5.firebaseapp.com",
    databaseURL: "https://wahrheit-pflicht-7ecf5-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "wahrheit-pflicht-7ecf5",
    storageBucket: "wahrheit-pflicht-7ecf5.firebasestorage.app",
    messagingSenderId: "481732191200",
    appId: "1:481732191200:web:fcf9c5b0bbf5deeaa58185"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// ============================================
// GLOBAL STATE
// ============================================
const G = {
    player: null,        
    role: null,          
    db: null,            
    discordWebhook: 'https://discord.com/api/webhooks/1513149934189150258/7nznkiKvltSXoQJ7UXhkNbUKJ5dRF33xq5s4YmcdVAIKR14ttvsnrRo6T7p7fvrX0hPi',
    allPlayers: ['Halil', 'Cornelius', 'Roman'],
    pins: {
        Halil: '19105887638halil',
        Cornelius: 'Klima1cornelius',
        Roman: 'roma1roman'
    },
    selectedQuestionType: 'truth',
    proofFile: null // currently selected File object for proof upload (sent directly to Discord)
};

// ============================================
// QUESTION BANK
// ============================================
const questionBank = {
    truth: [
        'Was ist dein größtes Geheimnis?',
        'Hast du jemals gelogen, um jemanden zu beeindrucken?',
        'Was ist das Peinlichste, das dir passiert ist?',
        'Wann hast du zum letzten Mal geweint und warum?',
        'Was magst du an dir selbst nicht?',
        'Wem gibst du nicht gerne zu, dass du ihn/sie magst?',
        'Was ist deine größte Angst?',
        'Hast du jemals etwas gestohlen?',
        'Was ist das Verrückteste, das du je getan hast?',
        'Was würdest du tun, wenn niemand es herausfinden würde?',
        'Was bereust du am meisten?',
        'Hast du jemals einen Freund hintergangen?',
        'Was ist dein größter Traum?',
        'Welche Lüge hast du am längsten aufrechterhalten?',
        'Wer in dieser Runde kennst du am wenigsten gut?'
    ],
    dare: [
        'Singe den Refrain eines Songs deiner Wahl vor.',
        'Mach 20 Liegestütze ohne Pause.',
        'Imitiere einen anderen Spieler für 2 Minuten.',
        'Schreib eine lustige Nachricht an einen zufälligen Kontakt und zeige die Antwort.',
        'Tanz 1 Minute lang ohne Musik.',
        'Sag jedem Spieler etwas Ehrliches (aber Nettes).',
        'Sprich 30 Sekunden lang nur im Akzent.',
        'Mach ein Selfie mit einer verrückten Grimasse und stelle es als Profilbild.',
        'Esse einen Löffel Senf.',
        'Laufe um den Block und grüße die erste Person, die du siehst.',
        'Rufe einen zufälligen Kontakt an und erzähle einen schlechten Witz.',
        'Halte einen Handstand für 15 Sekunden.',
        'Sprich rückwärts für eine ganze Minute.',
        'Zeige dein Telefon der Gruppe und lass sie deine letzten 5 Suchanfragen sehen.',
        'Schreibe eine Liebeserklärung an deine Lieblingsband und lese sie vor.'
    ]
};

function randomQuestion(type) {
    const pool = questionBank[type] || questionBank.truth;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================
// SESSION
// ============================================
function saveSession(name) {
    sessionStorage.setItem('wopSession', JSON.stringify({ playerName: name, ts: Date.now() }));
    G.player = name;
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem('wopSession');
        if (!raw) return null;
        const s = JSON.parse(raw);
        G.player = s.playerName;
        return s;
    } catch { return null; }
}

function clearSession() {
    sessionStorage.removeItem('wopSession');
    G.player = null;
    G.role = null;
    G.db = null;
}

// ============================================
// ROLE DETERMINATION
// ============================================
function determineRole() {
    if (!G.player || !G.db) { G.role = null; return; }
    const { matcher, matchee } = G.db;
    if (G.player === matcher) G.role = 'matcher';
    else if (G.player === matchee) G.role = 'matchee';
    else G.role = 'spectator';
}

// ============================================
// UI HELPERS
// ============================================
function showState(name) {
    document.querySelectorAll('.game-state').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`${name}-state`);
    if (el) el.classList.add('active');
}

function setRolePill() {
    const pill = document.getElementById('role-badge');
    if (!G.role) { pill.textContent = ''; pill.className = 'role-pill'; return; }
    const map = {
        matcher: ['matcher', '⚔️ Fragesteller'],
        matchee: ['matchee', '🎯 Zielperson'],
        spectator: ['spectator', '👁️ Zuschauer']
    };
    const [cls, label] = map[G.role] || ['spectator', '?'];
    pill.className = `role-pill ${G.player === 'Halil' ? 'admin' : cls}`;
    pill.textContent = G.player === 'Halil' ? `👑 Admin` : label;
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
}

function showToast(msg, type = 'info', dur = 3200) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('show'));
    });
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 350);
    }, dur);
}

// ============================================
// DISCORD WEBHOOK INTEGRATION
// ============================================
const DISCORD_COLOR = {
    truth: 5209079,   // blue-ish (matches --truth)
    dare: 16221263,   // orange-ish (matches --dare)
    manual: 11557879, // purple-ish (matches --admin)
    info: 3900150
};

function discordColorFor(entry) {
    if (entry.isManualQuestion) return DISCORD_COLOR.manual;
    return entry.choice === 'dare' ? DISCORD_COLOR.dare : DISCORD_COLOR.truth;
}

// Sende eine reine Status-/Text-Nachricht (Embed, ohne Datei) an den Discord-Webhook.
async function sendDiscordEmbed(embed) {
    if (!G.discordWebhook) return;
    try {
        await fetch(G.discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Wahrheit oder Pflicht',
                embeds: [embed]
            })
        });
    } catch (e) {
        console.warn('Discord webhook (embed) fehlgeschlagen:', e);
    }
}

// Sende eine abgeschlossene Runde inkl. Beweisfoto (als Anhang) an Discord.
// Gibt true/false zurück, damit der Aufrufer den Erfolg prüfen und den Nutzer bei einem Fehler warnen kann.
async function sendDiscordRoundComplete(entry, file) {
    if (!G.discordWebhook) return true; // kein Webhook konfiguriert = kein Fehlerfall

    const typeLabel = entry.isManualQuestion ? '📝 Manuell zugewiesen' : (entry.choice === 'dare' ? '🎯 Pflicht' : '💭 Wahrheit');

    const embed = {
        title: '✅ Runde abgeschlossen',
        color: discordColorFor(entry),
        fields: [
            { name: '⚔️ Fragesteller', value: entry.matcher || '-', inline: true },
            { name: '🎯 Zielperson', value: entry.matchee || '-', inline: true },
            { name: '📌 Typ', value: typeLabel, inline: true },
            { name: '❓ Frage / Aufgabe', value: (entry.question || '-').slice(0, 1024) },
            { name: '💬 Antwort', value: (entry.answer || '-').slice(0, 1024) }
        ],
        footer: { text: `Wahrheit oder Pflicht • ${new Date(entry.timestamp).toLocaleString('de-DE')}` },
        timestamp: entry.timestamp
    };

    try {
        let res;
        if (file) {
            const formData = new FormData();
            const safeName = file.name && /\.(png|jpe?g|gif|webp)$/i.test(file.name) ? file.name : 'beweisfoto.jpg';
            embed.image = { url: `attachment://${safeName}` };
            formData.append('payload_json', JSON.stringify({
                username: 'Wahrheit oder Pflicht',
                embeds: [embed]
            }));
            formData.append('files[0]', file, safeName);

            res = await fetch(G.discordWebhook, { method: 'POST', body: formData });
        } else {
            res = await fetch(G.discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'Wahrheit oder Pflicht', embeds: [embed] })
            });
        }
        if (!res.ok) {
            console.warn('Discord webhook (Runde) fehlgeschlagen: HTTP', res.status);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Discord webhook (Runde) fehlgeschlagen:', e);
        return false;
    }
}

// Live-Statusmeldungen (Rundenstart, Wahl getroffen, Frage gestellt)
function sendDiscordStatus(title, description, color = DISCORD_COLOR.info) {
    sendDiscordEmbed({
        title,
        description,
        color,
        footer: { text: 'Wahrheit oder Pflicht • Live-Status' },
        timestamp: new Date().toISOString()
    });
}

// ============================================
// MAIN SYNC
// ============================================
function syncUI() {
    if (!G.db) return;

    const { status, matcher, matchee, currentChoice, currentQuestion } = G.db;

    setText('waiting-matcher', matcher);
    setText('waiting-matchee', matchee);
    setText('spec-matcher', matcher);
    setText('spec-matchee', matchee);

    const adminBar = document.getElementById('admin-bar');
    if (adminBar) {
        if (G.player === 'Halil') {
            adminBar.classList.add('visible');
            document.getElementById('reset-round-btn').disabled = false;
            document.getElementById('assign-btn').disabled = false;
        } else {
            adminBar.classList.remove('visible');
            document.getElementById('reset-round-btn').disabled = true;
            document.getElementById('assign-btn').disabled = true;
        }
    }

    setRolePill();

    switch (status) {
        case 'WAITING':
            showState('waiting');
            document.getElementById('start-game-btn').disabled = false;
            if (!matcher) {
                setText('waiting-matcher', 'Niemand');
                setText('waiting-matchee', 'Niemand');
            }
            break;

        case 'CHOICE':
            if (G.role === 'matchee') {
                setText('choice-asker', matcher);
                showState('choice');
                document.getElementById('choice-truth').disabled = false;
                document.getElementById('choice-dare').disabled = false;
            }
            else if (G.role === 'matcher') {
                document.getElementById('choice-truth').disabled = true;
                document.getElementById('choice-dare').disabled = true;
                updateSpectatorMsg(`Warten auf ${matchee}s Wahl...`);
                showState('spectator');
            }
            else {
                document.getElementById('choice-truth').disabled = true;
                document.getElementById('choice-dare').disabled = true;
                updateSpectatorMsg(`${matchee} wählt zwischen Wahrheit und Pflicht...`);
                showState('spectator');
            }
            break;

        case 'WAITING_FOR_QUESTION':
            if (G.role === 'matchee') {
                const choiceLabel = currentChoice === 'dare' ? 'Pflicht' : 'Wahrheit';
                const choiceIcon  = currentChoice === 'dare' ? '🎯' : '💭';
                setText('wfq-choice-text', `Du hast ${choiceLabel} gewählt`);
                setText('wfq-matcher', matcher);
                document.getElementById('wfq-icon').textContent = choiceIcon;
                showState('waiting-for-question');
            }
            else if (G.role === 'matcher') {
                setText('qi-matchee-name', matchee);
                setText('qi-matchee-strip', matchee);
                const matcheeChoice = currentChoice || 'truth';
                setQIType(matcheeChoice);  
                showState('question-input');
            }
            else {
                updateSpectatorMsg(`${matcher} schreibt gerade die Frage für ${matchee}...`);
                showState('spectator');
            }
            break;

        case 'QUESTION_INPUT':
            if (G.role === 'matcher') {
                setText('qi-matchee-name', matchee);
                setText('qi-matchee-strip', matchee);
                setQIType(currentChoice || 'truth');
                showState('question-input');
            } else if (G.role === 'matchee') {
                setText('wfq-matcher', matcher);
                const cl = currentChoice === 'dare' ? 'Pflicht' : 'Wahrheit';
                setText('wfq-choice-text', `Du hast ${cl} gewählt`);
                document.getElementById('wfq-icon').textContent = currentChoice === 'dare' ? '🎯' : '💭';
                showState('waiting-for-question');
            } else {
                updateSpectatorMsg(`${matcher} schreibt die Frage...`);
                showState('spectator');
            }
            break;

        case 'ANSWER':
            if (G.role === 'matchee') {
                populateAnswerView(matcher, currentChoice, currentQuestion);
                showState('answer');
            }
            else {
                updateSpectatorMsg(`${matchee} gibt gerade ihre Antwort ein...`);
                showState('spectator');
            }
            break;

        case 'COMPLETED':
            showState('completed');
            setText('completed-message', `${matchee} hat geantwortet. Runde beendet!`);
            break;

        default:
            showState('waiting');
    }
}

function updateSpectatorMsg(msg) {
    setText('spectator-status', msg);
}

function populateAnswerView(askerName, choice, question) {
    setText('answer-asker-name', askerName);
    const badge = document.getElementById('answer-type-badge');
    const qText = document.getElementById('answer-question-text');

    if (choice === 'dare') {
        badge.textContent = '🎯 Pflicht';
        badge.className = 'question-type-badge badge-dare';
    } else {
        badge.textContent = '💭 Wahrheit';
        badge.className = 'question-type-badge badge-truth';
    }

    qText.textContent = question || 'Laden...';
}

function setQIType(type) {
    document.querySelectorAll('.qi-tag').forEach(t => t.classList.remove('active'));
    const tag = document.querySelector(`.qi-tag[data-type="${type}"]`);
    if (tag) tag.classList.add('active');

    const badge = document.getElementById('qi-choice-display');
    if (badge) {
        if (type === 'dare') {
            badge.textContent = '🎯 Pflicht';
            badge.className = 'question-type-badge badge-dare';
        } else {
            badge.textContent = '💭 Wahrheit';
            badge.className = 'question-type-badge badge-truth';
        }
    }

    const typeLabel = document.getElementById('qi-selected-type');
    if (typeLabel) {
        typeLabel.textContent = type === 'dare' ? 'Pflicht' : 'Wahrheit';
    }
}

// ============================================
// FIREBASE LISTENERS
// ============================================
function watchGameState() {
    onValue(ref(db, 'gameState'), snap => {
        try {
            const data = snap.val();
            G.db = data ? {
                status: data.status || 'WAITING',
                matcher: data.matcher || null,
                matchee: data.matchee || null,
                currentChoice: data.currentChoice || null,
                currentQuestion: data.currentQuestion || null,
                isManualQuestion: data.isManualQuestion || false
            } : {
                status: 'WAITING', matcher: null, matchee: null,
                currentChoice: null, currentQuestion: null, isManualQuestion: false
            };

            determineRole();
            syncUI();
        } catch (e) {
            console.error('watchGameState error:', e);
            showToast('Synchronisierungsfehler', 'error');
        }
    });
}

// Kapselt den Verlaufs-Cache statt eines rohen globalen `let` — verhindert versehentliches
// Überschreiben von außen und bündelt Lese-/Schreibzugriff an einer Stelle.
const HistoryStore = (() => {
    let entries = [];
    return {
        setAll(list) { entries = list; },
        getAll() { return entries; },
        findById(roundId) { return entries.find(e => e.roundId === roundId); }
    };
})();

function watchHistory() {
    onValue(ref(db, 'history'), snap => {
        try {
            const data = snap.val();
            const list = document.getElementById('history-list');

            if (!data) {
                list.innerHTML = '<p class="empty-history">Noch keine Einträge...</p>';
                HistoryStore.setAll([]);
                renderLeaderboard();
                return;
            }

            const allEntries = Object.entries(data)
                .map(([roundId, e]) => ({ ...e, roundId }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            HistoryStore.setAll(allEntries);
            const entries = allEntries.slice(0, 25);

            list.innerHTML = '';
            entries.forEach(e => list.appendChild(buildHistoryItem(e)));
            renderLeaderboard();

            // Wenn das Detail-Modal gerade offen ist, live aktualisieren (z.B. neue Stimmen)
            const modal = document.getElementById('history-modal');
            if (modal?.classList.contains('show') && modal.dataset.roundId) {
                const fresh = allEntries.find(e => e.roundId === modal.dataset.roundId);
                if (fresh) showHistoryDetail(fresh);
            }
        } catch (e) {
            console.error('watchHistory error:', e);
        }
    });
}

function tallyVotes(votes) {
    votes = votes || {};
    let brave = 0, honest = 0;
    Object.values(votes).forEach(v => {
        if (v?.brave) brave++;
        if (v?.honest) honest++;
    });
    return { brave, honest };
}

function buildHistoryItem(entry) {
    const el = document.createElement('div');
    el.className = 'history-item';

    const time = new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    let chipClass = 'chip-truth', chipLabel = '💭 Wahrheit';
    if (entry.isManualQuestion) { chipClass = 'chip-manual'; chipLabel = '📝 Manuell'; }
    else if (entry.choice === 'dare') { chipClass = 'chip-dare'; chipLabel = '🎯 Pflicht'; }

    const { brave, honest } = tallyVotes(entry.votes);
    const myVote = entry.votes?.[G.player] || {};

    el.innerHTML = `
        <div class="history-row-1">
            <span class="history-players">${entry.matcher || '?'} → ${entry.matchee || '?'}</span>
            <span class="history-time">${time}</span>
        </div>
        <div class="history-row-2">
            <span class="history-chip ${chipClass}">${chipLabel}</span>
            <span class="history-q">${entry.question || ''}</span>
        </div>
        ${entry.hasProof ? `<div class="history-item-img-note" style="margin-top:6px;font-size:0.72rem;color:var(--text-2);">📸 Beweisfoto in Discord gesendet</div>` : ''}
        <div class="vote-row" data-round-id="${entry.roundId}">
            <button type="button" class="vote-btn vote-btn-brave ${myVote.brave ? 'active' : ''}" data-vote-type="brave" data-round-id="${entry.roundId}" ${G.player === entry.matchee ? 'disabled title="Du kannst nicht für dich selbst abstimmen"' : ''}>
                🔥 <span class="vote-label">Mutig</span> <span class="vote-count">${brave}</span>
            </button>
            <button type="button" class="vote-btn vote-btn-honest ${myVote.honest ? 'active' : ''}" data-vote-type="honest" data-round-id="${entry.roundId}" ${G.player === entry.matchee ? 'disabled title="Du kannst nicht für dich selbst abstimmen"' : ''}>
                💯 <span class="vote-label">Ehrlich</span> <span class="vote-count">${honest}</span>
            </button>
        </div>
    `;

    el.querySelector('.history-row-1').addEventListener('click', () => showHistoryDetail(entry));
    el.querySelector('.history-row-2').addEventListener('click', () => showHistoryDetail(entry));

    el.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            castVote(entry.roundId, btn.dataset.voteType, btn);
        });
    });

    return el;
}

// ============================================
// VOTING (Mutig / Ehrlich) — jeder Spieler kann pro Runde einmal je Kategorie abstimmen
// ============================================
async function castVote(roundId, voteType, btnEl) {
    if (!G.player) return;
    const entry = HistoryStore.findById(roundId);
    if (entry && entry.matchee === G.player) {
        showToast('Du kannst nicht für deine eigene Antwort abstimmen!', 'error');
        return;
    }
    try {
        const currentVal = entry?.votes?.[G.player]?.[voteType] || false;
        const newVal = !currentVal;
        await update(ref(db, `history/${roundId}/votes/${G.player}`), { [voteType]: newVal });
        if (btnEl) {
            btnEl.classList.remove('vote-btn-pop');
            void btnEl.offsetWidth;
            btnEl.classList.add('vote-btn-pop');
        }
    } catch (e) {
        console.error('castVote error:', e);
        showToast('Fehler beim Abstimmen', 'error');
    }
}

// ============================================
// LEADERBOARD — "Mutigste" / "Ehrlichste" Spieler
// ============================================
// Leichter Fingerprint aus roundId + Stimmenanzahl je Runde, um unnötige Neuberechnungen
// zu vermeiden, wenn watchHistory feuert, aber sich für die Bestenliste nichts geändert hat.
// Wichtig bei 100+ Runden, da tallyVotes() sonst bei jedem Firebase-Update über die komplette
// Liste laufen würde, auch wenn nur ein Antworttext o.ä. sich geändert hat.
let _leaderboardFingerprint = null;

function computeLeaderboardFingerprint(entries) {
    let fp = entries.length + '|';
    for (const e of entries) {
        const v = e.votes || {};
        let voteCount = 0;
        for (const key in v) {
            if (v[key]?.brave) voteCount++;
            if (v[key]?.honest) voteCount++;
        }
        fp += e.roundId + ':' + voteCount + ';';
    }
    return fp;
}

function renderLeaderboard(force = false) {
    const body = document.getElementById('leaderboard-body');
    const emptyMsg = document.getElementById('leaderboard-empty');
    if (!body) return;

    const allEntries = HistoryStore.getAll();
    const fingerprint = computeLeaderboardFingerprint(allEntries);
    if (!force && fingerprint === _leaderboardFingerprint) {
        return; // Keine relevanten Änderungen (Stimmen) seit letztem Render — Skip
    }
    _leaderboardFingerprint = fingerprint;

    const stats = {};
    G.allPlayers.forEach(p => { stats[p] = { brave: 0, honest: 0, total: 0 }; });

    let anyVotes = false;
    allEntries.forEach(entry => {
        if (!entry.matchee || !stats[entry.matchee]) return;
        const { brave, honest } = tallyVotes(entry.votes);
        if (brave || honest) anyVotes = true;
        stats[entry.matchee].brave += brave;
        stats[entry.matchee].honest += honest;
        stats[entry.matchee].total += brave + honest;
    });

    const ranked = Object.entries(stats)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.total - a.total);

    body.querySelectorAll('.leaderboard-row').forEach(r => r.remove());

    if (!anyVotes) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    ranked.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${i === 0 && p.total > 0 ? 'rank-1' : ''}`;
        row.innerHTML = `
            <span class="leaderboard-rank">${i + 1}</span>
            <span class="leaderboard-name">${p.name}</span>
            <span class="leaderboard-stats">
                <span class="stat-brave">🔥 ${p.brave}</span>
                <span class="stat-honest">💯 ${p.honest}</span>
                <span class="stat-total">🏆 ${p.total}</span>
            </span>
        `;
        body.appendChild(row);
    });
}

document.getElementById('leaderboard-toggle')?.addEventListener('click', () => {
    const body = document.getElementById('leaderboard-body');
    const icon = document.getElementById('leaderboard-toggle-icon');
    body?.classList.toggle('visible');
    icon?.classList.toggle('open');
});

function showHistoryDetail(entry) {
    const modal = document.getElementById('history-modal');
    modal.dataset.roundId = entry.roundId || '';
    const timeStr = new Date(entry.timestamp).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    document.getElementById('modal-matcher').textContent = entry.matcher || '-';
    document.getElementById('modal-matchee').textContent = entry.matchee || '-';
    document.getElementById('modal-question').textContent = entry.question || '-';
    document.getElementById('modal-answer').textContent = entry.answer || '-';
    document.getElementById('modal-time').textContent = timeStr;

    const imgSection = document.getElementById('modal-image-section');
    if (imgSection) imgSection.style.display = 'none'; // Bilder liegen nur in Discord, nicht in Firebase gespeichert

    const voteRow = document.getElementById('modal-vote-row');
    if (voteRow && entry.roundId) {
        const { brave, honest } = tallyVotes(entry.votes);
        const myVote = entry.votes?.[G.player] || {};
        const disabled = G.player === entry.matchee;
        voteRow.innerHTML = `
            <button type="button" class="vote-btn vote-btn-brave ${myVote.brave ? 'active' : ''}" data-vote-type="brave" ${disabled ? 'disabled' : ''}>
                🔥 <span class="vote-label">Mutig</span> <span class="vote-count">${brave}</span>
            </button>
            <button type="button" class="vote-btn vote-btn-honest ${myVote.honest ? 'active' : ''}" data-vote-type="honest" ${disabled ? 'disabled' : ''}>
                💯 <span class="vote-label">Ehrlich</span> <span class="vote-count">${honest}</span>
            </button>
        `;
        voteRow.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', () => castVote(entry.roundId, btn.dataset.voteType, btn));
        });
    }

    const typeBadge = document.getElementById('modal-type');
    if (entry.isManualQuestion) {
        typeBadge.textContent = '📝 Manuell';
        typeBadge.className = 'history-detail-badge manual';
    } else if (entry.choice === 'dare') {
        typeBadge.textContent = '🎯 Pflicht';
        typeBadge.className = 'history-detail-badge dare';
    } else {
        typeBadge.textContent = '💭 Wahrheit';
        typeBadge.className = 'history-detail-badge truth';
    }

    modal.classList.add('show');
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.remove('show');
}

document.getElementById('history-modal-close-btn')?.addEventListener('click', closeHistoryModal);
document.getElementById('history-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'history-modal' || e.target.classList.contains('history-modal-overlay')) {
        closeHistoryModal();
    }
});

// ============================================
// LOGIN / LOGOUT
// ============================================
document.querySelectorAll('.player-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const section = document.getElementById('pin-section');
        section.classList.add('visible');
        const input = document.getElementById('pin-input');
        input.dataset.player = btn.dataset.player;
        input.dataset.pin = btn.dataset.pin;
        input.value = '';
        input.focus();
    });
});

document.getElementById('pin-submit').addEventListener('click', doLogin);
document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// 👁️ PASSWORD VISIBILITY TOGGLE
const pinToggleBtn = document.getElementById('pin-toggle');
const pinInputEl = document.getElementById('pin-input');
const eyeOpen = pinToggleBtn.querySelector('.eye-open');
const eyeClosed = pinToggleBtn.querySelector('.eye-closed');
let pinVisible = false;

pinToggleBtn.addEventListener('click', () => {
    pinVisible = !pinVisible;
    pinInputEl.type = pinVisible ? 'text' : 'password';
    pinToggleBtn.classList.toggle('revealed', pinVisible);
    pinToggleBtn.setAttribute('aria-label', pinVisible ? 'PIN verbergen' : 'PIN anzeigen');

    const showEl = pinVisible ? eyeOpen : eyeClosed;
    const hideEl = pinVisible ? eyeClosed : eyeOpen;
    hideEl.style.display = 'none';
    showEl.style.display = 'block';
    showEl.classList.remove('pop');
    void showEl.offsetWidth; // restart animation
    showEl.classList.add('pop');

    pinInputEl.focus();
    const len = pinInputEl.value.length;
    pinInputEl.setSelectionRange(len, len);
});

// 🔒 LIVE PIN STRENGTH METER
const pinStrengthBars = document.querySelectorAll('#pin-strength span');
pinInputEl.addEventListener('input', () => {
    const val = pinInputEl.value;
    const len = val.length;
    let score = 0;
    if (len >= 4) score++;
    if (len >= 8) score++;
    if (/[0-9]/.test(val) && /[a-zA-Z]/.test(val)) score++;
    if (len >= 12) score++;

    pinStrengthBars.forEach((bar, i) => {
        bar.className = '';
        if (len === 0) return;
        if (score <= 1) { if (i === 0) bar.classList.add('fill-weak'); }
        else if (score === 2) { if (i <= 1) bar.classList.add('fill-mid'); }
        else if (score >= 3) { if (i <= (score === 4 ? 3 : 2)) bar.classList.add('fill-strong'); }
    });
});

async function doLogin() {
    const input = document.getElementById('pin-input');
    const name = input.dataset.player;
    const correctPin = input.dataset.pin;
    const entered = input.value.trim();

    if (!name) { showToast('Bitte wähle einen Spieler', 'error'); return; }
    if (!entered) { showToast('Bitte PIN eingeben', 'error'); return; }
    if (entered !== correctPin) {
        showToast('Falsche PIN', 'error');
        input.value = '';
        pinStrengthBars.forEach(b => b.className = '');
        const card = document.querySelector('.login-card');
        card.classList.remove('shake-error');
        void card.offsetWidth;
        card.classList.add('shake-error');
        return;
    }

    saveSession(name);
    document.getElementById('current-player').textContent = name;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('admin-bar').classList.toggle('visible', name === 'Halil');

    watchGameState();
    watchHistory();
    showToast(`Willkommen, ${name}! 🎉`, 'success');
    input.value = '';
    document.getElementById('pin-section').classList.remove('visible');
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
}

document.getElementById('pin-cancel').addEventListener('click', () => {
    document.getElementById('pin-section').classList.remove('visible');
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('pin-input').value = '';
});

document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('game-screen').classList.remove('active');
    showToast('Abgemeldet', 'info');
});

// ============================================
// GAME ACTIONS
// ============================================
document.getElementById('start-game-btn').addEventListener('click', async () => {
    try {
        const shuffled = [...G.allPlayers].sort(() => Math.random() - 0.5);
        const matcher = shuffled[0];
        const matchee = shuffled[1];

        await set(ref(db, 'gameState'), {
            status: 'CHOICE',
            matcher,
            matchee,
            currentChoice: null,
            currentQuestion: null,
            isManualQuestion: false,
            startedAt: new Date().toISOString()
        });
        showToast(`Neue Runde: ${matchee} wählt!`, 'success');
        sendDiscordStatus('🎲 Neue Runde gestartet', `**${matcher}** fragt **${matchee}**.\n${matchee} muss jetzt zwischen 💭 Wahrheit und 🎯 Pflicht wählen.`, DISCORD_COLOR.info);
    } catch (e) {
        console.error(e);
        showToast('Fehler beim Starten', 'error');
    }
});

// 💭 CHOICE STATE: Matchee picks Wahrheit or Pflicht
document.getElementById('choice-truth').addEventListener('click', () => makeChoice('truth'));
document.getElementById('choice-dare').addEventListener('click', () => makeChoice('dare'));

async function makeChoice(type) {
    if (G.role !== 'matchee') {
        showToast('Du bist nicht an der Reihe!', 'error');
        return;
    }
    try {
        await update(ref(db, 'gameState'), {
            status: 'WAITING_FOR_QUESTION',
            currentChoice: type
        });
        showToast(`Du hast ${type === 'dare' ? 'Pflicht' : 'Wahrheit'} gewählt!`, 'success');
        const label = type === 'dare' ? '🎯 Pflicht' : '💭 Wahrheit';
        sendDiscordStatus('🎲 Wahl getroffen', `**${G.db.matchee}** hat **${label}** gewählt.\n**${G.db.matcher}** schreibt jetzt die Frage.`, type === 'dare' ? DISCORD_COLOR.dare : DISCORD_COLOR.truth);
    } catch (e) {
        console.error(e);
        showToast('Fehler beim Speichern der Wahl', 'error');
    }
}

// 📝 FRAGESTELLER-AKTIONEN (Fragetext-Feld & Zeichenzähler-Integration)
const qiTextarea = document.getElementById('qi-textarea');
qiTextarea?.addEventListener('input', (e) => {
    const count = e.target.value.length;
    setText('qi-char-count', count);
});

document.getElementById('qi-random-btn')?.addEventListener('click', () => {
    if (G.role !== 'matcher') return;
    const currentChoice = G.db?.currentChoice || 'truth';
    const randomQ = randomQuestion(currentChoice);
    if (qiTextarea) {
        qiTextarea.value = randomQ;
        setText('qi-char-count', randomQ.length);
    }
});

document.getElementById('qi-submit-btn')?.addEventListener('click', async () => {
    if (G.role !== 'matcher') {
        showToast('Du bist nicht der Fragesteller!', 'error');
        return;
    }
    const questionText = qiTextarea.value.trim();
    if (!questionText) {
        showToast('Bitte schreibe eine Frage!', 'error');
        return;
    }
    try {
        await update(ref(db, 'gameState'), {
            status: 'ANSWER',
            currentQuestion: questionText
        });
        showToast('Frage erfolgreich abgesendet!', 'success');
        const label = G.db.currentChoice === 'dare' ? '🎯 Pflicht' : '💭 Wahrheit';
        sendDiscordStatus('📝 Frage gestellt', `**${G.db.matcher}** → **${G.db.matchee}** (${label})\n**Frage:** ${questionText}\n\n${G.db.matchee} antwortet jetzt...`, DISCORD_COLOR.info);
        qiTextarea.value = '';
        setText('qi-char-count', 0);
    } catch (e) {
        console.error(e);
        showToast('Fehler beim Senden der Frage', 'error');
    }
});

// 💬 ANTWORT-AKTIONEN DER ZIELPERSON (Antwortlogik & Dateianhang-Verarbeitung)
const answerTextarea = document.getElementById('answer-textarea');
answerTextarea?.addEventListener('input', (e) => {
    const count = e.target.value.length;
    setText('char-count', count);
});

document.getElementById('proof-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const nameEl = document.getElementById('file-name');
    const previewWrap = document.getElementById('proof-preview');
    const previewImg = document.getElementById('proof-preview-img');
    const zoneInner = document.querySelector('.upload-zone-inner');

    if (!file) {
        G.proofFile = null;
        if (nameEl) nameEl.textContent = '';
        if (previewWrap) previewWrap.classList.remove('visible');
        zoneInner?.classList.remove('has-file');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showToast('Bitte wähle eine Bilddatei aus', 'error');
        e.target.value = '';
        return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — größere Bilder können den Discord-Upload zerschießen
    if (file.size > MAX_FILE_SIZE) {
        showToast(`Bild zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximal 10 MB erlaubt.`, 'error', 4500);
        e.target.value = '';
        G.proofFile = null;
        if (nameEl) nameEl.textContent = '';
        if (previewWrap) previewWrap.classList.remove('visible');
        zoneInner?.classList.remove('has-file');
        return;
    }

    G.proofFile = file;
    if (nameEl) nameEl.textContent = `📎 ${file.name} ausgewählt`;
    zoneInner?.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = (ev) => {
        if (previewImg) previewImg.src = ev.target.result;
        if (previewWrap) previewWrap.classList.add('visible');
    };
    reader.readAsDataURL(file);
});

document.getElementById('submit-answer-btn')?.addEventListener('click', async () => {
    if (G.role !== 'matchee') return;
    const answerText = answerTextarea.value.trim();
    if (!answerText) {
        showToast('Bitte gib eine Antwort ein!', 'error');
        return;
    }
    await finishRound(answerText);
});

document.getElementById('skip-answer-btn')?.addEventListener('click', async () => {
    if (G.role !== 'matchee') return;
    await finishRound('Abgelehnt / Übersprungen ❌');
});

async function finishRound(finalAnswer) {
    const submitBtn = document.getElementById('submit-answer-btn');
    const skipBtn = document.getElementById('skip-answer-btn');
    try {
        if (submitBtn) submitBtn.disabled = true;
        if (skipBtn) skipBtn.disabled = true;

        const roundId = G.db.startedAt ? G.db.startedAt.replace(/[.#$/[\]]/g, '-') : new Date().getTime().toString();
        const hasProof = !!G.proofFile;
        const historyEntry = {
            matcher: G.db.matcher,
            matchee: G.db.matchee,
            choice: G.db.currentChoice,
            question: G.db.currentQuestion,
            answer: finalAnswer,
            isManualQuestion: G.db.isManualQuestion || false,
            timestamp: new Date().toISOString(),
            hasProof,
            votes: {}
        };

        await set(ref(db, `history/${roundId}`), historyEntry);
        await update(ref(db, 'gameState'), { status: 'COMPLETED' });

        showToast('Runde erfolgreich beendet!', 'success');

        // Beweisfoto + alle Rundendetails gehen live an Discord (Bild als echter Datei-Anhang).
        // Die Runde selbst ist bereits gespeichert – ein Discord-Fehler soll den Nutzer nur warnen, nicht blockieren.
        sendDiscordRoundComplete(historyEntry, G.proofFile).then(ok => {
            if (!ok) {
                showToast('Runde gespeichert, aber Discord-Benachrichtigung fehlgeschlagen ⚠️', 'warning', 5000);
            }
        });
        if (answerTextarea) answerTextarea.value = '';
        setText('char-count', 0);
        const fileInput = document.getElementById('proof-file');
        if (fileInput) fileInput.value = '';
        setText('file-name', '');
        G.proofFile = null;
        document.getElementById('proof-preview')?.classList.remove('visible');
        document.querySelector('.upload-zone-inner')?.classList.remove('has-file');
    } catch (e) {
        console.error(e);
        showToast('Fehler beim Beenden der Runde', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (skipBtn) skipBtn.disabled = false;
    }
}

document.getElementById('next-round-btn')?.addEventListener('click', async () => {
    await resetToWaiting();
});

// ⚙️ ADMIN PANEL CONTROLS (Halil yetkileri)
document.getElementById('reset-round-btn')?.addEventListener('click', async () => {
    if (G.player !== 'Halil') return;
    await resetToWaiting();
    showToast('Runde wurde vom Admin zurückgesetzt!', 'warning');
});

document.getElementById('assign-btn')?.addEventListener('click', async () => {
    if (G.player !== 'Halil') return;
    const matcherSel = document.getElementById('matcher-dropdown').value;
    const matcheeSel = document.getElementById('matchee-dropdown').value;

    if (!matcherSel || !matcheeSel) {
        showToast('Bitte wähle Fragesteller und Zielperson!', 'error');
        return;
    }
    if (matcherSel === matcheeSel) {
        showToast('Fragesteller und Zielperson müssen unterschiedlich sein!', 'error');
        return;
    }

    try {
        await set(ref(db, 'gameState'), {
            status: 'CHOICE',
            matcher: matcherSel,
            matchee: matcheeSel,
            currentChoice: null,
            currentQuestion: null,
            isManualQuestion: true,
            startedAt: new Date().toISOString()
        });
        showToast(`Manuelle Zuweisung erfolgreich!`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Fehler bei der Zuweisung', 'error');
    }
});

async function resetToWaiting() {
    try {
        await set(ref(db, 'gameState'), {
            status: 'WAITING',
            matcher: null,
            matchee: null,
            currentChoice: null,
            currentQuestion: null,
            isManualQuestion: false
        });
    } catch (e) {
        console.error(e);
    }
}

// Automatische Sitzungsprüfung
const activeSession = loadSession();
if (activeSession) {
    document.getElementById('current-player').textContent = G.player;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('admin-bar').classList.toggle('visible', G.player === 'Halil');
    watchGameState();
    watchHistory();
}

// ============================================
// ANIMATIONEN (ehemals animations.js)
// ============================================
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. 3D STARFIELD / PARTICLE BACKGROUND ---------- */
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let W, H, particles = [];
    const PARTICLE_COUNT = reduceMotion ? 0 : (window.innerWidth < 700 ? 70 : 140);
    const colors = ['#4f8ef7', '#f7714f', '#b06ef7', '#ffffff'];

    function resizeCanvas() {
        W = bgCanvas.width = window.innerWidth;
        H = bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function Particle() {
        this.reset(true);
    }
    Particle.prototype.reset = function (init) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.z = Math.random() * 1.6 + 0.4; // depth factor (parallax)
        this.baseR = Math.random() * 1.6 + 0.4;
        this.vx = (Math.random() - 0.5) * 0.15 * this.z;
        this.vy = (Math.random() - 0.5) * 0.15 * this.z;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.01 + Math.random() * 0.02;
        if (!init) { this.x = Math.random() < 0.5 ? -5 : W + 5; }
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    let mouseX = W / 2, mouseY = H / 2;
    let targetParX = 0, targetParY = 0, curParX = 0, curParY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        targetParX = (e.clientX / W - 0.5) * 2;
        targetParY = (e.clientY / H - 0.5) * 2;

        const glow = document.getElementById('cursor-glow');
        if (glow) {
            glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        }
    }, { passive: true });

    function drawParticles() {
        if (reduceMotion) return;
        bgCtx.clearRect(0, 0, W, H);

        curParX += (targetParX - curParX) * 0.04;
        curParY += (targetParY - curParY) * 0.04;

        // connecting lines (constellation effect) - sampled for perf
        bgCtx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.twinklePhase += p.twinkleSpeed;

            // parallax offset based on depth
            const parX = curParX * 18 * p.z;
            const parY = curParY * 18 * p.z;

            if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) p.reset(false);

            const drawX = p.x + parX;
            const drawY = p.y + parY;
            const twinkle = (Math.sin(p.twinklePhase) + 1) / 2;
            const r = p.baseR * p.z * (0.7 + twinkle * 0.6);
            const alpha = 0.25 + twinkle * 0.5;

            bgCtx.beginPath();
            bgCtx.arc(drawX, drawY, r, 0, Math.PI * 2);
            bgCtx.fillStyle = p.color;
            bgCtx.globalAlpha = alpha * (p.z / 2);
            bgCtx.shadowBlur = 6 * p.z;
            bgCtx.shadowColor = p.color;
            bgCtx.fill();
        }
        bgCtx.globalAlpha = 1;
        bgCtx.shadowBlur = 0;

        requestAnimationFrame(drawParticles);
    }
    requestAnimationFrame(drawParticles);

    /* ---------- 2. 3D CARD TILT ON HOVER ---------- */
    function attachTilt(selector, maxTilt) {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.tiltBound) return;
            el.dataset.tiltBound = '1';
            if (reduceMotion) return;

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rotY = (px - 0.5) * maxTilt;
                const rotX = (0.5 - py) * maxTilt;
                el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
                el.style.setProperty('--mx', `${px * 100}%`);
                el.style.setProperty('--my', `${py * 100}%`);
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    function refreshTiltTargets() {
        attachTilt('.login-card', 6);
        attachTilt('.card', 4);
    }
    refreshTiltTargets();
    // Re-bind periodically since game-state cards toggle visibility/content
    setInterval(refreshTiltTargets, 1500);

    /* ---------- 3. BUTTON RIPPLE EFFECT ---------- */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn, .player-btn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height) * 1.4;
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
    });

    /* ---------- 4. CONFETTI BURST ---------- */
    const confettiCanvas = document.getElementById('confetti-canvas');
    const cCtx = confettiCanvas.getContext('2d');
    let confettiPieces = [];
    let confettiRunning = false;

    function resizeConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeConfetti);
    resizeConfetti();

    function fireConfetti(originX, originY, count) {
        if (reduceMotion) return;
        count = count || 90;
        originX = originX ?? confettiCanvas.width / 2;
        originY = originY ?? confettiCanvas.height / 3;
        const palette = ['#4f8ef7', '#f7714f', '#b06ef7', '#22d37a', '#f7c94f', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 9 + 3;
            confettiPieces.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                gravity: 0.22,
                size: Math.random() * 7 + 4,
                color: palette[Math.floor(Math.random() * palette.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 20,
                life: 1,
                decay: Math.random() * 0.008 + 0.006,
                shape: Math.random() < 0.5 ? 'rect' : 'circle'
            });
        }
        if (!confettiRunning) {
            confettiRunning = true;
            requestAnimationFrame(animateConfetti);
        }
    }
    window.fireConfetti = fireConfetti;

    function animateConfetti() {
        cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiPieces.forEach((p) => {
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.life -= p.decay;

            cCtx.save();
            cCtx.globalAlpha = Math.max(p.life, 0);
            cCtx.translate(p.x, p.y);
            cCtx.rotate((p.rotation * Math.PI) / 180);
            cCtx.fillStyle = p.color;
            if (p.shape === 'rect') {
                cCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                cCtx.beginPath();
                cCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                cCtx.fill();
            }
            cCtx.restore();
        });

        confettiPieces = confettiPieces.filter((p) => p.life > 0 && p.y < confettiCanvas.height + 50);

        if (confettiPieces.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiRunning = false;
            cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    /* ---------- 5. HOOK CONFETTI INTO GAME EVENTS ---------- */
    // Successful login
    const originalDoLoginBtn = document.getElementById('pin-submit');
    if (originalDoLoginBtn) {
        originalDoLoginBtn.addEventListener('click', () => {
            setTimeout(() => {
                const gameScreenActive = document.getElementById('game-screen').classList.contains('active');
                if (gameScreenActive) {
                    const rect = originalDoLoginBtn.getBoundingClientRect();
                    fireConfetti(rect.left + rect.width / 2, rect.top, 60);
                }
            }, 80);
        });
    }

    // Truth/Dare choice made
    ['choice-truth', 'choice-dare'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                const rect = el.getBoundingClientRect();
                fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 50);
            });
        }
    });

    // Answer submitted
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener('click', () => {
            const rect = submitAnswerBtn.getBoundingClientRect();
            setTimeout(() => fireConfetti(rect.left + rect.width / 2, rect.top, 70), 150);
        });
    }

    /* ---------- 6. PAGE ENTRY 3D REVEAL ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '0';
        document.body.style.transform = 'scale(0.98) translateZ(-40px)';
        document.body.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
            document.body.style.transform = 'scale(1) translateZ(0)';
        });
    });

    /* ---------- 7. GLOWING SCROLLBAR / GAME STATE SWITCH ANIMATION HOOK ---------- */
    const gameStateObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const el = m.target;
                if (el.classList.contains('active') && el.classList.contains('game-state')) {
                    el.style.animation = 'none';
                    void el.offsetWidth;
                    el.style.animation = '';
                    refreshTiltTargets();
                }
            }
        });
    });
    document.querySelectorAll('.game-state').forEach((el) => {
        gameStateObserver.observe(el, { attributes: true });
    });

})();
