import {
    Plugin,
    MarkdownView,
    Notice,
    Editor,
    Command,
    MarkdownFileInfo,
    Modal,
    App,
    ButtonComponent,
} from "obsidian";

import {
    ExpairPluginSettings,
    ExpairSettingTab,
    DEFAULT_SETTINGS,
    TuningExample,
    OpenAISettingsValue,
    GlobalSettingsValue,
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
        // TODO Check cases where unload is required
        console.log("ExpairPlugin unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        this.addCommands();
        await this.saveData(this.settings);
    }

    private addCommands() {
        console.log("Adding commands");
        
        const { globalSettings, openai, tuningExamples } = this.settings;

        // Group examples by language
        const examplesByLang = tuningExamples.reduce((acc, example) => {
            const lang = example.lang;

            acc[lang] = acc[lang] || [];
            acc[lang].push(example);

            return acc;
        }, {} as Record<string, TuningExample[]>);

        // Create one command per language with an expander for the examples for that language
        Object.entries(examplesByLang)
            .map(([lang, examples]) => new ExpandCommand(this.app, { lang, examples }, globalSettings, openai ))
            .forEach((args) => this.addCommand(args));
    }
}

class ExpandCommand implements Command {
    id: string;
    name: string;
    expander: GptAbbrevExpander;
    preserveOriginal: string;

    constructor(private app: App, exampleSet: { lang: string, examples: TuningExample[] }, globalSettings: GlobalSettingsValue, openai: OpenAISettingsValue) {
        const {lang, examples} = exampleSet;
        const {systemPrompt, expandTextPrompt, preserveOriginal} = globalSettings;

        console.log("command settings", globalSettings);

        this.id = `expand-with-ai-${lang}`;
        this.name = `Expand abbreviations with AI (${lang})`;
        this.preserveOriginal = preserveOriginal;
        this.expander = new GptAbbrevExpander( {systemPrompt, expandTextPrompt}, openai, examples);
    }

    public async editorCallback(editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) {

        const onSubmit = async (yesNo: boolean) => {
            this.runAnalysis(editor, yesNo);
        }

        console.log("preserve original:", this.preserveOriginal);

        switch(this.preserveOriginal) {
            case "Always":
                this.runAnalysis(editor, true);
                break;
            case "Never":
                this.runAnalysis(editor, false);
                break;
            case "Ask":
                this.preserveOriginalModal(onSubmit);
                break;
        }
    }

    private preserveOriginalModal(onSubmit: (yesNo: boolean) => Promise<void>) {
        new YesNoModal(this.app, "Preserve original content?", onSubmit).open();
    }

    public async runAnalysis(editor: Editor, originalCallout: boolean) {

        const decorateWithCallout = (calloutText: string, text: string) => {
            const callout = makeCallout("ai-pre-analysis", "collapsed", "AI", calloutText);
            return `${callout}\n\n${text}`;
        }

        const selection = editor.getSelection();

        if (!selection) {
            new Notice(`First, select some text to be expanded`, 5);
            return;
        }

        const analyzingNotice = new Notice("Expanding text with AI...", 0);

        try {
            const expandedText = await this.expander.analyze(selection) || "No results from AI!";
            const replacement = originalCallout 
                ? decorateWithCallout(selection, expandedText)
                : expandedText;

            editor.replaceSelection(replacement);
            
        } catch (error) {
            console.error("expandAbbrevText: GPT Error:", error);
            new Notice(`Expanding text error!\n${error.message}`, 5);
        } finally {
            analyzingNotice.hide();
        }
    }
} 

class YesNoModal extends Modal {
    constructor(app: App, private message: string, private onSubmit: (yesNo: boolean) => Promise<void>) {
      super(app);

      this.modalEl.style.width = "auto";
      this.modalEl.style.alignContent = "center";
    }
  
    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: this.message });

        const choice = (yesNo: boolean) => {
            this.onSubmit(yesNo);
            this.close();
        }

        new ButtonComponent(contentEl)
            .setButtonText("Yes")
            .setCta()
            .onClick(() => choice(true));

        new ButtonComponent(contentEl)
            .setButtonText("No")
            .setCta()
            .onClick(() => choice(false));
    }
  
    
  }
