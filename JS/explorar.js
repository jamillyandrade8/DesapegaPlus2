// Buscar por texto + categoria + cidade + status filtrado

const usuarioLogado_explorar = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuarioLogado_explorar) {
  alert("Você precisa estar logado para acessar esta página.");
  window.location.href = "login.html";
}

if (!localStorage.getItem("itens")) {
  const dadosFicticios = [
    {
      id: "1",
      titulo: "Celular - Samsung A13",
      descricao: "Tela trocada, funcionando bem.",
      categoria: "eletronico",
      cidade: "Sorocaba - São Paulo",
      condicao: "usado",
      quantidade: 1,
      dono: "Usuário Teste",
      tipo: "oferta",
      foto: "/img/celular2.jpeg",
      status: "ativo",
      criadoEm: new Date().toISOString(),
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "2",
      titulo: "Cercado para bebê",
      descricao: "Colorido e seguro para bebês.",
      categoria: "moveis",
      cidade: "Sorocaba - São Paulo",
      condicao: "novo",
      quantidade: 1,
      dono: "Usuário Teste",
      tipo: "oferta",
      foto: "../cercadinho.jpeg",
      status: "ativo",
      criadoEm: new Date().toISOString(),
      expiraEm: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  localStorage.setItem("itens", JSON.stringify(dadosFicticios));
}

const listaCards = document.getElementById("lista-cards");
const campoBusca = document.getElementById("campo-busca");
const filtroCategoria = document.getElementById("filtro-categoria");
const filtroTipo = document.getElementById("filtro-tipo");
const filtroOrdenacao = document.getElementById("filtro-ordenacao");
const filtroCidade = document.getElementById("filtro-cidade");
const botaoLimpar = document.getElementById("limpar-filtros");
const contadorItens = document.getElementById("contador-itens");

function carregarItens() {
  const hoje = new Date();
  const itens = JSON.parse(localStorage.getItem("itens")) || [];

  return itens.filter(item => {
    if (item.expiraEm && new Date(item.expiraEm) <= hoje && item.status === "ativo") {
      // não remove aqui; checkStatus centralizado fará a marcação.
    }
    // filtrar cancelado, negociado, sem-acordo, mostrar apenas itens ativos e pedidos/ofertas conforme filtro
    return item.status === "ativo";
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function criarCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";

  const badgeClass = item.tipo === "pedido" ? "pedido" : "oferta";
  const badgeText = item.tipo === "pedido" ? "Pedido" : "Oferta";

  const cond = item.condicao ? ` • ${item.condicao}` : "";
  const fotoSrc = item.foto ? item.foto : "./img/placeholder.png";

  card.innerHTML = `
    <img src="${fotoSrc}" alt="${escapeHtml(item.titulo)}">
    <div class="item-info">
      <h3 class="item-titulo">${escapeHtml(item.titulo)} <span class="badge ${badgeClass}">${badgeText}</span></h3>
      <p class="item-meta">${escapeHtml(item.categoria)} • ${escapeHtml(item.cidade)}${cond}</p>
      <p class="item-desc">${escapeHtml(item.descricao)}</p>
      <div class="card-actions">
        <button class="btn-contato">Solicitar</button>
        <button class="btn-detalhes">Detalhes</button>
      </div>
    </div>
  `;

  const btnSolicitar = card.querySelector(".btn-contato");
  btnSolicitar.addEventListener("click", () => {
    window.location.href = 'solicitar.html?id=' + encodeURIComponent(item.id);
  });

  const btnDetalhes = card.querySelector(".btn-detalhes");
  btnDetalhes.addEventListener("click", () => {
    const info = `Título: ${item.titulo}
      Descrição: ${item.descricao}
      Categoria: ${item.categoria}
      Condição: ${item.condicao}
      Quantidade: ${item.quantidade}
      Dono: ${item.dono}
      Publicado: ${new Date(item.criadoEm).toLocaleString()}
      Vence em: ${item.expiraEm ? new Date(item.expiraEm).toLocaleString() : "—"}`;
    alert(info);
  });

  return card;
}

function renderizarLista(itens) {
  listaCards.innerHTML = "";
  if (!itens.length) {
    listaCards.innerHTML = `<p style="color:${getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#666'}">Nenhum item encontrado.</p>`;
  } else {
    itens.forEach(i => listaCards.appendChild(criarCard(i)));
  }
  contadorItens.textContent = `${itens.length} resultado${itens.length !== 1 ? "s" : ""}`;
}

function aplicarFiltros() {
  let itens = carregarItens();

  const termo = (campoBusca.value || "").toLowerCase().trim();
  if (termo) {
    itens = itens.filter(it =>
      (it.titulo || "").toLowerCase().includes(termo) ||
      (it.descricao || "").toLowerCase().includes(termo) ||
      (it.cidade || "").toLowerCase().includes(termo)
    );
  }

  if (filtroCidade && (filtroCidade.value || "").trim() !== "") {
    const cidadeFiltro = filtroCidade.value.toLowerCase().trim();
    itens = itens.filter(it => (it.cidade || "").toLowerCase().includes(cidadeFiltro));
  }

  if (filtroCategoria.value) {
    itens = itens.filter(it => it.categoria === filtroCategoria.value);
  }

  if (filtroTipo.value && filtroTipo.value !== "ambos") {
    itens = itens.filter(it => it.tipo === filtroTipo.value);
  }

  if (filtroOrdenacao.value === "recentes") {
    itens.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  } else if (filtroOrdenacao.value === "urgencia") {
    itens.sort((a, b) => new Date(a.expiraEm || 0) - new Date(b.expiraEm || 0));
  }

  renderizarLista(itens);
}

if (campoBusca) campoBusca.addEventListener("input", aplicarFiltros);
if (filtroCidade) filtroCidade.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);
if (filtroTipo) filtroTipo.addEventListener("change", aplicarFiltros);
if (filtroOrdenacao) filtroOrdenacao.addEventListener("change", aplicarFiltros);
if (botaoLimpar) botaoLimpar.addEventListener("click", () => {
  campoBusca.value = "";
  if (filtroCidade) filtroCidade.value = "";
  filtroCategoria.value = "";
  filtroTipo.value = "ambos";
  filtroOrdenacao.value = "relevancia";
  aplicarFiltros();
});

aplicarFiltros();


