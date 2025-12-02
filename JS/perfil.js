// Cancelar oferta, aceitar vencedor, confirmar negociação, carregar abas

const usuarioLogado_perfil = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuarioLogado_perfil) {
  alert("Você precisa estar logado para acessar o perfil.");
  window.location.href = "login.html";
}

window.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario();
  carregarMinhasOfertas();
  carregarSolicitacoesEnviadas();
  carregarNotificacoesTab();
});

// DADOS DO USUÁRIO
function carregarDadosUsuario() {
  const nomeEl = document.getElementById("perfil-nome");
  const emailEl = document.getElementById("perfil-email");
  if (nomeEl) nomeEl.textContent = usuarioLogado_perfil.nome || usuarioLogado_perfil.email;
  if (emailEl) emailEl.textContent = usuarioLogado_perfil.email;
}

// helper notificação
function registrarNotificacaoHelper(destinatario, mensagem, extra = {}) {
  if (window.__Desapega_checkStatus && typeof window.__Desapega_checkStatus.registrarNotificacao === "function") {
    window.__Desapega_checkStatus.registrarNotificacao(destinatario, mensagem, extra);
  } else {
    const notificacoes = JSON.parse(localStorage.getItem("notificacoes")) || [];
    notificacoes.push({
      id: "n" + Date.now(),
      usuario: destinatario,
      mensagem,
      data: new Date().toISOString(),
      lido: false,
      ...extra
    });
    localStorage.setItem("notificacoes", JSON.stringify(notificacoes));
  }
}

// MINHAS OFERTAS
function carregarMinhasOfertas() {
  const container = document.getElementById("aba-ofertas");
  if (!container) return;
  container.innerHTML = "";

  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const minhas = itens.filter(i => i.dono === usuarioLogado_perfil.email);

  if (minhas.length === 0) {
    container.innerHTML = "<p>Você ainda não fez nenhuma oferta.</p>";
    return;
  }

  minhas.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const foto = item.foto || "./img/placeholder.png";

    let acoes = `<div class="card-actions">`;
    if (item.status === "ativo") {
      acoes += `<button class="btn-cancelar-oferta" data-id="${item.id}">Cancelar Oferta</button>`;
      // tendo interesses, permitir aceitar, abri lista
      if (item.interesses && item.interesses.length > 0) {
        acoes += `<button class="btn-aceitar" data-id="${item.id}">Aceitar Proposta</button>`;
      }
    } else if (item.status === "aguardando-acordo") {
      acoes += `<button class="btn-confirmar-dono" data-id="${item.id}">Confirmar vencedor</button>`;
      acoes += `<span class="status-badge">Aguardando acordo</span>`;
    } else if (item.status === "pendente_confirmacao") {
      acoes += `<span class="status-badge">Aguardando confirmação</span>`;
    } else if (item.status === "negociado" || item.status === "confirmado") {
      acoes += `<span class="status-badge">Negociado</span>`;
    } else if (item.status === "sem-acordo") {
      acoes += `<span class="status-badge">Sem acordo</span>`;
    } else if (item.status === "cancelado") {
      acoes += `<span class="status-badge">Cancelado</span>`;
    }
    acoes += `</div>`;

    card.innerHTML = `
      <img src="${foto}" class="card-foto">
      <div class="card-info">
        <h3>${escapeHtml(item.titulo)}</h3>
        <p>${escapeHtml(item.descricao)}</p>
        <p><strong>Status:</strong> ${item.status}</p>
        ${item.interesses && item.interesses.length ? `<p><strong>Interesses:</strong> ${item.interesses.length}</p>` : ""}
        ${acoes}
      </div>
    `;
    container.appendChild(card);

    const btnCancelar = card.querySelector(".btn-cancelar-oferta");
    if (btnCancelar) {
      btnCancelar.addEventListener("click", () => {
        if (!confirm("Deseja cancelar essa oferta? Isso notificará todos os interessados.")) return;
        cancelarOferta(item.id);
      });
    }

    const btnAceitar = card.querySelector(".btn-aceitar");
    if (btnAceitar) {
      btnAceitar.addEventListener("click", () => {
        if (!item.interesses || item.interesses.length === 0) {
          alert("Não há propostas para aceitar.");
          return;
        }
        // cria lista simples para escolha
        const lista = item.interesses.map(i => `${i.usuario} — ${i.tipo} — ${i.valor ?? "—"}`).join("\n");
        const escolha = prompt(`Interessados:\n${lista}\n\nDigite o EMAIL do interessado que deseja aceitar:`);
        if (!escolha) return;
        aceitarInteresse(item.id, escolha.trim());
      });
    }

    const btnConfirmarDono = card.querySelector(".btn-confirmar-dono");
    if (btnConfirmarDono) {
      btnConfirmarDono.addEventListener("click", () => {
        // encontra candidato marcado 
        const itensAll = JSON.parse(localStorage.getItem("itens")) || [];
        const itIdx = itensAll.findIndex(it => it.id === item.id);
        if (itIdx === -1) return alert("Item não encontrado.");
        const candidato = itensAll[itIdx].interesses ? itensAll[itIdx].interesses.find(i => i.candidato) : null;
        if (!candidato) {
          alert("Não há candidato marcado. Você pode aceitar manualmente pelas propostas.");
          return;
        }
        // ao confirmar pelo dono, setar pendente_confirmacao para interessado confirmar
        itensAll[itIdx].status = "pendente_confirmacao";
        // manter apenas o interesse selecionado 
        itensAll[itIdx].interesses = itensAll[itIdx].interesses.map(int => int.usuario === candidato.usuario ? { ...int, confirmado: false } : null).filter(Boolean);
        localStorage.setItem("itens", JSON.stringify(itensAll));
        registrarNotificacaoHelper(candidato.usuario, `Seu interesse em "${item.titulo}" foi ACEITO pelo dono! Confirme a negociação.`);
        alert("Solicitação enviada ao interessado. Aguardando confirmação.");
        carregarMinhasOfertas();
        carregarNotificacoesTab();
      });
    }
  });
}

// SOLICITAÇÕES ENVIADAS
function carregarSolicitacoesEnviadas() {
  const container = document.getElementById("aba-solicitacoes");
  if (!container) return;
  container.innerHTML = "";

  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const enviadas = [];

  itens.forEach(item => {
    if (Array.isArray(item.interesses)) {
      item.interesses.forEach(int => {
        if (int.usuario === usuarioLogado_perfil.email) {
          enviadas.push({ item, interesse: int });
        }
      });
    }
  });

  if (enviadas.length === 0) {
    container.innerHTML = "<p>Você ainda não enviou solicitações.</p>";
    return;
  }

  enviadas.forEach(reg => {
    const item = reg.item;
    const interesse = reg.interesse;

    const card = document.createElement("div");
    card.className = "card";

    const foto = item.foto || "./img/placeholder.png";
    let acoes = "";

    if (item.status === "pendente_confirmacao" && interesse.confirmado !== true) {
      acoes = `
        <div class="card-actions">
          <button class="btn-confirmar">Confirmar Negociação</button>
        </div>`;
    }

    card.innerHTML = `
      <img src="${foto}" class="card-foto">
      <div class="card-info">
        <h3>${escapeHtml(item.titulo)}</h3>
        <p><strong>Dono:</strong> ${item.dono}</p>
        <p><strong>Modalidade:</strong> ${interesse.tipo}</p>
        <p><strong>Valor:</strong> ${interesse.valor ?? "—"}</p>
        <p><strong>Data:</strong> ${new Date(interesse.timestamp).toLocaleString()}</p>
        ${acoes}
      </div>
    `;

    const btnConfirmar = card.querySelector(".btn-confirmar");
    if (btnConfirmar) {
      btnConfirmar.addEventListener("click", () => {
        confirmarNegociacao(item.id, interesse.usuario);
      });
    }

    container.appendChild(card);
  });
}

// NOTIFICAÇÕES 
function carregarNotificacoesTab() {
  const container = document.getElementById("aba-notificacoes");
  if (!container) return;
  container.innerHTML = "";

  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  let notificacoes = [];

  itens.forEach(item => {
    if (item.dono === usuarioLogado_perfil.email && Array.isArray(item.interesses)) {
      item.interesses.forEach(int => {
        notificacoes.push({ item, interesse: int });
      });
    }
  });

  if (notificacoes.length === 0) {
    container.innerHTML = "<p>Ninguém demonstrou interesse ainda.</p>";
    return;
  }

  notificacoes.forEach(reg => {
    const item = reg.item;
    const interesse = reg.interesse;

    const card = document.createElement("div");
    card.className = "card";
    const foto = item.foto || "./img/placeholder.png";

    card.innerHTML = `
      <img src="${foto}" class="card-foto">
      <div class="card-info">
        <h3>${escapeHtml(item.titulo)}</h3>
        <p><strong>Interessado:</strong> ${interesse.usuario}</p>
        <p><strong>Valor:</strong> ${interesse.valor ?? "—"}</p>
        <p><strong>Data:</strong> ${new Date(interesse.timestamp).toLocaleString()}</p>
        <div class="card-actions">
          <button class="btn-aceitar">Aceitar</button>
          <button class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-aceitar").addEventListener("click", () => {
      aceitarInteresse(item.id, interesse.usuario);
    });

    card.querySelector(".btn-cancelar").addEventListener("click", () => {
      cancelarInteresse(item.id, interesse.usuario);
    });

    container.appendChild(card);
  });
}

// LÓGICA DA NEGOCIAÇÃO
function aceitarInteresse(itemId, usuarioInteressado) {
  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const idx = itens.findIndex(i => i.id === itemId);
  if (idx === -1) return;

  const item = itens[idx];

  if (item.dono !== usuarioLogado_perfil.email) {
    alert("Apenas o dono pode aceitar uma proposta.");
    return;
  }

  //  status para aguardar confirmação do interessado
  item.status = "pendente_confirmacao";
  item.interesses = item.interesses
    .map(int => int.usuario === usuarioInteressado ? { ...int, confirmado: false } : null)
    .filter(Boolean);

  localStorage.setItem("itens", JSON.stringify(itens));

  registrarNotificacaoHelper(usuarioInteressado, `Seu interesse em "${item.titulo}" foi ACEITO! Por favor confirme a negociação.`);
  alert("Aguardando confirmação do interessado!");
  carregarNotificacoesTab();
  carregarMinhasOfertas();
}

function cancelarInteresse(itemId, usuarioInteressado) {
  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const idx = itens.findIndex(i => i.id === itemId);
  if (idx === -1) return;

  const item = itens[idx];
  item.interesses = (item.interesses || []).filter(i => i.usuario !== usuarioInteressado);
  localStorage.setItem("itens", JSON.stringify(itens));

  registrarNotificacaoHelper(usuarioInteressado, `Seu interesse na oferta "${item.titulo}" foi RECUSADO.`);
  alert("Interesse recusado.");
  carregarNotificacoesTab();
  carregarMinhasOfertas();
}

function confirmarNegociacao(itemId, usuarioInteressado) {
  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const idx = itens.findIndex(i => i.id === itemId);
  if (idx === -1) return;

  const item = itens[idx];
  item.status = "negociado";
  item.interesses = item.interesses.map(int =>
    int.usuario === usuarioInteressado ? { ...int, confirmado: true } : int
  );

  localStorage.setItem("itens", JSON.stringify(itens));
  registrarNotificacaoHelper(item.dono, `O interessado ${usuarioInteressado} confirmou a negociação do item "${item.titulo}".`);
  alert("Negociação confirmada! Combinar entrega.");
  carregarSolicitacoesEnviadas();
  carregarNotificacoesTab();
  carregarMinhasOfertas();
}

// CANCELAR OFERTA, pelo dono
function cancelarOferta(itemId) {
  const itens = JSON.parse(localStorage.getItem("itens")) || [];
  const idx = itens.findIndex(i => i.id === itemId);
  if (idx === -1) return alert("Item não encontrado.");

  const item = itens[idx];
  item.status = "cancelado";

  if (Array.isArray(item.interesses)) {
    item.interesses.forEach(int => {
      registrarNotificacaoHelper(int.usuario, `A oferta "${item.titulo}" foi cancelada pelo dono.`);
    });
  }

  localStorage.setItem("itens", JSON.stringify(itens));
  alert("Oferta cancelada.");
  carregarMinhasOfertas();
  carregarNotificacoesTab();
}

// helper escape
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Controle das Abas
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");

    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});
