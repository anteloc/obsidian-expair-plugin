import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import ExpairPlugin from "./ExpairPlugin";
import {
    DEFAULT_EXPAND_TEXT_PROMPT,
    DEFAULT_GPT_MODEL,
    DEFAULT_MAX_WORDS,
    DEFAULT_SYSTEM_PROMPT,
    OPENAI_MODELS,
} from "src/ai/gpt/GptModels";

export interface ExpairPluginSettings {
    openai: {
        apiKey: string;
        model: string;
        systemPrompt: string;
        expandTextPrompt: string;
        maxWords: number;
    };
}

export const DEFAULT_SETTINGS: ExpairPluginSettings = {
    openai: {
        apiKey: "",
        model: DEFAULT_GPT_MODEL.model,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        expandTextPrompt: DEFAULT_EXPAND_TEXT_PROMPT,
        maxWords: DEFAULT_MAX_WORDS,
    },
};

export class ExpairSettingTab extends PluginSettingTab {
    plugin: ExpairPlugin;

    constructor(app: App, plugin: ExpairPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        this.openaiSettings(containerEl);
    }

    private openaiSettings(containerEl: HTMLElement) {
        const openai = this.plugin.settings.openai;

        new Setting(containerEl).setName("OpenAI").setHeading();

        new Setting(containerEl)
            .setName("GPT API key")
            .setDesc("Required for expanding abbreviated texts with GPT")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your API key")
                    .setValue(openai.apiKey)
                    .onChange(async (value) => {
                        openai.apiKey = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName("Model")
            .setDesc("Model used for abbreviated text expansion")
            .addDropdown((modelSelector) => {
                // Add models to dropdown in order of preference
                OPENAI_MODELS.forEach(({ name, model }) =>
                    modelSelector.addOption(model, name),
                );

                modelSelector.setValue(openai.model).onChange(async (model) => {
                    openai.model = model;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("System prompt")
            .setDesc("GPT will assume the role described in this prompt")
            .addTextArea((text) => {
                const el = text.inputEl;

                el.rows = 10;
                el.cols = 50;
                // el.style.width = "100%";
                el.style.resize = "none";

                text.setValue(openai.systemPrompt).onChange(async (value) => {
                    openai.systemPrompt = value;
                    await this.plugin.saveSettings();
                });
            })
            .addButton((button) => {
                button.setButtonText("Reset").onClick(async () => {
                    openai.systemPrompt = DEFAULT_SYSTEM_PROMPT;
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName("Expand abbreviated text prompt")
            .setDesc(
                "GPT will expand the selected text according to the instructions in this prompt",
            )
            .addTextArea((text) => {
                const el = text.inputEl;

                el.rows = 10;
                el.cols = 50;
                // el.style.width = "100%";
                el.style.resize = "none";

                text.setValue(openai.expandTextPrompt).onChange(
                    async (value) => {
                        openai.expandTextPrompt = value;
                        await this.plugin.saveSettings();
                    },
                );
            })
            .addButton((button) => {
                button.setButtonText("Reset").onClick(async () => {
                    openai.expandTextPrompt = DEFAULT_EXPAND_TEXT_PROMPT;
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        // FIXME maxWords now will be max number of abbreviations to expand
        new Setting(containerEl)
            .setName("Max words")
            .setDesc("Maximum number of words in GPT's response")
            .addText((text) => {
                text.setValue(openai.maxWords.toString()).onChange(
                    async (value) => {
                        try {
                            openai.maxWords = parseInt(value);
                            await this.plugin.saveSettings();
                        } catch (error) {
                            new Notice(`Invalid maxWords value: '${value}'`);
                        }
                    },
                );
            });
    }
}
