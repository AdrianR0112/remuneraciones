(() => {
  "use strict";

  const page = document.body.dataset.page;
  if (page !== "remuneraciones") return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const rows = $$(".payroll-table tbody tr");
  const ratePersonalInput = $("#rate-personal");
  const rateEmployerInput = $("#rate-employer");
  const sbuInput = $("#sbu");
  const revenueInput = $("#revenue-per-client");
  const exampleSelect = $("#example-role");

  const currency = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const number = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 });
  const valueOf = (input) => Math.max(0, Number.parseFloat(input.value) || 0);
  const clampWorkers = (input) => Math.max(0, Math.floor(valueOf(input)));

  function getAssumptions() {
    return {
      personalRate: valueOf(ratePersonalInput) / 100,
      employerRate: valueOf(rateEmployerInput) / 100,
      sbu: valueOf(sbuInput)
    };
  }

  function calculateRow(row, assumptions) {
    const workers = clampWorkers($(".workers-input", row));
    const salary = valueOf($(".salary-input", row));
    const totalSalary = workers * salary;
    const personal = totalSalary * assumptions.personalRate;
    const employer = totalSalary * assumptions.employerRate;
    const thirteenth = totalSalary / 12;
    const fourteenth = workers * assumptions.sbu / 12;
    const cost = totalSalary + employer + thirteenth + fourteenth;
    return { workers, salary, totalSalary, personal, employer, thirteenth, fourteenth, cost };
  }

  function setMoney(row, output, value) {
    const cell = row.querySelector(`[data-output="${output}"]`);
    if (cell) cell.textContent = currency.format(value);
  }

  function updateExample(calculations, assumptions) {
    const index = Math.min(rows.length - 1, Math.max(0, Number.parseInt(exampleSelect.value, 10) || 0));
    const result = calculations[index];
    const salary = result.salary;
    const personalPerWorker = salary * assumptions.personalRate;
    const employerPerWorker = salary * assumptions.employerRate;
    const thirteenthPerWorker = salary / 12;
    const fourteenthPerWorker = assumptions.sbu / 12;
    const costPerWorker = salary + employerPerWorker + thirteenthPerWorker + fourteenthPerWorker;

    $("#formula-personal").textContent = `${currency.format(salary)} × ${(assumptions.personalRate * 100).toFixed(2)}%`;
    $("#formula-employer").textContent = `${currency.format(salary)} × ${(assumptions.employerRate * 100).toFixed(2)}%`;
    $("#formula-thirteenth").textContent = `${currency.format(salary)} ÷ 12`;
    $("#formula-fourteenth").textContent = `${currency.format(assumptions.sbu)} ÷ 12`;
    $("#formula-cost").textContent = `${currency.format(salary)} + ${currency.format(employerPerWorker)} + ${currency.format(thirteenthPerWorker)} + ${currency.format(fourteenthPerWorker)}`;
    $("#example-personal").textContent = currency.format(personalPerWorker);
    $("#example-employer").textContent = currency.format(employerPerWorker);
    $("#example-thirteenth").textContent = currency.format(thirteenthPerWorker);
    $("#example-fourteenth").textContent = currency.format(fourteenthPerWorker);
    $("#example-cost").textContent = currency.format(costPerWorker);
  }

  function updateCalculations() {
    const assumptions = getAssumptions();
    const calculations = rows.map((row) => calculateRow(row, assumptions));
    const totals = calculations.reduce((sum, item) => {
      Object.keys(sum).forEach((key) => { sum[key] += item[key] || 0; });
      return sum;
    }, { workers: 0, totalSalary: 0, personal: 0, employer: 0, thirteenth: 0, fourteenth: 0, cost: 0 });

    rows.forEach((row, index) => {
      const result = calculations[index];
      setMoney(row, "personal", result.personal);
      setMoney(row, "employer", result.employer);
      setMoney(row, "thirteenth", result.thirteenth);
      setMoney(row, "fourteenth", result.fourteenth);
      setMoney(row, "cost", result.cost);
      $(".workers-input", row).value = result.workers;
    });

    $("#total-workers").textContent = number.format(totals.workers);
    $("#total-salary").textContent = currency.format(totals.totalSalary);
    $("#total-personal").textContent = currency.format(totals.personal);
    $("#total-employer").textContent = currency.format(totals.employer);
    $("#total-thirteenth").textContent = currency.format(totals.thirteenth);
    $("#total-fourteenth").textContent = currency.format(totals.fourteenth);
    $("#total-cost").textContent = currency.format(totals.cost);
    $("#grand-total").textContent = currency.format(totals.cost);
    $("#annual-total").textContent = `${currency.format(totals.cost * 12)} al año`;

    const revenuePerClient = Math.max(1, valueOf(revenueInput));
    $("#clients-needed").textContent = number.format(Math.ceil(totals.cost / revenuePerClient));
    updateExample(calculations, assumptions);
  }

  function resetAll() {
    $$('input[data-default]').forEach((input) => { input.value = input.dataset.default; });
    exampleSelect.value = "0";
    updateCalculations();
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function downloadExcelCsv() {
    const assumptions = getAssumptions();
    const data = [
      ["Cargo", "Trabajadores", "Sueldo mensual por persona", "IESS personal total", "IESS patronal total", "Décimo tercero mensual", "Décimo cuarto mensual", "Costo mensual empresa", "", "Supuesto", "Valor"]
    ];

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const role = row.dataset.role;
      const workers = clampWorkers($(".workers-input", row));
      const salary = valueOf($(".salary-input", row));
      const assumptionLabel = index === 0 ? "Aporte personal IESS" : index === 1 ? "Aporte patronal IESS" : index === 2 ? "SBU 2026" : "";
      const assumptionValue = index === 0 ? assumptions.personalRate : index === 1 ? assumptions.employerRate : index === 2 ? assumptions.sbu : "";
      data.push([
        role,
        workers,
        salary,
        `=B${excelRow}*C${excelRow}*$K$2`,
        `=B${excelRow}*C${excelRow}*$K$3`,
        `=B${excelRow}*C${excelRow}/12`,
        `=B${excelRow}*$K$4/12`,
        `=B${excelRow}*(C${excelRow}+(C${excelRow}*$K$3)+(C${excelRow}/12)+($K$4/12))`,
        "",
        assumptionLabel,
        assumptionValue
      ]);
    });

    data.push([
      "TOTAL",
      "=SUM(B2:B5)",
      "=SUMPRODUCT(B2:B5,C2:C5)",
      "=SUM(D2:D5)",
      "=SUM(E2:E5)",
      "=SUM(F2:F5)",
      "=SUM(G2:G5)",
      "=SUM(H2:H5)",
      "",
      "Nota",
      "Abra en Excel y guarde como .xlsx para conservar formato y fórmulas."
    ]);

    const csv = data.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "VIGENTE-remuneraciones-formulas.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  $$('input, select').forEach((control) => control.addEventListener("input", updateCalculations));
  $("#reset-table").addEventListener("click", resetAll);
  $("#download-excel").addEventListener("click", downloadExcelCsv);
  updateCalculations();
})();
