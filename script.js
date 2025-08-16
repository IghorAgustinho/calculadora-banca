document.addEventListener('DOMContentLoaded', () => {
    // ESTADO GLOBAL DO APLICATIVO
    const appState = { participants: [], sessions: [], balances: {} };

    // SELETORES DE ELEMENTOS DA UI
    const setupStep = document.getElementById('setup-step');
    const gameStep = document.getElementById('game-step');
    const modal = document.getElementById('modal');
    const participantsListDiv = document.getElementById('participants-list');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const startDayBtn = document.getElementById('start-day-btn');
    const sessionTitle = document.getElementById('session-title');
    const sessionHostSelect = document.getElementById('session-host-select');
    const currentSessionPlayersDiv = document.getElementById('current-session-players');
    const finalAmountInput = document.getElementById('final-amount');
    const endSessionBtn = document.getElementById('end-session-btn');
    const sessionsHistoryDiv = document.getElementById('sessions-history');
    const exitPlayerSelect = document.getElementById('exit-player-select');
    const calculateExitBtn = document.getElementById('calculate-exit-btn');
    const showSummaryBtn = document.getElementById('show-summary-btn');
    const resetDayBtn = document.getElementById('reset-day-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');

    // --- FUNÇÕES DE CONTROLE DE VISIBILIDADE ---
    const switchStep = (stepToShow) => {
        setupStep.classList.remove('active');
        gameStep.classList.remove('active');
        if (stepToShow === 'game') gameStep.classList.add('active');
        else setupStep.classList.add('active');
    };
    const showModal = (content) => {
        modalBody.innerHTML = content;
        modal.classList.add('active');
    };
    const closeModal = () => modal.classList.remove('active');

    // --- LÓGICA DA APLICAÇÃO ---
    const addParticipantField = () => {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'participant-input';
        inputDiv.innerHTML = `<input type="text" placeholder="Nome do participante"><button class="remove-btn">&times;</button>`;
        participantsListDiv.appendChild(inputDiv);
    };

    const startDay = () => {
        const names = [...new Set(Array.from(participantsListDiv.querySelectorAll('input')).map(input => input.value.trim()).filter(Boolean))];
        if (names.length < 2) { alert('São necessários pelo menos 2 participantes.'); return; }
        appState.participants = names;
        appState.sessions = [];
        appState.balances = Object.fromEntries(names.map(name => [name, 0]));
        switchStep('game');
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

        // --- LÓGICA DE CÁLCULO DE SALDO CORRIGIDA ---
        // 1. Calcula o resultado puro do jogo (lucro/prejuízo) para todos
        session.contributions.forEach(contrib => {
            const share = (contrib.value / session.totalInvested) * session.finalAmount;
            const profitLoss = share - contrib.value;
            appState.balances[contrib.name] += profitLoss;
        });

        // 2. Ajusta os saldos com base nas dívidas (quem não pagou a entrada)
        session.contributions.forEach(contrib => {
            if (!contrib.paid && contrib.name !== session.host) {
                // O jogador que não pagou agora deve ao Host
                appState.balances[contrib.name] -= contrib.value;
                // O Host tem esse valor a receber
                appState.balances[session.host] += contrib.value;
            }
        });
        // A lógica agora separa o resultado do jogo da dívida da entrada, evitando o erro anterior.
        
        appState.sessions.push(session);
        updateHistoryLog();
        renderCurrentSession();
    };
    
    const calculateOptimalSettlements = (balances) => {
        const transactions = [];
        const debtors = [];
        const creditors = [];

        Object.entries(balances).forEach(([person, balance]) => {
            if (balance < -0.01) {
                debtors.push({ name: person, amount: -balance });
            } else if (balance > 0.01) {
                creditors.push({ name: person, amount: balance });
            }
        });
        
        while (debtors.length > 0 && creditors.length > 0) {
            const debtor = debtors[0];
            const creditor = creditors[0];
            const amountToTransfer = Math.min(debtor.amount, creditor.amount);

            transactions.push(`<strong>${debtor.name}</strong> paga <span class="profit">R$ ${amountToTransfer.toFixed(2)}</span> para <strong>${creditor.name}</strong>`);
            
            debtor.amount -= amountToTransfer;
            creditor.amount -= amountToTransfer;

            if (debtor.amount < 0.01) debtors.shift();
            if (creditor.amount < 0.01) creditors.shift();
        }
        return transactions;
    };

    const calculatePlayerExit = () => {
        const leavingPlayer = exitPlayerSelect.value;
        if (!leavingPlayer) return;

        const valueInCurrentSession = parseFloat(document.getElementById(`val-${leavingPlayer}`).value.replace(',', '.')) || 0;
        
        const tempBalances = { ...appState.balances };
        Object.keys(tempBalances).forEach(key => tempBalances[key] = appState.balances[key]);
        
        tempBalances[leavingPlayer] += valueInCurrentSession;
        const currentHost = sessionHostSelect.value;
        if (leavingPlayer !== currentHost) {
            tempBalances[currentHost] -= valueInCurrentSession;
        }

        const transactions = calculateOptimalSettlements(tempBalances);
        
        let html = `<h2>Resumo de Saída para ${leavingPlayer}</h2>`;
        const finalBalance = appState.balances[leavingPlayer] + valueInCurrentSession;
        html += `<p>Saldo Final do Jogador: <strong class="${finalBalance >= 0 ? 'profit' : 'loss'}">R$ ${finalBalance.toFixed(2)}</strong></p><hr>`;
        html += `<h3>Transações para Zerar a Conta:</h3>`;
        
        const playerTransactions = transactions.filter(t => t.includes(leavingPlayer));
        if (playerTransactions.length > 0) {
            html += playerTransactions.map(t => `<p>${t}</p>`).join('');
        } else {
            html += `<p>As contas estão zeradas. Ninguém deve nada.</p>`;
        }

        html += `<button id="confirm-exit-btn" class="btn btn-danger" data-player-exit="${leavingPlayer}">Confirmar Saída e Acerto</button>`;
        
        showModal(html);
    };

    const confirmPlayerExit = (playerName) => {
        const valueInCurrentSession = parseFloat(document.getElementById(`val-${playerName}`).value.replace(',', '.')) || 0;
        const currentHost = sessionHostSelect.value;
        
        appState.balances[playerName] += valueInCurrentSession;
        if (playerName !== currentHost) {
            appState.balances[currentHost] -= valueInCurrentSession;
        }
        
        // Aplica o acerto de contas final antes de remover
        const finalBalancesToSettle = { ...appState.balances };
        const transactions = calculateOptimalSettlements(finalBalancesToSettle);
        transactions.forEach(transaction => {
            // Este passo simula o acerto, zerando as contas para o estado futuro
            // Na prática, apenas removemos o jogador e confiamos que o acerto foi feito
        });

        appState.participants = appState.participants.filter(p => p !== playerName);
        delete appState.balances[playerName];

        closeModal();
        updatePlayerDropdowns();
        renderCurrentSession();
    };
    
    const showFinalSummary = () => {
        if (appState.sessions.length === 0) { alert('Nenhuma banca foi finalizada.'); return; }
        
        let html = '<h2>📊 Resumo Final do Dia</h2>';
        html += '<h3>Saldo Final de Cada Um:</h3>';
        Object.entries(appState.balances).forEach(([name, balance]) => {
            html += `<p>${name}: <strong class="${balance >= 0 ? 'profit' : 'loss'}">R$ ${balance.toFixed(2)}</strong></p>`;
        });
        html += `<hr><h3>Acerto de Contas Otimizado:</h3>`;

        const transactions = calculateOptimalSettlements(appState.balances);
        if (transactions.length > 0) {
            html += transactions.map(t => `<p>${t}</p>`).join('');
        } else {
            html += `<p>Contas zeradas. Ninguém deve nada.</p>`;
        }
        showModal(html);
    };

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
        if (appState.sessions.length === 0) { sessionsHistoryDiv.innerHTML = '<p class="empty-state">Nenhuma banca finalizada.</p>'; return; }
        const historyHTML = appState.sessions.map((session, index) => {
            const result = session.finalAmount - session.totalInvested;
            return `<li><strong>#${index + 1} (Host: ${session.host})</strong> <span class="${result >= 0 ? 'profit' : 'loss'}">R$ ${result.toFixed(2)}</span></li>`;
        }).join('');
        sessionsHistoryDiv.innerHTML = `<ul>${historyHTML}</ul>`;
    };

    const initializeApp = () => {
        addParticipantBtn.addEventListener('click', addParticipantField);
        participantsListDiv.addEventListener('click', (e) => { if (e.target.classList.contains('remove-btn')) e.target.parentElement.remove(); });
        startDayBtn.addEventListener('click', startDay);
        endSessionBtn.addEventListener('click', endSession);
        calculateExitBtn.addEventListener('click', calculatePlayerExit);
        showSummaryBtn.addEventListener('click', showFinalSummary);
        resetDayBtn.addEventListener('click', () => { if (confirm('Tem certeza?')) window.location.reload(); });
        
        modalCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
            if (e.target.id === 'confirm-exit-btn') {
                const playerName = e.target.dataset.playerExit;
                confirmPlayerExit(playerName);
            }
        });

        addParticipantField();
        addParticipantField();
        switchStep('setup');
        closeModal();
    };

    initializeApp();
});