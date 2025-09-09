const API_BASE = 'https://estacionamentowillian.vercel.app';
const vehicleForm = document.getElementById('vehicleForm');
const vehicleListBody = document.querySelector('#vehicleList tbody');
const stayHistoryBody = document.querySelector('#stayHistory tbody');
// Formatação de data/hora
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR');
}
// Formatação de duração entre entrada e saída
function formatDuration(start, end) {
  if (!end) return '-';
  const diffMs = new Date(end) - new Date(start);
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}
// Carrega e exibe veículos estacionados com ações
async function loadVehicles() {
  try {
    const res = await fetch(`${API_BASE}/veiculos`);
    const veiculos = await res.json();
    vehicleListBody.innerHTML = '';
    veiculos.forEach(v => {
      const estadiaAtiva = v.estadias.find(e => !e.saida);
      if (!estadiaAtiva) return; // só mostra veículos com estadia ativa
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${v.placa}</td>
        <td>${v.modelo}</td>
        <td>${v.cor || '-'}</td>
        <td>${v.tipo}</td>
        <td>${formatDateTime(estadiaAtiva.entrada)}</td>
        <td>
          <button class="saida-btn" data-placa="${v.placa}">Registrar Saída</button>
          <button class="edit-btn" data-placa="${v.placa}">Editar</button>
          <button class="delete-btn" data-placa="${v.placa}">Deletar</button>
        </td>
      `;
      vehicleListBody.appendChild(tr);
    });
    // Eventos dos botões
    document.querySelectorAll('.saida-btn').forEach(btn => {
      btn.addEventListener('click', () => registrarSaida(btn.dataset.placa));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editarVeiculo(btn.dataset.placa));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletarVeiculo(btn.dataset.placa));
    });
  } catch (error) {
    console.error('Erro ao carregar veículos:', error);
  }
}
// Carrega e exibe histórico de estadias
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
// Função para cadastrar veículo e criar estadia
async function cadastrarVeiculo(e) {
  e.preventDefault();
  const formData = new FormData(vehicleForm);
  const veiculo = {
    placa: formData.get('placa').toUpperCase(),
    modelo: formData.get('modelo'),
    cor: formData.get('cor'),
    tipo: formData.get('tipo').toUpperCase(),
    proprietario: 'Desconhecido',
    marca: 'Desconhecida',
    telefone: '00000000000',
  };
  try {
    // Cria veículo
    let res = await fetch(`${API_BASE}/veiculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veiculo),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error('Erro ao criar veículo');
    }
    // Cria estadia
    res = await fetch(`${API_BASE}/estadias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placa: veiculo.placa,
        valorHora: 5.0,
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
}
// Função para editar veículo (preenche formulário e altera listener)
async function editarVeiculo(placa) {
  try {
    const res = await fetch(`${API_BASE}/veiculos/${placa}`);
    if (!res.ok) throw new Error('Veículo não encontrado');
    const v = await res.json();
    // Preenche formulário
    vehicleForm.placa.value = v.placa;
    vehicleForm.modelo.value = v.modelo;
    vehicleForm.cor.value = v.cor || '';
    vehicleForm.tipo.value = v.tipo;
    // Desabilita campo placa (ID)
    vehicleForm.placa.disabled = true;
    // Muda texto do botão
    vehicleForm.querySelector('button[type="submit"]').textContent = 'Atualizar Veículo';
    // Remove listener antigo para evitar duplicação
    vehicleForm.removeEventListener('submit', cadastrarVeiculo);
    // Adiciona listener para atualizar
    vehicleForm.addEventListener('submit', atualizarVeiculo);
    async function atualizarVeiculo(e) {
      e.preventDefault();
      const veiculoAtualizado = {
        modelo: vehicleForm.modelo.value,
        cor: vehicleForm.cor.value,
        tipo: vehicleForm.tipo.value.toUpperCase(),
        proprietario: v.proprietario || 'Desconhecido',
        marca: v.marca || 'Desconhecida',
        telefone: v.telefone || '00000000000',
      };
      try {
        const res = await fetch(`${API_BASE}/veiculos/${placa}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(veiculoAtualizado),
        });
        if (!res.ok) throw new Error('Erro ao atualizar veículo');
        alert('Veículo atualizado com sucesso!');
        vehicleForm.reset();
        vehicleForm.placa.disabled = false;
        vehicleForm.querySelector('button[type="submit"]').textContent = 'Registrar Entrada';
        // Remove listener de atualizar e re-adiciona o de cadastrar
        vehicleForm.removeEventListener('submit', atualizarVeiculo);
        vehicleForm.addEventListener('submit', cadastrarVeiculo);
        loadVehicles();
      } catch (error) {
        alert(error.message);
      }
    }
  } catch (error) {
    alert(error.message);
  }
}
// Função para deletar veículo
async function deletarVeiculo(placa) {
  if (!confirm(`Confirma a exclusão do veículo ${placa}?`)) return;
  try {
    const res = await fetch(`${API_BASE}/veiculos/${placa}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao deletar veículo');
    alert('Veículo deletado com sucesso!');
    loadVehicles();
    loadStayHistory();
  } catch (error) {
    alert(error.message);
  }
}
// Função para registrar saída (atualizar estadia)
async function registrarSaida(placa) {
  try {
    // Busca estadia ativa do veículo
    const resEstadias = await fetch(`${API_BASE}/estadias?placa=${placa}`);
    const estadias = await resEstadias.json();
    // Filtra estadia ativa (sem saída)
    const estadiaAtiva = estadias.find(e => !e.saida);
    if (!estadiaAtiva) {
      alert('Estadia ativa não encontrada para este veículo.');
      return;
    }
    const entrada = new Date(estadiaAtiva.entrada);
    const saida = new Date();
    const diffHoras = Math.ceil((saida - entrada) / (1000 * 60 * 60));
    const valorTotal = diffHoras * estadiaAtiva.valorHora;
    // Atualiza estadia com saída e valor total
    const res = await fetch(`${API_BASE}/estadias/${estadiaAtiva.id}`, {
      method: 'PATCH',
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
// Inicializa listeners e carrega dados
vehicleForm.addEventListener('submit', cadastrarVeiculo);
loadVehicles();
loadStayHistory();