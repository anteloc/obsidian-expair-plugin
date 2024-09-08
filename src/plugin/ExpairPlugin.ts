import {
    Plugin,
    MarkdownView,
    MarkdownRenderer,
    MarkdownPostProcessorContext,
    Notice,
    Editor,
} from "obsidian";

import {
    ExpairPluginSettings,
    ExpairSettingTab,
    DEFAULT_SETTINGS,
} from "./ExpairPluginSettings";
// import { ExpairPluginUtils } from "./ExpairPluginUtils";
import { GptAbbrevExpander } from "../ai/gpt/GptAbbrevExpander";
import { ExpandedTextRenderer } from "../renderer/ExpandedTextRenderer";
import { makeCallout } from "./ExpairPluginUtils";

type MarkdownCodeBlockHandler = (
    sourceCode: string,
    el: HTMLElement,
    p: MarkdownPostProcessorContext,
) => Promise<void>;

export default class ExpairPlugin extends Plugin {
    settings: ExpairPluginSettings;
    // private pluginUtils: ExpairPluginUtils;

    async onload() {
        await this.loadSettings();
        
        // this.pluginUtils = new ExpairPluginUtils(
        //     this.settings,
        //     this.app.vault,
        //     this.app.metadataCache,
        //     this.app.workspace,
        // );

        // this.loadGraphApis();

        this.addSettingTab(new ExpairSettingTab(this.app, this));

        this.addCommands();

        // Wait for layout ready to rerender active view to apply the new syntax highlighting
        const layoutReady = () =>
            this.app.workspace
                .getActiveViewOfType(MarkdownView)
                ?.previewMode.rerender(true);

        this.app.workspace.onLayoutReady(layoutReady);
    }

    onunload() {
        // TODO Check if code block processors require unregistering
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private addCommands() {

        const { openai, tuningExamples } = this.settings;

        const decorateWithCallout = (calloutText: string, text: string) => {
            const callout = makeCallout("ai-pre-analysis", "collapsed", "AI", calloutText);
            return `${callout}\n\n${text}`;
        }

        const expandInEditor = (editor: Editor, selection: string, expandedText: string | null) => {

            if (!expandedText) {
                new Notice("AI didn't return any results!");
                return;
            }

            const replacement = decorateWithCallout(selection, expandedText);

            editor.replaceSelection(replacement);
        }

        // Group examples by language
        const examplesByLang = tuningExamples.reduce((acc, example) => {
            const lang = example.lang;

            acc[lang] = acc[lang] || [];
            acc[lang].push(example);

            return acc;
        }, {} as Record<string, any[]>);


        // const expanders = Object.values(examplesByLang).map((examples) => new GptAbbrevExpander(openai, tuningExamples));

        // Returns a closure in order to create a command that will expand the selected text
        // with the expander for the given language
        const expanderEditorCallback = (expander: GptAbbrevExpander) => (editor: Editor) => {
            const selection = editor.getSelection();

            if (!selection) {
                return;
            }

            const analyzingNotice = new Notice("Expanding text with AI...", 0);
            
            expander.analyze(selection)
                .then((expandedText) => expandInEditor(editor, selection, expandedText))
                .catch((error) => {
                    console.error("expandAbbrevText: GPT Error:", error);
                    new Notice(`Expanding text error!\n${error.message}`, 5);
                })
                .finally(() => {
                    analyzingNotice.hide();
                });
        };

        Object.entries(examplesByLang).forEach(([lang, langExamples]) => {
            const abbrevExpander = new GptAbbrevExpander(openai, langExamples);

            const cmd = this.addCommand({
                id: `expand-with-ai-${lang}`,
                name: `Expand abbreviations with AI (${lang})`,
                editorCallback: expanderEditorCallback(abbrevExpander),
            });

            console.log(`Command for ${lang} added: ${cmd.name}`, cmd);
        });

        // this.addCommand({
        //     id: "expand-with-ai",
        //     name: "Expand abbreviations with AI",
        //     editorCallback: (editor: Editor) => {
        //         const selection = editor.getSelection();

        //         if (!selection) {
        //             return;
        //         }

        //         const abbrevExpander = new GptAbbrevExpander(this.settings.openai, this.settings.tuningExamples);
        //         const analyzingNotice = new Notice("Expanding text with AI...", 0);
        //         const expandInEditor = (expandedText: string | null) => {

        //             if (!expandedText) {
        //                 new Notice("AI didn't return any results!");
        //                 return;
        //             }

        //             const replacement = decorateWithCallout(selection, expandedText);

        //             editor.replaceSelection(replacement);
        //         }

        //         abbrevExpander.analyze(selection)
        //             .then(expandInEditor)
        //             .catch((error) => {
        //                 console.error("expandAbbrevText: GPT Error:", error);
        //                 new Notice(`Expanding text error!\n${error.message}`, 5);
        //             })
        //             .finally(() => {
        //                 analyzingNotice.hide();
        //             });
        //     },
        //   });
    }


    private loadGraphApis() {
        const abbrevExpander = new GptAbbrevExpander(this.settings.openai, this.settings.tuningExamples);

        this.registerMarkdownCodeBlockProcessor(
            'expair',
            this.markdownCodeBlockHandler(abbrevExpander),
        );

        // const graphApis = buildGraphApis(this.pluginUtils);

        // Register APIs
        // graphApis.forEach(({ api, language }) => {
        //     this.graphApis[api.apiName] = api.make();

        //     this.registerMarkdownCodeBlockProcessor(
        //         language,
        //         this.markdownCodeBlockHandler(api, plotAnalyzer),
        //     );
        // });
    }

    // Return a closure() that will handle the markdown code block for the given API and
    // using the given plot analyzer for the AI analysis
    // FIXME This code block handler will need to be replaced by another handler 
    // for selected abbreviated text
    private markdownCodeBlockHandler(
        expander: GptAbbrevExpander,
    ): MarkdownCodeBlockHandler {
        return async (
            sourceCode: string,
            el: HTMLElement,
            ppc: MarkdownPostProcessorContext,
        ) => {
            const wrapper = el.createEl("div", {
                cls: "",
                attr: { id: `graph-wrapper` },
            });

            const analyzeButton = wrapper.createEl("button", {
                text: "Analyze with AI",
            });
            const rendererContainer = wrapper.createEl("div");
            const analysisResultsContainer = wrapper.createEl("div");

            wrapper.appendChild(analyzeButton);
            wrapper.appendChild(rendererContainer);
            wrapper.appendChild(analysisResultsContainer);

            el.appendChild(wrapper);

            const textRenderer = new ExpandedTextRenderer(
                expander,
                (message, duration) => new Notice(message, duration),
                this.markdownRenderer(ppc.sourcePath),
                {
                    rendererContainer,
                    analyzeButton,
                    analysisResultsContainer,
                },
            );

            await textRenderer.expandAbbrevText(sourceCode);
        };
    }

    // Return a closure() that will render the markdown content
    // only requiring markdown text and a container for the rendered content
    private markdownRenderer(
        sourcePath: string,
    ): (markdown: string, markdownContainer: HTMLElement) => Promise<void> {
        return async (markdown, markdownContainer) => {
            await MarkdownRenderer.render(
                this.app,
                markdown,
                markdownContainer,
                sourcePath,
                this,
            );
        };
    }
}
