const log     = require('metalogger')();
const express = require('express');
const app = express();

function responder(req, res) {
    res.send('Hello World!');
}

app.get('/', responder);
app.get('/hello', responder);

// Note: listening on port "0" results to listening on random, free port. Avoids conflicts.
module.exports.getServer = () => {
    const server = app.listen(0, function () {
        const port = server.address().port;
        //log.info(`Test server listening at port ${port} \n`);
    });

    return server;
};
