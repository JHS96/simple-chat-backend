const express = require('express');

const messageRoutes = require('./routes/messages');

const app = express();

app.use('/messages', messageRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
