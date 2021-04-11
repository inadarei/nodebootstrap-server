const log     = require('metalogger')();
const { json } = require('body-parser');
const express = require('express');
let app = express();

function responder(req, res) {
    res.send('Hello World!');
}

function jsonResponder(req, res) {
    const input = req.body;
    log.info("wtf", input);
    res.json({rsv: 100});
}

app.get('/', responder);
app.get('/hello', responder);

app.post('/jsonParser', jsonResponder);

module.exports.getServer = () => {
    const serverFactory = require('../../lib');
    const testServer =  serverFactory.getTestServer(app);
    return testServer;
};
