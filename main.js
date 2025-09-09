const API_BASE = "https://estacionamentowill.vercel.app";


document.addEventListener('DOMContentLoaded', () => {
  // --- helpers para seleção segura ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // MENU
  const menuBtn = $('#menu-btn');
  const menuContent = $('#menu-content');
  if (menuBtn && menuContent) {
    menuBtn.addEventListener('click', () => {
      menuContent.style.display = menuContent.style.display === 'block' ? 'none' : 'block';
    });
  }

  // MODAL (procura .modal-content dentro do modal)
  const modal = $('#modal');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;
  function abrirModal(html) {
    if (!modal || !modalContent) {
      console.warn('Modal ou modal-content não encontrado no DOM.');
      return;
    }
    modalContent.innerHTML = html;
    modal.style.display = 'flex';
    const fechar = modalContent.querySelector('.fechar');
    if (fechar) fechar.addEventListener('click', () => modal.style.display = 'none');
  }

  // Fecha modal ao clicar fora do conteúdo
  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) modal.style.display = 'none';
    });
  }

  // --- ABRIR FORM VEÍCULO ---
  const btnNovoVeiculo = $('#novoVeiculo');
  if (btnNovoVeiculo) btnNovoVeiculo.addEventListener('click', () => abrirFormVeiculo());

  function abrirFormVeiculo(veiculo = null) {
    abrirModal(`
      <button class="fechar">X</button>
      <h3>${veiculo ? 'Editar' : 'Cadastrar'} Veículo</h3>
      <input id="placa" placeholder="Placa" maxlength="7" value="${veiculo ? veiculo.placa : ''}" ${veiculo ? 'readonly' : ''}><br>
      <select id="tipo">
        <option value="">Tipo</option>
        <option value="CARRO">Carro</option>
        <option value="MOTO">Moto</option>
        <option value="VAN">Van</option>
        <option value="CAMINHAO">Caminhão</option>
        <option value="ONIBUS">Ônibus</option>
      </select><br>
      <input id="proprietario" placeholder="Proprietário" value="${veiculo ? (veiculo.proprietario || '') : ''}"><br>
      <input id="modelo" placeholder="Modelo" value="${veiculo ? (veiculo.modelo || '') : ''}"><br>
      <input id="marca" placeholder="Marca" value="${veiculo ? (veiculo.marca || '') : ''}"><br>
      <input id="cor" placeholder="Cor (opcional)" value="${veiculo ? (veiculo.cor || '') : ''}"><br>
      <input id="ano" placeholder="Ano (opcional)" type="number" value="${veiculo && veiculo.ano ? veiculo.ano : ''}"><br>
      <input id="telefone" placeholder="Telefone" value="${veiculo ? (veiculo.telefone || '') : ''}"><br>
      <div style="margin-top:10px">
        <button id="salvarVeiculo">${veiculo ? 'Atualizar' : 'Salvar'}</button>
      </div>
    `);

    // preenche tipo se editando
    if (veiculo) {
      const tipoEl = $('#tipo', modalContent);
      if (tipoEl) tipoEl.value = veiculo.tipo || '';
    }

    const botaoSalvar = $('#salvarVeiculo', modalContent);
    if (!botaoSalvar) return;

    botaoSalvar.addEventListener('click', async () => {
      const placa = ($('#placa', modalContent) || { value: '' }).value.trim();
      const tipo = ($('#tipo', modalContent) || { value: '' }).value;
      const proprietario = ($('#proprietario', modalContent) || { value: '' }).value.trim();
      const modelo = ($('#modelo', modalContent) || { value: '' }).value.trim();
      const marca = ($('#marca', modalContent) || { value: '' }).value.trim();
      const cor = ($('#cor', modalContent) || { value: '' }).value.trim();
      const ano = ($('#ano', modalContent) || { value: '' }).value;
      const telefone = ($('#telefone', modalContent) || { value: '' }).value.trim();

      if (!placa || !tipo || !proprietario || !modelo || !marca || !telefone) {
        return alert('Preencha todos os campos obrigatórios!');
      }

      try {
        const method = veiculo ? "PATCH" : "POST";
        const url = veiculo ? `${API_BASE}/veiculos/${encodeURIComponent(placa)}` : `${API_BASE}/veiculos`;
        const payload = {
          placa,
          tipo,
          proprietario,
          modelo,
          marca,
          cor: cor || null,
          ano: ano ? Number(ano) : null,
          telefone
        };
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text().catch(()=>null);
          throw new Error(txt || `Status ${res.status}`);
        }
        alert(veiculo ? 'Veículo atualizado!' : 'Veículo cadastrado!');
        modal.style.display = 'none';
        carregarVeiculos();
      } catch (err) {
        console.error('Erro ao salvar veículo:', err);
        alert('Erro: ' + (err.message || err));
      }
    }, { once: true });
  }

  // --- CARREGAR VEÍCULOS ---
  async function carregarVeiculos() {
    // encontra/insere container
    let container = $('#veiculos-list');
    if (!container) {
      const wrapper = document.createElement('section');
      wrapper.innerHTML = `<h2>Veículos</h2><div id="veiculos-list"></div>`;
      document.querySelector('main').prepend(wrapper);
      container = $('#veiculos-list');
    }
    container.innerHTML = "Carregando...";

    try {
      const res = await fetch(`${API_BASE}/veiculos`);
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(txt || `Status ${res.status}`);
      }
      const veiculos = await res.json();
      if (!Array.isArray(veiculos) || veiculos.length === 0) {
        container.innerHTML = "Nenhum veículo cadastrado.";
        return;
      }
      container.innerHTML = '';
      veiculos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'estadia-card';
        card.innerHTML = `
          <strong>${v.placa}</strong> - ${v.modelo} (${v.tipo})<br>
          Proprietário: ${v.proprietario || '-'}<br>
          Marca: ${v.marca || '-'}<br>
          Cor: ${v.cor || '-'}<br>
          Ano: ${v.ano || '-'}<br>
          Telefone: ${v.telefone || '-'}<br>
          <button class="editarVeiculo" data-placa="${v.placa}">Editar</button>
        `;
        container.appendChild(card);
      });

      // delega edição
      $$('.editarVeiculo', container).forEach(btn => {
        btn.addEventListener('click', async () => {
          const placa = btn.getAttribute('data-placa');
          try {
            const res = await fetch(`${API_BASE}/veiculos/${encodeURIComponent(placa)}`);
            if (!res.ok) throw new Error('Erro ao buscar veículo');
            const veiculo = await res.json();
            abrirFormVeiculo(veiculo);
          } catch (err) {
            console.error(err);
            alert('Erro ao buscar veículo: ' + (err.message || err));
          }
        });
      });
    } catch (err) {
      console.error('Erro carregarVeiculos:', err);
      container.innerHTML = "Erro ao carregar veículos: " + (err.message || err);
    }
  }

  // --- NOVA ESTADIA (aceita tanto #novaEstadia quanto #add-btn) ---
  const btnNovaEst = $('#novaEstadia') || $('#add-btn');
  if (btnNovaEst) {
    btnNovaEst.addEventListener('click', async () => {
      // busca veículos para popular select (se falhar, permite digitar a placa manualmente)
      let veiculos = [];
      try {
        const r = await fetch(`${API_BASE}/veiculos`);
        if (r.ok) veiculos = await r.json();
      } catch (err) {
        console.warn('Não foi possível buscar veículos para o select:', err);
      }

      abrirModal(`
        <button class="fechar">X</button>
        <h3>Nova Estadia</h3>
        <label>Veículo</label><br>
        <select id="veiculoPlaca">
          <option value="">Selecione o veículo (ou digite a placa abaixo)</option>
          ${veiculos.map(v => `<option value="${v.placa}">${v.placa} - ${v.modelo}</option>`).join('')}
        </select><br>
        <label>Ou digite a placa:</label><br>
        <input id="placaManual" placeholder="AAA0000"><br>
        <label>Valor por hora (R$):</label><br>
        <input id="valorHora" placeholder="Ex: 10" type="number" min="1"><br>
        <div style="margin-top:8px;"><button id="salvarEstadia">Salvar</button></div>
      `);

      $('#salvarEstadia', modalContent).addEventListener('click', async () => {
        const placaSelect = $('#veiculoPlaca', modalContent).value;
        const placaManual = ($('#placaManual', modalContent) || { value: '' }).value.trim();
        const placa = placaSelect || placaManual;
        const valorHoraRaw = ($('#valorHora', modalContent) || { value: '' }).value;
        const valorHora = Number(valorHoraRaw);

        if (!placa || !valorHora) return alert('Preencha placa e valor hora!');

        try {
          const res = await fetch(`${API_BASE}/estadias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ placa, valorHora })
          });
          if (!res.ok) {
            const t = await res.text().catch(()=>null);
            throw new Error(t || `Status ${res.status}`);
          }
          alert('Estadia cadastrada!');
          modal.style.display = 'none';
          carregarEstadias();
        } catch (err) {
          console.error('Erro ao cadastrar estadia:', err);
          alert('Erro: ' + (err.message || err));
        }
      }, { once: true });
    });
  }

  // --- CARREGAR ESTADIAS ---
  const lista = $('#estadias-list');
  async function carregarEstadias() {
    if (!lista) {
      console.warn('Elemento #estadias-list não encontrado');
      return;
    }
    lista.innerHTML = "Carregando...";
    try {
      const res = await fetch(`${API_BASE}/estadias`);
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(txt || `Status ${res.status}`);
      }
      const dados = await res.json();
      if (!Array.isArray(dados) || dados.length === 0) {
        lista.innerHTML = "Nenhuma estadia registrada.";
        return;
      }
      lista.innerHTML = '';
      dados.forEach(e => {
        // tenta formatar datas (se vierem no formato ISO)
        const entrada = e.entrada ? (new Date(e.entrada)).toLocaleString() : '-';
        const saida = e.saida ? (new Date(e.saida)).toLocaleString() : 'Em aberto';
        const valorHora = e.valorHora != null ? Number(e.valorHora) : 0;
        const total = e.total != null ? Number(e.total) : (e.saida ? valorHora * 1 : 0); // fallback
        const card = document.createElement('div');
        card.className = 'estadia-card';
        card.innerHTML = `
          <strong>${e.placa}</strong><br>
          Entrada: ${entrada}<br>
          Saída: ${saida}<br>
          Valor Hora: R$ ${valorHora.toFixed(2)}<br>
          <strong>Total: R$ ${Number(total).toFixed(2)}</strong>
        `;
        lista.appendChild(card);
      });
    } catch (err) {
      console.error('Erro carregarEstadias:', err);
      lista.innerHTML = "Erro ao carregar estadias: " + (err.message || err);
    }
  }

  // --- INICIALIZA ---
  carregarEstadias();
  carregarVeiculos();
});