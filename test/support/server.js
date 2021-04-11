const log     = require('metalogger')();
const { json } = require('body-parser');
const express = require('express');
const app = express();

function responder(req, res) {
    res.send('Hello World!');
}

function jsonResponder(req, res) {
    res.json(req.body);
}


module.exports.getServer = async () => {
    const serverFactory = require('../../lib');
    return new Promise(resolve=>{
        serverFactory.getTestServer(app,(server,app)=>{
            app.get('/', responder);
            app.get('/hello', responder);

            app.post('/jsonParser', jsonResponder);

            resolve(server);
        });
    });
};
