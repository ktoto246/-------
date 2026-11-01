class ApiMock {
    constructor() {
        this.delay = 60; // Имитация пинга 500мс
        this.initDb();
    }

    initDb() {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([
                { id: 1, login: 'admin', pass: '123', role: 'accountant', name: 'Анна Бухгалтер' },
                { id: 2, login: '001', pass: '123', role: 'employee', name: 'Иванов Иван' }
            ]));
        }
    }

    async login(login, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users'));
                const user = users.find(u => u.login === login && u.pass === password);
                if (user) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    resolve(user);
                } else {
                    reject(new Error('Неверный логин или пароль'));
                }
            }, this.delay);
        });
    }
}

const api = new ApiMock();