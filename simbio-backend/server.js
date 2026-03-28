// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3010;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROTAS DE PACIENTES (RF01) ====================
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

    if (!nome || !idade || !responsavel || !telefone || !condicao_clinica) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }
    if (idade < 0 || idade > 17) {
        return res.status(400).json({ error: 'Idade deve estar entre 0 e 17 anos.' });
    }

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

app.get('/api/pacientes', (req, res) => {
    db.all('SELECT id, nome, idade, responsavel, telefone, condicao_clinica, data_cadastro FROM pacientes', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ==================== ROTAS DE AUTENTICAÇÃO (RF11) ====================

// Login unificado
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;
    
    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    
    // Se o tipo for especificado como 'profissional'
    if (tipo === 'profissional') {
        const sql = `SELECT id, nome, email, registro, tipo FROM profissionais WHERE email = ? AND senha = ?`;
        db.get(sql, [email, senha], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(401).json({ error: 'Email ou senha inválidos.' });
            }
            res.json({ 
                message: 'Login realizado com sucesso!', 
                usuario: { ...row, tipo_usuario: 'profissional' }
            });
        });
    } else {
        // Buscar em cuidadores
        const sqlCuidador = `SELECT id, nome, email, paciente_id FROM cuidadores WHERE email = ? AND senha = ?`;
        db.get(sqlCuidador, [email, senha], (err, cuidador) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (cuidador) {
                // Buscar dados do paciente vinculado
                const sqlPaciente = `SELECT id, nome, idade, condicao_clinica FROM pacientes WHERE id = ?`;
                db.get(sqlPaciente, [cuidador.paciente_id], (err, paciente) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ 
                        message: 'Login realizado com sucesso!', 
                        usuario: { 
                            ...cuidador, 
                            tipo_usuario: 'cuidador',
                            paciente: paciente || null
                        }
                    });
                });
            } else {
                return res.status(401).json({ error: 'Email ou senha inválidos.' });
            }
        });
    }
});

// Rota para cadastro de cuidador
app.post('/api/cuidadores', (req, res) => {
    const { nome, email, senha, telefone, paciente_id } = req.body;
    
    if (!nome || !email || !senha || !telefone || !paciente_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    
    // Verificar se email já existe
    const sqlCheck = `SELECT id FROM cuidadores WHERE email = ?`;
    db.get(sqlCheck, [email], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            return res.status(400).json({ error: 'Email já cadastrado.' });
        }
        
        const dataCadastro = new Date().toISOString();
        const sqlInsert = `
            INSERT INTO cuidadores (nome, email, senha, telefone, paciente_id, data_cadastro)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(sqlInsert, [nome, email, senha, telefone, paciente_id, dataCadastro], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erro ao cadastrar cuidador.' });
            }
            res.status(201).json({
                message: 'Cuidador cadastrado com sucesso!',
                id: this.lastID,
                cuidador: { id: this.lastID, nome, email, paciente_id }
            });
        });
    });
});

// Rota para obter dados do paciente pelo cuidador
app.get('/api/cuidador/paciente/:cuidadorId', (req, res) => {
    const { cuidadorId } = req.params;
    
    const sql = `
        SELECT c.*, p.id as paciente_id, p.nome as paciente_nome, p.idade, p.condicao_clinica
        FROM cuidadores c
        JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.id = ?
    `;
    db.get(sql, [cuidadorId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Cuidador não encontrado.' });
        }
        res.json(row);
    });
});

// Rota para verificar sessão atual
app.get('/api/verificar-sessao', (req, res) => {
    res.json({ autenticado: false });
});

// ==================== ROTAS DE PLANOS TERAPÊUTICOS (RF02) ====================
app.post('/api/planos', (req, res) => {
    const { paciente_id, profissional_id, medicamentos, exercicios, cuidados, observacoes, data_fim } = req.body;
    
    if (!paciente_id || !profissional_id) {
        return res.status(400).json({ error: 'Paciente e profissional são obrigatórios.' });
    }
    
    const dataInicio = new Date().toISOString();
    const created_at = new Date().toISOString();
    
    // Inserir plano principal
    const sqlPlano = `
        INSERT INTO planos_terapeuticos (paciente_id, profissional_id, data_inicio, data_fim, observacoes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sqlPlano, [paciente_id, profissional_id, dataInicio, data_fim || null, observacoes || null, 'ativo', created_at], function(err) {
        if (err) {
            console.error('Erro ao criar plano:', err);
            return res.status(500).json({ error: 'Erro ao criar plano terapêutico.' });
        }
        
        const planoId = this.lastID;
        let erros = [];
        let insercoesPendentes = 0;
        
        // Contar total de itens a serem inseridos
        const totalMed = medicamentos ? medicamentos.length : 0;
        const totalExe = exercicios ? exercicios.length : 0;
        const totalCuid = cuidados ? cuidados.length : 0;
        const totalInsercoes = totalMed + totalExe + totalCuid;
        
        if (totalInsercoes === 0) {
            return res.status(201).json({
                message: 'Plano terapêutico criado com sucesso!',
                plano_id: planoId,
                resumo: { medicamentos: 0, exercicios: 0, cuidados: 0 }
            });
        }
        
        function verificarConclusao() {
            insercoesPendentes++;
            if (insercoesPendentes === totalInsercoes) {
                if (erros.length > 0) {
                    console.error('Erros ao inserir itens:', erros);
                    return res.status(500).json({ error: 'Erro parcial ao salvar itens do plano.' });
                }
                res.status(201).json({
                    message: 'Plano terapêutico criado com sucesso!',
                    plano_id: planoId,
                    resumo: {
                        medicamentos: totalMed,
                        exercicios: totalExe,
                        cuidados: totalCuid
                    }
                });
            }
        }
        
        // Inserir medicamentos
        if (medicamentos && medicamentos.length > 0) {
            const sqlMed = `INSERT INTO medicamentos (plano_id, nome, dosagem, horarios, duracao_dias, instrucoes) VALUES (?, ?, ?, ?, ?, ?)`;
            medicamentos.forEach(med => {
                db.run(sqlMed, [planoId, med.nome, med.dosagem, med.horarios, med.duracao_dias, med.instrucoes], (err) => {
                    if (err) erros.push({ tipo: 'medicamento', nome: med.nome, erro: err });
                    verificarConclusao();
                });
            });
        }
        
        // Inserir exercícios
        if (exercicios && exercicios.length > 0) {
            const sqlExe = `INSERT INTO exercicios (plano_id, nome, frequencia, duracao, repeticoes, instrucoes) VALUES (?, ?, ?, ?, ?, ?)`;
            exercicios.forEach(exe => {
                db.run(sqlExe, [planoId, exe.nome, exe.frequencia, exe.duracao, exe.repeticoes, exe.instrucoes], (err) => {
                    if (err) erros.push({ tipo: 'exercicio', nome: exe.nome, erro: err });
                    verificarConclusao();
                });
            });
        }
        
        // Inserir cuidados
        if (cuidados && cuidados.length > 0) {
            const sqlCuid = `INSERT INTO cuidados (plano_id, nome, descricao, frequencia, horarios) VALUES (?, ?, ?, ?, ?)`;
            cuidados.forEach(cuid => {
                db.run(sqlCuid, [planoId, cuid.nome, cuid.descricao, cuid.frequencia, cuid.horarios], (err) => {
                    if (err) erros.push({ tipo: 'cuidado', nome: cuid.nome, erro: err });
                    verificarConclusao();
                });
            });
        }
    });
});

app.get('/api/planos/paciente/:pacienteId', (req, res) => {
    const { pacienteId } = req.params;
    
    const sqlPlano = `
        SELECT * FROM planos_terapeuticos 
        WHERE paciente_id = ? AND status = 'ativo'
        ORDER BY created_at DESC LIMIT 1
    `;
    
    db.get(sqlPlano, [pacienteId], (err, plano) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!plano) {
            return res.json({ plano: null });
        }
        
        const sqlMed = `SELECT * FROM medicamentos WHERE plano_id = ?`;
        const sqlExe = `SELECT * FROM exercicios WHERE plano_id = ?`;
        const sqlCuid = `SELECT * FROM cuidados WHERE plano_id = ?`;
        
        db.all(sqlMed, [plano.id], (err, medicamentos) => {
            db.all(sqlExe, [plano.id], (err, exercicios) => {
                db.all(sqlCuid, [plano.id], (err, cuidados) => {
                    res.json({ plano, medicamentos, exercicios, cuidados });
                });
            });
        });
    });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});