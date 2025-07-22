const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');

const app = express();
const db = new sqlite3.Database('./database.db');

// --- Sessão (usaremos no futuro) ---
app.use(session({
  secret: 'chave-secreta',
  resave: false,
  saveUninitialized: true
}));

// --- Middlewares ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Cria tabela se não existir ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor TEXT,
      cliente TEXT,
      produto TEXT,
      quantidade INTEGER,
      valor REAL,
      status TEXT DEFAULT 'Recebido'
    )
  `);
});

// --- Tela do vendedor ---
app.get('/vendedor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendedor.html'));
});

// --- Dashboard (admin) ---
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- Cadastrar pedido ---
app.post('/pedido', (req, res) => {
  const { vendedor, cliente, produto, quantidade, valor } = req.body;
  db.run(
    `INSERT INTO pedidos (vendedor, cliente, produto, quantidade, valor) VALUES (?, ?, ?, ?, ?)`,
    [vendedor, cliente, produto, quantidade, valor],
    () => res.redirect('/vendedor')
  );
});

// --- Listar pedidos (vendedoras veem os próprios pedidos e status) ---
app.get('/meus-pedidos', (req, res) => {
  db.all(`SELECT * FROM pedidos ORDER BY id DESC`, [], (err, rows) => {
    res.json(rows); // Retorna JSON para consumo via AJAX no front
  });
});

// --- Atualizar status (admin muda status do pedido) ---
app.post('/atualizar-status', (req, res) => {
  const { id, status } = req.body;
  db.run(
    `UPDATE pedidos SET status = ? WHERE id = ?`,
    [status, id],
    () => res.redirect('/dashboard')
  );
});

// --- API de pedidos para o dashboard ---
app.get('/todos-pedidos', (req, res) => {
  db.all(`SELECT * FROM pedidos ORDER BY id DESC`, [], (err, rows) => {
    res.json(rows);
  });
});

// --- Tratamento 404 ---
app.use((req, res) => {
  res.status(404).send('Página não encontrada 😕');
});

// --- Inicia servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Rodando em http://localhost:${PORT}`));
