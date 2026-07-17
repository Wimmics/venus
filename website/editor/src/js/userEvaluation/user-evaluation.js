import { initJsPsych } from "jspsych";
import "jspsych/css/jspsych.css";
import { TaskLog } from "./task-log";
import { UsabilityTestingWorkflow } from "./test-timeline";

export class UserEvaluation {
    constructor({editorApp}) {
        this.editorApp = editorApp

        this.doneButton = document.querySelector("#doneButton")
        this.testContainer = document.querySelector("#user-testing-overlay")

        this.waitingResolve = null;
        
        this.currentTaskLog = null

        this.workflow = new UsabilityTestingWorkflow({
            startTask: (id) => this.startTask(id),
            finishTask: () => this.finishTask(),
            waitForUser: () => this.waitForUser()
        })
    }

    async init(){
        this.testContainer.classList.add("active");

        this.jsPsych = initJsPsych({
            display_element: "jspsych-container",

            // show_progress_bar: true,
            // auto_update_progress_bar: false,
            // allow_backward: true,   

            on_finish: () => {
                this.testContainer.classList.remove("active");

                console.log(this.jsPsych.data.get().values());
            },

            on_trial_finish: () => {
                console.log(this.jsPsych.data.get().values());
            }
        });

        await this.workflow.buildTimeline()

        this.jsPsych.run(this.workflow.getTimeline())

        this.doneButton.addEventListener("click", () => {
            this.finishTask();
        })

        this._wrapEditor()
    }

    _wrapEditor() {
        // Intercept and log errors
        const originalSetStatus = this.editorApp.setStatus.bind(this.editorApp);

        this.editorApp.setStatus = (message, isError, ...args) => {
            if (isError) {
                this.currentTaskLog.errors.push({
                    time: performance.now() - this.currentTaskLog.startTime,
                    type: this.getErrorType(message),
                    message
                });
            }

            return originalSetStatus(message, isError, ...args);
        };

        // Intercept and log selected visualization templates, while keeping the sparql query visible after template selection during user evaluation. By default, the query is deleted.
        const originalStartCustomWorkspace = this.editorApp.startCustomWorkspace.bind(this.editorApp);

        this.editorApp.startCustomWorkspace = async (templateId, ...args) => {
            const sparql = await this.editorApp.sparqlPanelController.getText();
 
            const template = this.editorApp.getTemplateById(templateId);

            this.currentTaskLog.templateSelections.push({
                time: performance.now() - this.currentTaskLog.startTime,
                templateId,
                templateLabel: template.label,
                component: template.component
            });

            await originalStartCustomWorkspace(templateId, ...args);

            await this.editorApp.sparqlPanelController.setText(sparql);
        };

        // Intercept and log selected snippets in the encoding panel
        const originalAddSnippet = this.editorApp.encodingPanelController.addSnippet.bind(this.editorApp.encodingPanelController);

        this.editorApp.encodingPanelController.addSnippet = async (d, ...args) => {
            const selectedValue = document.querySelector(`#${d.key}`).value;
            const component = this.editorApp.encodingPanelController.getActiveComponent()
            const snippet = d.action(selectedValue, component)

            this.currentTaskLog.encodingSnippets.push({
                time: performance.now() - this.currentTaskLog.startTime,
                key: d.key,
                snippet: snippet,
                selectedValue,
                component: component
            });

            return originalAddSnippet(d, ...args);
        };

        // Count the number of times user click on run ; tentative count
        document.querySelector("#encodingRunButton")
            .addEventListener("click", async () => {
                this.currentTaskLog.runCount++;

                this.currentTaskLog.configs.push({
                    time: performance.now() - this.currentTaskLog.startTime,
                    encoding: {...await this._getCurrentEncoding()},
                    query: await this.editorApp.sparqlPanelController.getText(),
                    runCount: this.currentTaskLog.runCount 
                })
            });
    }

    getErrorType(message){
        if (message.includes("JSON.parse")) {
            return "JSON syntax"
        }

        if (message.includes("Invalid encoding")) {
            return "encoding"
        }
        
        return "unknown"
    }

    waitForUser() {
        return new Promise(resolve => {
            this.waitingResolve = resolve;
        });
    }

    async startTask(task = null) {
        console.log("task = ", task)
        this.currentTaskLog = new TaskLog({task: task, startTime: performance.now()})

        this.testContainer.classList.remove("active");

        this.doneButton.hidden = false

        // Load scenario into the editor
        await this.editorApp.loadScenarioAndRefresh(task.scenario_id)

        // Prepare terrain
        this.editorApp.sparqlPanelController.setReadOnly(!task.sparql)
        
        if (task.encoding === false) 
            this.editorApp.encodingPanelController.setValue({})
    }

    async finishTask() {
        // Hide done button
        this.doneButton.hidden = true;

        // Show jsPsych again
        this.testContainer.classList.add("active");

        this.currentTaskLog.logDuration(performance.now())

        this.currentTaskLog.finalEncoding = {...await this._getCurrentEncoding()}

        this.currentTaskLog.finalQuery = await this.editorApp.sparqlPanelController.getText()

        if (this.waitingResolve) {
            this.waitingResolve(this.currentTaskLog);
            this.waitingResolve = null;
        }
    }

    async _getCurrentEncoding(){
        const finalEncoding = await this.editorApp.encodingPanelController.parseValue()
        return finalEncoding.value
    }
}