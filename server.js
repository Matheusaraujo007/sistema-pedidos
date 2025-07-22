const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('./database.db');

// --- Cria tabela se não existir ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor TEXT,
      cliente TEXT,
      telefone TEXT,
      produto TEXT,
      quantidade INTEGER,
      valor REAL,
      status TEXT DEFAULT 'Recebido'
    )
  `);
});

// --- Middlewares ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Tela do vendedor ---
app.get('/vendedor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendedor.html'));
});

// --- Cadastrar pedido ---
app.post('/pedido', (req, res) => {
  const { vendedor, cliente, telefone, produto, quantidade, valor } = req.body;
  db.run(
    `INSERT INTO pedidos (vendedor, cliente, telefone, produto, quantidade, valor) VALUES (?, ?, ?, ?, ?, ?)`,
    [vendedor, cliente, telefone, produto, quantidade, valor],
    () => res.redirect('/vendedor')
  );
});

// --- Listar pedidos do vendedor ---
app.get('/pedidos', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    let html = `
      <h1>Pedidos Recebidos</h1>
      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <th>ID</th><th>Vendedor</th><th>Cliente</th><th>Telefone</th><th>Produto</th>
          <th>Qtd</th><th>Valor</th><th>Status</th><th>Ação</th>
        </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.vendedor}</td>
          <td>${p.cliente}</td>
          <td>${p.telefone}</td>
          <td>${p.produto}</td>
          <td>${p.quantidade}</td>
          <td>R$ ${p.valor.toFixed(2)}</td>
          <td>${p.status}</td>
          <td>${p.status !== 'Entregue'
            ? `<a href="/entregar/${p.id}">Entregar</a>`
            : ''
          }</td>
        </tr>`;
    });
    html += `</table><br><a href="/vendedor">Voltar</a>`;
    res.send(html);
  });
});

// --- Mudar status para Entregue ---
app.get('/entregar/:id', (req, res) => {
  db.run(
    `UPDATE pedidos SET status = 'Entregue' WHERE id = ?`,
    [req.params.id],
    () => res.redirect('/pedidos')
  );
});

// --- Dashboard completo ---
app.get('/dashboard', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    const totalPedidos = rows.length;
    const totalValor = rows.reduce((acc, p) => acc + p.valor, 0);
    const entregues = rows.filter(p => p.status === 'Entregue').length;
    const pendentes = totalPedidos - entregues;

    let html = `
      <h1>📊 Dashboard de Pedidos</h1>
      <ul>
        <li><strong>Total de Pedidos:</strong> ${totalPedidos}</li>
        <li><strong>Pedidos Entregues:</strong> ${entregues}</li>
        <li><strong>Pedidos Pendentes:</strong> ${pendentes}</li>
        <li><strong>Total Vendido:</strong> R$ ${totalValor.toFixed(2)}</li>
      </ul>

      <h2>Lista de Pedidos</h2>
      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <th>ID</th><th>Vendedor</th><th>Cliente</th><th>Telefone</th><th>Produto</th>
          <th>Qtd</th><th>Valor</th><th>Status</th><th>Ação</th>
        </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.vendedor}</td>
          <td>${p.cliente}</td>
          <td>${p.telefone}</td>
          <td>${p.produto}</td>
          <td>${p.quantidade}</td>
          <td>R$ ${p.valor.toFixed(2)}</td>
          <td>${p.status}</td>
          <td>
            <form method="POST" action="/atualizar-status/${p.id}">
              <select name="status" onchange="this.form.submit()">
                <option ${p.status === 'Recebido' ? 'selected' : ''}>Recebido</option>
                <option ${p.status === 'Aguardando Retorno' ? 'selected' : ''}>Aguardando Retorno</option>
                <option ${p.status === 'Arte Aprovada' ? 'selected' : ''}>Arte Aprovada</option>
                <option ${p.status === 'Produzindo' ? 'selected' : ''}>Produzindo</option>
                <option ${p.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                <option ${p.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
              </select>
            </form>
          </td>
        </tr>`;
    });
    html += `</table><br><a href="/vendedor">Voltar</a>`;
    res.send(html);
  });
});

// --- Atualizar status ---
app.post('/atualizar-status/:id', (req, res) => {
  const { status } = req.body;
  db.run(
    `UPDATE pedidos SET status = ? WHERE id = ?`,
    [status, req.params.id],
    () => res.redirect('/dashboard')
  );
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).send('Página não encontrada 😕');
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Rodando em http://localhost:${PORT}`));
