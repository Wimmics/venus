import { CodeMirrorPanel } from "./codemirror-panel.js";

export class EncodingEditor {
	constructor({ holderId }) {
		this.panel = new CodeMirrorPanel({ holderId, readOnly: false, language: "json" });
	}
	
	async init() {
		await this.panel.init("");
	}
	
	async setValue(value) {
		await this.panel.setText(JSON.stringify(value, null, 2));
	}
	
	async parseValue() {
		const rawText = await this.panel.getText();
		try {
			return { value: JSON.parse(rawText), error: null };
		} catch (error) {
			return { value: null, error };
		}
	}
	
	async format() {
		const parsed = await this.parseValue();
		if (parsed.error) return parsed;
		await this.setValue(parsed.value);
		return parsed;
	}
	
	async getText() {
		return this.panel.getText();
	}

	async insertAtCursor(text) {
		this.panel.insertAtCursor(text)
	}
}
