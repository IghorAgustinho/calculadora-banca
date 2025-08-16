document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL DO APLICATIVO ---
    let appState = {
        participants: [],
        sessions: [],
        balances: {}
    };

    // --- SELETORES DE ELEMENTOS DA UI ---
    // Containers
    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    const modal = document.getElementById('modal');
    
    // Setup
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

    // --- FUNÇÕES E EVENTOS ---

    // Adiciona campo para novo participante na tela de setup
    addParticipantBtn.addEventListener('click', () => {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'participant-input';
        inputDiv.innerHTML = `<input type="text" placeholder="Nome do participante ${participantsListDiv.children.length + 1}">`;
        participantsListDiv.appendChild(inputDiv);
    });

    // Inicia o dia de jogo com os participantes definidos
    startDayBtn.addEventListener('click', () => {
        const participantInputs = participantsListDiv.querySelectorAll('input');
        const names = Array.from(participantInputs).map(input => input.value.trim()).filter(name => name);
        
        if (names.length < 2) {
            alert('São necessários pelo menos 2 participantes.');
            return;
        }

        appState.participants = [...new Set(names)]; // Garante nomes únicos
        appState.participants.forEach(name => { appState.balances[name] = 0; });

        setupContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        updatePlayerDropdowns();
        renderCurrentSession();
    });

    // Finaliza a banca atual, calcula resultados e prepara para a próxima
    endSessionBtn.addEventListener('click', () => {
        const finalAmount = parseFloat(finalAmountInput.value);
        const host = sessionHostSelect.value;

        if (isNaN(finalAmount)) { alert('Insira o valor final da banca.'); return; }
        if (!host) { alert('Selecione o Host desta banca.'); return; }

        const session = { host, finalAmount, contributions: [], totalInvested: 0 };
        let currentTotalInvested = 0;

        appState.participants.forEach(name => {
            const value = parseFloat(document.getElementById(`val-${name}`).value) || 0;
            const paid = document.getElementById(`paid-${name}`).checked;
            if (value > 0) {
                session.contributions.push({ name, value, paid });
                currentTotalInvested += value;
            }
        });

        if (currentTotalInvested === 0) { alert('Ninguém investiu nesta banca.'); return; }
        session.totalInvested = currentTotalInvested;

        // Atualiza saldos com base no resultado da sessão
        session.contributions.forEach(contrib => {
            const share = (contrib.value / session.totalInvested) * session.finalAmount;
            const profitLoss = share - contrib.value;
            appState.balances[contrib.name] += profitLoss;

            if (!contrib.paid && contrib.name !== session.host) {
                appState.balances[contrib.name] -= contrib.value; // Deve o valor que não pagou
                appState.balances[session.host] += contrib.value;   // Host recebe esse valor
            }
        });

        appState.sessions.push(session);
        updateHistory();
        renderCurrentSession();
    });
    
    // Calcula e mostra o acerto de contas para um jogador que está saindo
    calculateExitBtn.addEventListener('click', () => {
        const leavingPlayer = exitPlayerSelect.value;
        if (!leavingPlayer) { alert('Selecione um jogador para calcular a saída.'); return; }

        const currentHost = sessionHostSelect.value;
        const balanceFromSessions = appState.balances[leavingPlayer];
        const valueInCurrentSession = parseFloat(document.getElementById(`val-${leavingPlayer}`).value) || 0;
        const totalToSettle = balanceFromSessions + valueInCurrentSession;
        
        let html = `<h3>Resumo de Saída para ${leavingPlayer}</h3>`;
        html += `<p>Saldo das bancas finalizadas: <strong class="${balanceFromSessions >= 0 ? 'profit' : 'loss'}">R$ ${balanceFromSessions.toFixed(2)}</strong></p>`;
        html += `<p>Valor a ser devolvido da banca atual: <strong>R$ ${valueInCurrentSession.toFixed(2)}</strong></p>`;
        html += `<hr><p><strong>TOTAL A ACERTAR: R$ ${Math.abs(totalToSettle).toFixed(2)}</strong></p><hr>`;

        if (totalToSettle > 0) {
            html += `<h3><strong class="profit">${currentHost} (Host atual) deve pagar R$ ${totalToSettle.toFixed(2)} para ${leavingPlayer}.</strong></h3>`;
        } else if (totalToSettle < 0) {
            html += `<h3><strong class="loss">${leavingPlayer} deve pagar R$ ${Math.abs(totalToSettle).toFixed(2)} para ${currentHost} (Host atual).</strong></h3>`;
        } else {
            html += `<h3>As contas estão zeradas. Ninguém deve nada.</h3>`;
        }
        
        showModal(html);
    });
    
    // Mostra o resumo final do dia
    showSummaryBtn.addEventListener('click', () => {
        if (appState.sessions.length === 0) {
            alert('Nenhuma banca foi finalizada para gerar um resumo.');
            return;
        }
        let html = '<h2>📊 Resumo Final do Dia</h2>';
        html += '<h3>Saldo Final de Cada Um:</h3>';
        Object.entries(appState.balances).forEach(([name, balance]) => {
            html += `<p>${name}: <strong class="${balance >= 0 ? 'profit' : 'loss'}">R$ ${balance.toFixed(2)}</strong></p>`;
        });
        showModal(html);
    });

    // Reseta o dia inteiro
    resetDayBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja apagar TODOS os dados e começar de novo?')) {
            window.location.reload();
        }
    });

    // --- FUNÇÕES AUXILIARES ---

    // Prepara a tela para a banca atual
    function renderCurrentSession() {
        sessionTitle.innerText = `Banca #${appState.sessions.length + 1}`;
        currentSessionPlayersDiv.innerHTML = '';
        appState.participants.forEach(name => {
            currentSessionPlayersDiv.innerHTML += `
                <div class="contribution-input">
                    <label for="val-${name}">${name}:</label>
                    <input type="number" id="val-${name}" placeholder="Valor (R$)">
                    <div class="payment-status">
                        <input type="checkbox" id="paid-${name}">
                        <label for="paid-${name}">Pagou?</label>
                    </div>
                </div>`;
        });
        finalAmountInput.value = '';
    }
    
    // Atualiza a lista de jogadores nos dropdowns (selects)
    function updatePlayerDropdowns() {
        const options = appState.participants.map(name => `<option value="${name}">${name}</option>`).join('');
        sessionHostSelect.innerHTML = options;
        exitPlayerSelect.innerHTML = options;
    }
    
    // Atualiza o histórico de bancas na tela
    function updateHistory() {
        if (appState.sessions.length === 0) {
            sessionsHistoryDiv.innerHTML = '<p>Nenhuma banca finalizada ainda.</p>';
            return;
        }
        sessionsHistoryDiv.innerHTML = '<ul>' + appState.sessions.map((session, index) => {
            const result = session.finalAmount - session.totalInvested;
            return `<li><strong>Banca #${index + 1} (Host: ${session.host}):</strong> Invest R$ ${session.totalInvested.toFixed(2)} | Final R$ ${session.finalAmount.toFixed(2)} | <span class="${result >= 0 ? 'profit' : 'loss'}">Result: R$ ${result.toFixed(2)}</span></li>`;
        }).join('') + '</ul>';
    }

    // Funções do Modal
    function showModal(content) {
        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
    }
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});