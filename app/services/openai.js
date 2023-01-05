require("dotenv").config();

const openAI = require("openai");
const { Configuration, OpenAIApi } = openAI;

const configuration = new Configuration({
    organization: "org-2turFt9yKJabdk8tjBhSxQGK",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getCompletion = async (question) => {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${question}`,
        max_tokens: 500,
        temperature: 0.9,
    });

    return response.data.choices[0].text;
};

module.exports = {
    getCompletion,
};
