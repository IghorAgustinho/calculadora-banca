document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('add-player-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const playersList = document.getElementById('players-list');
    const resultsContainer = document.getElementById('results-container');
    const summaryDiv = document.getElementById('summary');
    const playerResultsDiv = document.getElementById('player-results');
    
    let playerCount = 0;

    // Função para adicionar um novo jogador
    const addPlayer = () => {
        playerCount++;
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-input';
        playerDiv.innerHTML = `
            <input type="text" placeholder="Nome do Jogador ${playerCount}" class="player-name">
            <input type="number" placeholder="Valor investido (R$)" class="player-value">
            <button class="btn btn-danger remove-player-btn">Remover</button>
        `;
        playersList.appendChild(playerDiv);
    };

    // Adiciona o primeiro jogador ao carregar a página
    addPlayer();

    addPlayerBtn.addEventListener('click', addPlayer);

    // Remove um jogador
    playersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-player-btn')) {
            e.target.parentElement.remove();
        }
    });

    // Função principal para calcular
    calculateBtn.addEventListener('click', () => {
        const playerInputs = document.querySelectorAll('.player-input');
        const finalAmount = parseFloat(document.getElementById('final-amount').value);
        
        if (isNaN(finalAmount)) {
            alert('Por favor, insira um valor final válido.');
            return;
        }

        let totalInvested = 0;
        const players = [];

        playerInputs.forEach(input => {
            const name = input.querySelector('.player-name').value || 'Jogador Anônimo';
            const value = parseFloat(input.querySelector('.player-value').value);

            if (!isNaN(value) && value > 0) {
                players.push({ name, value });
                totalInvested += value;
            }
        });
        
        if (totalInvested === 0) {
            alert('Nenhum valor investido. Adicione os valores de cada jogador.');
            return;
        }

        const profitOrLoss = finalAmount - totalInvested;
        
        // Exibir Resumo
        summaryDiv.innerHTML = `
            <p><strong>Total Investido:</strong> R$ ${totalInvested.toFixed(2)}</p>
            <p><strong>Valor Final da Banca:</strong> R$ ${finalAmount.toFixed(2)}</p>
            <p><strong>Resultado:</strong> <span class="${profitOrLoss >= 0 ? 'profit' : 'loss'}">R$ ${profitOrLoss.toFixed(2)}</span></p>
        `;
        
        // Limpar resultados anteriores dos jogadores
        playerResultsDiv.innerHTML = '';

        // Calcular e exibir resultado de cada jogador
        players.forEach(player => {
            const percentage = (player.value / totalInvested);
            const share = finalAmount * percentage;
            const playerProfitOrLoss = share - player.value;
            
            const resultElement = document.createElement('div');
            resultElement.innerHTML = `
                <strong>${player.name}</strong> (investiu R$ ${player.value.toFixed(2)}):<br>
                Recebe de volta: <strong>R$ ${share.toFixed(2)}</strong>
                <span class="${playerProfitOrLoss >= 0 ? 'profit' : 'loss'}">(Resultado: R$ ${playerProfitOrLoss.toFixed(2)})</span>
            `;
            playerResultsDiv.appendChild(resultElement);
        });

        resultsContainer.classList.remove('results-hidden');
    });

    // Função para limpar tudo e começar de novo
    resetBtn.addEventListener('click', () => {
        playersList.innerHTML = '';
        document.getElementById('final-amount').value = '';
        resultsContainer.classList.add('results-hidden');
        summaryDiv.innerHTML = '';
        playerResultsDiv.innerHTML = '';
        playerCount = 0;
        addPlayer(); // Adiciona o primeiro campo de jogador novamente
    });
});