require("dotenv").config();

const openAI = require("openai");
const { Configuration, OpenAIApi } = openAI;

const {
    default: makeWASocket,
    MessageType,
    MessageOptions,
    Mimetype,
    DisconnectReason,
    useSingleFileAuthState,
    makeInMemoryStore,
} = require("@adiwajshing/baileys");

const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./auth_info.json");
const store = makeInMemoryStore({});
store.readFromFile("./baileys_store.json");
setInterval(() => {
    store.writeToFile("./baileys_store.json");
}, 10_000);

const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");
const port = process.env.PORT || 3001;

const configuration = new Configuration({
    organization: "org-2turFt9yKJabdk8tjBhSxQGK",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

//fungsi suara capital
function capital(textSound) {
    const arr = textSound.split(" ");
    for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }
    const str = arr.join(" ");
    return str;
}

async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage || message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }

            return message;
        },
    });

    store.bind(sock.ev);

    sock.ev.on("connection.update", (update) => {
        //console.log(update);
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect =
                (lastDisconnect.error = Boom)?.output?.statusCode !==
                DisconnectReason.loggedOut;
            console.log(
                "connection closed due to ",
                lastDisconnect.error,
                ", reconnecting ",
                shouldReconnect
            );
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === "open") {
            console.log("opened connection");
            sock.sendPresenceUpdate("unavailable");
        }
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        //console.log(messages);
        sock.sendPresenceUpdate("unavailable");

        if (type === "notify") {
            if (!messages[0].key.fromMe) {
                //tentukan jenis pesan berbentuk text
                const pesan = messages[0].message.conversation;

                //nowa dari pengirim pesan sebagai id
                const noWa = messages[0].key.remoteJid;

                // await sock.readMessages([messages[0].key]);

                //kecilkan semua pesan yang masuk lowercase
                const pesanMasuk = pesan.toLowerCase();

                if (
                    !messages[0].key.fromMe &&
                    pesanMasuk.split(" ").slice(0, 2).join(" ") === "halo reno"
                ) {
                    const question = pesanMasuk.replace("halo reno", "");
                    const response = await openai.createCompletion({
                        model: "text-davinci-003",
                        prompt: `${question}`,
                        max_tokens: 500,
                        temperature: 0.9,
                    });

                    if (response.data.choices[0].text) {
                        await sock.readMessages([messages[0].key]);
                        await sock.sendMessage(
                            noWa,
                            { text: response.data.choices[0].text },
                            { quoted: messages[0] }
                        );
                    }
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "list jasa"
                ) {
                    const sections = [
                        {
                            title: "PEMBUATAN WEBSITE",
                            rows: [
                                {
                                    title: "Landing Page",
                                    rowId: "1",
                                },
                                {
                                    title: "Company Profile",
                                    rowId: "2",
                                },
                            ],
                        },
                        {
                            title: "APLIKASI",
                            rows: [
                                {
                                    title: "Point of Sales / Kasir",
                                    rowId: "4",
                                },
                                {
                                    title: "Sistem Informasi Perusahaan",
                                    rowId: "5",
                                },
                            ],
                        },
                    ];

                    const listPesan = {
                        text: "Produk/Jasa yang kami tawarkan di Distech Studio",
                        title: "Daftar Produk/Jasa",
                        buttonText: "Tampilakn Produk/Jasa",
                        sections,
                    };

                    await sock.readMessages([messages[0].key]);
                    const result = await sock.sendMessage(noWa, listPesan);
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "ganti nama"
                ) {
                    if (
                        messages[0].key.participant !== null ||
                        messages[0].key.participant !== undefined
                    ) {
                        await sock.groupUpdateSubject(
                            messages[0].key.remoteJid,
                            "Halo Reno"
                        );
                    }
                }
            }
        }
    });
}

connectToWhatsApp().catch((err) => console.log("unexpected error: " + err)); // catch any errors

server.listen(port, () => {
    console.log("Server Berjalan pada Port : " + port);
});
