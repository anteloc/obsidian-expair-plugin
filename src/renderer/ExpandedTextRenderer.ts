import { GptAbbrevExpander } from "src/ai/gpt/GptAbbrevExpander";

export class ExpandedTextRenderer {

    constructor(
        private expander: GptAbbrevExpander,
        private alertNotice: (message: string, duration: number) => any,
        private markdownRenderer: (
            markdown: string,
            markdownContainer: HTMLElement,
        ) => Promise<void>,
        // FIXME Remove the rendererEls and leave only the one required for adding the callout to it, currently: analysisResultsContainer
        private rendererEls: {
            rendererContainer: HTMLDivElement;
            analyzeButton: HTMLButtonElement;
            analysisResultsContainer: HTMLElement;
        },
    ) {

    }

    public async expandAbbrevText(abbrevText: string) {
        const analyzingNotice = this.alertNotice("Expanding text...", 0);

        let calloutType = "ai-pre-analysis";
        let calloutHeader = "AI";
        let result;

        try {
            result =
                (await this.expander.analyze(abbrevText)) ||
                "**ERROR** Failed to analyze the abbreviated text";
        } catch (error) {
            console.error("expandAbbrevText: GPT Error:", error);

            calloutType = "error";
            calloutHeader = "AI Error";
            result = error.message;
        } finally {

            await this.markdownRenderer(
                this.makeCallout(
                    calloutType,
                    calloutHeader,
                    result,
                ),
                this.rendererEls.analysisResultsContainer,
            );

            analyzingNotice.hide();
        }
    }

    private makeCallout(
        type: string,
        header: string,
        text: string,
    ) {
        const lines = [];

        const textLines = text.split("\n").map((line) => `> ${line}`);

        lines.push(`> [!${type}]+ ${header}`);
        lines.push(...textLines);

        return lines.join("\n");
    }
}
