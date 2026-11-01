const userStr = localStorage.getItem('currentUser');
if (!userStr) window.location.href = 'index.html';
const currentUser = JSON.parse(userStr);

document.getElementById('userName').textContent = `| ${currentUser.name} (${currentUser.role === 'accountant' ? 'Бухгалтер' : 'Сотрудник'})`;

let salaryChart; 

if (currentUser.role === 'employee') {
    document.getElementById('navSummary').style.display = 'none';
    document.getElementById('navEmp').style.display = 'none';
    document.getElementById('navCalc').style.display = 'none';
    document.getElementById('searchEmp').style.display = 'none';
    document.getElementById('searchPay').placeholder = 'Поиск по месяцу...';
    document.getElementById('paysheetTitle').textContent = 'Мои расчетные листки';
    showScreen('paysheet');
} else {
    document.getElementById('searchPay').placeholder = 'Поиск по месяцу или ФИО...';
    showScreen('summary');
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-screen="${id}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (id === 'summary' && currentUser.role === 'accountant') renderSummary();
    if (id === 'employees' && currentUser.role === 'accountant') renderEmployees();
    if (id === 'calc' && currentUser.role === 'accountant') renderCalcSelect();
    if (id === 'paysheet') renderPaysheet();
}

function fmt(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
function parse(s) { return +s.replace(/[^\d.-]/g, '') || 0; }
function toast(msg, err = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = err ? '#e74c3c' : '#27ae60';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== СВОДКА И ГРАФИКИ (Со страховыми взносами) =====
function renderSummary() {
    const logs = db.getLogs();
    document.getElementById('auditLogs').innerHTML = logs.map(l => `<li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>${l.date}</strong>: ${l.action}</li>`).join('');

    const payslips = db.getAllPayslips();
    const totalGross = payslips.reduce((sum, p) => sum + p.total, 0);
    const totalTaxes = totalGross * 0.30; // 30% страховых взносов

    const activeEmp = db.getAllEmployees().filter(e => e.status !== 'Уволен');
    const positions = {};
    activeEmp.forEach(e => { positions[e.pos] = (positions[e.pos] || 0) + e.salary; });

    if (salaryChart) salaryChart.destroy();
    const ctx = document.getElementById('salaryChart').getContext('2d');
    salaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(positions),
            datasets: [{ data: Object.values(positions), backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                subtitle: {
                    display: true,
                    text: `ФОТ (Начислено): ${fmt(totalGross)} | Взносы (30%): ${fmt(totalTaxes)}`,
                    font: { size: 14, weight: 'bold' },
                    color: '#e74c3c'
                }
            }
        }
    });
}

// ===== СОТРУДНИКИ И ПОИСК =====
document.getElementById('searchEmp').addEventListener('input', (e) => renderEmployees(e.target.value));

function renderEmployees(filter = '') {
    let employees = db.getAllEmployees();
    if (filter) {
        filter = filter.toLowerCase();
        employees = employees.filter(e => e.name.toLowerCase().includes(filter) || e.tab.includes(filter));
    }
    const tb = document.getElementById('empTable');
    tb.innerHTML = employees.length ? employees.map((e, i) => {
        const isFired = e.status === 'Уволен';
        const rowStyle = isFired ? 'opacity: 0.6; background: #f8fafc;' : '';
        const nameTpl = isFired ? `<span style="text-decoration: line-through;">${e.name}</span> <span style="color:#ef4444; font-size: 0.8rem;">(Уволен)</span>` : e.name;
        const actions = isFired
            ? `<span style="font-size: 0.8rem; color: #64748b;">Уволен</span>`
            : `<button class="btn btn-secondary btn-sm" onclick="editEmployee(${e.id})">✏️</button> <button class="btn btn-danger btn-sm" onclick="delEmployee(${e.id})">Уволить</button>`;

        return `<tr style="${rowStyle}"><td>${i + 1}</td><td>${e.tab}</td><td>${nameTpl}</td><td>${e.pos}</td><td>${fmt(e.salary)}</td><td>${actions}</td></tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;">Ничего не найдено</td></tr>';
}

document.getElementById('addEmpBtn').addEventListener('click', () => {
    ['empId', 'empTab', 'empName', 'empPos', 'empSalary'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('empModal').classList.add('active');
});
document.getElementById('closeModalBtn').addEventListener('click', () => document.getElementById('empModal').classList.remove('active'));
document.getElementById('cancelModalBtn').addEventListener('click', () => document.getElementById('empModal').classList.remove('active'));

document.getElementById('saveEmpBtn').addEventListener('click', () => {
    const id = document.getElementById('empId').value;
    const tab = document.getElementById('empTab').value.trim();
    const data = {
        tab: tab, name: document.getElementById('empName').value.trim(),
        pos: document.getElementById('empPos').value.trim(), salary: +document.getElementById('empSalary').value || 0
    };
    
    if (!data.tab || !data.name || !data.pos) { toast('Заполните все поля!', true); return; }
    
    if (!id && db.checkTabExists(data.tab)) {
        toast('Ошибка: Табельный номер уже занят!', true);
        return;
    }
    
    if (data.salary < 0) { toast('Оклад не может быть отрицательным!', true); return; }

    id ? db.updateEmployee(+id, data) : db.addEmployee(data);
    document.getElementById('empModal').classList.remove('active');
    renderEmployees(document.getElementById('searchEmp').value);
    toast('Сотрудник сохранён');
});

function editEmployee(id) {
    const e = db.getEmployee(id);
    document.getElementById('empId').value = e.id;
    document.getElementById('empTab').value = e.tab;
    document.getElementById('empName').value = e.name;
    document.getElementById('empPos').value = e.pos;
    document.getElementById('empSalary').value = e.salary;
    document.getElementById('empModal').classList.add('active');
}

function delEmployee(id) {
    if (confirm('Точно уволить сотрудника? Он останется в базе для истории.')) { 
        db.deleteEmployee(id); 
        renderEmployees(); 
    }
}

// ===== РАСЧЁТЫ И ВЕДОМОСТЬ =====
function renderCalcSelect() {
    // В расчетах показываем только активных
    const active = db.getAllEmployees().filter(e => e.status !== 'Уволен');
    document.getElementById('calcEmp').innerHTML = active.map(e => `<option value="${e.id}">${e.tab} — ${e.name}</option>`).join('');
}

document.getElementById('calcBtn').addEventListener('click', () => {
    const emp = db.getEmployee(+document.getElementById('calcEmp').value);
    if (!emp) return;
    const total = Math.round(emp.salary * (+document.getElementById('calcDays').value / +document.getElementById('calcNorm').value)) + (+document.getElementById('calcBonus').value);
    document.getElementById('rBase').textContent = fmt(total - +document.getElementById('calcBonus').value);
    document.getElementById('rBonus').textContent = fmt(+document.getElementById('calcBonus').value);
    document.getElementById('rTotal').textContent = fmt(total);
    document.getElementById('rNdf').textContent = fmt(Math.round(total * 0.13));
    document.getElementById('rDed').textContent = fmt(+document.getElementById('calcDed').value);
    document.getElementById('rNet').textContent = fmt(total - Math.round(total * 0.13) - +document.getElementById('calcDed').value);
});

document.getElementById('savePayslipBtn').addEventListener('click', () => {
    const emp = db.getEmployee(+document.getElementById('calcEmp').value);
    if (!emp) return;
    const total = parse(document.getElementById('rTotal').textContent);
    if (total === 0) { toast('Сначала нажмите «Рассчитать»!', true); return; }
    db.addPayslip({
        empId: emp.id, empName: emp.name,
        month: document.getElementById('calcMonth').value, base: parse(document.getElementById('rBase').textContent),
        bonus: parse(document.getElementById('rBonus').textContent), total,
        ndf: parse(document.getElementById('rNdf').textContent), ded: parse(document.getElementById('rDed').textContent),
        net: parse(document.getElementById('rNet').textContent)
    });
    toast('Сохранено в ведомость');
});

document.getElementById('searchPay').addEventListener('input', (e) => renderPaysheet(e.target.value));

function renderPaysheet(filter = '') {
    let payslips = db.getAllPayslips();
    if (currentUser.role === 'employee') payslips = payslips.filter(p => p.empId === currentUser.id);
    if (filter) {
        filter = filter.toLowerCase();
        payslips = payslips.filter(p => p.empName.toLowerCase().includes(filter) || p.month.toLowerCase().includes(filter));
    }
    document.getElementById('payTable').innerHTML = payslips.length ? payslips.map((p, i) => `
        <tr><td>${i + 1}</td><td>${p.empName}</td><td>${p.month}</td><td>${fmt(p.total)}</td>
        <td style="color:#e74c3c">${fmt(p.ndf)}</td><td style="color:#f59e0b">${fmt(p.ded)}</td><td style="color:#27ae60;font-weight:600">${fmt(p.net)}</td>
        <td>${currentUser.role === 'accountant' ? `<button class="btn btn-danger btn-sm" onclick="db.deletePayslip(${p.id}); renderPaysheet(); renderSummary();">🗑</button>` : `<button class="btn btn-primary btn-sm" onclick="downloadPDF(${p.id})">PDF</button>`}</td></tr>
    `).join('') : '<tr><td colspan="8" style="text-align:center;">Нет данных</td></tr>';
}

function downloadPDF(id) {
    const p = db.getAllPayslips().find(x => x.id === id);
    ['Month','Name','Base','Bonus','Total','Ndf','Net'].forEach(k => document.getElementById('pdf'+k).textContent = k==='Month'||k==='Name' ? p[k.toLowerCase()] : fmt(p[k.toLowerCase()]));
    const el = document.getElementById('pdfTemplate'); el.style.display = 'block';
    html2pdf().set({ margin: 10, filename: `Расчет_${p.month}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } }).from(el).save().then(() => el.style.display = 'none');
}

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const emp = db.getAllEmployees();
        if (!emp.length) { toast('Нет данных для экспорта', true); return; }
        let csv = 'Таб.номер;ФИО;Должность;Оклад;Статус\n' + emp.map(e => `${e.tab};${e.name};${e.pos};${e.salary};${e.status}`).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'employees.csv';
        a.click();
    });
}