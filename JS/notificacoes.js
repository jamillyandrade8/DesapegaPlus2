
// Organizar, marcar lidas, exibir notificações só do usuário logado

const usuarioLogado_not = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuarioLogado_not) {
  // se esta página for apenas de notificações, redireciona
  if (document.getElementById && document.getElementById("lista-notificacoes")) {
    alert("Faça login para continuar");
    window.location.href = "login.html";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("lista-notificacoes")) carregarNotificacoesUsuario();
});

function carregarNotificacoesUsuario() {
  const lista = document.getElementById("lista-notificacoes");
  if (!lista) return;
  lista.innerHTML = "";

  const todas = JSON.parse(localStorage.getItem("notificacoes")) || [];
  const minhas = todas.filter(n => n.usuario === usuarioLogado_not.email);

  if (minhas.length === 0) {
    lista.innerHTML = "<p>Você não tem notificações.</p>";
    return;
  }

  minhas.sort((a, b) => new Date(b.data) - new Date(a.data));

  minhas.forEach(notif => {
    const card = document.createElement("div");
    card.className = "card-notificacao";
    if (!notif.lido) card.classList.add("nao-lida");

    card.innerHTML = `
      <div class="not-msg">
        <p>${escapeHtml(notif.mensagem)}</p>
        <small>${new Date(notif.data).toLocaleString()}</small>
      </div>
      <div class="not-actions">
        <button class="btn-marcar">${notif.lido ? "Marcar não lida" : "Marcar lida"}</button>
        <button class="btn-remover">Remover</button>
      </div>
    `;

    card.querySelector(".btn-marcar").addEventListener("click", () => {
      toggleLido(notif.id, !notif.lido);
      carregarNotificacoesUsuario();
    });

    card.querySelector(".btn-remover").addEventListener("click", () => {
      if (!confirm("Remover esta notificação?")) return;
      removerNotificacao(notif.id);
      carregarNotificacoesUsuario();
    });

    lista.appendChild(card);
  });

  // botão limpar tudo (se existir)
  const btnLimpar = document.getElementById("btn-limpar-notificacoes");
  if (btnLimpar) {
    btnLimpar.style.display = "inline-block";
    btnLimpar.onclick = () => {
      if (!confirm("Remover todas as suas notificações?")) return;
      limparNotificacoesUsuario();
      carregarNotificacoesUsuario();
    };
  }
}

function toggleLido(id, novo) {
  const todas = JSON.parse(localStorage.getItem("notificacoes")) || [];
  const idx = todas.findIndex(n => n.id === id);
  if (idx === -1) return;
  todas[idx].lido = !!novo;
  localStorage.setItem("notificacoes", JSON.stringify(todas));
}

function removerNotificacao(id) {
  let todas = JSON.parse(localStorage.getItem("notificacoes")) || [];
  todas = todas.filter(n => n.id !== id);
  localStorage.setItem("notificacoes", JSON.stringify(todas));
}

function limparNotificacoesUsuario() {
  const todas = JSON.parse(localStorage.getItem("notificacoes")) || [];
  const restantes = todas.filter(n => n.usuario !== usuarioLogado_not.email);
  localStorage.setItem("notificacoes", JSON.stringify(restantes));
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
