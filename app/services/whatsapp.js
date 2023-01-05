const {
    default: makeWASocket,
    DisconnectReason,
    useSingleFileAuthState,
    fetchLatestBaileysVersion,
    delay,
    AnyMessageContent,
} = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");

const { getPBUpdate } = require("./github");
const { getCompletion } = require("./openai");

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
                        const answer = await getCompletion(question);

                        if (answer) {
                            await delay(10);
                            await sock.readMessages([messages[0].key]);
                            await delay(10);
                            await sock.sendMessage(
                                noWa,
                                { text: answer },
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
                }
            }
        }
    });
};

module.exports = {
    connectToWhatsApp,
};
