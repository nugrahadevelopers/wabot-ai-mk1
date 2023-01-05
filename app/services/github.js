require("dotenv").config();

const { Octokit } = require("@octokit/core");
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_TOKEN,
});

const getPBUpdate = async () => {
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

    return text;
};

module.exports = {
    getPBUpdate,
};
