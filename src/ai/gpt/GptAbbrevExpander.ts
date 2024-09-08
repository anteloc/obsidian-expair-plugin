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
        private tuningExamples: {
            abbrevText: string;
            expandedText: string;
        }[]
    ) {}

    public async analyze(abbrevText: string): Promise<string | null> {
        const { apiKey, model } = this.openaiSettings;

        const openai = new OpenAI({
            apiKey,
            // WARNING: This is a security risk, added here after a
            // warning message from the OpenAI API.
            dangerouslyAllowBrowser: true,
        });

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

        const messages = [];

        messages.push({
            role: "system",
            content: systemPrompt,
        });

        this.tuningExamples.forEach((example) => {
            messages.push({
                role: "user",
                content: `${expandTextPrompt}: "${example.abbrevText}"`,
            });
            messages.push({
                role: "assistant",
                content: example.expandedText,
            });
        });

        messages.push({
            role: "user",
            content: `${expandTextPrompt}: "${abbrevText}"`,
        });

        const body = {
            model: model,
            n: 1,
            max_tokens: 1000,
            messages,
        };

        return body as ChatCompletionCreateParamsNonStreaming;
    }
}
