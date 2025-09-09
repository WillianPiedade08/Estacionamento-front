const API_BASE = 'https://estacionamentowillian.vercel.app'; // ajuste para sua URL real
const vehicleForm = document.getElementById('vehicleForm');
const vehicleListBody = document.querySelector('#vehicleList tbody');
const stayHistoryBody = document.querySelector('#stayHistory tbody');
// Função para formatar data/hora
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR');
}
// Função para calcular tempo entre entrada e saída
function formatDuration(start, end) {
  if (!end) return '-';
  const diffMs = new Date(end) - new Date(start);
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}
// Carregar veículos estacionados
async function loadVehicles() {
  try {
    const res = await fetch(`${API_BASE}/veiculos`);
    const veiculos = await res.json();
    // Limpa tabela
    vehicleListBody.innerHTML = '';
    veiculos.forEach(v => {
      // Pega estadia ativa (sem saída)
      const estadiaAtiva = v.estadias.find(e => !e.saida);
      if (!estadiaAtiva) return; // só mostra veículos com estadia ativa
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${v.placa}</td>
        <td>${v.modelo}</td>
        <td>${v.cor || '-'}</td>
        <td>${v.tipo}</td>
        <td>${formatDateTime(estadiaAtiva.entrada)}</td>
        <td><button class="saida-btn" data-placa="${v.placa}">Registrar Saída</button></td>
      `;
      vehicleListBody.appendChild(tr);
    });
    // Adiciona evento nos botões de saída
    document.querySelectorAll('.saida-btn').forEach(btn => {
      btn.addEventListener('click', () => registrarSaida(btn.dataset.placa));
    });
  } catch (error) {
    console.error('Erro ao carregar veículos:', error);
  }
}
// Carregar histórico de estadias
async function loadStayHistory() {
  try {
    const res = await fetch(`${API_BASE}/estadias`);
    const estadias = await res.json();
    stayHistoryBody.innerHTML = '';
    estadias.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.placa || '-'}</td>
        <td>${formatDateTime(e.entrada)}</td>
        <td>${formatDateTime(e.saida)}</td>
        <td>${formatDuration(e.entrada, e.saida)}</td>
        <td>${e.valorTotal ? e.valorTotal.toFixed(2) : '-'}</td>
      `;
      stayHistoryBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
}
// Cadastrar veículo e criar estadia
vehicleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(vehicleForm);
  const veiculo = {
    placa: formData.get('placa').toUpperCase(),
    modelo: formData.get('modelo'),
    cor: formData.get('cor'),
    tipo: formData.get('tipo').toUpperCase(),
    proprietario: 'Desconhecido', // você pode adicionar campo no form se quiser
    marca: 'Desconhecida',        // idem
    telefone: '00000000000',      // idem
  };
  try {
    // Cria veículo (POST)
    let res = await fetch(`${API_BASE}/veiculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veiculo),
    });
    if (!res.ok && res.status !== 409) { // 409 = veículo já existe
      throw new Error('Erro ao criar veículo');
    }
    // Cria estadia (POST)
    res = await fetch(`${API_BASE}/estadias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placa: veiculo.placa,
        valorHora: 5.0, // exemplo fixo, ajuste conforme sua regra
      }),
    });
    if (!res.ok) throw new Error('Erro ao registrar estadia');
    alert('Veículo registrado com sucesso!');
    vehicleForm.reset();
    loadVehicles();
    loadStayHistory();
  } catch (error) {
    alert(error.message);
  }
});
// Registrar saída do veículo (atualizar estadia)
async function registrarSaida(placa) {
  try {
    // Busca estadia ativa do veículo
    const resEstadias = await fetch(`${API_BASE}/estadias?placa=${placa}&ativa=true`);
    const estadias = await resEstadias.json();
    if (estadias.length === 0) {
      alert('Estadia ativa não encontrada para este veículo.');
      return;
    }
    const estadia = estadias[0];
    // Calcula valor total (exemplo simples)
    const entrada = new Date(estadia.entrada);
    const saida = new Date();
    const diffHoras = Math.ceil((saida - entrada) / (1000 * 60 * 60));
    const valorTotal = diffHoras * estadia.valorHora;
    // Atualiza estadia com saída e valor total
    const res = await fetch(`${API_BASE}/estadias/${estadia.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saida: saida.toISOString(),
        valorTotal,
      }),
    });
    if (!res.ok) throw new Error('Erro ao registrar saída');
    alert(`Saída registrada. Valor total: R$ ${valorTotal.toFixed(2)}`);
    loadVehicles();
    loadStayHistory();
  } catch (error) {
    alert(error.message);
  }
}
// Inicializa
loadVehicles();
loadStayHistory();