// Criação de itens com foto, categoria, expiração 

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuarioLogado) {
  alert("Você precisa estar logado para doar um item");
  window.location.href = "login.html";
}

// calcula expiração, retorna ISO string
function calcularExpiracaoISO(duracao) {
  const agora = new Date();
  if (duracao === "24h") agora.setHours(agora.getHours() + 24);
  else if (duracao === "7d") agora.setDate(agora.getDate() + 7);
  else if (duracao === "15d") agora.setDate(agora.getDate() + 15);
  else if (duracao === "30d") agora.setDate(agora.getDate() + 30);
  else agora.setDate(agora.getDate() + 30); // default 30d

  return agora.toISOString();
}

const formDoar = document.getElementById("formDoar");
const inputFoto = document.getElementById("foto");

if (formDoar) {
  formDoar.addEventListener("submit", function (event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const categoria = document.getElementById("categoria").value;
    const condicao = document.getElementById("condicao").value;
    const quantidade = document.getElementById("quantidade").value;
    const cidade = document.getElementById("cidade").value.trim();
    const duracao = document.getElementById("duracao").value;

    if (!nome || !descricao || !categoria || !condicao || !quantidade || !cidade || !duracao) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    function salvarItem(fotoBase64) {
      const novoItem = {
        id: "i" + Date.now(),
        dono: usuarioLogado.email, // identificação por email
        titulo: nome,
        descricao,
        categoria,
        condicao,
        quantidade: Number(quantidade),
        cidade,
        duracao,
        criadoEm: new Date().toISOString(),
        expiraEm: calcularExpiracaoISO(duracao),
        status: "ativo",
        foto: fotoBase64 || null,
        interesses: []
      };

      const itens = JSON.parse(localStorage.getItem("itens")) || [];
      itens.push(novoItem);
      localStorage.setItem("itens", JSON.stringify(itens));

      alert("Item doado com sucesso!");
      window.location.href = "explorar.html";
    }

    if (inputFoto && inputFoto.files && inputFoto.files[0]) {
      const file = inputFoto.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        salvarItem(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      salvarItem(null);
    }
  });
}
