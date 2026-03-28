// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Para servir o frontend

// Rota para cadastrar paciente
app.post('/api/pacientes', (req, res) => {
    const {
        nome,
        idade,
        data_nascimento,
        responsavel,
        telefone,
        email,
        condicao_clinica,
        observacoes,
        consentimento_data
    } = req.body;

    // Validações básicas
    if (!nome || !idade || !responsavel || !telefone || !condicao_clinica) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }
    if (idade < 0 || idade > 17) {
        return res.status(400).json({ error: 'Idade deve estar entre 0 e 17 anos.' });
    }
    // Validação simples de telefone (pode ser mais robusta)
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        return res.status(400).json({ error: 'Telefone inválido.' });
    }
    if (!consentimento_data) {
        return res.status(400).json({ error: 'Consentimento LGPD é obrigatório.' });
    }

    const dataCadastro = new Date().toISOString();

    const sql = `
        INSERT INTO pacientes 
        (nome, idade, data_nascimento, responsavel, telefone, email, condicao_clinica, observacoes, consentimento_data, data_cadastro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        nome,
        idade,
        data_nascimento || null,
        responsavel,
        telefone,
        email || null,
        condicao_clinica,
        observacoes || null,
        consentimento_data,
        dataCadastro
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao cadastrar paciente.' });
        }
        res.status(201).json({
            message: 'Paciente cadastrado com sucesso!',
            id: this.lastID,
            paciente: { id: this.lastID, nome, idade, responsavel, telefone, condicao_clinica }
        });
    });
});

// Rota opcional para listar pacientes (útil para debug)
app.get('/api/pacientes', (req, res) => {
    db.all('SELECT id, nome, idade, responsavel, telefone, condicao_clinica, data_cadastro FROM pacientes', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});