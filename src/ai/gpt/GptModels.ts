// TODO Add other supported models
// Models set in order of preference due to its accuracy, performance, etc.
export const OPENAI_MODELS = [
    {
        name: "GPT-4o Mini",
        model: "gpt-4o-mini",
    },
    {
        name: "GPT-4 Turbo",
        model: "gpt-4-turbo",
    },
];

export const DEFAULT_SYSTEM_PROMPT = `You are an specialist in quick-note taking, using word abbreviations`;

export const DEFAULT_EXPAND_TEXT_PROMPT = `Translate the following text to it's non-abbreviated form`;

export const DEFAULT_GPT_MODEL = OPENAI_MODELS[0];
export const DEFAULT_MAX_WORDS = 500;


