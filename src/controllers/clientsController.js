const Client = require("../models/Client");
const Address = require("../models/Address");
const ForbiddenError = require("../errors/ForbiddenError");
const InexistingIdError = require("../errors/InexistingIdError");

async function postClient(clientData) {
    const client = await Client.create(clientData);
    return client;
}

async function getAllClients() {
    const clients = await Client.findAll();
    return clients;
}

async function getClientById(id) {
    const client = await Client.findByPk(id);
    if(!client) throw new InexistingIdError;

    return client;
}

module.exports = { 
    postClient,
    getAllClients,
    getClientById   
}