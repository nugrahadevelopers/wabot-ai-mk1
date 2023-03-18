require("dotenv").config();

const openAI = require("openai");
const { Configuration, OpenAIApi } = openAI;

const configuration = new Configuration({
    organization: "org-2turFt9yKJabdk8tjBhSxQGK",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getCompletion = async (lastQuestion, lastAnswer, question) => {
    let messages;
    if (lastQuestion != "") {
        console.log(lastQuestion);
        messages = [
            {
                role: "system",
                content: "Kamu adalah asisten yang sangat membantu.",
            },
            {
                role: "user",
                content: `${lastQuestion}`,
            },
            {
                role: "assistant",
                content: `${lastAnswer}`,
            },
            {
                role: "user",
                content: `${question}`,
            },
        ];
    } else {
        messages = [
            {
                role: "system",
                content: "Kamu adalah asisten yang sangat membantu.",
            },
            {
                role: "user",
                content: `${question}`,
            },
        ];
    }

    const response = await openai.createChatCompletion({
        model: process.env.OPENAI_API_MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.5,
    });

    return response.data.choices[0].message.content;

    // const response = await openai.createCompletion({
    //     model: process.env.OPENAI_API_MODEL,
    //     prompt: `${question}`,
    //     max_tokens: 500,
    //     temperature: 0.9,
    // });

    // return response.data.choices[0].text;
};

module.exports = {
    getCompletion,
};
