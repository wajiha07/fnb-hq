const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Optional: serve built React UI from one port (http://localhost:4000)
const uiDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(uiDist, 'index.html'))) {
  app.use(express.static(uiDist));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    return res.sendFile(path.join(uiDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
