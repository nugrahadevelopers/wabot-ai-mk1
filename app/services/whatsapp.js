require("dotenv").config();

const {
    default: makeWASocket,
    DisconnectReason,
    useSingleFileAuthState,
    fetchLatestBaileysVersion,
    delay,
    AnyMessageContent,
} = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");

const { getPBUpdate } = require("./github");
const { getCompletion, getImageCompletion } = require("./openai");

const { state, saveState } = useSingleFileAuthState("auth_info.json");

const connectToWhatsApp = async () => {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(
        `Using wa version v${version.join(".")}, isLatest: ${isLatest}`
    );

    const sock = makeWASocket({
        version: version,
        auth: state,
        printQRInTerminal: true,
        markOnlineOnConnect: false,
        level: "silent",
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
                        let readLastQuestin =
                            fs.readFileSync("last_question.json");
                        let questionParsed = JSON.parse(readLastQuestin);

                        let answer;
                        if (questionParsed.length > 0) {
                            for (var i = 0; i < questionParsed.length; i++) {
                                if (questionParsed[i].jId == noWa) {
                                    answer = await getCompletion(
                                        questionParsed[i].question,
                                        questionParsed[i].answer,
                                        question
                                    );
                                } else {
                                    answer = await getCompletion(
                                        "",
                                        "",
                                        question
                                    );
                                }
                            }
                        } else {
                            answer = await getCompletion("", "", question);
                        }

                        if (answer) {
                            await delay(10);
                            await sock.readMessages([messages[0].key]);
                            await delay(10);
                            await sock.sendMessage(
                                noWa,
                                { text: answer },
                                { quoted: messages[0] }
                            );

                            // check if an element exists in array using a comparer function
                            // comparer : function(currentElement)
                            Array.prototype.inArray = function (comparer) {
                                for (var i = 0; i < this.length; i++) {
                                    if (comparer(this[i])) return true;
                                }
                                return false;
                            };

                            // adds an element to the array if it does not already exist using a comparer
                            // function
                            Array.prototype.pushIfNotExist = function (
                                element,
                                comparer
                            ) {
                                if (!this.inArray(comparer)) {
                                    this.push(element);
                                } else {
                                    for (var i = 0; i < this.length; i++) {
                                        if (comparer(this[i])) {
                                            this[i].question = question;
                                            this[i].answer = answer;
                                        }
                                    }
                                }
                            };

                            let lastQuestion = {
                                jId: noWa,
                                question: question,
                                answer: answer,
                            };

                            let readData =
                                fs.readFileSync("last_question.json");
                            let jsonParsed = JSON.parse(readData);

                            jsonParsed.pushIfNotExist(
                                lastQuestion,
                                function (e) {
                                    return e.jId == noWa;
                                }
                            );

                            let jsonData = JSON.stringify(jsonParsed);
                            fs.writeFileSync("last_question.json", jsonData);
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
                    const result = await sock.sendMessage(noWa, listPesan, {
                        ephemeralExpiration: 604800,
                    });
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
                    const result = await getPBUpdate();

                    await delay(10);
                    await sock.readMessages([messages[0].key]);
                    await delay(10);
                    await sock.sendMessage(
                        noWa,
                        {
                            text: `*Update pembuatan aplikasi SIM Personal Beauty* \n \n${result}`,
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
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk === "menu hari ini"
                ) {
                    const menu1 = {
                        image: {
                            url:
                                process.env.APP_HOST +
                                "/media/menu/sayur-bayam.jpg",
                        },
                        caption: "Sayur Bayam ( *Rp 4.500* )",
                    };

                    const menu2 = {
                        image: {
                            url:
                                process.env.APP_HOST +
                                "/media/menu/sop-bihun-telur-puyuh.jpg",
                        },
                        caption: "Sop Bihun Telur Puyuh ( *Rp 7.000* )",
                    };

                    const menu3 = {
                        image: {
                            url:
                                process.env.APP_HOST +
                                "/media/menu/sayur-brokoli.jpg",
                        },
                        caption: "Sayur Brokoli ( *Rp 6.500* )",
                    };

                    await sock.sendMessage(noWa, {
                        text: "*Bingung mau makan apa?*\nKami memberikan beberapa rekomendasi menu untuk kamu.",
                    });
                    await sock.sendMessage(noWa, menu1, {
                        ephemeralExpiration: 604800,
                    });
                    await sock.sendMessage(noWa, menu2, {
                        ephemeralExpiration: 604800,
                    });
                    await sock.sendMessage(noWa, menu3, {
                        ephemeralExpiration: 604800,
                    });
                } else if (
                    !messages[0].key.fromMe &&
                    pesanMasuk.split(" ").slice(0, 2).join(" ") ===
                        "buatkan gambar"
                ) {
                    const prompt = pesanMasuk.replace("buatkan gambar", "");
                    if (prompt == "") {
                        await delay(10);
                        await sock.readMessages([messages[0].key]);
                        await delay(10);
                        await sock.sendMessage(
                            noWa,
                            {
                                text: "Jangan cuman buatkan gambar saja, ketikan deskripsi yang ingin dibuat setelahnya..",
                            },
                            { quoted: messages[0] }
                        );
                    } else {
                        var answer;
                        answer = await getImageCompletion(prompt);
                        console.log(answer);
                        if (answer) {
                            await delay(10);
                            await sock.readMessages([messages[0].key]);
                            await delay(10);
                            const hasil = {
                                image: {
                                    url: answer,
                                },
                                caption: "Ini hasilnya, bagaimana?",
                            };

                            await sock.sendMessage(noWa, hasil, {
                                ephemeralExpiration: 604800,
                            });
                            // await sock.sendMessage(
                            //     noWa,
                            //     { text: answer },
                            //     { quoted: messages[0] }
                            // );
                        }
                    }
                }
            }
        }
    });
};

module.exports = {
    connectToWhatsApp,
};
