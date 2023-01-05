require("dotenv").config();

const { Octokit } = require("@octokit/core");

const openAI = require("openai");
const { Configuration, OpenAIApi } = openAI;

const {
    default: makeWASocket,
    DisconnectReason,
    useSingleFileAuthState,
    fetchLatestBaileysVersion,
    delay,
    AnyMessageContent,
} = require("@adiwajshing/baileys");

const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

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

const configuration = new Configuration({
    organization: "org-2turFt9yKJabdk8tjBhSxQGK",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_TOKEN,
});

async function connectToWhatsApp() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(
        `Using wa version v${version.join(".")}, isLatest: ${isLatest}`
    );

    const sock = makeWASocket({
        version: version,
        auth: state,
        printQRInTerminal: true,
        getMessage: async (key) => {
            return {
                conversation: "hello",
            };
        },
    });

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
                    if (question == "") {
                        await delay(10);
                        await sock.readMessages([messages[0].key]);
                        await delay(10);
                        await sock.sendMessage(
                            noWa,
                            {
                                text: "Jangan cuman halo reno saja, ketikan pertanyaanmu setelahnya..",
                            },
                            { quoted: messages[0] }
                        );
                    } else {
                        const response = await openai.createCompletion({
                            model: "text-davinci-003",
                            prompt: `${question}`,
                            max_tokens: 500,
                            temperature: 0.9,
                        });

                        if (response.data.choices[0].text) {
                            await delay(10);
                            await sock.readMessages([messages[0].key]);
                            await delay(10);
                            await sock.sendMessage(
                                noWa,
                                { text: response.data.choices[0].text },
                                { quoted: messages[0] }
                            );
                        }
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

                    await delay(10);
                    await sock.readMessages([messages[0].key]);
                    await delay(10);
                    const result = await sock.sendMessage(noWa, listPesan);
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk.split(" ").slice(0, 2).join(" ") === "ganti nama"
                ) {
                    if (pesanMasuk.replace("ganti nama", "") === "") {
                        await delay(10);
                        await sock.sendMessage(
                            noWa,
                            {
                                text: "Jangan lupa memasukan nama group yg diinginkan setelah kata *ganti nama*",
                            },
                            { quoted: messages[0] }
                        );
                    } else {
                        if (
                            messages[0].key.participant !== null ||
                            messages[0].key.participant !== undefined
                        ) {
                            await delay(10);
                            await sock.groupUpdateSubject(
                                messages[0].key.remoteJid,
                                pesanMasuk.replace("ganti nama", "")
                            );
                        }
                    }
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "cek bot"
                ) {
                    await delay(10);
                    await sock.sendMessage(
                        noWa,
                        { text: "Bot aktif" },
                        { quoted: messages[0] }
                    );
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "hai reno update pb"
                ) {
                    const result = await octokit.request(
                        "GET /repos/nugrahadevelopers/SIMPersonalBeauty/commits?per_page=5",
                        {
                            owner: "nugrahadevelopers",
                            repo: "SIMPersonalBeauty",
                        }
                    );

                    let text = "";
                    const data = result.data.forEach((item, index) => {
                        let date = new Date(item.commit.author.date);
                        text += `Oleh: ${
                            item.commit.author.name
                        }\nTanggal: ${date.toLocaleString("en-GB", {
                            hour12: false,
                        })}\nUpdate: ${item.commit.message}\n \n=========\n \n`;
                    });

                    await delay(10);
                    await sock.readMessages([messages[0].key]);
                    await delay(10);
                    await sock.sendMessage(
                        noWa,
                        {
                            text: `*Update pembuatan aplikasi SIM Personal Beauty* \n \n${text}`,
                        },
                        { quoted: messages[0] }
                    );
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "ambil profile picture"
                ) {
                    const ppUrl = await sock.profilePictureUrl(
                        messages[0].key.remoteJid,
                        "image"
                    );
                    console.log("download profile picture from: " + ppUrl);
                }
            }
        }
    });
}

connectToWhatsApp().catch((err) => console.log("unexpected error: " + err));

server.listen(port, () => {
    console.log("Server Berjalan pada Port : " + port);
});
