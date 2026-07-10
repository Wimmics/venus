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

        const originalStartCustomWorkspace = this.editorApp.startCustomWorkspace.bind(this.editorApp);

        this.editorApp.startCustomWorkspace = async (...args) => {
            const sparql = await this.editorApp.sparqlPanelController.getText();

            await originalStartCustomWorkspace(...args);

            await this.editorApp.sparqlPanelController.setText(sparql);
        };

        document.querySelector("#encodingRunButton")
            .addEventListener("click", () => {
                this.currentTaskLog.runCount++;
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
        console.log("encoding = ", task.encoding === false)
        if (task.encoding === false) 
            this.editorApp.encodingPanelController.setValue({})
    }

    async finishTask() {
        // Hide done button
        this.doneButton.hidden = true;

        // Show jsPsych again
        this.testContainer.classList.add("active");

        this.currentTaskLog.logDuration(performance.now())

        const finalEncoding = await this.editorApp.encodingPanelController.parseValue()
        this.currentTaskLog.finalEncoding = finalEncoding.value

        this.currentTaskLog.finalQuery = await this.editorApp.sparqlPanelController.getText()

        if (this.waitingResolve) {
            this.waitingResolve(this.currentTaskLog);
            this.waitingResolve = null;
        }
    }
}