// Rotina para processar expirações, escolher vencedor e criar notificações

(function () {
    "use strict";
  
    function genId(prefix = "n") {
      try {
        return (crypto && crypto.randomUUID) ? crypto.randomUUID() : prefix + Date.now() + Math.floor(Math.random() * 1000);
      } catch (e) {
        return prefix + Date.now() + Math.floor(Math.random() * 1000);
      }
    }
  
    function salvarNotificacoes(notifs) {
      localStorage.setItem("notificacoes", JSON.stringify(notifs));
    }
  
    function registrarNotificacao(destinatario, mensagem, extra = {}) {
      const notificacoes = JSON.parse(localStorage.getItem("notificacoes")) || [];
      notificacoes.push({
        id: genId(),
        usuario: destinatario, // email do destinatário
        mensagem,
        data: new Date().toISOString(),
        lido: false,
        ...extra
      });
      salvarNotificacoes(notificacoes);
    }
  
    // para escolher vencedor
    // por prioridade: 1. cidade igual 2. maior valor 3. ordem de chegada (timestamp menor)
    function escolherVencedor(item) {
      if (!Array.isArray(item.interesses) || item.interesses.length === 0) return null;
  
      const arr = item.interesses.map(i => ({
        ...i,
        cidadeMatch: (i.cidade && item.cidade) ? (String(i.cidade).toLowerCase() === String(item.cidade).toLowerCase() ? 1 : 0) : 0,
        valorNum: (typeof i.valor === "number") ? i.valor : (i.valor ? Number(i.valor) : null)
      }));
  
      arr.sort((a, b) => {
        if ((b.cidadeMatch - a.cidadeMatch) !== 0) return b.cidadeMatch - a.cidadeMatch;
        const av = a.valorNum ?? -Infinity;
        const bv = b.valorNum ?? -Infinity;
        if (bv !== av) return bv - av;
        return a.timestamp - b.timestamp;
      });
  
      return arr[0];
    }
  
    function processarExpiracoes() {
      const itens = JSON.parse(localStorage.getItem("itens")) || [];
      const agora = new Date();
      let alterou = false;
  
      const novos = itens.map(item => {
        // só processa itens com expiraEm
        if (!item || !item.expiraEm) return item;
  
        const expira = new Date(item.expiraEm);
        // só processa se expirou
        if (expira > agora) return item;
  
        // se já está em estado final, ignora
        if (["cancelado", "negociado", "sem-acordo", "aguardando-acordo", "pendente_confirmacao"].includes(item.status)) {
          return item;
        }
  
        // item expirou e estava disponível 
        if (!item.interesses || item.interesses.length === 0) {
          item.status = "sem-acordo";
          registrarNotificacao(item.dono, `Sua oferta "${item.titulo}" expirou sem propostas e foi marcada como sem acordo.`);
        } else {
          const vencedor = escolherVencedor(item);
          if (vencedor) {
            item.status = "aguardando-acordo";
            // marca candidato, apenas para referência
            item.interesses = item.interesses.map(i => ({ ...i, candidato: i.usuario === vencedor.usuario }));
            // notifica dono e vencedor
            registrarNotificacao(item.dono, `Sua oferta "${item.titulo}" recebeu uma proposta vencedora de ${vencedor.usuario}. Confirme no seu perfil.`, { itemId: item.id, tipo: "confirmacaoDono" });
            registrarNotificacao(vencedor.usuario, `Você foi selecionado como vencedor para "${item.titulo}". Aguarde confirmação do dono.`, { itemId: item.id, tipo: "aguardandoConfirmacao" });
          } else {
            item.status = "sem-acordo";
            registrarNotificacao(item.dono, `Sua oferta "${item.titulo}" expirou sem um vencedor claro.`);
          }
        }
  
        alterou = true;
        return item;
      });
  
      if (alterou) {
        localStorage.setItem("itens", JSON.stringify(novos));
      }
    }
  
    try {
      // roda ao carregar e a cada 30s
      processarExpiracoes();
      setInterval(processarExpiracoes, 30000);
    } catch (e) {
      console.error("checkStatus error:", e);
    }
  
    // outros arquivos poderem usar
    window.__Desapega_checkStatus = {
      processarExpiracoes,
      registrarNotificacao,
      escolherVencedor
    };
  })();
  