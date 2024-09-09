import {
    Plugin,
    MarkdownView,
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
import { makeCallout } from "./ExpairPluginUtils";

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

            // TODO Add a callout with the original text by choice of the user, 
            // e. g. in settings or a custom command, due to that callout markdown text 
            // can break other block elements, e. g. lists when trying to replace just one item
            // const replacement = decorateWithCallout(selection, expandedText);
            const replacement = expandedText;

            editor.replaceSelection(replacement);
        }

        // Returns a closure in order to create a command that will expand the selected text
        // with the expander for the given language
        const expanderCallback = (expander: GptAbbrevExpander) => (editor: Editor) => {
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

        // Group examples by language
        const examplesByLang = tuningExamples.reduce((acc, example) => {
            const lang = example.lang;

            acc[lang] = acc[lang] || [];
            acc[lang].push(example);

            return acc;
        }, {} as Record<string, any[]>);

        // Create one command per language with an expander for the examples for that language
        Object.entries(examplesByLang)
            .map(([lang, langExamples]) => ({
                id: `expand-with-ai-${lang}`,
                name: `Expand abbreviations with AI (${lang})`,
                editorCallback: expanderCallback(new GptAbbrevExpander(openai, langExamples)),
            }))
            .forEach((args) => this.addCommand(args));
    }
}
