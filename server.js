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

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas do Vendedor ---

// Formulário do vendedor
app.get('/vendedor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendedor.html'));
});

// Envia pedido
app.post('/vendedor/pedido', (req, res) => {
  const { vendedor, cliente, produto, quantidade, valor } = req.body;
  db.run(
    `INSERT INTO pedidos (vendedor, cliente, produto, quantidade, valor) VALUES (?, ?, ?, ?, ?)`,
    [vendedor, cliente, produto, quantidade, valor],
    () => res.redirect('/vendedor')
  );
});

// Lista os pedidos do vendedor específico (simulação sem login, usando query)
app.get('/vendedor/pedidos', (req, res) => {
  const vendedor = req.query.vendedor;
  db.all(`SELECT * FROM pedidos WHERE vendedor = ?`, [vendedor], (err, rows) => {
    let html = `<h1>Pedidos de ${vendedor}</h1>
      <table border="1" cellpadding="8" cellspacing="0">
      <tr>
        <th>ID</th><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Status</th>
      </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td><td>${p.cliente}</td><td>${p.produto}</td>
          <td>${p.quantidade}</td><td>R$ ${p.valor.toFixed(2)}</td><td>${p.status}</td>
        </tr>`;
    });
    html += `</table><br><a href="/vendedor">Voltar</a>`;
    res.send(html);
  });
});

// --- Dashboard Administrativo ---

app.get('/dashboard', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    let html = `<h1>Dashboard Administrativo</h1>
      <table border="1" cellpadding="8" cellspacing="0">
      <tr>
        <th>ID</th><th>Vendedor</th><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Status</th><th>Ação</th>
      </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td><td>${p.vendedor}</td><td>${p.cliente}</td><td>${p.produto}</td>
          <td>${p.quantidade}</td><td>R$ ${p.valor.toFixed(2)}</td><td>${p.status}</td>
          <td>
            ${p.status !== 'Finalizado' ? `
              <form method="GET" action="/mudar-status/${p.id}" style="display:inline;">
                <select name="novoStatus">
                  <option ${p.status === 'Aguardando Retorno' ? 'selected' : ''}>Aguardando Retorno</option>
                  <option ${p.status === 'Arte Aprovada' ? 'selected' : ''}>Arte Aprovada</option>
                  <option ${p.status === 'Produzindo' ? 'selected' : ''}>Produzindo</option>
                  <option ${p.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                </select>
                <button type="submit">Atualizar</button>
              </form>` : 'Pedido Finalizado'
            }
          </td>
        </tr>`;
    });
    html += `</table>`;
    res.send(html);
  });
});

// Atualiza status do pedido
app.get('/mudar-status/:id', (req, res) => {
  const { id } = req.params;
  const { novoStatus } = req.query;
  db.run(`UPDATE pedidos SET status = ? WHERE id = ?`, [novoStatus, id], () => {
    res.redirect('/dashboard');
  });
});

// --- Inicia servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Rodando em http://localhost:${PORT}`));
