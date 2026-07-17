// URL padrão vazia. Quando o usuário salvar uma URL, ela será carregada do localStorage.
let N8N_WEBHOOK_URL = "";

// Chaves usadas para guardar configurações no navegador.
const CHAVE_WEBHOOK = "senac_n8n_webhook_url";
const CHAVE_CHAT_WEBHOOK = "senac_n8n_chat_webhook_url";
const CHAVE_SUPABASE_URL = "senac_supabase_url";
const CHAVE_SUPABASE_ANON_KEY = "senac_supabase_anon_key";
const CHAVE_INTERVALO_ATUALIZACAO = "senac_intervalo_atualizacao_segundos";
const LIMITE_NOTIFICACOES = 30;

// Arquivos oficiais do pacote @n8n/chat carregados apenas quando o chat oficial for ativado.
const N8N_CHAT_CSS_URL = "https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css";
const N8N_CHAT_JS_URL = "https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js";

// Configurações carregadas do localStorage.
let N8N_CHAT_WEBHOOK_URL = "";
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
let INTERVALO_ATUALIZACAO_SEGUNDOS = 30;

// Estado em memória usado para renderização da tela.
let chamados = [];
let ultimaRequisicaoLista = 0;
let atualizacaoAutomaticaId = null;
let supabaseConectado = false;
let tabelaAtual = "usuarios";
let notificacoesBanco = [];
let notificacoesNaoLidas = 0;
let snapshotBanco = null;

// Dados reais carregados do Supabase. Não há dados fictícios no projeto.
const dadosBanco = {
    usuarios: [],
    setores: [],
    categorias_chamado: [],
    chamados: [],
    historico_chamados: [],
    base_conhecimento: []
};

// Modelo relacional extraído do documento do projeto.
const ESQUEMA_TABELAS = {
    usuarios: {
        titulo: "Usuários",
        descricao: "Pessoas que usam o sistema: alunos, professores, técnicos e coordenação.",
        colunas: ["id", "nome", "email", "telefone", "perfil", "ativo", "data_criacao"],
        campos: [
            { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
            { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true },
            { nome: "telefone", rotulo: "Telefone", tipo: "text" },
            { nome: "perfil", rotulo: "Perfil", tipo: "select", obrigatorio: true, opcoes: ["Aluno", "Professor", "Técnico", "Coordenação"] },
            { nome: "ativo", rotulo: "Usuário ativo", tipo: "checkbox", padrao: true },
            { nome: "data_criacao", rotulo: "Data de criação", tipo: "datetime-local", usarPadraoBanco: true }
        ]
    },
    setores: {
        titulo: "Setores",
        descricao: "Áreas internas da instituição responsáveis pelos atendimentos.",
        colunas: ["id", "data_criacao", "nome", "responsavel", "descricao"],
        campos: [
            { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
            { nome: "responsavel", rotulo: "Responsável", tipo: "text" },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea" },
            { nome: "data_criacao", rotulo: "Data de criação", tipo: "datetime-local", usarPadraoBanco: true }
        ]
    },
    categorias_chamado: {
        titulo: "Categorias de chamado",
        descricao: "Classificações dos problemas atendidos pela central.",
        colunas: ["id", "data_criacao", "nome", "descricao"],
        campos: [
            { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea" },
            { nome: "data_criacao", rotulo: "Data de criação", tipo: "datetime-local", usarPadraoBanco: true }
        ]
    },
    chamados: {
        titulo: "Chamados",
        descricao: "Demandas abertas pelos usuários, relacionadas a setor e categoria.",
        colunas: ["id", "data_abertura", "usuario_id", "setor_id", "categoria_id", "titulo", "descricao", "prioridade", "status", "data_atualizacao"],
        campos: [
            { nome: "usuario_id", rotulo: "Usuário solicitante", tipo: "relation", tabela: "usuarios", obrigatorio: true },
            { nome: "setor_id", rotulo: "Setor", tipo: "relation", tabela: "setores", obrigatorio: true },
            { nome: "categoria_id", rotulo: "Categoria", tipo: "relation", tabela: "categorias_chamado", obrigatorio: true },
            { nome: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea", obrigatorio: true },
            { nome: "prioridade", rotulo: "Prioridade", tipo: "select", obrigatorio: true, opcoes: ["Baixa", "Média", "Alta", "Crítica"], padrao: "Média" },
            { nome: "status", rotulo: "Status", tipo: "select", obrigatorio: true, opcoes: ["Aberto", "Em análise", "Resolvido", "Cancelado"], padrao: "Aberto" },
            { nome: "data_abertura", rotulo: "Data de abertura", tipo: "datetime-local", usarPadraoBanco: true },
            { nome: "data_atualizacao", rotulo: "Data de atualização", tipo: "datetime-local" }
        ]
    },
    historico_chamados: {
        titulo: "Histórico de chamados",
        descricao: "Registro das movimentações realizadas em cada chamado.",
        colunas: ["id", "data_registro", "chamado_id", "usuario_id", "acao", "descricao"],
        campos: [
            { nome: "chamado_id", rotulo: "Chamado", tipo: "relation", tabela: "chamados", obrigatorio: true },
            { nome: "usuario_id", rotulo: "Usuário responsável", tipo: "relation", tabela: "usuarios", obrigatorio: true },
            { nome: "acao", rotulo: "Ação", tipo: "text", obrigatorio: true },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea" },
            { nome: "data_registro", rotulo: "Data do registro", tipo: "datetime-local", usarPadraoBanco: true }
        ]
    },
    base_conhecimento: {
        titulo: "Base de conhecimento",
        descricao: "Perguntas e respostas usadas pelo agente para orientar usuários.",
        colunas: ["id", "categoria_id", "pergunta", "resposta", "ativo", "data_criacao"],
        campos: [
            { nome: "categoria_id", rotulo: "Categoria", tipo: "relation", tabela: "categorias_chamado", obrigatorio: true },
            { nome: "pergunta", rotulo: "Pergunta", tipo: "text", obrigatorio: true },
            { nome: "resposta", rotulo: "Resposta", tipo: "textarea", obrigatorio: true },
            { nome: "ativo", rotulo: "Resposta ativa", tipo: "checkbox", padrao: true },
            { nome: "data_criacao", rotulo: "Data de criação", tipo: "datetime-local", usarPadraoBanco: true }
        ]
    }
};

document.addEventListener("DOMContentLoaded", inicializarSistema);

// Inicializa eventos, carrega configurações salvas e busca dados reais quando houver conexão.
function inicializarSistema() {
    configurarEventos();
    carregarUrlN8N();
    carregarUrlChatN8N();
    carregarConfiguracaoSupabase();
    selecionarTabela(tabelaAtual);
    renderizarNotificacoes();
    listarChamados({ silencioso: true });
}

// Registra eventos de formulários, filtros, botões, abas e navegação.
function configurarEventos() {
    document.getElementById("form-chamado").addEventListener("submit", cadastrarChamado);
    document.getElementById("form-chat").addEventListener("submit", enviarPerguntaAgente);
    document.getElementById("form-registro").addEventListener("submit", salvarRegistroTabela);
    document.getElementById("botao-novo-registro").addEventListener("click", () => renderizarFormularioTabela());
    document.getElementById("botao-atualizar-lista").addEventListener("click", listarChamados);
    document.getElementById("botao-salvar-url").addEventListener("click", salvarUrlN8N);
    document.getElementById("botao-testar-conexao").addEventListener("click", testarConexao);
    document.getElementById("botao-limpar-url").addEventListener("click", limparUrlN8N);
    document.getElementById("botao-salvar-chat-url").addEventListener("click", salvarUrlChatN8N);
    document.getElementById("botao-limpar-chat-url").addEventListener("click", limparUrlChatN8N);
    document.getElementById("botao-salvar-supabase").addEventListener("click", salvarConfiguracaoSupabase);
    document.getElementById("botao-testar-supabase").addEventListener("click", testarConexaoSupabase);
    document.getElementById("botao-limpar-supabase").addEventListener("click", limparConfiguracaoSupabase);
    document.getElementById("botao-marcar-notificacoes").addEventListener("click", marcarNotificacoesComoLidas);
    document.getElementById("botao-limpar-notificacoes").addEventListener("click", limparNotificacoes);

    document.getElementById("filtro-status").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-prioridade").addEventListener("change", aplicarFiltros);
    document.getElementById("filtro-busca").addEventListener("input", aplicarFiltros);
    document.getElementById("corpo-tabela-chamados").addEventListener("click", tratarCliqueTabela);
    document.getElementById("corpo-tabela-gerenciamento").addEventListener("click", tratarCliqueGerenciamento);

    document.querySelectorAll(".aba-dados").forEach((botao) => {
        botao.addEventListener("click", () => selecionarTabela(botao.dataset.tabela));
    });

    document.querySelectorAll(".botao-sugestao").forEach((botao) => {
        botao.addEventListener("click", () => {
            document.getElementById("pergunta-agente").value = botao.dataset.pergunta;
            enviarPerguntaAgente();
        });
    });

    document.querySelectorAll(".link-menu").forEach((link) => {
        link.addEventListener("click", () => destacarLinkMenu(link));
    });
}

// Carrega do localStorage a URL do Webhook do n8n.
function carregarUrlN8N() {
    N8N_WEBHOOK_URL = localStorage.getItem(CHAVE_WEBHOOK) || "";
    document.getElementById("webhook-url").value = N8N_WEBHOOK_URL;
    atualizarIndicadorIntegracao();
}

// Carrega do localStorage a URL opcional do Chat Trigger usado pelo @n8n/chat.
function carregarUrlChatN8N() {
    N8N_CHAT_WEBHOOK_URL = localStorage.getItem(CHAVE_CHAT_WEBHOOK) || "";
    document.getElementById("chat-webhook-url").value = N8N_CHAT_WEBHOOK_URL;
    configurarChatOficialN8N();
}

// Carrega a configuração do Supabase e prepara o status de atualização.
function carregarConfiguracaoSupabase() {
    SUPABASE_URL = localStorage.getItem(CHAVE_SUPABASE_URL) || "";
    SUPABASE_ANON_KEY = localStorage.getItem(CHAVE_SUPABASE_ANON_KEY) || "";
    INTERVALO_ATUALIZACAO_SEGUNDOS = Number(localStorage.getItem(CHAVE_INTERVALO_ATUALIZACAO)) || 30;

    document.getElementById("supabase-url").value = SUPABASE_URL;
    document.getElementById("supabase-anon-key").value = SUPABASE_ANON_KEY;
    document.getElementById("supabase-tabela").value = "chamados";
    document.getElementById("intervalo-atualizacao").value = INTERVALO_ATUALIZACAO_SEGUNDOS;

    atualizarStatusSupabase();
    atualizarIndicadorIntegracao();
    renderizarSelectsChamado();
}

// Salva a URL do Webhook da central de chamados no localStorage.
function salvarUrlN8N() {
    const campoUrl = document.getElementById("webhook-url");
    const urlInformada = campoUrl.value.trim();

    if (!urlInformada) {
        mostrarToast("Informe a URL do Webhook do n8n antes de salvar.", "erro");
        return;
    }

    if (!urlValida(urlInformada)) {
        mostrarToast("A URL informada não parece válida. Use http:// ou https://.", "erro");
        return;
    }

    if (urlPareceChatExternoN8N(urlInformada)) {
        mostrarToast("Essa parece ser a URL do chat externo do n8n. Use o campo URL do Chat Trigger para esse link.", "erro");
        return;
    }

    localStorage.setItem(CHAVE_WEBHOOK, urlInformada);
    carregarUrlN8N();
    mostrarToast("URL do Webhook salva com sucesso.", "sucesso");
    listarChamados();
}

// Salva a URL do Chat Trigger para ativar o widget oficial do n8n.
function salvarUrlChatN8N() {
    const campoUrl = document.getElementById("chat-webhook-url");
    const urlInformada = campoUrl.value.trim();

    if (!urlInformada) {
        mostrarToast("Informe a URL do Chat Trigger do n8n antes de salvar.", "erro");
        return;
    }

    if (!urlValida(urlInformada)) {
        mostrarToast("A URL do chat não parece válida. Use http:// ou https://.", "erro");
        return;
    }

    localStorage.setItem(CHAVE_CHAT_WEBHOOK, urlInformada);
    carregarUrlChatN8N();
    mostrarToast("URL do chat oficial salva com sucesso.", "sucesso");
}

// Salva a conexão direta com Supabase usando somente URL pública e chave anon.
function salvarConfiguracaoSupabase() {
    const url = document.getElementById("supabase-url").value.trim();
    const anonKey = document.getElementById("supabase-anon-key").value.trim();
    const intervalo = Number(document.getElementById("intervalo-atualizacao").value);

    if (!url || !anonKey) {
        mostrarToast("Informe a URL do Supabase e a chave anon pública.", "erro");
        return false;
    }

    if (!urlValida(url)) {
        mostrarToast("A URL do Supabase não é válida.", "erro");
        return false;
    }

    if (chaveSupabasePareceServiceRole(anonKey)) {
        mostrarToast("Não use service_role no front-end. Informe somente a chave anon pública com RLS ativo.", "erro");
        return false;
    }

    if (!intervaloValido(intervalo)) {
        mostrarToast("Informe um intervalo entre 5 e 3600 segundos.", "erro");
        return false;
    }

    localStorage.setItem(CHAVE_SUPABASE_URL, removerBarraFinal(url));
    localStorage.setItem(CHAVE_SUPABASE_ANON_KEY, anonKey);
    localStorage.setItem(CHAVE_INTERVALO_ATUALIZACAO, String(intervalo));

    supabaseConectado = false;
    pararAtualizacaoAutomatica();
    reiniciarMonitoramentoBanco();
    carregarConfiguracaoSupabase();
    mostrarToast("Configuração do Supabase salva. Teste a conexão para confirmar permissões.", "sucesso");
    return true;
}

// Remove a URL do Webhook da central.
function limparUrlN8N() {
    localStorage.removeItem(CHAVE_WEBHOOK);
    carregarUrlN8N();
    mostrarToast("URL do n8n removida.", "info");
    listarChamados();
}

// Remove a URL do Chat Trigger e volta a exibir o chat manual.
function limparUrlChatN8N() {
    localStorage.removeItem(CHAVE_CHAT_WEBHOOK);
    carregarUrlChatN8N();
    mostrarToast("Chat oficial removido. O chat manual voltou a ser exibido.", "info");
}

// Remove a conexão com Supabase, interrompe polling e limpa dados carregados.
function limparConfiguracaoSupabase() {
    localStorage.removeItem(CHAVE_SUPABASE_URL);
    localStorage.removeItem(CHAVE_SUPABASE_ANON_KEY);
    localStorage.removeItem(CHAVE_INTERVALO_ATUALIZACAO);
    pararAtualizacaoAutomatica();
    supabaseConectado = false;
    SUPABASE_URL = "";
    SUPABASE_ANON_KEY = "";
    INTERVALO_ATUALIZACAO_SEGUNDOS = 30;
    reiniciarMonitoramentoBanco();
    limparDadosBanco();
    carregarConfiguracaoSupabase();
    atualizarTelasComDadosAtuais();
    mostrarToast("Configuração do Supabase removida.", "info");
}

// Mantida por compatibilidade com versões anteriores; agora não existe modo com dados fictícios.
function alternarModoDemo() {
    atualizarIndicadorIntegracao();
}

// Atualiza o texto superior indicando a fonte real de dados.
function atualizarIndicadorIntegracao() {
    const indicador = document.getElementById("indicador-modo");
    const fonte = obterFonteDados();

    indicador.classList.remove("conectado", "erro");

    if (fonte === "supabase") {
        indicador.textContent = supabaseConectado ? "Integrado ao Supabase" : "Supabase configurado";
        indicador.classList.add("conectado");
        return;
    }

    if (fonte === "n8n") {
        indicador.textContent = "Integrado ao n8n";
        indicador.classList.add("conectado");
        return;
    }

    indicador.textContent = "Sem fonte de dados";
    indicador.classList.add("erro");
}

// Alterna entre o chat manual do projeto e o widget oficial @n8n/chat.
async function configurarChatOficialN8N() {
    const areaManual = document.getElementById("chat-manual-area");
    const areaOficial = document.getElementById("chat-oficial-area");
    const alvoChat = document.getElementById("n8n-chat");

    if (!N8N_CHAT_WEBHOOK_URL) {
        areaManual.hidden = false;
        areaOficial.hidden = true;
        alvoChat.innerHTML = "";
        return;
    }

    areaManual.hidden = true;
    areaOficial.hidden = false;
    alvoChat.innerHTML = '<div class="mensagem-carregamento-chat">Carregando chat oficial do n8n...</div>';

    try {
        await carregarCssChatN8N();
        const { createChat } = await import(N8N_CHAT_JS_URL);

        alvoChat.innerHTML = "";
        createChat({
            webhookUrl: N8N_CHAT_WEBHOOK_URL,
            target: "#n8n-chat",
            mode: "fullscreen",
            loadPreviousSession: false,
            showWelcomeScreen: false,
            initialMessages: [
                "Olá! Sou o agente de IA da Central SENAC.",
                "Como posso ajudar com os chamados?"
            ],
            i18n: {
                en: {
                    title: "Central SENAC",
                    subtitle: "Agente de IA conectado ao n8n",
                    footer: "",
                    getStarted: "Nova conversa",
                    inputPlaceholder: "Digite sua pergunta..."
                }
            }
        });
    } catch (erro) {
        console.error("Falha ao carregar o @n8n/chat:", erro);
        areaManual.hidden = false;
        areaOficial.hidden = true;
        alvoChat.innerHTML = "";
        mostrarToast("Não foi possível carregar o chat oficial do n8n. Verifique conexão, CDN e CORS.", "erro");
    }
}

// Inclui o CSS oficial do @n8n/chat apenas uma vez na página.
function carregarCssChatN8N() {
    const cssExistente = document.querySelector(`link[href="${N8N_CHAT_CSS_URL}"]`);

    if (cssExistente) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = N8N_CHAT_CSS_URL;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

// Envia uma ação padronizada para o n8n usando fetch().
async function enviarParaN8N(acao, dados) {
    if (!N8N_WEBHOOK_URL) {
        throw new Error("Configure a URL do Webhook do n8n ou conecte o Supabase.");
    }

    const resposta = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            acao,
            dados
        })
    });

    return await lerRespostaN8N(resposta);
}

// Envia requisições diretas para a API REST do Supabase usando chave anon pública.
async function enviarParaSupabase(metodo, caminho, corpo = null, prefer = "") {
    if (!supabaseConfigurado()) {
        throw new Error("Configure a URL do Supabase e a chave anon pública.");
    }

    const cabecalhos = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
    };

    if (prefer) {
        cabecalhos.Prefer = prefer;
    }

    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
        method: metodo,
        headers: cabecalhos,
        body: corpo ? JSON.stringify(corpo) : null
    });

    return await lerRespostaSupabase(resposta);
}

// Cadastra um novo chamado usando chaves estrangeiras reais.
async function cadastrarChamado(evento) {
    if (evento) {
        evento.preventDefault();
    }

    const formulario = document.getElementById("form-chamado");

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const dados = {
        usuario_id: Number(document.getElementById("usuario-id").value),
        setor_id: Number(document.getElementById("setor").value),
        categoria_id: Number(document.getElementById("categoria").value),
        titulo: document.getElementById("titulo").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        prioridade: document.getElementById("prioridade").value,
        status: "Aberto",
        data_abertura: new Date().toISOString()
    };

    mostrarCarregamento(true, "Cadastrando chamado...");

    try {
        if (obterFonteDados() === "supabase") {
            await criarRegistroSupabase("chamados", dados);
        } else {
            const resposta = await enviarParaN8N("criar_chamado", {
                ...dados,
                usuario_nome: obterRotuloRelacao("usuarios", dados.usuario_id),
                setor_nome: obterRotuloRelacao("setores", dados.setor_id),
                categoria_nome: obterRotuloRelacao("categorias_chamado", dados.categoria_id)
            });

            if (resposta.sucesso === false) {
                throw new Error(resposta.mensagem || "O chamado não foi cadastrado.");
            }
        }

        formulario.reset();
        mostrarToast("Chamado cadastrado com sucesso.", "sucesso");
        await listarChamados();
    } catch (erro) {
        mostrarToast(erro.message || "Erro ao cadastrar chamado.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Busca dados reais no Supabase ou chamados via n8n. Sem conexão, mantém a lista vazia.
async function listarChamados(opcoes = {}) {
    const idRequisicao = ++ultimaRequisicaoLista;
    const silencioso = Boolean(opcoes.silencioso);

    if (!silencioso) {
        mostrarCarregamento(true, "Carregando dados...");
    }

    try {
        const fonte = obterFonteDados();

        if (fonte === "supabase") {
            await carregarTodosDadosSupabase();
            supabaseConectado = true;
            if (!atualizacaoAutomaticaId) {
                configurarAtualizacaoAutomatica();
            }
            atualizarStatusSupabase("Conectado ao Supabase. Última atualização: " + new Date().toLocaleTimeString("pt-BR"));
        } else if (fonte === "n8n") {
            const resposta = await enviarParaN8N("listar_chamados", {});
            dadosBanco.chamados = normalizarListaChamados(resposta);
        } else {
            limparDadosBanco();
            reiniciarMonitoramentoBanco();
            if (!silencioso) {
                mostrarToast("Nenhuma fonte de dados configurada. Configure n8n ou Supabase.", "info");
            }
        }

        if (idRequisicao !== ultimaRequisicaoLista) {
            return;
        }

        atualizarTelasComDadosAtuais();
    } catch (erro) {
        if (obterFonteDados() === "supabase") {
            supabaseConectado = false;
            atualizarStatusSupabase("Falha ao buscar dados no Supabase.");
        }

        if (idRequisicao === ultimaRequisicaoLista && !silencioso) {
            mostrarToast(erro.message || "Erro ao carregar dados.", "erro");
        }
    } finally {
        if (idRequisicao === ultimaRequisicaoLista && !silencioso) {
            mostrarCarregamento(false);
        }
    }
}

// Atualiza o status de um chamado na fonte real configurada.
async function atualizarStatusChamado(id, status) {
    mostrarCarregamento(true, "Atualizando status...");

    try {
        if (obterFonteDados() === "supabase") {
            await atualizarRegistroSupabase("chamados", id, {
                status,
                data_atualizacao: new Date().toISOString()
            });
        } else {
            const resposta = await enviarParaN8N("atualizar_status", {
                id_chamado: Number(id),
                novo_status: status
            });

            if (resposta.sucesso === false) {
                throw new Error(resposta.mensagem || "Não foi possível atualizar o status.");
            }
        }

        mostrarToast(`Chamado ${id} marcado como ${status}.`, "sucesso");
        await listarChamados();
    } catch (erro) {
        mostrarToast(erro.message || "Erro ao atualizar status.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Envia a pergunta digitada para o agente via Webhook do n8n.
async function enviarPerguntaAgente(evento) {
    if (evento) {
        evento.preventDefault();
    }

    const campoPergunta = document.getElementById("pergunta-agente");
    const pergunta = campoPergunta.value.trim();

    if (!pergunta) {
        mostrarToast("Digite uma pergunta para o agente.", "erro");
        return;
    }

    if (!N8N_WEBHOOK_URL) {
        mostrarToast("Configure a URL do Webhook do n8n ou use a URL do Chat Trigger oficial.", "erro");
        return;
    }

    mostrarMensagemChat("usuario", pergunta);
    campoPergunta.value = "";
    mostrarCarregamento(true, "Consultando agente...");

    try {
        const resposta = await enviarParaN8N("perguntar_agente", {
            pergunta
        });

        const textoResposta = resposta.resposta || resposta.mensagem || "O agente não retornou uma resposta textual.";
        mostrarMensagemChat("agente", textoResposta);
    } catch (erro) {
        mostrarMensagemChat("sistema", "Não foi possível obter resposta do agente neste momento.");
        mostrarToast(erro.message || "Erro ao consultar o agente.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Carrega todas as tabelas do modelo para resolver chaves estrangeiras.
async function carregarTodosDadosSupabase() {
    const tabelas = Object.keys(ESQUEMA_TABELAS);

    for (const tabela of tabelas) {
        dadosBanco[tabela] = await listarTabelaSupabase(tabela);
    }

    verificarAlteracoesBanco();
}

// Compara a versão atual dos dados com a versão anterior carregada do Supabase.
function verificarAlteracoesBanco() {
    const snapshotAtual = criarSnapshotBanco();

    if (!snapshotBanco) {
        snapshotBanco = snapshotAtual;
        return;
    }

    const alteracoes = [];

    Object.keys(ESQUEMA_TABELAS).forEach((tabela) => {
        const registrosAntes = snapshotBanco[tabela] || {};
        const registrosAgora = snapshotAtual[tabela] || {};
        const tituloTabela = ESQUEMA_TABELAS[tabela].titulo;

        Object.keys(registrosAgora).forEach((id) => {
            const registroAtual = registrosAgora[id];
            const registroAnterior = registrosAntes[id];

            if (!registroAnterior) {
                alteracoes.push(criarNotificacaoBanco("adicionado", tituloTabela, registroAtual.rotulo));
                return;
            }

            if (registroAnterior.assinatura !== registroAtual.assinatura) {
                alteracoes.push(criarNotificacaoBanco("atualizado", tituloTabela, registroAtual.rotulo));
            }
        });

        Object.keys(registrosAntes).forEach((id) => {
            if (!registrosAgora[id]) {
                alteracoes.push(criarNotificacaoBanco("removido", tituloTabela, registrosAntes[id].rotulo));
            }
        });
    });

    snapshotBanco = snapshotAtual;

    if (alteracoes.length > 0) {
        registrarNotificacoes(alteracoes);
    }
}

// Cria uma fotografia simples dos registros para detectar criação, edição e exclusão.
function criarSnapshotBanco() {
    const snapshot = {};

    Object.keys(ESQUEMA_TABELAS).forEach((tabela) => {
        snapshot[tabela] = {};

        dadosBanco[tabela].forEach((registro) => {
            if (registro.id === undefined || registro.id === null) {
                return;
            }

            snapshot[tabela][String(registro.id)] = {
                assinatura: criarAssinaturaRegistro(registro),
                rotulo: obterRotuloRegistro(tabela, registro)
            };
        });
    });

    return snapshot;
}

// Gera uma assinatura estável de um registro, independentemente da ordem das chaves.
function criarAssinaturaRegistro(registro) {
    return JSON.stringify(ordenarValorParaAssinatura(registro));
}

// Ordena objetos e listas para que a comparação detecte apenas mudanças reais de valor.
function ordenarValorParaAssinatura(valor) {
    if (Array.isArray(valor)) {
        return valor.map(ordenarValorParaAssinatura);
    }

    if (valor && typeof valor === "object") {
        return Object.keys(valor)
            .sort()
            .reduce((objetoOrdenado, chave) => {
                objetoOrdenado[chave] = ordenarValorParaAssinatura(valor[chave]);
                return objetoOrdenado;
            }, {});
    }

    return valor ?? null;
}

// Monta uma notificação de alteração detectada no banco.
function criarNotificacaoBanco(tipo, tabela, rotuloRegistro) {
    const acoes = {
        adicionado: "Novo registro",
        atualizado: "Registro atualizado",
        removido: "Registro removido"
    };

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tipo,
        tabela,
        titulo: acoes[tipo],
        mensagem: `${acoes[tipo]} em ${tabela}: ${rotuloRegistro}`,
        dataHora: new Date().toISOString(),
        lida: false
    };
}

// Adiciona novas notificações à lista exibida para o administrador.
function registrarNotificacoes(novasNotificacoes) {
    notificacoesBanco = [...novasNotificacoes, ...notificacoesBanco].slice(0, LIMITE_NOTIFICACOES);
    notificacoesNaoLidas = notificacoesBanco.filter((notificacao) => !notificacao.lida).length;
    renderizarNotificacoes();

    const mensagem = novasNotificacoes.length === 1
        ? "1 alteração detectada no banco de dados."
        : `${novasNotificacoes.length} alterações detectadas no banco de dados.`;

    mostrarToast(mensagem, "info");
}

// Renderiza o painel com as últimas notificações do banco.
function renderizarNotificacoes() {
    const lista = document.getElementById("lista-notificacoes");
    const mensagem = document.getElementById("mensagem-notificacoes");
    const contador = document.getElementById("contador-notificacoes");
    const botaoMarcar = document.getElementById("botao-marcar-notificacoes");
    const botaoLimpar = document.getElementById("botao-limpar-notificacoes");

    if (!lista || !mensagem || !contador) {
        return;
    }

    lista.innerHTML = "";
    mensagem.hidden = notificacoesBanco.length > 0;
    contador.textContent = notificacoesNaoLidas === 1
        ? "1 nova"
        : `${notificacoesNaoLidas} novas`;

    if (botaoMarcar) {
        botaoMarcar.disabled = notificacoesNaoLidas === 0;
    }

    if (botaoLimpar) {
        botaoLimpar.disabled = notificacoesBanco.length === 0;
    }

    notificacoesBanco.forEach((notificacao) => {
        lista.appendChild(criarItemNotificacao(notificacao));
    });
}

// Cria o item visual de uma notificação.
function criarItemNotificacao(notificacao) {
    const item = document.createElement("li");
    const cabecalho = document.createElement("div");
    const titulo = document.createElement("strong");
    const data = document.createElement("time");
    const mensagem = document.createElement("p");
    const etiqueta = document.createElement("span");

    item.className = `item-notificacao notificacao-${classeTexto(notificacao.tipo)}`;
    item.classList.toggle("nao-lida", !notificacao.lida);

    cabecalho.className = "notificacao-cabecalho";
    etiqueta.className = "etiqueta-notificacao";
    etiqueta.textContent = notificacao.tipo;
    titulo.textContent = notificacao.titulo;
    data.dateTime = notificacao.dataHora;
    data.textContent = formatarData(notificacao.dataHora);
    mensagem.textContent = notificacao.mensagem;

    cabecalho.append(etiqueta, titulo, data);
    item.append(cabecalho, mensagem);

    return item;
}

// Marca todas as notificações atuais como lidas.
function marcarNotificacoesComoLidas() {
    notificacoesBanco = notificacoesBanco.map((notificacao) => ({
        ...notificacao,
        lida: true
    }));
    notificacoesNaoLidas = 0;
    renderizarNotificacoes();
}

// Limpa a lista de notificações exibida na tela.
function limparNotificacoes() {
    notificacoesBanco = [];
    notificacoesNaoLidas = 0;
    renderizarNotificacoes();
}

// Reinicia a referência usada para comparar alterações no banco.
function reiniciarMonitoramentoBanco() {
    snapshotBanco = null;
}

// Lista uma tabela inteira pela API REST do Supabase.
async function listarTabelaSupabase(tabela) {
    validarTabelaConhecida(tabela);
    const resposta = await enviarParaSupabase("GET", `${tabela}?select=*&order=id.asc`);

    return Array.isArray(resposta) ? resposta : [];
}

// Insere um registro em uma tabela conhecida.
async function criarRegistroSupabase(tabela, dados) {
    validarTabelaConhecida(tabela);
    return await enviarParaSupabase("POST", tabela, dados, "return=representation");
}

// Atualiza um registro por id em uma tabela conhecida.
async function atualizarRegistroSupabase(tabela, id, dados) {
    validarTabelaConhecida(tabela);
    return await enviarParaSupabase("PATCH", `${tabela}?id=eq.${encodeURIComponent(id)}`, dados, "return=representation");
}

// Exclui um registro por id em uma tabela conhecida.
async function excluirRegistroSupabase(tabela, id) {
    validarTabelaConhecida(tabela);
    return await enviarParaSupabase("DELETE", `${tabela}?id=eq.${encodeURIComponent(id)}`);
}

// Testa se a configuração do Supabase consegue ler todas as tabelas do modelo.
async function testarConexaoSupabase() {
    const configuracaoSalva = salvarConfiguracaoSupabase();

    if (!configuracaoSalva || !supabaseConfigurado()) {
        return;
    }

    mostrarCarregamento(true, "Testando Supabase...");

    try {
        await carregarTodosDadosSupabase();
        supabaseConectado = true;
        atualizarTelasComDadosAtuais();
        atualizarStatusSupabase("Conexão com Supabase funcionando.");
        mostrarToast("Conexão com Supabase funcionando.", "sucesso");
        configurarAtualizacaoAutomatica();
    } catch (erro) {
        supabaseConectado = false;
        pararAtualizacaoAutomatica();
        atualizarStatusSupabase("Falha ao conectar com Supabase.");
        mostrarToast(erro.message || "Erro ao testar Supabase.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Testa a conexão com o Webhook enviando a ação testar_conexao.
async function testarConexao() {
    const campoUrl = document.getElementById("webhook-url");
    const urlTemporaria = campoUrl.value.trim();

    if (!urlTemporaria) {
        mostrarToast("Informe a URL do Webhook para testar a conexão.", "erro");
        return;
    }

    if (!urlValida(urlTemporaria)) {
        mostrarToast("A URL informada para teste não é válida.", "erro");
        return;
    }

    if (urlPareceChatExternoN8N(urlTemporaria)) {
        mostrarToast("Essa URL parece ser do chat externo do n8n (/chat). Use o campo URL do Chat Trigger.", "erro");
        return;
    }

    const urlAnterior = N8N_WEBHOOK_URL;
    N8N_WEBHOOK_URL = urlTemporaria;

    mostrarCarregamento(true, "Testando conexão...");

    try {
        const resposta = await enviarParaN8N("testar_conexao", {
            origem: "interface_web_senac"
        });

        if (resposta.sucesso) {
            mostrarToast(resposta.mensagem || "Conexão com n8n funcionando.", "sucesso");
        } else {
            mostrarToast(resposta.mensagem || "O n8n respondeu, mas não confirmou sucesso.", "erro");
        }
    } finally {
        N8N_WEBHOOK_URL = urlAnterior;
        mostrarCarregamento(false);
    }
}

// Configura polling periódico quando o Supabase estiver conectado com sucesso.
function configurarAtualizacaoAutomatica() {
    pararAtualizacaoAutomatica();

    if (!supabaseConfigurado() || !supabaseConectado) {
        atualizarStatusSupabase(
            supabaseConfigurado()
                ? "Supabase configurado. Teste a conexão para iniciar a atualização automática."
                : ""
        );
        return;
    }

    atualizacaoAutomaticaId = setInterval(() => {
        listarChamados({ silencioso: true });
    }, INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);

    atualizarStatusSupabase(`Atualização automática a cada ${INTERVALO_ATUALIZACAO_SEGUNDOS} segundos.`);
}

// Interrompe o polling periódico.
function pararAtualizacaoAutomatica() {
    if (atualizacaoAutomaticaId) {
        clearInterval(atualizacaoAutomaticaId);
        atualizacaoAutomaticaId = null;
    }
}

// Seleciona uma tabela para gerenciamento.
function selecionarTabela(tabela) {
    validarTabelaConhecida(tabela);
    tabelaAtual = tabela;

    document.querySelectorAll(".aba-dados").forEach((botao) => {
        botao.classList.toggle("ativa", botao.dataset.tabela === tabela);
    });

    renderizarFormularioTabela();
    renderizarTabelaGerenciamento();
}

// Renderiza o formulário de cadastro/edição da tabela selecionada.
function renderizarFormularioTabela(registro = {}) {
    const esquema = ESQUEMA_TABELAS[tabelaAtual];
    const container = document.getElementById("campos-registro");

    document.getElementById("registro-id").value = registro.id || "";
    document.getElementById("descricao-tabela").textContent = esquema.descricao;
    container.innerHTML = "";

    esquema.campos.forEach((campo) => {
        const grupo = criarCampoFormulario(campo, registro[campo.nome]);
        container.appendChild(grupo);
    });
}

// Cria dinamicamente um campo de formulário com base no esquema da tabela.
function criarCampoFormulario(campo, valor) {
    const grupo = document.createElement("div");
    const idCampo = `campo-${tabelaAtual}-${campo.nome}`;

    grupo.className = campo.tipo === "textarea" ? "campo campo-texto" : "campo";

    if (campo.tipo === "checkbox") {
        grupo.classList.add("campo-checkbox");
        const label = document.createElement("label");
        const input = document.createElement("input");

        input.type = "checkbox";
        input.id = idCampo;
        input.name = campo.nome;
        input.checked = valor === undefined ? Boolean(campo.padrao) : Boolean(valor);
        label.append(input, document.createTextNode(campo.rotulo));
        grupo.appendChild(label);
        return grupo;
    }

    const label = document.createElement("label");
    label.htmlFor = idCampo;
    label.textContent = campo.rotulo;
    grupo.appendChild(label);

    if (campo.tipo === "textarea") {
        const textarea = document.createElement("textarea");
        textarea.id = idCampo;
        textarea.name = campo.nome;
        textarea.rows = 4;
        textarea.required = Boolean(campo.obrigatorio);
        textarea.value = valor || "";
        grupo.appendChild(textarea);
        return grupo;
    }

    if (campo.tipo === "select" || campo.tipo === "relation") {
        const select = document.createElement("select");
        select.id = idCampo;
        select.name = campo.nome;
        select.required = Boolean(campo.obrigatorio);
        select.appendChild(new Option("Selecione", ""));

        if (campo.tipo === "relation") {
            dadosBanco[campo.tabela].forEach((item) => {
                select.appendChild(new Option(obterRotuloRegistro(campo.tabela, item), item.id));
            });
        } else {
            campo.opcoes.forEach((opcao) => {
                select.appendChild(new Option(opcao, opcao));
            });
        }

        select.value = valor ?? campo.padrao ?? "";
        grupo.appendChild(select);
        return grupo;
    }

    const input = document.createElement("input");
    input.id = idCampo;
    input.name = campo.nome;
    input.type = campo.tipo || "text";
    input.required = Boolean(campo.obrigatorio);
    input.value = campo.tipo === "datetime-local" ? formatarParaInputData(valor) : (valor ?? campo.padrao ?? "");
    grupo.appendChild(input);
    return grupo;
}

// Salva o registro da tabela selecionada usando insert ou update.
async function salvarRegistroTabela(evento) {
    evento.preventDefault();

    if (!supabaseConfigurado()) {
        mostrarToast("Configure o Supabase para editar os dados das tabelas.", "erro");
        return;
    }

    const form = document.getElementById("form-registro");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById("registro-id").value;
    const dados = coletarDadosFormularioTabela({ atualizar: Boolean(id) });

    mostrarCarregamento(true, id ? "Atualizando registro..." : "Criando registro...");

    try {
        if (id) {
            await atualizarRegistroSupabase(tabelaAtual, id, dados);
            mostrarToast("Registro atualizado com sucesso.", "sucesso");
        } else {
            await criarRegistroSupabase(tabelaAtual, dados);
            mostrarToast("Registro criado com sucesso.", "sucesso");
        }

        await listarChamados();
        renderizarFormularioTabela();
    } catch (erro) {
        mostrarToast(erro.message || "Erro ao salvar registro.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Coleta os dados do formulário dinâmico conforme os tipos do esquema.
function coletarDadosFormularioTabela(opcoes = {}) {
    const esquema = ESQUEMA_TABELAS[tabelaAtual];
    const formulario = document.getElementById("form-registro");
    const atualizandoRegistro = Boolean(opcoes.atualizar);
    const dados = {};

    esquema.campos.forEach((campo) => {
        const elemento = formulario.elements.namedItem(campo.nome);

        if (!elemento) {
            return;
        }

        if (campo.tipo === "checkbox") {
            dados[campo.nome] = elemento.checked;
            return;
        }

        if (campo.tipo === "relation") {
            dados[campo.nome] = elemento.value ? Number(elemento.value) : null;
            return;
        }

        if (campo.tipo === "datetime-local") {
            if (elemento.value) {
                dados[campo.nome] = new Date(elemento.value).toISOString();
            } else if (!campo.usarPadraoBanco || atualizandoRegistro) {
                dados[campo.nome] = null;
            }
            return;
        }

        dados[campo.nome] = elemento.value.trim();
    });

    return dados;
}

// Trata cliques de editar e excluir na tabela de gerenciamento.
function tratarCliqueGerenciamento(evento) {
    const botao = evento.target.closest("[data-acao]");

    if (!botao) {
        return;
    }

    const id = botao.dataset.id;

    if (botao.dataset.acao === "editar") {
        const registro = dadosBanco[tabelaAtual].find((item) => String(item.id) === String(id));
        renderizarFormularioTabela(registro || {});
        document.getElementById("dados-sistema").scrollIntoView({ behavior: "smooth" });
        return;
    }

    if (botao.dataset.acao === "excluir") {
        excluirRegistroTabela(id);
    }
}

// Exclui um registro da tabela selecionada.
async function excluirRegistroTabela(id) {
    const confirmado = confirm("Deseja excluir este registro? Registros relacionados por chave estrangeira podem impedir a exclusão.");

    if (!confirmado) {
        return;
    }

    mostrarCarregamento(true, "Excluindo registro...");

    try {
        await excluirRegistroSupabase(tabelaAtual, id);
        mostrarToast("Registro excluído com sucesso.", "sucesso");
        await listarChamados();
        renderizarFormularioTabela();
    } catch (erro) {
        mostrarToast(erro.message || "Erro ao excluir registro.", "erro");
    } finally {
        mostrarCarregamento(false);
    }
}

// Renderiza a tabela de gerenciamento da entidade selecionada.
function renderizarTabelaGerenciamento() {
    const esquema = ESQUEMA_TABELAS[tabelaAtual];
    const cabecalho = document.getElementById("cabecalho-tabela-gerenciamento");
    const corpo = document.getElementById("corpo-tabela-gerenciamento");
    const mensagem = document.getElementById("mensagem-gerenciamento");
    const registros = dadosBanco[tabelaAtual] || [];

    cabecalho.innerHTML = "";
    corpo.innerHTML = "";
    mensagem.hidden = registros.length > 0;

    const linhaCabecalho = document.createElement("tr");
    esquema.colunas.forEach((coluna) => {
        const th = document.createElement("th");
        th.textContent = obterRotuloColuna(coluna);
        linhaCabecalho.appendChild(th);
    });

    const thAcoes = document.createElement("th");
    thAcoes.textContent = "Ações";
    linhaCabecalho.appendChild(thAcoes);
    cabecalho.appendChild(linhaCabecalho);

    registros.forEach((registro) => {
        const linha = document.createElement("tr");

        esquema.colunas.forEach((coluna) => {
            adicionarCelula(linha, obterRotuloColuna(coluna), formatarValorTabela(tabelaAtual, coluna, registro[coluna]));
        });

        adicionarCelula(linha, "Ações", criarAcoesGerenciamento(registro.id));
        corpo.appendChild(linha);
    });
}

// Cria botões de edição e exclusão para o gerenciamento.
function criarAcoesGerenciamento(id) {
    const container = document.createElement("div");
    const editar = document.createElement("button");
    const excluir = document.createElement("button");

    container.className = "acoes-tabela";

    editar.type = "button";
    editar.className = "botao botao-secundario botao-acao";
    editar.textContent = "Editar";
    editar.dataset.acao = "editar";
    editar.dataset.id = id;

    excluir.type = "button";
    excluir.className = "botao botao-neutro botao-acao";
    excluir.textContent = "Excluir";
    excluir.dataset.acao = "excluir";
    excluir.dataset.id = id;

    container.append(editar, excluir);
    return container;
}

// Atualiza dashboard, lista, selects e tabela de gerenciamento depois de carregar dados.
function atualizarTelasComDadosAtuais() {
    chamados = normalizarListaChamados(dadosBanco.chamados);
    atualizarDashboard(chamados);
    renderizarSelectsChamado();
    aplicarFiltros();
    renderizarTabelaGerenciamento();
    atualizarIndicadorIntegracao();
}

// Preenche os selects de chaves estrangeiras do formulário principal de chamado.
function renderizarSelectsChamado() {
    preencherSelectRelacao("usuario-id", "usuarios", "Selecione o usuário solicitante");
    preencherSelectRelacao("setor", "setores", "Selecione o setor");
    preencherSelectRelacao("categoria", "categorias_chamado", "Selecione a categoria");
}

// Preenche um select usando uma tabela de referência.
function preencherSelectRelacao(idSelect, tabela, textoVazio) {
    const select = document.getElementById(idSelect);
    const valorAtual = select.value;

    select.innerHTML = "";
    select.appendChild(new Option(dadosBanco[tabela].length ? textoVazio : "Conecte o Supabase para carregar opções", ""));

    dadosBanco[tabela].forEach((item) => {
        select.appendChild(new Option(obterRotuloRegistro(tabela, item), item.id));
    });

    if (valorAtual && Array.from(select.options).some((opcao) => opcao.value === valorAtual)) {
        select.value = valorAtual;
    }
}

// Mostra uma nova mensagem no chat manual.
function mostrarMensagemChat(tipo, texto) {
    const areaMensagens = document.getElementById("chat-mensagens");
    const mensagem = document.createElement("div");

    mensagem.className = `mensagem-chat mensagem-${tipo}`;
    mensagem.textContent = texto;

    areaMensagens.appendChild(mensagem);
    areaMensagens.scrollTop = areaMensagens.scrollHeight;
}

// Exibe notificações rápidas de sucesso, erro, informação ou carregamento.
function mostrarToast(mensagem, tipo = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");

    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.setAttribute("role", tipo === "erro" ? "alert" : "status");

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5200);
}

// Lê a resposta do n8n e mostra erro claro quando o retorno não for JSON.
async function lerRespostaN8N(resposta) {
    const tipoConteudo = resposta.headers.get("content-type") || "";
    const corpoTexto = await resposta.text();

    if (!resposta.ok) {
        throw new Error(`O n8n respondeu com HTTP ${resposta.status}. Verifique se a URL é de produção e se o workflow está ativo.`);
    }

    if (tipoConteudo.includes("application/json")) {
        return corpoTexto ? JSON.parse(corpoTexto) : {};
    }

    try {
        return corpoTexto ? JSON.parse(corpoTexto) : {};
    } catch (erro) {
        throw new Error("O endpoint respondeu, mas não retornou JSON. Verifique se a URL pertence ao Webhook JSON da central.");
    }
}

// Lê a resposta do Supabase REST e converte erros em mensagens úteis.
async function lerRespostaSupabase(resposta) {
    const corpoTexto = await resposta.text();
    let corpo = null;

    if (corpoTexto) {
        try {
            corpo = JSON.parse(corpoTexto);
        } catch (erro) {
            corpo = corpoTexto;
        }
    }

    if (!resposta.ok) {
        const mensagem = corpo?.message || corpo?.hint || corpoTexto || `HTTP ${resposta.status}`;
        throw new Error(`Erro Supabase: ${mensagem}`);
    }

    return corpo || [];
}

// Aplica os filtros de status, prioridade e busca textual sobre os chamados carregados.
function aplicarFiltros() {
    const status = document.getElementById("filtro-status").value;
    const prioridade = document.getElementById("filtro-prioridade").value;
    const busca = normalizarTexto(document.getElementById("filtro-busca").value);

    const chamadosFiltrados = chamados.filter((chamado) => {
        const atendeStatus = !status || chamado.status === status;
        const atendePrioridade = !prioridade || chamado.prioridade === prioridade;
        const textoBusca = normalizarTexto(`${chamado.titulo} ${obterRotuloRelacao("usuarios", chamado.usuario_id)} ${chamado.nome_solicitante || ""}`);
        const atendeBusca = !busca || textoBusca.includes(busca);

        return atendeStatus && atendePrioridade && atendeBusca;
    });

    renderizarChamados(chamadosFiltrados);
}

// Renderiza a tabela de chamados com botões de atualização de status.
function renderizarChamados(listaChamados) {
    const corpoTabela = document.getElementById("corpo-tabela-chamados");
    const mensagemLista = document.getElementById("mensagem-lista");

    corpoTabela.innerHTML = "";
    mensagemLista.hidden = listaChamados.length > 0;

    if (listaChamados.length === 0) {
        mensagemLista.textContent = obterFonteDados()
            ? "Nenhum chamado encontrado para os filtros selecionados."
            : "Nenhum chamado carregado. Configure uma fonte real de dados em n8n ou Supabase.";
    }

    listaChamados.forEach((chamado) => {
        const linha = document.createElement("tr");

        adicionarCelula(linha, "ID", chamado.id);
        adicionarCelula(linha, "Título", chamado.titulo, "titulo-chamado");
        adicionarCelula(linha, "Solicitante", chamado.nome_solicitante || obterRotuloRelacao("usuarios", chamado.usuario_id));
        adicionarCelula(linha, "Setor", chamado.setor || obterRotuloRelacao("setores", chamado.setor_id));
        adicionarCelula(linha, "Categoria", chamado.categoria || obterRotuloRelacao("categorias_chamado", chamado.categoria_id));
        adicionarCelula(linha, "Prioridade", criarEtiqueta(chamado.prioridade, `prioridade-${classeTexto(chamado.prioridade)}`));
        adicionarCelula(linha, "Status", criarEtiqueta(chamado.status, `status-${classeTexto(chamado.status)}`));
        adicionarCelula(linha, "Abertura", formatarData(chamado.data_abertura));
        adicionarCelula(linha, "Ações", criarAcoesTabela(chamado));

        corpoTabela.appendChild(linha);
    });
}

// Atualiza os cards do dashboard a partir da lista atual.
function atualizarDashboard(listaChamados) {
    const total = listaChamados.length;
    const abertos = contarPorCampo(listaChamados, "status", "Aberto");
    const emAnalise = contarPorCampo(listaChamados, "status", "Em análise");
    const resolvidos = contarPorCampo(listaChamados, "status", "Resolvido");
    const criticos = contarPorCampo(listaChamados, "prioridade", "Crítica");

    document.getElementById("card-total").textContent = total;
    document.getElementById("card-abertos").textContent = abertos;
    document.getElementById("card-analise").textContent = emAnalise;
    document.getElementById("card-resolvidos").textContent = resolvidos;
    document.getElementById("card-criticos").textContent = criticos;
}

// Trata cliques nos botões de status da tabela usando delegação de eventos.
function tratarCliqueTabela(evento) {
    const botao = evento.target.closest("[data-status]");

    if (!botao) {
        return;
    }

    atualizarStatusChamado(botao.dataset.id, botao.dataset.status);
}

// Cria botões de ação para cada chamado.
function criarAcoesTabela(chamado) {
    const container = document.createElement("div");
    const botaoAnalise = document.createElement("button");
    const botaoResolvido = document.createElement("button");

    container.className = "acoes-tabela";

    botaoAnalise.type = "button";
    botaoAnalise.className = "botao botao-secundario botao-acao";
    botaoAnalise.textContent = "Marcar como em análise";
    botaoAnalise.dataset.id = chamado.id;
    botaoAnalise.dataset.status = "Em análise";
    botaoAnalise.disabled = chamado.status === "Em análise" || chamado.status === "Resolvido";

    botaoResolvido.type = "button";
    botaoResolvido.className = "botao botao-primario botao-acao";
    botaoResolvido.textContent = "Marcar como resolvido";
    botaoResolvido.dataset.id = chamado.id;
    botaoResolvido.dataset.status = "Resolvido";
    botaoResolvido.disabled = chamado.status === "Resolvido";

    container.append(botaoAnalise, botaoResolvido);
    return container;
}

// Adiciona uma célula na tabela, aceitando texto simples ou elementos HTML seguros.
function adicionarCelula(linha, rotulo, conteudo, classeExtra = "") {
    const celula = document.createElement("td");

    celula.dataset.label = rotulo;

    if (classeExtra) {
        celula.classList.add(classeExtra);
    }

    if (conteudo instanceof Node) {
        celula.appendChild(conteudo);
    } else {
        celula.textContent = conteudo ?? "";
    }

    linha.appendChild(celula);
}

// Cria uma etiqueta visual para status e prioridade.
function criarEtiqueta(texto, classe) {
    const etiqueta = document.createElement("span");

    etiqueta.className = `etiqueta ${classe}`;
    etiqueta.textContent = texto || "";

    return etiqueta;
}

// Normaliza diferentes formatos possíveis de resposta do n8n ou Supabase para uma lista de chamados.
function normalizarListaChamados(resposta = {}) {
    resposta = resposta || {};

    const origem = Array.isArray(resposta)
        ? resposta
        : resposta.chamados || resposta.dados || resposta.data || [];

    return origem.map((item) => ({
        id: item.id || item.id_chamado || item.chamado_id,
        usuario_id: item.usuario_id || item.usuario?.id,
        setor_id: item.setor_id || item.setor?.id,
        categoria_id: item.categoria_id || item.categoria?.id,
        titulo: item.titulo || "Sem título",
        nome_solicitante: item.nome_solicitante || item.solicitante || item.usuario?.nome || "",
        email_solicitante: item.email_solicitante || item.email || item.usuario?.email || "",
        setor: typeof item.setor === "string" ? item.setor : item.setor?.nome,
        categoria: typeof item.categoria === "string" ? item.categoria : item.categoria?.nome,
        prioridade: item.prioridade || "Baixa",
        status: item.status || "Aberto",
        data_abertura: item.data_abertura || item.criado_em || item.created_at || item.createdAt || "",
        data_atualizacao: item.data_atualizacao || "",
        descricao: item.descricao || ""
    }));
}

// Conta quantos registros possuem determinado valor em um campo.
function contarPorCampo(lista, campo, valor) {
    return lista.filter((item) => item[campo] === valor).length;
}

// Informa qual fonte real de dados deve ser usada.
function obterFonteDados() {
    if (supabaseConfigurado()) {
        return "supabase";
    }

    if (N8N_WEBHOOK_URL) {
        return "n8n";
    }

    return "";
}

// Verifica se os dados mínimos do Supabase estão configurados.
function supabaseConfigurado() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Atualiza texto auxiliar da área de Supabase.
function atualizarStatusSupabase(texto = "") {
    const elemento = document.getElementById("supabase-status");

    if (!elemento) {
        return;
    }

    if (texto) {
        elemento.textContent = texto;
        return;
    }

    elemento.textContent = supabaseConfigurado()
        ? "Supabase configurado. Teste a conexão para carregar as tabelas e iniciar a atualização automática."
        : "Supabase não configurado.";
}

// Exibe ou oculta a mensagem geral de carregamento.
function mostrarCarregamento(exibir, mensagem = "Processando solicitação...") {
    const elemento = document.getElementById("estado-carregando");

    elemento.textContent = mensagem;
    elemento.hidden = !exibir;
}

// Valida se a URL informada possui protocolo http ou https.
function urlValida(valor) {
    try {
        const url = new URL(valor);
        return ["http:", "https:"].includes(url.protocol);
    } catch (erro) {
        return false;
    }
}

// Identifica URLs que parecem ser do chat externo do n8n, não do Webhook JSON da central.
function urlPareceChatExternoN8N(valor) {
    try {
        const url = new URL(valor);
        const caminho = url.pathname.replace(/\/+$/, "").toLowerCase();

        return url.hostname.includes("n8n") && caminho.endsWith("/chat");
    } catch (erro) {
        return false;
    }
}

// Rejeita chaves administrativas service_role, que nunca devem ficar no front-end.
function chaveSupabasePareceServiceRole(chave) {
    if (chave.toLowerCase().includes("service_role")) {
        return true;
    }

    const partes = chave.split(".");

    if (partes.length < 2) {
        return false;
    }

    try {
        const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
        const base64ComPadding = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const payload = JSON.parse(atob(base64ComPadding));
        return payload.role === "service_role";
    } catch (erro) {
        return false;
    }
}

// Garante um intervalo razoável para polling.
function intervaloValido(valor) {
    return Number.isFinite(valor) && valor >= 5 && valor <= 3600;
}

// Remove barra final de URLs para montar endpoints REST corretamente.
function removerBarraFinal(valor) {
    return valor.replace(/\/+$/, "");
}

// Garante que a tabela pertence ao modelo extraído do documento.
function validarTabelaConhecida(tabela) {
    if (!ESQUEMA_TABELAS[tabela]) {
        throw new Error("Tabela não reconhecida no modelo do projeto.");
    }
}

// Remove todos os dados carregados da memória.
function limparDadosBanco() {
    Object.keys(dadosBanco).forEach((tabela) => {
        dadosBanco[tabela] = [];
    });
}

// Retorna o rótulo amigável de um registro relacionado.
function obterRotuloRelacao(tabela, id) {
    const registro = dadosBanco[tabela]?.find((item) => String(item.id) === String(id));
    return registro ? obterRotuloRegistro(tabela, registro) : (id ? `ID ${id}` : "Não informado");
}

// Retorna a melhor descrição textual de cada registro.
function obterRotuloRegistro(tabela, registro) {
    if (!registro) {
        return "Não informado";
    }

    if (tabela === "chamados") {
        return `#${registro.id} - ${registro.titulo || "Sem título"}`;
    }

    if (tabela === "base_conhecimento") {
        return registro.pergunta || `ID ${registro.id}`;
    }

    return registro.nome || registro.titulo || registro.acao || `ID ${registro.id}`;
}

// Formata valores de tabela, resolvendo chaves estrangeiras quando necessário.
function formatarValorTabela(tabela, coluna, valor) {
    const campo = ESQUEMA_TABELAS[tabela].campos.find((item) => item.nome === coluna);

    if (campo?.tipo === "relation") {
        return obterRotuloRelacao(campo.tabela, valor);
    }

    if (typeof valor === "boolean") {
        return valor ? "Sim" : "Não";
    }

    if (coluna.includes("data")) {
        return formatarData(valor);
    }

    return valor ?? "";
}

// Converte nomes técnicos de colunas em rótulos legíveis.
function obterRotuloColuna(coluna) {
    const nomes = {
        id: "ID",
        usuario_id: "Usuário",
        setor_id: "Setor",
        categoria_id: "Categoria",
        chamado_id: "Chamado",
        titulo: "Título",
        descricao: "Descrição",
        prioridade: "Prioridade",
        status: "Status",
        pergunta: "Pergunta",
        resposta: "Resposta",
        ativo: "Ativo",
        perfil: "Perfil",
        telefone: "Telefone",
        responsavel: "Responsável",
        data_criacao: "Data de criação",
        data_abertura: "Data de abertura",
        data_atualizacao: "Data de atualização",
        data_registro: "Data de registro"
    };

    return nomes[coluna] || coluna.replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
}

// Remove acentos e padroniza texto para buscas e comparações.
function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Converte textos como "Em análise" para classes CSS como "em-analise".
function classeTexto(texto) {
    return normalizarTexto(texto).replace(/\s+/g, "-");
}

// Formata datas ISO para o padrão brasileiro.
function formatarData(valor) {
    if (!valor) {
        return "Não informada";
    }

    const textoData = String(valor);
    const data = /^\d{4}-\d{2}-\d{2}$/.test(textoData)
        ? new Date(`${textoData}T00:00:00`)
        : new Date(textoData);

    if (Number.isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleString("pt-BR");
}

// Formata data para input datetime-local.
function formatarParaInputData(valor) {
    if (!valor) {
        return "";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

// Destaca visualmente o link de navegação selecionado.
function destacarLinkMenu(linkSelecionado) {
    document.querySelectorAll(".link-menu").forEach((link) => {
        link.classList.remove("ativo");
    });

    linkSelecionado.classList.add("ativo");
}
