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
      telefone_cliente TEXT,
      produto TEXT,
      quantidade INTEGER,
      valor REAL,
      data_pedido TEXT,
      previsao_entrega TEXT,
      status TEXT DEFAULT 'Recebido'
    )
  `);
});

// --- Middlewares ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Rota principal: formulário de novo pedido ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Cadastrar pedido ---
app.post('/pedido', (req, res) => {
  const { vendedor, cliente, telefone_cliente, produto, quantidade, valor, data_pedido, previsao_entrega } = req.body;

  db.run(
    `INSERT INTO pedidos (vendedor, cliente, telefone_cliente, produto, quantidade, valor, data_pedido, previsao_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [vendedor, cliente, telefone_cliente, produto, quantidade, valor, data_pedido, previsao_entrega],
    () => res.redirect('/')
  );
});

// --- Listar pedidos simples (tabela HTML) ---
app.get('/pedidos', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    let html = `
      <h1>Pedidos Recebidos</h1>
      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <th>ID</th><th>Vendedor</th><th>Cliente</th><th>Produto</th>
          <th>Qtd</th><th>Valor</th><th>Status</th><th>Data do Pedido</th><th>Previsão de Entrega</th><th>Ação</th>
        </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.vendedor}</td>
          <td>${p.cliente}</td>
          <td>${p.produto}</td>
          <td>${p.quantidade}</td>
          <td>R$ ${p.valor.toFixed(2)}</td>
          <td>${p.status}</td>
          <td>${p.data_pedido}</td>
          <td>${p.previsao_entrega}</td>
          <td>${p.status !== 'Entregue'
            ? `<a href="/entregar/${p.id}">Entregar</a>`
            : ''
          }</td>
        </tr>`;
    });
    html += `</table><br><a href="/">Voltar</a>`;
    res.send(html);
  });
});

// --- Rota de entrega (muda status) ---
app.get('/entregar/:id', (req, res) => {
  db.run(
    `UPDATE pedidos SET status = 'Entregue' WHERE id = ?`,
    [req.params.id],
    () => res.redirect('/pedidos')
  );
});

// --- Dashboard com estatísticas e lista completa ---
app.get('/dashboard', (req, res) => {
  db.all(`SELECT * FROM pedidos`, [], (err, rows) => {
    const totalPedidos  = rows.length;
    const totalValor    = rows.reduce((acc, p) => acc + p.valor, 0);
    const entregues     = rows.filter(p => p.status === 'Entregue').length;
    const pendentes     = totalPedidos - entregues;

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
          <th>ID</th><th>Vendedor</th><th>Cliente</th><th>Produto</th>
          <th>Qtd</th><th>Valor</th><th>Status</th><th>Data do Pedido</th><th>Previsão de Entrega</th><th>Ação</th>
        </tr>`;
    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.vendedor}</td>
          <td>${p.cliente}</td>
          <td>${p.produto}</td>
          <td>${p.quantidade}</td>
          <td>R$ ${p.valor.toFixed(2)}</td>
          <td>${p.status}</td>
          <td>${p.data_pedido}</td>
          <td>${p.previsao_entrega}</td>
          <td>${p.status !== 'Entregue'
            ? `<a href="/entregar/${p.id}">Entregar</a>`
            : ''
          }</td>
        </tr>`;
    });
    html += `</table><br><a href="/">Voltar</a>`;
    res.send(html);
  });
});

// --- Tratamento 404 para rotas não definidas ---
app.use((req, res) => {
  res.status(404).send('Página não encontrada 😕');
});

// --- Inicia servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
