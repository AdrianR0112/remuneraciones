(() => {
  "use strict";

  if (document.body.dataset.page !== "remuneraciones") return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const roles = [
    { area: "Dirección", role: "Gerencia General", band: "E", workers: 1, salary: 2200 },
    { area: "Producto y Tecnología", role: "Dirección de Tecnología", band: "L3", workers: 1, salary: 1700 },
    { area: "Producto y Tecnología", role: "Ingeniería Backend", band: "L2", workers: 2, salary: 1200 },
    { area: "Producto y Tecnología", role: "Ingeniería Frontend", band: "L2", workers: 2, salary: 1150 },
    { area: "Producto y Tecnología", role: "DevOps e Infraestructura", band: "L2", workers: 1, salary: 1250 },
    { area: "Producto y Tecnología", role: "QA y Automatización", band: "L1", workers: 1, salary: 850 },
    { area: "Producto y Tecnología", role: "Gestión de Producto", band: "L2", workers: 1, salary: 1200 },
    { area: "Producto y Tecnología", role: "Diseño UX/UI", band: "L1", workers: 1, salary: 850 },
    { area: "Operaciones y Clientes", role: "Jefatura de Operaciones", band: "L3", workers: 1, salary: 1400 },
    { area: "Operaciones y Clientes", role: "Especialista de Implementación", band: "L1", workers: 2, salary: 750 },
    { area: "Operaciones y Clientes", role: "Soporte al Cliente", band: "O", workers: 2, salary: 600 },
    { area: "Comercial y Marketing", role: "Jefatura Comercial y Marketing", band: "L3", workers: 1, salary: 1400 },
    { area: "Comercial y Marketing", role: "Ejecutivo Comercial", band: "L1", workers: 2, salary: 800 },
    { area: "Comercial y Marketing", role: "Marketing Digital", band: "L1", workers: 1, salary: 750 },
    { area: "Administración y Personas", role: "Jefatura Administrativa y Financiera", band: "L3", workers: 1, salary: 1350 },
    { area: "Administración y Personas", role: "Analista Contable y Administrativo", band: "L1", workers: 1, salary: 750 },
    { area: "Administración y Personas", role: "Analista de Talento Humano", band: "L1", workers: 1, salary: 750 }
  ];
  const bands = {
    E: { min: 1800, midpoint: 2200, max: 2600 },
    L3: { min: 1300, midpoint: 1550, max: 1800 },
    L2: { min: 950, midpoint: 1150, max: 1350 },
    L1: { min: 650, midpoint: 800, max: 950 },
    O: { min: 482, midpoint: 575, max: 650 }
  };

  const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 });
  const payrollBody = $("#payroll-body");
  const exampleSelect = $("#example-role");
  const downloadButton = $("#download-excel");

  function renderRows() {
    payrollBody.innerHTML = roles.map((item, index) => `
      <tr data-index="${index}" data-role="${item.role}" data-band="${item.band}">
        <th scope="row"><span>${item.role}</span><small>${item.area}</small></th>
        <td><span class="band-chip">${item.band}</span></td>
        <td><input class="workers-input" aria-label="Trabajadores en ${item.role}" type="number" min="0" max="100" step="1" value="${item.workers}" data-default="${item.workers}" inputmode="numeric"></td>
        <td><span class="money-input"><b>$</b><input class="salary-input" aria-label="Sueldo de ${item.role}" type="number" min="482" max="10000" step="10" value="${item.salary}" data-default="${item.salary}" inputmode="decimal"></span></td>
        <td data-output="personal">—</td><td data-output="employer">—</td><td data-output="thirteenth">—</td><td data-output="fourteenth">—</td><td class="cost-cell" data-output="cost">—</td>
      </tr>`).join("");
    exampleSelect.innerHTML = roles.map((item, index) => `<option value="${index}">${item.role}</option>`).join("");
  }

  renderRows();
  const rows = $$("#payroll-body tr");
  const ratePersonalInput = $("#rate-personal");
  const rateEmployerInput = $("#rate-employer");
  const sbuInput = $("#sbu");
  const revenueInput = $("#revenue-per-client");

  function readNumber(input, { min, max, integer = false }) {
    const raw = input.value.trim();
    const parsed = Number(raw);
    const valid = raw !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max && (!integer || Number.isInteger(parsed));
    input.toggleAttribute("aria-invalid", !valid);
    return { valid, value: valid ? parsed : 0 };
  }

  function getAssumptions() {
    const personal = readNumber(ratePersonalInput, { min: 0, max: 100 });
    const employer = readNumber(rateEmployerInput, { min: 0, max: 100 });
    const sbu = readNumber(sbuInput, { min: 1, max: 10000 });
    return { valid: personal.valid && employer.valid && sbu.valid, personalRate: personal.value / 100, employerRate: employer.value / 100, sbu: sbu.value };
  }

  function calculateRow(row, assumptions) {
    const workersInput = $(".workers-input", row);
    const salaryInput = $(".salary-input", row);
    const workersResult = readNumber(workersInput, { min: 0, max: 100, integer: true });
    const salaryResult = readNumber(salaryInput, { min: assumptions.sbu || 1, max: 10000 });
    const valid = assumptions.valid && workersResult.valid && salaryResult.valid;
    const workers = workersResult.value;
    const salary = salaryResult.value;
    const totalSalary = workers * salary;
    const personal = totalSalary * assumptions.personalRate;
    const employer = totalSalary * assumptions.employerRate;
    const thirteenth = totalSalary / 12;
    const fourteenth = workers * assumptions.sbu / 12;
    const cost = totalSalary + employer + thirteenth + fourteenth;
    return { valid, workers, salary, totalSalary, personal, employer, thirteenth, fourteenth, cost };
  }

  function setMoney(row, output, value, valid) {
    const cell = row.querySelector(`[data-output="${output}"]`);
    cell.textContent = valid ? currency.format(value) : "Revise dato";
  }

  function setFormulaState(valid) {
    ["formula-personal", "formula-employer", "formula-thirteenth", "formula-fourteenth", "formula-cost", "example-personal", "example-employer", "example-thirteenth", "example-fourteenth", "example-cost"].forEach((id) => { $(`#${id}`).textContent = valid ? $(`#${id}`).textContent : "—"; });
  }

  function updateExample(calculations, assumptions) {
    const index = Math.min(rows.length - 1, Math.max(0, Number.parseInt(exampleSelect.value, 10) || 0));
    const result = calculations[index];
    if (!result.valid) { setFormulaState(false); return; }
    const salary = result.salary;
    const personal = salary * assumptions.personalRate;
    const employer = salary * assumptions.employerRate;
    const thirteenth = salary / 12;
    const fourteenth = assumptions.sbu / 12;
    const cost = salary + employer + thirteenth + fourteenth;
    $("#formula-personal").textContent = `${currency.format(salary)} × ${(assumptions.personalRate * 100).toFixed(2)}%`;
    $("#formula-employer").textContent = `${currency.format(salary)} × ${(assumptions.employerRate * 100).toFixed(2)}%`;
    $("#formula-thirteenth").textContent = `${currency.format(salary)} ÷ 12`;
    $("#formula-fourteenth").textContent = `${currency.format(assumptions.sbu)} ÷ 12`;
    $("#formula-cost").textContent = `${currency.format(salary)} + ${currency.format(employer)} + ${currency.format(thirteenth)} + ${currency.format(fourteenth)}`;
    $("#example-personal").textContent = currency.format(personal);
    $("#example-employer").textContent = currency.format(employer);
    $("#example-thirteenth").textContent = currency.format(thirteenth);
    $("#example-fourteenth").textContent = currency.format(fourteenth);
    $("#example-cost").textContent = currency.format(cost);
  }

  function updateCalculations() {
    const assumptions = getAssumptions();
    const calculations = rows.map((row) => calculateRow(row, assumptions));
    const allValid = assumptions.valid && calculations.every((item) => item.valid);
    const totals = calculations.reduce((sum, item) => {
      if (!item.valid) return sum;
      ["workers", "totalSalary", "personal", "employer", "thirteenth", "fourteenth", "cost"].forEach((key) => { sum[key] += item[key]; });
      return sum;
    }, { workers: 0, totalSalary: 0, personal: 0, employer: 0, thirteenth: 0, fourteenth: 0, cost: 0 });

    rows.forEach((row, index) => {
      const item = calculations[index];
      ["personal", "employer", "thirteenth", "fourteenth", "cost"].forEach((key) => setMoney(row, key, item[key], item.valid));
    });

    $("#validation-message").hidden = allValid;
    const totalValues = { "#total-workers": whole.format(totals.workers), "#total-salary": currency.format(totals.totalSalary), "#total-personal": currency.format(totals.personal), "#total-employer": currency.format(totals.employer), "#total-thirteenth": currency.format(totals.thirteenth), "#total-fourteenth": currency.format(totals.fourteenth), "#total-cost": currency.format(totals.cost) };
    Object.entries(totalValues).forEach(([selector, value]) => { $(selector).textContent = allValid ? value : "—"; });
    $("#grand-total").textContent = allValid ? currency.format(totals.cost) : "Revise los datos";
    $("#annual-total").textContent = allValid ? `${currency.format(totals.cost * 12)} al año` : "Corrija los campos marcados";

    const revenue = readNumber(revenueInput, { min: 1, max: 1000000 });
    $("#clients-needed").textContent = allValid && revenue.valid ? whole.format(Math.ceil(totals.cost / revenue.value)) : "—";
    $("#validation-message").hidden = allValid && revenue.valid;
    downloadButton.disabled = !(allValid && revenue.valid);
    updateExample(calculations, assumptions);
  }

  function resetAll() {
    $$('input[data-default]').forEach((input) => { input.value = input.dataset.default; });
    exampleSelect.value = "0";
    updateCalculations();
  }

  function applyMidpoints() {
    rows.forEach((row) => { $(".salary-input", row).value = bands[row.dataset.band].midpoint; });
    updateCalculations();
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function downloadExcelCsv() {
    if (downloadButton.disabled) return;
    const assumptions = getAssumptions();
    const data = [["Área", "Cargo", "Escala", "Trabajadores", "Sueldo mensual por persona", "IESS personal total", "IESS patronal total", "Décimo tercero mensual", "Décimo cuarto mensual", "Costo laboral modelado", "", "Supuesto", "Valor"]];
    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const source = roles[index];
      const workers = $(".workers-input", row).value;
      const salary = $(".salary-input", row).value;
      const assumptionLabel = index === 0 ? "Aporte personal IESS" : index === 1 ? "Aporte patronal IESS" : index === 2 ? "SBU 2026" : "";
      const assumptionValue = index === 0
        ? assumptions.personalRate.toLocaleString("es-EC", { useGrouping: false, maximumFractionDigits: 4 })
        : index === 1
          ? assumptions.employerRate.toLocaleString("es-EC", { useGrouping: false, maximumFractionDigits: 4 })
          : index === 2 ? assumptions.sbu : "";
      data.push([source.area, source.role, source.band, workers, salary, `=D${excelRow}*E${excelRow}*$M$2`, `=D${excelRow}*E${excelRow}*$M$3`, `=D${excelRow}*E${excelRow}/12`, `=D${excelRow}*$M$4/12`, `=D${excelRow}*(E${excelRow}+(E${excelRow}*$M$3)+(E${excelRow}/12)+($M$4/12))`, "", assumptionLabel, assumptionValue]);
    });
    const totalRow = rows.length + 2;
    const lastDataRow = rows.length + 1;
    data.push(["", "TOTAL", "", `=SUMA(D2:D${lastDataRow})`, `=SUMAPRODUCTO(D2:D${lastDataRow};E2:E${lastDataRow})`, `=SUMA(F2:F${lastDataRow})`, `=SUMA(G2:G${lastDataRow})`, `=SUMA(H2:H${lastDataRow})`, `=SUMA(I2:I${lastDataRow})`, `=SUMA(J2:J${lastDataRow})`, "", "Nota", `Fila ${totalRow}: guarde como .xlsx para conservar fórmulas.`]);
    const csv = data.map((row) => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "VIGENTE-escalas-remuneraciones.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  $$("input, select").forEach((control) => control.addEventListener("input", updateCalculations));
  $("#reset-table").addEventListener("click", resetAll);
  $("#apply-midpoints").addEventListener("click", applyMidpoints);
  downloadButton.addEventListener("click", downloadExcelCsv);
  updateCalculations();
})();
