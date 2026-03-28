// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'simbio.db'), (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco SQLite.');
        criarTabela();
    }
});

function criarTabela() {
    const sql = `
        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            idade INTEGER NOT NULL,
            data_nascimento TEXT,
            responsavel TEXT NOT NULL,
            telefone TEXT NOT NULL,
            email TEXT,
            condicao_clinica TEXT NOT NULL,
            observacoes TEXT,
            consentimento_data TEXT,
            data_cadastro TEXT
        )
    `;
    db.run(sql, (err) => {
        if (err) console.error('Erro ao criar tabela:', err.message);
        else console.log('Tabela pacientes verificada/criada.');
    });
}

module.exports = db;