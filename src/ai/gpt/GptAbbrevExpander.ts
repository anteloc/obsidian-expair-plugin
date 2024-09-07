import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";

export class GptAbbrevExpander {
    constructor(
        private openaiSettings: {
            apiKey: string;
            model: string;
            systemPrompt: string;
            expandTextPrompt: string;
            // FIXME adapt maxWords to throw error if the number of abbrevs is too high
            maxWords: number;
        },
    ) {}

    public async analyze(abbrevText: string): Promise<string | null> {
        const { apiKey, model } = this.openaiSettings;

        const openai = new OpenAI({
            apiKey,
            // WARNING: This is a security risk, added here after a
            // warning message from the OpenAI API.
            dangerouslyAllowBrowser: true,
        });

        // Just one image for now
        const requestBody = await this.requestBody(abbrevText);

        console.log(`Ongoing ${model} request...`, requestBody);

        const response = await openai.chat.completions.create(requestBody);

        console.log(`Response received for ${model} request`);

        return response.choices[0].message.content;
    }

    private async requestBody(
        abbrevText: string,
    ): Promise<ChatCompletionCreateParamsNonStreaming> {
        const { model, expandTextPrompt, systemPrompt } =
            this.openaiSettings;

        const userContent = [];

        const userPrompt = {
            type: "text",
            text: `${expandTextPrompt} 
            ${abbrevText}`,
        };

        // const userAbbrevText = {
        //     type: "text",
        //     text: abbrevText,
        // };

        userContent.push(userPrompt);

        const body = {
            model: model,
            n: 1,
            max_tokens: 1000,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userContent,
                },
            ],
        };

        return body as ChatCompletionCreateParamsNonStreaming;
    }
}
