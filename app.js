const LOCAL_KEY = "pollar-alunos-v3";

let alunos = [];
let supabaseClient = null;
let onlineReady = false;

const el = {
  connectionStatus: document.querySelector("#connectionStatus"),
  setupPanel: document.querySelector("#setupPanel"),
  studentForm: document.querySelector("#studentForm"),
  studentName: document.querySelector("#studentName"),
  studentSeries: document.querySelector("#studentSeries"),
  studentClass: document.querySelector("#studentClass"),
  filterName: document.querySelector("#filterName"),
  filterSeries: document.querySelector("#filterSeries"),
  filterClass: document.querySelector("#filterClass"),
  refreshData: document.querySelector("#refreshData"),
  studentRows: document.querySelector("#studentRows"),
  studentSummary: document.querySelector("#studentSummary"),
  toast: document.querySelector("#toast"),
};

function gerarId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function formatarSaldo(valor) {
  return `P$ ${Number(valor || 0).toLocaleString("pt-BR")}`;
}

function normalizarTurma(valor) {
  return valor.trim().toUpperCase();
}

function mostrarAviso(texto) {
  el.toast.textContent = texto;
  el.toast.classList.add("show");
  window.clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = window.setTimeout(() => el.toast.classList.remove("show"), 2600);
}

function atualizarStatus(texto, tipo = "") {
  el.connectionStatus.textContent = texto;
  el.connectionStatus.className = `status-bar ${tipo}`.trim();
}

function temConfiguracaoSupabase() {
  return Boolean(
    window.POLLAR_SUPABASE_URL &&
      window.POLLAR_SUPABASE_ANON_KEY &&
      !window.POLLAR_SUPABASE_URL.includes("SEU-PROJETO") &&
      !window.POLLAR_SUPABASE_ANON_KEY.includes("SUA-CHAVE"),
  );
}

function carregarLocal() {
  try {
    alunos = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    alunos = [];
  }
}

function salvarLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(alunos));
}

function paraBanco(aluno) {
  return {
    id: aluno.id,
    name: aluno.nome,
    series: aluno.serie,
    class_name: aluno.turma,
    balance: aluno.saldo,
    updated_at: new Date().toISOString(),
  };
}

function doBanco(registro) {
  return {
    id: registro.id,
    nome: registro.name,
    serie: registro.series,
    turma: registro.class_name,
    saldo: Number(registro.balance || 0),
  };
}

async function iniciarBanco() {
  if (!temConfiguracaoSupabase() || !window.supabase) {
    onlineReady = false;
    el.setupPanel.hidden = false;
    atualizarStatus("Modo local: configure o Supabase para uso por vários professores.", "local");
    carregarLocal();
    renderizar();
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(window.POLLAR_SUPABASE_URL, window.POLLAR_SUPABASE_ANON_KEY);
    onlineReady = true;
    el.setupPanel.hidden = true;
    atualizarStatus("Banco online conectado.");
    await carregarAlunos();

    supabaseClient
      .channel("pollar-students")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, carregarAlunos)
      .subscribe();
  } catch {
    onlineReady = false;
    atualizarStatus("Falha no banco online. Usando modo local.", "error");
    carregarLocal();
    renderizar();
  }
}

async function carregarAlunos() {
  if (!onlineReady) {
    carregarLocal();
    renderizar();
    return;
  }

  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("series", { ascending: true })
    .order("class_name", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    atualizarStatus("Erro ao carregar alunos. Confira a tabela no Supabase.", "error");
    mostrarAviso("Não consegui carregar os alunos do banco online.");
    return;
  }

  alunos = data.map(doBanco);
  salvarLocal();
  renderizar();
}

async function salvarAluno(aluno) {
  if (!onlineReady) {
    const posicao = alunos.findIndex((item) => item.id === aluno.id);
    if (posicao >= 0) alunos[posicao] = aluno;
    else alunos.push(aluno);
    salvarLocal();
    renderizar();
    return true;
  }

  const { error } = await supabaseClient.from("students").upsert(paraBanco(aluno));
  if (error) {
    mostrarAviso("Não foi possível salvar no banco online.");
    return false;
  }

  await carregarAlunos();
  return true;
}

async function removerAluno(id) {
  const aluno = alunos.find((item) => item.id === id);
  if (!aluno || !confirm(`Remover ${aluno.nome}?`)) return;

  if (!onlineReady) {
    alunos = alunos.filter((item) => item.id !== id);
    salvarLocal();
    renderizar();
    mostrarAviso("Aluno removido.");
    return;
  }

  const { error } = await supabaseClient.from("students").delete().eq("id", id);
  if (error) {
    mostrarAviso("Não foi possível remover o aluno.");
    return;
  }

  await carregarAlunos();
  mostrarAviso("Aluno removido.");
}

function alunosFiltrados() {
  const nome = el.filterName.value.trim().toLowerCase();
  const serie = el.filterSeries.value;
  const turma = el.filterClass.value;

  return [...alunos]
    .filter((aluno) => !nome || aluno.nome.toLowerCase().includes(nome))
    .filter((aluno) => !serie || aluno.serie === serie)
    .filter((aluno) => !turma || aluno.turma === turma)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function renderizarFiltroTurma() {
  const atual = el.filterClass.value;
  const turmas = [...new Set(alunos.map((aluno) => aluno.turma))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  el.filterClass.innerHTML = `<option value="">Todas</option>${turmas.map((turma) => `<option value="${turma}">${turma}</option>`).join("")}`;
  if (turmas.includes(atual)) el.filterClass.value = atual;
}

function renderizarTabela() {
  const lista = alunosFiltrados();
  el.studentSummary.textContent = `${lista.length} ${lista.length === 1 ? "aluno" : "alunos"}`;

  if (!lista.length) {
    el.studentRows.innerHTML = `<tr><td class="empty-cell" colspan="5">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  el.studentRows.innerHTML = lista
    .map(
      (aluno) => `
        <tr>
          <td>
            <div class="student-name">
              <button class="remove-button" type="button" data-remove="${aluno.id}" title="Remover aluno">×</button>
              <span>${aluno.nome}</span>
            </div>
          </td>
          <td><span class="badge">${aluno.serie}</span></td>
          <td><span class="badge">${aluno.turma}</span></td>
          <td class="balance">${formatarSaldo(aluno.saldo)}</td>
          <td>
            <div class="action-cell">
              <input class="amount-input" id="valor-${aluno.id}" type="number" min="1" step="1" placeholder="Qtd" />
              <button class="btn-add" type="button" data-add="${aluno.id}">+</button>
              <button class="btn-sub" type="button" data-subtract="${aluno.id}">-</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  el.studentRows.querySelectorAll("[data-remove]").forEach((botao) => {
    botao.addEventListener("click", () => removerAluno(botao.dataset.remove));
  });

  el.studentRows.querySelectorAll("[data-add]").forEach((botao) => {
    botao.addEventListener("click", () => alterarSaldo(botao.dataset.add, "somar"));
  });

  el.studentRows.querySelectorAll("[data-subtract]").forEach((botao) => {
    botao.addEventListener("click", () => alterarSaldo(botao.dataset.subtract, "subtrair"));
  });
}

function renderizar() {
  renderizarFiltroTurma();
  renderizarTabela();
}

async function alterarSaldo(id, operacao) {
  const campoValor = document.querySelector(`#valor-${CSS.escape(id)}`);
  const valor = Number(campoValor.value);
  const aluno = alunos.find((item) => item.id === id);

  if (!aluno) return;

  if (!valor || valor <= 0) {
    mostrarAviso("Digite uma quantidade maior que zero.");
    return;
  }

  if (operacao === "somar") {
    aluno.saldo += valor;
  } else {
    aluno.saldo = Math.max(0, aluno.saldo - valor);
  }

  campoValor.value = "";
  const salvo = await salvarAluno(aluno);
  if (salvo) mostrarAviso("Saldo atualizado.");
}

el.studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = el.studentName.value.trim();
  const serie = el.studentSeries.value;
  const turma = normalizarTurma(el.studentClass.value);

  if (!nome || !serie || !turma) {
    mostrarAviso("Preencha nome, série e turma.");
    return;
  }

  const aluno = {
    id: gerarId(),
    nome,
    serie,
    turma,
    saldo: 0,
  };

  const salvo = await salvarAluno(aluno);
  if (!salvo) return;

  el.studentName.value = "";
  el.studentClass.value = "";
  el.studentName.focus();
  mostrarAviso("Aluno cadastrado.");
});

el.filterName.addEventListener("input", renderizarTabela);
el.filterSeries.addEventListener("change", renderizarTabela);
el.filterClass.addEventListener("change", renderizarTabela);
el.refreshData.addEventListener("click", carregarAlunos);

iniciarBanco();
