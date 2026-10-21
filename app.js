(() => {
  "use strict";

  if (document.body.dataset.page !== "remuneraciones") return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const roles = [
    { area: "Dirección", role: "Gerencia General", band: "E", workers: 1, salary: 2200 },
    { area: "Producto y Tecnología", role: "Dirección de Tecnología", band: "L3", workers: 1, salary: 1700 },
    { area: "Producto y Tecnología", role: "Ingeniería Full Stack", band: "L2", workers: 2, salary: 1200 },
    { area: "Producto y Tecnología", role: "Producto, UX/UI y QA", band: "L2", workers: 1, salary: 1000 },
    { area: "Operaciones y Clientes", role: "Jefatura de Operaciones e Implementación", band: "L2", workers: 1, salary: 1100 },
    { area: "Operaciones y Clientes", role: "Soporte al Cliente", band: "O", workers: 1, salary: 600 },
    { area: "Comercial y Marketing", role: "Jefatura Comercial y Marketing", band: "L2", workers: 1, salary: 1200 },
    { area: "Comercial y Marketing", role: "Ejecutivo Comercial", band: "L1", workers: 1, salary: 800 },
    { area: "Administración y Personas", role: "Jefatura Administrativa, Financiera y de Personas", band: "L2", workers: 1, salary: 1100 }
  ];
  const bands = {
    E: { min: 1800, midpoint: 2200, max: 2600 },
    L3: { min: 1300, midpoint: 1550, max: 1800 },
    L2: { min: 950, midpoint: 1150, max: 1350 },
    L1: { min: 650, midpoint: 800, max: 950 },
    O: { min: 510, midpoint: 580, max: 650 }
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
    $("#individual-role").innerHTML = roles.map((item, index) => `<option value="${index}">${item.role}</option>`).join("");
  }

  renderRows();
  const rows = $$("#payroll-body tr");
  const ratePersonalInput = $("#rate-personal");
  const rateEmployerInput = $("#rate-employer");
  const sbuInput = $("#sbu");
  const sectoralFloorInput = $("#sectoral-floor");
  const revenueInput = $("#revenue-per-client");
  const individualRoleSelect = $("#individual-role");
  const individualSalaryInput = $("#individual-salary");
  const individualBonusInput = $("#individual-bonus");
  const individualSuppHoursInput = $("#individual-supp-hours");
  const individualExtraHoursInput = $("#individual-extra-hours");
  const individualNightHoursInput = $("#individual-night-hours");
  const individualDeductionsInput = $("#individual-deductions");
  const individualStatus = $("#individual-status");

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
    const sectoralFloor = readNumber(sectoralFloorInput, { min: 1, max: 10000 });
    return { valid: personal.valid && employer.valid && sbu.valid && sectoralFloor.valid, personalRate: personal.value / 100, employerRate: employer.value / 100, sbu: sbu.value, sectoralFloor: sectoralFloor.value };
  }

  function calculateRow(row, assumptions) {
    const workersInput = $(".workers-input", row);
    const salaryInput = $(".salary-input", row);
    const workersResult = readNumber(workersInput, { min: 0, max: 100, integer: true });
    const salaryResult = readNumber(salaryInput, { min: Math.max(assumptions.sbu, assumptions.sectoralFloor) || 1, max: 10000 });
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

  function setIndividualMoney(id, value, valid) {
    $(id).textContent = valid ? currency.format(value) : "—";
  }

  function loadIndividualRole() {
    const index = Math.min(rows.length - 1, Math.max(0, Number.parseInt(individualRoleSelect.value, 10) || 0));
    individualSalaryInput.value = $(".salary-input", rows[index]).value;
  }

  function updateIndividualCalculator() {
    const assumptions = getAssumptions();
    const salary = readNumber(individualSalaryInput, { min: 1, max: 100000 });
    const bonus = readNumber(individualBonusInput, { min: 0, max: 100000 });
    const supplementaryHours = readNumber(individualSuppHoursInput, { min: 0, max: 48 });
    const extraordinaryHours = readNumber(individualExtraHoursInput, { min: 0, max: 200 });
    const nightHours = readNumber(individualNightHoursInput, { min: 0, max: 240 });
    const deductions = readNumber(individualDeductionsInput, { min: 0, max: 100000 });
    const baseValid = assumptions.valid && salary.valid && bonus.valid && supplementaryHours.valid && extraordinaryHours.valid && nightHours.valid && deductions.valid;
    const hourValue = salary.value / 240;
    const supplementary = hourValue * 1.5 * supplementaryHours.value;
    const extraordinary = hourValue * 2 * extraordinaryHours.value;
    const night = hourValue * 1.25 * nightHours.value;
    const gross = salary.value + bonus.value + supplementary + extraordinary + night;
    const personal = gross * assumptions.personalRate;
    const employer = gross * assumptions.employerRate;
    const thirteenth = gross / 12;
    const fourteenth = assumptions.sbu / 12;
    const deductionsAllowed = deductions.value <= gross - personal;
    individualDeductionsInput.toggleAttribute("aria-invalid", baseValid && !deductionsAllowed);
    const valid = baseValid && deductionsAllowed;
    const net = gross - personal - deductions.value;
    const employerCost = gross + employer + thirteenth + fourteenth;
    const legalFloor = Math.max(assumptions.sbu, assumptions.sectoralFloor);
    const complies = salary.value >= legalFloor;

    const outputs = {
      "#individual-base": salary.value,
      "#individual-hour-value": hourValue,
      "#individual-supp-total": supplementary,
      "#individual-extra-total": extraordinary,
      "#individual-night-total": night,
      "#individual-bonus-total": bonus.value,
      "#individual-gross": gross,
      "#individual-personal": personal,
      "#individual-discounts-total": deductions.value,
      "#individual-employer": employer,
      "#individual-thirteenth": thirteenth,
      "#individual-fourteenth": fourteenth,
      "#individual-employer-cost": employerCost,
      "#individual-net": net
    };
    Object.entries(outputs).forEach(([id, value]) => setIndividualMoney(id, value, valid));

    individualStatus.classList.toggle("is-valid", valid && complies);
    individualStatus.classList.toggle("is-warning", !valid || !complies);
    if (!baseValid) {
      individualStatus.textContent = "Revise los campos marcados: hay valores vacíos o fuera de rango.";
    } else if (!deductionsAllowed) {
      individualStatus.textContent = "Los descuentos no pueden superar el ingreso disponible después del IESS personal.";
    } else if (!complies) {
      individualStatus.textContent = `Advertencia: el sueldo está por debajo del piso de control de ${currency.format(legalFloor)}.`;
    } else {
      individualStatus.textContent = `Cumple el piso de control de ${currency.format(legalFloor)}. Verifique la homologación exacta del cargo en el MDT.`;
    }
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
    updateIndividualCalculator();
  }

  function resetAll() {
    $$('input[data-default]').forEach((input) => { input.value = input.dataset.default; });
    exampleSelect.value = "0";
    individualRoleSelect.value = "0";
    loadIndividualRole();
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
      const assumptionLabel = index === 0 ? "Aporte personal IESS" : index === 1 ? "Aporte patronal IESS" : index === 2 ? "SBU 2026" : index === 3 ? "Piso sectorial TIC referencial" : "";
      const assumptionValue = index === 0
        ? assumptions.personalRate.toLocaleString("es-EC", { useGrouping: false, maximumFractionDigits: 4 })
        : index === 1
          ? assumptions.employerRate.toLocaleString("es-EC", { useGrouping: false, maximumFractionDigits: 4 })
          : index === 2 ? assumptions.sbu : index === 3 ? assumptions.sectoralFloor : "";
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

  $$(".assumptions input, #payroll-body input, #example-role, #revenue-per-client").forEach((control) => control.addEventListener("input", updateCalculations));
  $$("#individual-calculator input").forEach((control) => control.addEventListener("input", updateIndividualCalculator));
  individualRoleSelect.addEventListener("change", () => { loadIndividualRole(); updateIndividualCalculator(); });
  $("#reset-table").addEventListener("click", resetAll);
  $("#apply-midpoints").addEventListener("click", applyMidpoints);
  downloadButton.addEventListener("click", downloadExcelCsv);
  loadIndividualRole();
  updateCalculations();
})();
