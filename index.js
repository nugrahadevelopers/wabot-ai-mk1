require("dotenv").config();

const { connectToWhatsApp } = require("./app/services/whatsapp");

const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");
const port = process.env.PORT || 3001;

connectToWhatsApp().catch((err) => console.log("unexpected error: " + err));

app.use(express.static("public"));

server.listen(port, () => {
    console.log("Server Berjalan pada Port : " + port);
});
