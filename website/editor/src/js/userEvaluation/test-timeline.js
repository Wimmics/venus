import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import callFunction from "@jspsych/plugin-call-function";
import surveyLikert from "@jspsych/plugin-survey-likert";
import surveyMultiChoice from "@jspsych/plugin-survey-multi-choice";
import surveyText from "@jspsych/plugin-survey-text";
import surveyHtmlForm from "@jspsych/plugin-survey-html-form";

import { fetchJson, fetchText } from "../utils/http-utils";
import { USABILITY_TEST_DATA_PATH } from "./user-evaluation";

export class UsabilityTestingWorkflow {
    constructor({startTask = null, waitForUser = null, startTutorial = null} = {}) {
        this.startTask = startTask
        this.waitForUser = waitForUser
        this.startTutorial = startTutorial

        this.timeline = []

        this.frequencyLikert = ["Not at all", "Slightly", "Moderately", "Very", "Extremely"]

        this.debug = false 
    }

    async buildTimeline() {

        // pre-test
        await this._addWelcomeMessage()
        await this._addTermsAndConditionsAgreement()
        await this._addPreTestQuestionnaire()

        // tutorial
        await this._addTutorial()
        

        // tasks
        const json = await fetchJson(`${USABILITY_TEST_DATA_PATH}/tasks.json`)
        for (const task of json.values) {
            await this._addTask(task)
        }

        // post-test 
        await this._addUMUXLiteQuestionnaire()
        await this._addPostTestQuestionnaire()
    }

    getTimeline() {
        return this.timeline
    }

    async _addWelcomeMessage(){
        const htmlContent = await fetchText(`${USABILITY_TEST_DATA_PATH}/welcome.html`);

        this.timeline.push({
            type: surveyHtmlForm,
            preamble: "<h2>Welcome</h2>",
            html: htmlContent,
            button_label: "Start",
            on_load: () => this._styleButtons()
        })
    }

    async _addTermsAndConditionsAgreement() {
        const htmlContent = await fetchText(`${USABILITY_TEST_DATA_PATH}/terms.html`);

        this.timeline.push({
            type: surveyHtmlForm,
            preamble: "<h2>Privacy and Consent</h2>",
            html: htmlContent,
            button_label: "Continue",
            on_load: () => this._styleButtons()
        })
    }   

    async _addPreTestQuestionnaire() {
        const json = await fetchJson(`${USABILITY_TEST_DATA_PATH}/pre-questionnaire.json`)
        console.log("json = ", json)

        this.timeline.push({
            type: surveyHtmlForm,
            preamble: `<h2>Background Questionnaire</h2>
                    <p>
                        Please answer the following questions about your background and your familiarity with the concepts and technologies related to this study. Your responses will only be used for research purposes.
                    </p>`,
            html: this._generateHTMLForm(json.values),
            button_label: "Continue",

            on_load: () => {
                this._initializeForm()
            },

            on_load: () => {
                if (this.debug) {
                    this._fillCurrentForm();
                }

                this._styleButtons()
            }
        });
        
    }

    async _addTutorial() {
        
        const onboardingContent = await fetchText(`${USABILITY_TEST_DATA_PATH}/onboarding.html`);

        this.timeline.push({
            type: htmlButtonResponse,
            stimulus: onboardingContent,
            choices: ["Start Onboarding"],
            on_load: () => this._styleButtons()
        })

        const terminologyContent = await fetchText(`${USABILITY_TEST_DATA_PATH}/terminology.html`);

        this.timeline.push({
            type: htmlButtonResponse,
            stimulus: terminologyContent,
            choices: ["Start Guided Tour"],
            on_load: () => this._styleButtons()
        })

        let taskLog = null
        this.timeline.push({
            type:callFunction,
            async: true, 
            func: async (done) => {
                await this.startTutorial()

                taskLog = await this.waitForUser()

                done()
            },
            data: () => ({
                ...taskLog
            })
        })
    }

    async _addTask(task) {
        const baseContent = await fetchText(`${USABILITY_TEST_DATA_PATH}/tasks/${task.id}.html`);

        const sparqlRestriction = `<li>Do not modify the SPARQL query.</li>`
        const htmlContent = `${baseContent} 
            <div class="info-box">
            <strong>Instructions</strong>

            <ul>
                ${task.id !== "task_7" ? sparqlRestriction : ""}
                <li>Click <strong>Task</strong> at any time to reopen the task description.</li>
                <li>Click <strong>Done</strong> once you have completed the task.</li>
            </ul>
        </div>
        `
        
        this.timeline.push({
            type: htmlButtonResponse,
            stimulus: htmlContent,
            choices: ["Start Task"],
            on_load: () => this._styleButtons()
        });

        let taskLog = null
        this.timeline.push({
            type: callFunction,
            async: true,
            func: async done => {

                await this.startTask({ taskConfig: task, taskDescription: htmlContent});

                taskLog = await this.waitForUser();

                done();
            },
            data: () => ({
                task_id: task.id,
                ...taskLog
            })
        });

        await this._addRawTLXQuestionnaire(task.id)
    }

    

    async _addRawTLXQuestionnaire(task) {
        const json = await fetchJson(`${USABILITY_TEST_DATA_PATH}/raw-tlx.json`)

        this.timeline.push({
            type: surveyLikert,
            data: {
                questionnaire: "nasa_tlx",
                task: task
            },
            preamble: `
                <h2>Task Workload Assessment</h2>
                <p>
                    Please rate each aspect of the task from <strong>1 (Very Low)</strong>
                    to <strong>10 (Very High)</strong>.
                </p>
            `,
            questions: this._getScale10Questions(json.values),
            button_label: "Continue",

            on_load: () => {
                if (this.debug) {
                    this._fillCurrentForm();
                }

                this._styleButtons()
            }
        });
    }

    async _addUMUXLiteQuestionnaire() {
        const json = await fetchJson(`${USABILITY_TEST_DATA_PATH}/umux-lite.json`)
        console.log("json = ", json)

        this.timeline.push({
            type: surveyLikert,
            data: {
                questionnaire: "umux_lite"
            },
            preamble: `
                <h2>System Usability Assessment</h2>
                <p>
                    Please rate each of the following statements from <strong>1 (Strongly Disagree)</strong>
                    to <strong>10 (Strongly Agree)</strong>.
                </p>
            `,
            questions: this._getScale10Questions(json.values),
            button_label: "Continue",

            on_load: () => {
                if (this.debug) {
                    this._fillCurrentForm();
                }

                this._styleButtons()
            }
        });

    }

    async _addPostTestQuestionnaire(){
        const json = await fetchJson(`${USABILITY_TEST_DATA_PATH}/post-test.json`)

        this.timeline.push({
            type: surveyHtmlForm,
            preamble: `
                <h2>Post-test Questionnaire</h2>

                <p>
                Thank you for participating in this study and for completing all the tasks. We only have a few final questions to gather your feedback on the VENUS framework and your overall experience with this study.
                </p>

                <p>
                Once you have answered the questions below, click <strong>Submit and Finish</strong> to submit your responses and complete the study. After submission, you will no longer be able to modify your answers.
                </p>
                `,
            html: this._generateHTMLForm(json.values),
            button_label: "Submit and Finish",

            on_load: () => { 
                if (this.debug) {
                    this._fillCurrentForm();
                }

                this._styleButtons({type: "success"}) 
            }
        })

    }

    // --------- begin HTML form helpers ----------

    _generateHTMLForm(values) {
        let questionTypes = values.map(d => d.type)
        questionTypes = questionTypes.filter( (d,i) => questionTypes.indexOf(d) === i )

        let questions = ``
        for (const type of questionTypes) {
            const data = values.filter(d => d.type === type)
            for (const d of data) {
                questions += this._getHTMLQuestion({type, data: d}) ?? ''
            }
        }

        return questions
    }
    _getHTMLQuestion({type, data}){
        switch(type) {
            case "number":
                return this._getNumberQuestion(data)   
            case "open-question":
                return this._getOpenQuestion(data)     
            case "multiple-choice":
                return this._getMultipleChoiceQuestion(data)
            case "likert-frequency":
            case "likert-familiarity":
            case "likert-experience":
                return this._getLikertQuestion({type, data})
            case "likert-matrix-frequency":
            case "likert-matrix-familiarity":
                return this._getLikertMatrix({type, data})
            case "multiple-open":
                return this._getMultipleOpenQuestion(data)
            default:
                return null
        }
        
    }

    _getNumberQuestion(data) {
       return `<div class="jspsych-question">
                <label>${data.description}</label>
                <input class="form-control" type="number" name="${data.id}" required>
            </div>`
    }

    _getOpenQuestion(data){
        return `<div class="jspsych-question">
                <label>${data.description}</label>
                <textarea class="form-control" name="${data.id}" required></textarea>
            </div>`
    }

    _getMultipleOpenQuestion(data) {
        let html = `
            <div class="jspsych-question">
                <label>${data.description}</label>`;

        for (let i = 1; i <= 3; i++) {
            html += `
                <textarea
                    class="form-control mb-2"
                    name="${data.id}_${i}"
                    placeholder="Answer ${i}"
                    required
                ></textarea>`;
        }

        html += `</div>`;

        return html;
    }

    _getMultipleChoiceQuestion(data){
        if (!data.options.length) return null
        let html = `<div class="jspsych-question"><label>${data.description}</label>`
        data.options.forEach((d,i) => {
            html += `<label><input type="radio" name="${data.id}" value="${d}" ${i === 1 ? "required" : ""}> ${d}</label>`
        })
        html += `
            <label>
                <input
                    type="radio"
                    name="${data.id}"
                    value="Other"
                    id="${data.id}-other-radio"
                    class="other-radio"
                >
                Other:
                <input
                    type="text"
                    name="${data.id}_other"
                    id="${data.id}-other-text"
                    class="other-text"
                    disabled
                >
            </label>
        </div>`;

        return html
    }

    

    _resolveLikertScale(type) {
        if (type.includes("frequency"))
            return ["Never", "Rarely", "Sometimes", "Often", "Always"]

        if (type.includes("familiarity"))
            return ["Not at all", "Slightly", "Somewhat", "Moderately", "Extremely"]

        if (type.includes("experience"))
            return ["No experience", "Limited experience", "Moderate experience", "Extensive experience", "Expert"]

        return []
    }
    _getLikertQuestion({type, data}){
        const likertLabels = this._resolveLikertScale(type)
        let html = `<div class="jspsych-question"><label>${data.description}</label>`
        likertLabels.forEach( (d,i) => {
            html += `<label><input type="radio" name="${data.id}" value="${i}" ${i === 1 ? "required" : ""}> ${d}</label>`
        })
        return html += `</div>`
    }

    _getLikertMatrix({type, data}) {
        if (!data?.options?.length) return null

        const likertLabels = this._resolveLikertScale(type)
        
        let html = `<div class="jspsych-question"><label>${data.description}</label>`

        // table head
        html += `<table class="table table-sm likert-matrix">
            <thead>
            <tr><th></th>`

        likertLabels.forEach(d => {
            html += `<th>${d}</th>` // table columns (likert labels)
        })

        html += `</tr>
            </thead>
            <tbody>` // beginning of table body

        data.options.forEach(option => {
            html += `<tr><td>${option}</td>`;

            [1, 2, 3, 4, 5].forEach((d,i) => {
                html += `<td><input type="radio" name="${option}" value="${d}" ${i === 1 ? "required" : ""}></td>`
            })
            html += `</tr>`
        })
        
        return html + `</tbody></table></div>`

    }
    // ------ end HTML form helpers -----

    // ---- data helpers ------

    _getScale10Questions(data) {
        const questions = []
        const scale10 = Array.from({ length: 10 }, (_, i) => String(i + 1));
            
        for (const value of data) {
            questions.push({
                prompt: value.description,
                labels: scale10,
                required: false // change to true once the protocol is done 
            })
        }

        return questions
    }

    // ------ on_load helpers ------

    _styleButtons({ type = "primary" } = {}) {
        const button = document.querySelector(".jspsych-btn");
        if (!button) return;

        const styles = {
            primary: {
                bg: "#0d6efd",
                border: "#0d6efd",
                color: "#fff"
            },
            success: {
                bg: "#198754",
                border: "#198754",
                color: "#fff"
            }
        };

        const observer = new MutationObserver(() => {
            observer.disconnect();
            applyStyle();
            observer.observe(button, {
                attributes: true,
                attributeFilter: ["style"]
            });
        });

        const applyStyle = () => {
            const s = styles[type];
            button.style.backgroundColor = s.bg;
            button.style.borderColor = s.border;
            button.style.color = s.color;
        };

        observer.observe(button, {
            attributes: true,
            attributeFilter: ["style"]
        });

        applyStyle();
    }

    _initializeForm() {
        // Enable the behavior of the option "Other" on multiple choice questions
        document.querySelectorAll(".other-radio").forEach(radio => {

            const group = radio.name;
            const text = radio.parentElement.querySelector(".other-text");

            radio.form
                .querySelectorAll(`input[type="radio"][name="${group}"]`)
                .forEach(input => {

                    input.addEventListener("change", () => {

                        if (radio.checked) {
                            text.disabled = false;
                            text.required = true;
                            text.focus();
                        } else {
                            text.disabled = true;
                            text.required = false;
                            text.value = "";
                        }

                    });

                });

        });
    }

    // Debug helper
    _fillCurrentForm() {
        const form = document.querySelector("#jspsych-content form");
        if (!form) return;

        // Textareas
        form.querySelectorAll("textarea").forEach(el => {
            if (!el.value) {
                el.value = "Test response";
            }
        });

        // Text inputs
        form.querySelectorAll('input[type="text"]').forEach(el => {
            if (!el.value) {
                el.value = "Test";
            }
        });

        // Number inputs
        form.querySelectorAll('input[type="number"]').forEach(el => {
            if (!el.value) {
                const min = Number(el.min) || 18;
                const max = Number(el.max) || 65;
                el.value = Math.floor(Math.random() * (max - min + 1)) + min;
            }
        });

        // Radio groups
        const groups = new Map();

        form.querySelectorAll('input[type="radio"]').forEach(radio => {
            if (!groups.has(radio.name)) {
                groups.set(radio.name, []);
            }
            groups.get(radio.name).push(radio);
        });

        groups.forEach(radios => {
            const choice = radios[Math.floor(Math.random() * radios.length)];
            choice.checked = true;
            choice.dispatchEvent(new Event("change", { bubbles: true }));
        });

        // Checkboxes
        form.querySelectorAll('input[type="checkbox"][required]').forEach(cb => {
            cb.checked = true;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
        });

        // Selects
        form.querySelectorAll("select").forEach(select => {
            if (select.options.length > 0) {
                const index = Math.floor(Math.random() * select.options.length);
                select.selectedIndex = index;
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    }


}