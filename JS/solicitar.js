// Bloqueios por status + grava interesse completo (identificação por email)

function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  
  function showError(msg) {
    const el = document.getElementById("erro");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.style.display = "block";
  }
  
  function hideError() {
    const el = document.getElementById("erro");
    if (!el) return;
    el.style.display = "none";
  }
  
  const usuarioLogado_solicitar = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLogado_solicitar) {
    alert("Você precisa estar logado para solicitar um item.");
    window.location.href = "login.html";
  }
  
  const tituloEl = document.getElementById("titulo");
  const resumoEl = document.getElementById("resumo");
  const fotoEl = document.getElementById("foto");
  const metaEl = document.getElementById("meta");
  const descEl = document.getElementById("descricao");
  const infoEl = document.getElementById("informacoes");
  
  const form = document.getElementById("formInteresse");
  const valorBox = document.getElementById("valorBox");
  const valorInput = document.getElementById("valor");
  const voltarBtn = document.getElementById("voltar");
  
  hideError();
  
  const itemId = qs("id");
  if (!itemId) {
    showError("Item não especificado.");
    if (form) form.style.display = "none";
  }
  
  let itens = JSON.parse(localStorage.getItem("itens")) || [];
  let item = itens.find(i => i.id === itemId);
  
  if (!item) {
    showError("Item não encontrado.");
    if (form) form.style.display = "none";
  } else {
    preencherInformacoes(item);
  }
  
  function preencherInformacoes(it) {
    item = it;
    tituloEl.textContent = it.titulo || "Item sem título";
    descEl.textContent = it.descricao || "";
    metaEl.textContent = `${it.categoria || ""} • ${it.cidade || ""} • ${it.condicao || ""}`;
  
    const criado = it.criadoEm ? new Date(it.criadoEm).toLocaleString() : "—";
    const expira = it.expiraEm ? new Date(it.expiraEm).toLocaleString() : "—";
    infoEl.textContent = `Publicado em: ${criado} • Vence em: ${expira}`;
    fotoEl.src = it.foto || "./img/placeholder.png";
  
    resumoEl.style.display = "block";
    form.style.display = "block";
  }
  
  function atualizarCampoValor() {
    if (!form) return;
    const tipo = form.elements["modalidade"].value;
    if (tipo === "pago" || tipo === "cobro-retirada") {
      valorBox.style.display = "block";
    } else {
      valorBox.style.display = "none";
      valorInput.value = "";
    }
  }
  
  if (form && form.elements && form.elements["modalidade"]) {
    Array.from(form.elements["modalidade"]).forEach(r => r.addEventListener("change", atualizarCampoValor));
  }
  atualizarCampoValor();
  
  if (voltarBtn) voltarBtn.addEventListener("click", () => window.location.href = "explorar.html");
  
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();
  
      let itensLS = JSON.parse(localStorage.getItem("itens")) || [];
      const pos = itensLS.findIndex(it => it.id === item.id);
      if (pos === -1) {
        alert("Erro: item não encontrado.");
        return;
      }
  
      const itemAtual = itensLS[pos];
  
      // BLOQUEIO — DONO NÃO PODE FAZER LANCE NO PRÓPRIO ITEM
      if (itemAtual.dono === usuarioLogado_solicitar.email) {
        alert("Você não pode enviar interesse no seu próprio item.");
        return;
      }
  
      // BLOQUEIO — ITEM EXPIRADO / CANCELADO / NEGOCIADO / AGUARDANDO / PENDENTE
      const agora = new Date();
      const expira = itemAtual.expiraEm ? new Date(itemAtual.expiraEm) : null;
      if ((expira && expira <= agora) || ["cancelado", "negociado", "aguardando-acordo", "sem-acordo", "pendente_confirmacao"].includes(itemAtual.status)) {
        alert("Este item não está mais disponível para novos interesses.");
        return;
      }
  
      // CAPTURAR MODALIDADE
      const modalidade = form.elements["modalidade"].value;
      let valor = null;
      if (modalidade === "pago" || modalidade === "cobro-retirada") {
        const raw = parseFloat(valorInput.value);
        if (isNaN(raw) || raw <= 0) {
          alert("Informe um valor válido.");
          return;
        }
        valor = Math.round(raw * 100) / 100;
      }
  
      const interesse = {
        usuario: usuarioLogado_solicitar.email,
        tipo: modalidade,
        valor: valor,
        cidade: usuarioLogado_solicitar.cidade || null,
        timestamp: Date.now()
      };
  
      if (!Array.isArray(itemAtual.interesses)) itemAtual.interesses = [];
  
      // evita duplicar interesse do mesmo email
      const ja = itemAtual.interesses.some(i => i.usuario === interesse.usuario);
      if (ja) {
        alert("Você já demonstrou interesse nesse item.");
        return;
      }
  
      itemAtual.interesses.push(interesse);
  
      // Ordenar interesses: valor > gratuitos por ordem de chegada
      itemAtual.interesses.sort((a, b) => {
        const av = (typeof a.valor === "number") ? a.valor : null;
        const bv = (typeof b.valor === "number") ? b.valor : null;
        if (av != null && bv != null) return bv - av;
        if (bv != null && av == null) return 1;
        if (av != null && bv == null) return -1;
        return a.timestamp - b.timestamp;
      });
  
      itensLS[pos] = itemAtual;
      localStorage.setItem("itens", JSON.stringify(itensLS));
  
      // notifica dono
      if (window.__Desapega_checkStatus && typeof window.__Desapega_checkStatus.registrarNotificacao === "function") {
        window.__Desapega_checkStatus.registrarNotificacao(itemAtual.dono, `Novo interesse em "${itemAtual.titulo}" por ${usuarioLogado_solicitar.email}`, { itemId: itemAtual.id, tipo: "novoInteresse" });
      } else {
        const nots = JSON.parse(localStorage.getItem("notificacoes")) || [];
        nots.push({ id: "n" + Date.now(), usuario: itemAtual.dono, mensagem: `Novo interesse em "${itemAtual.titulo}" por ${usuarioLogado_solicitar.email}`, data: new Date().toISOString(), lido: false, itemId: itemAtual.id, tipo: "novoInteresse" });
        localStorage.setItem("notificacoes", JSON.stringify(nots));
      }
  
      alert("Interesse enviado com sucesso!");
      window.location.href = "explorar.html";
    });
  }
  