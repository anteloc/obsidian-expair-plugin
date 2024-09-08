import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";

export class GptAbbrevExpander {
    lang: string;
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
            lang: string;
        }[]
    ) {
        // XXX does it make sense to consider several languages?
        // all examples are for the same language
        this.lang = this.tuningExamples[0].lang;
    }

    public async analyze(abbrevText: string): Promise<string | null> {
        const { apiKey, model } = this.openaiSettings;

        // WARNING: Security risk, added here after a warning message from OpenAI API
        const openai = new OpenAI({
            apiKey,
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

        const expandPrompt = `In ${this.lang}: ${expandTextPrompt}`;

        const messages = [];

        messages.push({
            role: "system",
            content: systemPrompt,
        });

        this.tuningExamples.forEach((example) => {
            messages.push({
                role: "user",
                content: `${expandPrompt}: "${example.abbrevText}"`,
            });
            messages.push({
                role: "assistant",
                content: example.expandedText,
            });
        });

        messages.push({
            role: "user",
            content: `${expandPrompt}: "${abbrevText}"`,
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
