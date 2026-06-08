const express = require('express');

const app = express();

app.get('/hello', (req, res) => {
  const name = req.query.name;
  const who = name && String(name).length > 0 ? String(name) : 'World';
  res.status(200).json({ message: `Hello, ${who}!` });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app;
