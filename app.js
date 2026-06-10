const LOCAL_KEY = "pollar-simplificado-v2";

let supabaseClient = null;
let students = [];
let onlineReady = false;

const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  filterSeries: document.querySelector("#filterSeries"),
  filterClass: document.querySelector("#filterClass"),
  filterName: document.querySelector("#filterName"),
  refreshData: document.querySelector("#refreshData"),
  studentForm: document.querySelector("#studentForm"),
  studentName: document.querySelector("#studentName"),
  studentSeries: document.querySelector("#studentSeries"),
  studentClass: document.querySelector("#studentClass"),
  studentBalance: document.querySelector("#studentBalance"),
  bulkStudents: document.querySelector("#bulkStudents"),
  importStudents: document.querySelector("#importStudents"),
  balanceForm: document.querySelector("#balanceForm"),
  balanceStudent: document.querySelector("#balanceStudent"),
  balanceOperation: document.querySelector("#balanceOperation"),
  balanceValue: document.querySelector("#balanceValue"),
  teacherName: document.querySelector("#teacherName"),
  studentRows: document.querySelector("#studentRows"),
  studentCount: document.querySelector("#studentCount"),
  totalBalance: document.querySelector("#totalBalance"),
  setupPanel: document.querySelector("#setupPanel"),
  toast: document.querySelector("#toast"),
};

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function money(value) {
  return `${Number(value || 0).toLocaleString("pt-BR")} P$`;
}

function normalizeClass(value) {
  return value.trim().toUpperCase();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function setStatus(message, type = "") {
  els.connectionStatus.textContent = message;
  els.connectionStatus.className = `connection-card ${type}`.trim();
}

function loadLocal() {
  try {
    students = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    students = [];
  }
}

function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(students));
}

function hasSupabaseConfig() {
  return Boolean(
    window.POLLAR_SUPABASE_URL &&
      window.POLLAR_SUPABASE_ANON_KEY &&
      !window.POLLAR_SUPABASE_URL.includes("SEU-PROJETO") &&
      !window.POLLAR_SUPABASE_ANON_KEY.includes("SUA-CHAVE"),
  );
}

async function setupOnlineDatabase() {
  if (!hasSupabaseConfig() || !window.supabase) {
    onlineReady = false;
    els.setupPanel.hidden = false;
    setStatus("Modo local: configure o Supabase", "offline");
    loadLocal();
    render();
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(window.POLLAR_SUPABASE_URL, window.POLLAR_SUPABASE_ANON_KEY);
    onlineReady = true;
    els.setupPanel.hidden = true;
    setStatus("Banco online conectado");
    await loadStudents();
    listenOnlineChanges();
  } catch {
    onlineReady = false;
    setStatus("Falha ao conectar. Usando modo local.", "error");
    loadLocal();
    render();
  }
}

async function loadStudents() {
  if (!onlineReady) {
    loadLocal();
    render();
    return;
  }

  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("series", { ascending: true })
    .order("class_name", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    setStatus("Erro ao carregar dados online", "error");
    showToast("Verifique se a tabela students foi criada no Supabase.");
    return;
  }

  students = data.map(fromDatabaseStudent);
  saveLocal();
  render();
}

function listenOnlineChanges() {
  supabaseClient
    .channel("students-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "students" }, loadStudents)
    .subscribe();
}

function toDatabaseStudent(student) {
  return {
    id: student.id,
    name: student.name,
    series: student.series,
    class_name: student.className,
    balance: student.balance,
    updated_by: student.updatedBy || "",
    updated_at: new Date().toISOString(),
  };
}

function fromDatabaseStudent(student) {
  return {
    id: student.id,
    name: student.name,
    series: student.series,
    className: student.class_name,
    balance: Number(student.balance || 0),
    updatedBy: student.updated_by || "",
    updatedAt: student.updated_at || "",
  };
}

async function saveStudent(student) {
  if (!onlineReady) {
    const index = students.findIndex((item) => item.id === student.id);
    if (index >= 0) students[index] = student;
    else students.push(student);
    saveLocal();
    render();
    return;
  }

  const { error } = await supabaseClient.from("students").upsert(toDatabaseStudent(student));
  if (error) {
    showToast("Não foi possível salvar no banco online.");
    return;
  }
  await loadStudents();
}

async function deleteStudent(id) {
  if (!confirm("Remover este aluno?")) return;

  if (!onlineReady) {
    students = students.filter((student) => student.id !== id);
    saveLocal();
    render();
    return;
  }

  const { error } = await supabaseClient.from("students").delete().eq("id", id);
  if (error) {
    showToast("Não foi possível remover o aluno.");
    return;
  }
  await loadStudents();
}

function filteredStudents() {
  const series = els.filterSeries.value;
  const className = els.filterClass.value;
  const name = els.filterName.value.trim().toLowerCase();

  return students
    .filter((student) => !series || student.series === series)
    .filter((student) => !className || student.className === className)
    .filter((student) => !name || student.name.toLowerCase().includes(name))
    .sort((a, b) => a.series.localeCompare(b.series, "pt-BR") || a.className.localeCompare(b.className, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));
}

function renderClassFilter() {
  const current = els.filterClass.value;
  const classes = [...new Set(students.map((student) => student.className))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  els.filterClass.innerHTML = `<option value="">Todas</option>${classes.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  if (classes.includes(current)) els.filterClass.value = current;
}

function renderBalanceStudentOptions() {
  const list = filteredStudents();
  els.balanceStudent.innerHTML = list.length
    ? list.map((student) => `<option value="${student.id}">${student.name} - ${student.series} ${student.className} - ${money(student.balance)}</option>`).join("")
    : `<option value="">Nenhum aluno encontrado</option>`;
}

function renderRows() {
  const list = filteredStudents();
  els.studentRows.innerHTML = list.length
    ? list
        .map(
          (student) => `
            <tr>
              <td><strong>${student.name}</strong></td>
              <td>${student.series}</td>
              <td>${student.className}</td>
              <td><span class="balance-pill">${money(student.balance)}</span></td>
              <td>
                <div class="row-actions">
                  <button class="secondary-button" type="button" data-fill="${student.id}">Selecionar</button>
                  <button class="danger-button" type="button" data-delete="${student.id}">Remover</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="5"><div class="empty">Nenhum aluno encontrado.</div></td></tr>`;

  els.studentRows.querySelectorAll("[data-fill]").forEach((button) => {
    button.addEventListener("click", () => {
      els.balanceStudent.value = button.dataset.fill;
      els.balanceValue.focus();
    });
  });

  els.studentRows.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteStudent(button.dataset.delete));
  });
}

function renderSummary() {
  const list = filteredStudents();
  const total = list.reduce((sum, student) => sum + Number(student.balance || 0), 0);
  els.studentCount.textContent = `${list.length} ${list.length === 1 ? "aluno" : "alunos"}`;
  els.totalBalance.textContent = money(total);
}

function render() {
  renderClassFilter();
  renderBalanceStudentOptions();
  renderRows();
  renderSummary();
}

els.studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const student = {
    id: makeId(),
    name: els.studentName.value.trim(),
    series: els.studentSeries.value,
    className: normalizeClass(els.studentClass.value),
    balance: Number(els.studentBalance.value || 0),
    updatedBy: els.teacherName.value.trim(),
  };

  if (!student.name || !student.className) {
    showToast("Preencha nome, série e turma.");
    return;
  }

  await saveStudent(student);
  els.studentForm.reset();
  els.studentBalance.value = 0;
  showToast("Aluno salvo.");
});

els.importStudents.addEventListener("click", async () => {
  const lines = els.bulkStudents.value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let count = 0;

  for (const line of lines) {
    const [name, series = els.studentSeries.value, className = els.studentClass.value || "A"] = line.split(";").map((part) => part.trim());
    if (!name) continue;
    await saveStudent({
      id: makeId(),
      name,
      series,
      className: normalizeClass(className),
      balance: 0,
      updatedBy: els.teacherName.value.trim(),
    });
    count += 1;
  }

  els.bulkStudents.value = "";
  await loadStudents();
  showToast(`${count} alunos importados.`);
});

els.balanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const student = students.find((item) => item.id === els.balanceStudent.value);
  const value = Number(els.balanceValue.value || 0);

  if (!student) {
    showToast("Selecione um aluno.");
    return;
  }

  if (els.balanceOperation.value === "add") student.balance += value;
  if (els.balanceOperation.value === "subtract") student.balance = Math.max(0, student.balance - value);
  if (els.balanceOperation.value === "set") student.balance = value;

  student.updatedBy = els.teacherName.value.trim();
  student.updatedAt = new Date().toISOString();

  await saveStudent(student);
  showToast("Saldo atualizado.");
});

els.filterSeries.addEventListener("change", render);
els.filterClass.addEventListener("change", render);
els.filterName.addEventListener("input", render);
els.refreshData.addEventListener("click", loadStudents);

setupOnlineDatabase();
