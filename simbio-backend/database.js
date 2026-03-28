// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'simbio.db'), (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco SQLite.');
        criarTabelas();
    }
});

function criarTabelas() {
    // Tabela de pacientes (já existente)
    const sqlPacientes = `
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

    // Tabela de profissionais de saúde
    const sqlProfissionais = `
        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            registro TEXT NOT NULL,
            tipo TEXT NOT NULL,
            data_cadastro TEXT
        )
    `;

    // Tabela de planos terapêuticos
    const sqlPlanos = `
        CREATE TABLE IF NOT EXISTS planos_terapeuticos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            profissional_id INTEGER NOT NULL,
            data_inicio TEXT NOT NULL,
            data_fim TEXT,
            status TEXT DEFAULT 'ativo',
            observacoes TEXT,
            created_at TEXT,
            FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
            FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
        )
    `;

    // Tabela de medicamentos
    const sqlMedicamentos = `
        CREATE TABLE IF NOT EXISTS medicamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plano_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            dosagem TEXT NOT NULL,
            horarios TEXT NOT NULL,
            duracao_dias INTEGER,
            instrucoes TEXT,
            FOREIGN KEY (plano_id) REFERENCES planos_terapeuticos(id)
        )
    `;

    // Tabela de exercícios
    const sqlExercicios = `
        CREATE TABLE IF NOT EXISTS exercicios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plano_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            frequencia TEXT NOT NULL,
            duracao TEXT NOT NULL,
            repeticoes INTEGER,
            instrucoes TEXT,
            FOREIGN KEY (plano_id) REFERENCES planos_terapeuticos(id)
        )
    `;

    // Tabela de cuidados específicos
    const sqlCuidados = `
        CREATE TABLE IF NOT EXISTS cuidados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plano_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT NOT NULL,
            frequencia TEXT NOT NULL,
            horarios TEXT,
            FOREIGN KEY (plano_id) REFERENCES planos_terapeuticos(id)
        )
    `;

    // database.js - Adicionar após as outras tabelas

    // Tabela de cuidadores (responsáveis pelos pacientes)
    const sqlCuidadores = `
        CREATE TABLE IF NOT EXISTS cuidadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            telefone TEXT NOT NULL,
            paciente_id INTEGER NOT NULL,
            data_cadastro TEXT,
            FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        )
    `;

    db.run(sqlPacientes);
    db.run(sqlProfissionais);
    db.run(sqlPlanos);
    db.run(sqlMedicamentos);
    db.run(sqlExercicios);
    db.run(sqlCuidados, (err) => {
        if (err) console.error('Erro ao criar tabelas:', err.message);
        else console.log('Tabelas de pacientes, profissionais, planos, medicamentos e exercícios verificadas/criadas.');
    });
    db.run(sqlCuidadores, (err) => {
        if (err) console.error('Erro ao criar tabela cuidadores:', err.message);
        else console.log('Tabela cuidadores verificada/criada.');
    });
    db.run(sqlCuidados, (err) => {
        if (err) console.error('Erro ao criar tabelas:', err.message);
        else {
            console.log('Todas as tabelas verificadas/criadas.');
            // Inserir profissional de exemplo se não existir
            inserirProfissionalExemplo();
        }
    });
}

function inserirProfissionalExemplo() {
    const sql = `SELECT * FROM profissionais WHERE email = 'dr_ana@simbio.com'`;
    db.get(sql, [], (err, row) => {
        if (!row) {
            const insertSql = `
                INSERT INTO profissionais (nome, email, senha, registro, tipo, data_cadastro)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            db.run(insertSql, [
                'Dra. Ana Silva',
                'dr_ana@simbio.com',
                'senha123',
                'CRM-12345',
                'medico',
                new Date().toISOString()
            ]);
            console.log('Profissional de exemplo criado: dr_ana@simbio.com / senha123');
        }
    });
}

module.exports = db;