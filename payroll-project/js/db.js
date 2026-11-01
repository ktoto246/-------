class Database {
    constructor() {
        this.employees = this.load('employees') || this.getDefaultEmployees();
        this.payslips = this.load('payslips') || this.getDefaultPayslips();
        this.logs = this.load('logs') || [];
        this.save();
    }

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            localStorage.removeItem(key);
            return null;
        }
    }

    save() {
        localStorage.setItem('employees', JSON.stringify(this.employees));
        localStorage.setItem('payslips', JSON.stringify(this.payslips));
        localStorage.setItem('logs', JSON.stringify(this.logs));
    }

    addLog(action) {
        const date = new Date().toLocaleString('ru-RU');
        this.logs.unshift({ date, action });
        if (this.logs.length > 50) this.logs.pop();
        this.save();
    }

    getDefaultEmployees() {
        return [
            { id: 1, tab: '001', name: 'Иванов Иван Иванович', pos: 'Главный бухгалтер', salary: 120000, role: 'accountant', pass: '123', status: 'Активен' },
            { id: 2, tab: '002', name: 'Петрова Мария Сергеевна', pos: 'Бухгалтер', salary: 80000, role: 'accountant', pass: '123', status: 'Активен' },
            { id: 3, tab: '003', name: 'Сидоров Алексей Петрович', pos: 'Менеджер проектов', salary: 95000, role: 'employee', pass: '123', status: 'Активен' },
            { id: 4, tab: '004', name: 'Кузнецова Ольга Викторовна', pos: 'HR-специалист', salary: 65000, role: 'employee', pass: '123', status: 'Активен' },
            { id: 5, tab: '005', name: 'Смирнов Дмитрий Андреевич', pos: 'Сисадмин', salary: 110000, role: 'employee', pass: '123', status: 'Активен' }
        ];
    }

    getDefaultPayslips() {
        return [
            { id: 101, empId: 3, empName: 'Сидоров Алексей Петрович', month: 'Октябрь', base: 95000, bonus: 10000, total: 105000, ndf: 13650, ded: 0, net: 91350 }
        ];
    }

    // Подставляем статус на лету, если его не было
    getAllEmployees() { 
        return this.employees.map(e => ({...e, status: e.status || 'Активен'})); 
    }
    
    getEmployee(id) { return this.getAllEmployees().find(e => e.id === id); }
    getLogs() { return this.logs; }
    
    checkTabExists(tab) { return this.getAllEmployees().some(e => e.tab === tab); }
    
    addEmployee(emp) {
        emp.id = Date.now();
        emp.role = 'employee';
        emp.pass = '123';
        emp.status = 'Активен';
        this.employees.push(emp);
        this.addLog(`Добавлен сотрудник: ${emp.name} (Таб: ${emp.tab})`);
        this.save();
        return emp;
    }

    updateEmployee(id, data) {
        const emp = this.employees.find(e => e.id === id);
        if (emp) {
            Object.assign(emp, data);
            this.addLog(`Изменены данные сотрудника: ${emp.name}`);
            this.save();
        }
    }

    // Вместо удаления ставим статус Уволен
    deleteEmployee(id) {
        const emp = this.employees.find(e => e.id === id);
        if (emp) {
            emp.status = 'Уволен';
            this.addLog(`Уволен сотрудник: ${emp.name}`);
            this.save();
        }
    }

    getAllPayslips() { return this.payslips; }
    
    addPayslip(payslip) {
        payslip.id = Date.now();
        this.payslips.push(payslip);
        this.addLog(`Начислена ЗП (${payslip.month}) сотруднику: ${payslip.empName}`);
        this.save();
    }

    deletePayslip(id) {
        this.payslips = this.payslips.filter(p => p.id !== id);
        this.addLog(`Удалена запись из ведомости (ID: ${id})`);
        this.save();
    }

    clearPayslips() {
        this.payslips = [];
        this.addLog('Ведомость полностью очищена');
        this.save();
    }

    loginUser(tabNumber, password) {
        const user = this.getAllEmployees().find(e => e.tab === tabNumber && e.pass === password && e.status !== 'Уволен');
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.addLog(`Вход в систему: ${user.name}`);
            return true;
        }
        return false;
    }
}
const db = new Database();