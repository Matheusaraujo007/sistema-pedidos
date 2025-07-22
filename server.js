const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('./database.db');

// --- Criação da tabela ---
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

// --- Middlewares ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas do vendedor ---

// Tela do vendedor
app.get('/vendedor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendedor.html'));
});

// Cadastrar pedido
app.post('/vendedor/pedido', (req, res) => {
  const { vendedor, cliente, produto, quantidade, valor } = req.body;
  db.run(
    `INSERT INTO pedidos (vendedor, cliente, produto, quantidade, valor) VALUES (?, ?, ?, ?, ?)`,
    [vendedor, cliente, produto, quantidade, valor],
    () => res.redirect('/vendedor')
  );
});

// Consultar pedidos do vendedor
app.get('/vendedor/pedidos', (req, res) => {
  const { vendedor } = req.query;
  db.all(`SELECT * FROM pedidos WHERE vendedor = ?`, [vendedor], (err, rows) => {
    let html = `
      <h1>Meus Pedidos</h1>
      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <th>ID</th><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Status</th>
        </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.cliente}</td>
          <td>${p.produto}</td>
          <td>${p.quantidade}</td>
          <td>R$ ${p.valor.toFixed(2)}</td>
          <td>${p.status}</td>
        </tr>`;
    });
    html += `</table><br><a href="/vendedor">Voltar</a>`;
    res.send(html);
  });
});

// --- Rotas do admin ---

// Dashboard (tela)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Dados do dashboard (JSON)
app.get('/admin/dados', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    const totalPedidos  = rows.length;
    const totalValor    = rows.reduce((acc, p) => acc + p.valor, 0);
    const entregues     = rows.filter(p => p.status === 'Entregue' || p.status === 'Finalizado').length;
    const pendentes     = totalPedidos - entregues;

    res.json({
      totalPedidos,
      totalValor,
      entregues,
      pendentes,
      pedidos: rows
    });
  });
});

// Atualiza status do pedido (POST)
app.post('/admin/atualizar-status', (req, res) => {
  const { id, status } = req.body;
  db.run(`UPDATE pedidos SET status = ? WHERE id = ?`, [status, id], () => res.sendStatus(200));
});

// --- Rota fallback (404) ---
app.use((req, res) => {
  res.status(404).send('Página não encontrada 😕');
});

// --- Inicia servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Rodando em http://localhost:${PORT}`));
