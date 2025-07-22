const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('./database.db');

// Criação da tabela
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
app.use(express.static('public'));

// Rota para receber pedidos
app.post('/pedido', (req, res) => {
  const { vendedor, cliente, produto, quantidade, valor } = req.body;
  db.run(
    `INSERT INTO pedidos (vendedor, cliente, produto, quantidade, valor) VALUES (?, ?, ?, ?, ?)`,
    [vendedor, cliente, produto, quantidade, valor],
    () => res.redirect('/')
  );
});

// Rota para exibir pedidos
app.get('/pedidos', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    let html = '<h1>Pedidos Recebidos</h1><table border="1"><tr><th>ID</th><th>Vendedor</th><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Status</th><th>Ação</th></tr>';
    rows.forEach(p => {
      html += `<tr>
        <td>${p.id}</td>
        <td>${p.vendedor}</td>
        <td>${p.cliente}</td>
        <td>${p.produto}</td>
        <td>${p.quantidade}</td>
        <td>${p.valor}</td>
        <td>${p.status}</td>
        <td>${p.status !== 'Entregue' ? '<a href="/entregar/' + p.id + '">Entregar</a>' : ''}</td>
      </tr>`;
    });
    html += '</table><br><a href="/">Voltar</a>';
    res.send(html);
  });
});

// Marcar pedido como entregue
app.get('/entregar/:id', (req, res) => {
  db.run(`UPDATE pedidos SET status = 'Entregue' WHERE id = ?`, [req.params.id], () => {
    res.redirect('/pedidos');
  });
});

// Página inicial (formulário)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Rodando na porta', PORT));
