import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import ExpairPlugin from "./ExpairPlugin";
import { OPENAI_MODELS, DEFAULT_GPT_MODEL } from "src/ai/gpt/GptModels";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EXPAND_TEXT_PROMPT,
  DEFAULT_ABBREV_TEXT,
  DEFAULT_EXPANDED_TEXT,
  DEFAULT_MAX_WORDS,
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  DEFAULT_PRESERVE_ORIGINAL,
} from "src/plugin/ExpairPluginDefaults";
import { v4 as uuid } from "uuid";

export type GlobalSettingsValue = {
  systemPrompt: string;
  expandTextPrompt: string;
  maxWords: number;
  preserveOriginal: "Always" | "Ask" | "Never";
};

export type OpenAISettingsValue = {
  apiKey: string;
  model: string;
};

export type TuningExample = {
  exampleId: string;
  abbrevText: string;
  expandedText: string;
  lang: string;
};

type OperationResult = {
  success: boolean;
  message: string;
};

export interface ExpairPluginSettings {
  globalSettings: GlobalSettingsValue;
  openai: OpenAISettingsValue;
  tuningExamples: TuningExample[];
}

const defaultTuningExample = (): TuningExample => ({
  exampleId: uuid(),
  abbrevText: DEFAULT_ABBREV_TEXT,
  expandedText: DEFAULT_EXPANDED_TEXT,
  lang: DEFAULT_LANG,
});

export const DEFAULT_SETTINGS: ExpairPluginSettings = {
  globalSettings: {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    expandTextPrompt: DEFAULT_EXPAND_TEXT_PROMPT,
    maxWords: DEFAULT_MAX_WORDS,
    preserveOriginal: DEFAULT_PRESERVE_ORIGINAL,
  },
  openai: {
    apiKey: "",
    model: DEFAULT_GPT_MODEL.model,
  },
  tuningExamples: [defaultTuningExample()],
};

class AddTuningExampleModal extends Modal {
  editableExample: TuningExample;
  mode: "Add" | "Edit";

  constructor(
    app: App,
    editableExample: TuningExample | null,
    private onSave: (example: TuningExample) => OperationResult,
  ) {
    super(app);

    this.mode = editableExample ? "Edit" : "Add";

    // Either clone the given example to avoid modifying the original by reference
    // or create a new one with default values if none is provided
    this.editableExample = editableExample
      ? { ...editableExample }
      : defaultTuningExample();

    this.modalEl.style.width = "auto";
  }

  onOpen() {
    const { contentEl } = this;
    const { abbrevText, expandedText, lang } = this.editableExample;

    contentEl.createEl("h1", { text: `${this.mode} tuning example` });

    new Setting(contentEl).setName("Language").addDropdown((dropdown) => {
      SUPPORTED_LANGS.forEach((suppLang) =>
        dropdown.addOption(suppLang, suppLang),
      );

      dropdown
        .setValue(lang)
        .onChange((value: string) => (this.editableExample.lang = value));
    });

    new Setting(contentEl).setName("Abbreviated text").addTextArea((text) => {
      const el = text.inputEl;

      el.rows = 10;
      el.cols = 80;
      el.style.resize = "none";

      text
        .setValue(abbrevText)
        .onChange((value) => (this.editableExample.abbrevText = value));
    });

    new Setting(contentEl).setName("Expanded text").addTextArea((text) => {
      const el = text.inputEl;

      el.rows = 10;
      el.cols = 80;
      el.style.resize = "none";

      text
        .setValue(expandedText)
        .onChange((value) => (this.editableExample.expandedText = value));
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Save")
          .setCta()
          .onClick(() => {
            const result = this.onSave(this.editableExample);

            if (result.success) {
              this.close();
            } else {
              new Notice(result.message);
            }
          }),
      )
      .addButton((btn) =>
        btn
          .setButtonText("Cancel")
          .setCta()
          .onClick(() => this.close()),
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export class ExpairSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: ExpairPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.globalSettings(containerEl);
    this.openaiSettings(containerEl);
    this.tuningExamplesSettings(containerEl);
  }

  private globalSettings(containerEl: HTMLElement) {
    const globalSettings = this.plugin.settings.globalSettings;

    new Setting(containerEl)
      .setName("System prompt")
      .setDesc("GPT will assume the role described in this prompt")
      .addTextArea((text) => {
        const el = text.inputEl;

        el.rows = 10;
        el.cols = 50;
        el.style.resize = "none";

        text.setValue(globalSettings.systemPrompt).onChange(async (value) => {
          globalSettings.systemPrompt = value;
          await this.plugin.saveSettings();
        });
      })
      .addButton((button) => {
        button.setButtonText("Reset").onClick(async () => {
          globalSettings.systemPrompt = DEFAULT_SYSTEM_PROMPT;
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
        el.style.resize = "none";

        text
          .setValue(globalSettings.expandTextPrompt)
          .onChange(async (value) => {
            globalSettings.expandTextPrompt = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) => {
        button.setButtonText("Reset").onClick(async () => {
          globalSettings.expandTextPrompt = DEFAULT_EXPAND_TEXT_PROMPT;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // FIXME maxWords now will be max number of abbreviations to expand
    new Setting(containerEl)
      .setName("Max words")
      .setDesc("WIP Maximum number of words in GPT's response")
      .addText((text) => {
        text
          .setValue(globalSettings.maxWords.toString())
          .onChange(async (value) => {
            try {
              globalSettings.maxWords = parseInt(value);
              await this.plugin.saveSettings();
            } catch (error) {
              new Notice(`Invalid maxWords value: '${value}'`);
            }
          });
      });

    new Setting(containerEl)
      .setName("Preserve original text")
      .setDesc("Add a callout containing the replaced text")
      .addDropdown((preserveSelector) => {
        preserveSelector
          .addOption("Always", "Always")
          .addOption("Never", "Never")
          .addOption("Ask", "Ask")
          .setValue(globalSettings.preserveOriginal)
          .onChange(async (value: "Always" | "Never" | "Ask") => {
            globalSettings.preserveOriginal = value;
            await this.plugin.saveSettings();
          });
      });
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
  }

  private tuningExamplesSettings(containerEl: HTMLElement) {
    const tuningExamples = this.plugin.settings.tuningExamples;

    const existingAbbrevText = (example: TuningExample) =>
      tuningExamples.some(
        (e) =>
          e.abbrevText === example.abbrevText &&
          e.exampleId !== example.exampleId,
      );
    const emptyExampleText = (example: TuningExample) =>
      example.abbrevText.trim() === "" || example.expandedText.trim() === "";
    const upsertExample = (example: TuningExample) => {
      const idx = tuningExamples.findIndex(
        (e) => e.exampleId === example.exampleId,
      );
      if (idx === -1) {
        tuningExamples.push(example);
      } else {
        tuningExamples[idx] = example;
      }
    };

    const onSave = (editableExample: TuningExample) => {
      let result = {
        success: true,
        message: "",
      };

      if (existingAbbrevText(editableExample)) {
        result = {
          success: false,
          message: `Abbreviated text example already exists!`,
        };
      } else if (emptyExampleText(editableExample)) {
        result = {
          success: false,
          message: `Abbreviated and/or expanded text cannot be empty!`,
        };
      }

      if (result.success) {
        upsertExample(editableExample);

        this.plugin.saveSettings();
        this.display();
      }

      return result;
    };

    new Setting(containerEl)
      .setName("Fine tuning examples")
      .setDesc("Examples for fine tuning the AI model")
      .setHeading()
      .addButton((button) => {
        button.setButtonText("+").onClick(() => {
          new AddTuningExampleModal(this.app, null, onSave).open();
        });
      });

    tuningExamples.forEach((example: TuningExample, idx) =>
      this.buildTuningExampleSettings(containerEl, example, idx, onSave),
    );
  }

  private buildTuningExampleSettings(
    containerEl: HTMLElement,
    example: TuningExample,
    idx: number,
    onSave: (example: TuningExample) => OperationResult,
  ) {
    const tuningExamples = this.plugin.settings.tuningExamples;

    new Setting(containerEl)
      .setName(`Example ${idx + 1}`)
      .addTextArea((abbrevTextArea) => {
        const el = abbrevTextArea.inputEl;

        el.rows = 5;
        el.cols = 25;
        el.style.resize = "none";

        abbrevTextArea.setValue(example.abbrevText).setDisabled(true);
      })
      .addButton((button) => {
        // TODO find an easier way to put a label with an icon here
        button
          .setIcon("arrow-right-to-line")
          .setTooltip("Should expand to...")
          .setDisabled(true);
      })
      .addTextArea((expandedTextArea) => {
        const el = expandedTextArea.inputEl;

        el.rows = 5;
        el.cols = 25;
        el.style.resize = "none";

        expandedTextArea.setValue(example.expandedText).setDisabled(true);
      })
      .addButton((button) => {
        button.setIcon("pencil").onClick(() => {
          new AddTuningExampleModal(this.app, example, onSave).open();
        });
      })
      .addButton((button) => {
        button.setIcon("trash-2").onClick(() => {
          if (tuningExamples.length === 1) {
            new Notice("At least one example is required");
            return;
          }

          tuningExamples.splice(idx, 1);

          this.display();
        });
      });
  }
}
