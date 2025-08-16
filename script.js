document.addEventListener('DOMContentLoaded', () => {
    // ESTADO GLOBAL DO APLICATIVO
    const appState = { participants: [], sessions: [], balances: {} };

    // SELETORES DE ELEMENTOS DA UI
    const setupStep = document.getElementById('setup-step');
    const gameStep = document.getElementById('game-step');
    const modal = document.getElementById('modal');
    
    // Configuração
    const participantsListDiv = document.getElementById('participants-list');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const startDayBtn = document.getElementById('start-day-btn');

    // Jogo
    const sessionTitle = document.getElementById('session-title');
    const sessionHostSelect = document.getElementById('session-host-select');
    const currentSessionPlayersDiv = document.getElementById('current-session-players');
    const finalAmountInput = document.getElementById('final-amount');
    const endSessionBtn = document.getElementById('end-session-btn');
    const sessionsHistoryDiv = document.getElementById('sessions-history');

    // Gerenciamento
    const exitPlayerSelect = document.getElementById('exit-player-select');
    const calculateExitBtn = document.getElementById('calculate-exit-btn');
    const showSummaryBtn = document.getElementById('show-summary-btn');
    const resetDayBtn = document.getElementById('reset-day-btn');

    // Modal
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');

    // --- FUNÇÕES PRINCIPAIS E EVENTOS ---

    const addParticipantField = () => {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'participant-input';
        inputDiv.innerHTML = `<input type="text" placeholder="Nome do participante"><button class="remove-btn">&times;</button>`;
        participantsListDiv.appendChild(inputDiv);
    };

    const startDay = () => {
        const names = [...new Set(Array.from(participantsListDiv.querySelectorAll('input'))
            .map(input => input.value.trim()).filter(Boolean))];
        
        if (names.length < 2) {
            alert('São necessários pelo menos 2 participantes com nomes preenchidos.');
            return;
        }

        appState.participants = names;
        appState.sessions = [];
        appState.balances = Object.fromEntries(names.map(name => [name, 0]));

        setupStep.classList.remove('active');
        gameStep.classList.add('active');
        
        updatePlayerDropdowns();
        renderCurrentSession();
    };

    const endSession = () => {
        const finalAmount = parseFloat(finalAmountInput.value.replace(',', '.')) || 0;
        const host = sessionHostSelect.value;

        if (!host) { alert('Selecione o Host desta banca.'); return; }

        const session = { host, finalAmount, contributions: [], totalInvested: 0 };
        
        appState.participants.forEach(name => {
            const value = parseFloat(document.getElementById(`val-${name}`).value.replace(',', '.')) || 0;
            const paid = document.getElementById(`paid-${name}`).checked;
            if (value > 0) {
                session.contributions.push({ name, value, paid });
                session.totalInvested += value;
            }
        });

        if (session.totalInvested === 0) { alert('Ninguém investiu nesta banca.'); return; }

        session.contributions.forEach(contrib => {
            const share = (contrib.value / session.totalInvested) * session.finalAmount;
            const profitLoss = share - contrib.value;
            appState.balances[contrib.name] += profitLoss;

            if (!contrib.paid && contrib.name !== session.host) {
                appState.balances[contrib.name] -= contrib.value;
                appState.balances[session.host] += contrib.value;
            }
        });

        appState.sessions.push(session);
        updateHistoryLog();
        renderCurrentSession();
    };

    const calculatePlayerExit = () => {
        const leavingPlayer = exitPlayerSelect.value;
        if (!leavingPlayer) return;

        const currentHost = sessionHostSelect.value;
        const balanceFromSessions = appState.balances[leavingPlayer];
        const valueInCurrentSession = parseFloat(document.getElementById(`val-${leavingPlayer}`).value.replace(',', '.')) || 0;
        const totalToSettle = balanceFromSessions + valueInCurrentSession;
        
        let html = `<h2>Resumo de Saída para ${leavingPlayer}</h2>`;
        html += `<p>Saldo das bancas finalizadas: <strong class="${balanceFromSessions >= 0 ? 'profit' : 'loss'}">R$ ${balanceFromSessions.toFixed(2)}</strong></p>`;
        html += `<p>Valor a ser devolvido da banca atual: <strong>R$ ${valueInCurrentSession.toFixed(2)}</strong></p>`;
        html += `<hr><p><strong>TOTAL A ACERTAR: R$ ${Math.abs(totalToSettle).toFixed(2)}</strong></p><hr>`;

        if (totalToSettle > 0) {
            html += `<h3><strong class="profit">${currentHost} (Host) deve pagar R$ ${totalToSettle.toFixed(2)} para ${leavingPlayer}.</strong></h3>`;
        } else if (totalToSettle < 0) {
            html += `<h3><strong class="loss">${leavingPlayer} deve pagar R$ ${Math.abs(totalToSettle).toFixed(2)} para ${currentHost} (Host).</strong></h3>`;
        } else {
            html += `<h3>As contas estão zeradas.</h3>`;
        }
        
        showModal(html);
    };

    const showFinalSummary = () => {
        if (appState.sessions.length === 0) {
            alert('Nenhuma banca foi finalizada.');
            return;
        }
        let html = '<h2>📊 Resumo Final do Dia</h2>';
        html += '<h3>Saldo Final de Cada Um:</h3>';
        Object.entries(appState.balances).forEach(([name, balance]) => {
            html += `<p>${name}: <strong class="${balance >= 0 ? 'profit' : 'loss'}">R$ ${balance.toFixed(2)}</strong></p>`;
        });
        showModal(html);
    };

    // --- FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
    const renderCurrentSession = () => {
        sessionTitle.innerText = `Banca #${appState.sessions.length + 1}`;
        currentSessionPlayersDiv.innerHTML = appState.participants.map(name => `
            <div class="contribution-item">
                <label for="val-${name}">${name}:</label>
                <input type="number" id="val-${name}" placeholder="0.00">
                <div class="checkbox-container">
                    <input type="checkbox" id="paid-${name}" checked>
                    <label for="paid-${name}">Pagou</label>
                </div>
            </div>`).join('');
        finalAmountInput.value = '';
    };

    const updatePlayerDropdowns = () => {
        const optionsHTML = appState.participants.map(name => `<option value="${name}">${name}</option>`).join('');
        sessionHostSelect.innerHTML = optionsHTML;
        exitPlayerSelect.innerHTML = optionsHTML;
    };

    const updateHistoryLog = () => {
        if (appState.sessions.length === 0) {
            sessionsHistoryDiv.innerHTML = '<p class="empty-state">Nenhuma banca finalizada.</p>';
            return;
        }
        const historyHTML = appState.sessions.map((session, index) => {
            const result = session.finalAmount - session.totalInvested;
            return `<li><strong>#${index + 1} (Host: ${session.host})</strong> <span class="${result >= 0 ? 'profit' : 'loss'}">R$ ${result.toFixed(2)}</span></li>`;
        }).join('');
        sessionsHistoryDiv.innerHTML = `<ul>${historyHTML}</ul>`;
    };

    const showModal = (content) => {
        modalBody.innerHTML = content;
        modal.classList.add('active');
    };

    // --- EVENT LISTENERS ---
    addParticipantBtn.addEventListener('click', addParticipantField);
    participantsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            e.target.parentElement.remove();
        }
    });
    startDayBtn.addEventListener('click', startDay);
    endSessionBtn.addEventListener('click', endSession);
    calculateExitBtn.addEventListener('click', calculatePlayerExit);
    showSummaryBtn.addEventListener('click', showFinalSummary);
    resetDayBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja apagar TODOS os dados e começar de novo?')) {
            window.location.reload();
        }
    });
    modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Inicia a aplicação adicionando os dois primeiros campos de participante.
    addParticipantField();
    addParticipantField();
});