import { initJsPsych } from "jspsych";
import "jspsych/css/jspsych.css";
import { TaskLog } from "./task-log";
import { UsabilityTestingWorkflow } from "./test-timeline";

// Tutorial content
import usabilityContent from "../tutorial/content/usability.js";

export const USABILITY_TEST_DATA_PATH = `${import.meta.env.BASE_URL}/data/usability-testing`
const STORAGE_KEY = "venus-usability-test";

export class UserEvaluation {
    constructor({editorApp, tutorial, toolbarId}) {
        this.editorApp = editorApp
        this.tutorial = tutorial

        this.doneButton = document.querySelector("#doneButton")
        this.viewTaskButton = document.querySelector("#viewTask") 

        this.waitingResolve = null;
        
        this.currentTaskLog = null

        this.workflow = new UsabilityTestingWorkflow({
            startTask: (id) => this.startTask(id),
            waitForUser: () => this.waitForUser(),
            startTutorial: () => this.launchTutorial()
        }) 
    }

    async init(){
        this._setupContainer()
        this._setupControlButtons()
        this._setupDocsOverlay()

        this._setupTutorial()

        this.jsPsych = initJsPsych({
            display_element: "jspsych-container",

            // show_progress_bar: true,
            // auto_update_progress_bar: false,
            // allow_backward: true,   

            on_finish: async () => {
                this.testContainer.classList.remove("active");
                await this.saveToServer()
            },

            on_trial_finish: () => {
                console.log(this.jsPsych.data.get().values());

                this.saveTrialData()
            }
        });

        await this.setTestState()

        await this.workflow.buildTimeline()

        const timeline = this.workflow.getTimeline()
        this.jsPsych.run(timeline.slice(this.state.currentStep))

        this._setupEditorInterceptor()
        this._setupToastInterceptor()

        // Disable example selection
        document.querySelector("#scenarioSelect").disabled = true   
    }

    _setupContainer() {
        this.testContainer = document.createElement("div");
        this.testContainer.id = "user-testing-overlay";

        this.testContainer.innerHTML = `
            <div id="jspsych-container"></div>
        `;
        this.testContainer.classList.add("active");

        document.body.appendChild(this.testContainer);
    }

    _setupControlButtons() {
        if (document.querySelector("#usability-controls")) {
            return;
        }

        document.body.insertAdjacentHTML("beforeend", `
            <div id="usability-controls" hidden>
                <button
                    id="viewTask"
                    class="btn btn-primary">
                    <i class="fa-solid fa-file-lines"></i>
                    Task
                </button>

                <button
                    id="doneButton"
                    class="btn btn-success">
                    <i class="fa-solid fa-check"></i>
                    Done
                </button>
            </div>
        `);

        this.controls = document.querySelector("#usability-controls");
        this.viewTaskButton = document.querySelector("#viewTask");
        this.doneButton = document.querySelector("#doneButton");

        this.doneButton.addEventListener("click", () => {
            this.finishTask();
        })

        this.viewTaskButton.addEventListener("click", () => {
            this.showTaskDescription()
        })
    }

    _setupDocsOverlay() {
        if (document.querySelector("#doc-overlay")) {
            return;
        }

        document.body.insertAdjacentHTML("beforeend", `
            <div id="doc-overlay" hidden>
                <div id="doc-dialog">
                    <div id="doc-navbar-mask">
                        <span class="doc-title">
                            <i class="fa-solid fa-book"></i>
                            VENUS Documentation
                        </span>

                        <button id="close-doc" type="button" aria-label="Close">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <iframe
                        id="doc-frame"
                        src="${import.meta.env.VITE_DOCS_URL}"
                        title="VENUS Documentation">
                    </iframe>
                </div>
            </div>
        `);

        const overlay = document.querySelector("#doc-overlay");
        const closeButton = document.querySelector("#close-doc");
        const docsButton = document.querySelector("#docs");

        docsButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            this.currentTaskLog.docsCount++;

            overlay.hidden = false;
        });

        closeButton.addEventListener("click", () => {
            overlay.hidden = true;
        });
    }

    _setupTutorial() {
        if (!this.tutorial) return

        this.tutorial.setContent(usabilityContent)
		this.tutorial.setMandatory(true)
        this.tutorial.setDisabledSteps(["welcome", "workflow"])

        this.tutorial.setDoneAction(() => {
            this.finishTask();
        });
    }

    _setupToastInterceptor() {
        this.statusObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        node.matches(".editor-toast.error")
                    ) {
                        const message = node.textContent.trim();

                        this.currentTaskLog.errors.push({
                            time: performance.now() - this.currentTaskLog.startTime,
                            type: this.getErrorType(message),
                            message
                        });
                    }
                }
            }
        });

        this.statusObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    _setupEditorInterceptor() {
       // Intercept and log query/template selections
        const originalLaunchWorkspace = this.editorApp.launchWorkspace.bind(this.editorApp);

        this.editorApp.launchWorkspace = async (options = {}, ...args) => {
            const { queryId, templateId } = options;

            if (queryId) {
                const query = this.editorApp.queries.get(queryId);

                this.currentTaskLog.querySelections.push({
                    time: performance.now() - this.currentTaskLog.startTime,
                    queryId,
                    queryLabel: query?.label
                });
            }

            if (templateId) {
                const template = this.editorApp.templates.get(templateId);

                this.currentTaskLog.templateSelections.push({
                    time: performance.now() - this.currentTaskLog.startTime,
                    templateId,
                    templateLabel: template?.label,
                    component: template?.component
                });
            }

            return originalLaunchWorkspace(options, ...args);
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

    async launchTutorial() {
        this.currentTaskLog = new TaskLog({task: "tutorial", startTime: performance.now()})

        this.testContainer.classList.remove("active");
        this.tutorial.start("documentation") // TEMP: remove parameter
    }

    async startTask({ taskConfig = null, taskDescription = null} ) {
        this.currentTaskLog = new TaskLog({task: taskConfig, startTime: performance.now()})
        this.currentTaskDescription = taskDescription

        this.testContainer.classList.remove("active");

        this.controls.hidden = false

        // Load scenario into the editor
        await this.editorApp.launchWorkspace({scenarioId: taskConfig.scenario_id})

        // Prepare editor for task
        this.editorApp.sparqlPanelController.setReadOnly(taskConfig.sparqlReadOnly)

        if (taskConfig.sparql === false)
            this.editorApp.sparqlPanelController.setText("")
        
        if (taskConfig.encoding === false) 
            this.editorApp.encodingPanelController.setValue({})

        if (taskConfig.visualization === false) 
            this.editorApp.visualizationView.clear()

        document.querySelector("#visualizationTypeSelect").selectedIndex = 0
        document.querySelector("#querySelect").selectedIndex = 0
    }

    async finishTask() {
        // Hide test control buttons
        this.controls.hidden = true;

        // Show jsPsych again
        this.testContainer.classList.add("active");

        this.currentTaskLog.logDuration(performance.now())

        // if this is a normal task then log final encoding and query
        if (this.currentTaskLog.task !== "tutorial") {
            this.currentTaskLog.finalEncoding = {...await this._getCurrentEncoding()}
            this.currentTaskLog.finalQuery = await this.editorApp.sparqlPanelController.getText()
        }

        if (this.waitingResolve) {
            this.waitingResolve(this.currentTaskLog);
            this.waitingResolve = null;
        }
    }

    async _getCurrentEncoding(){
        const finalEncoding = await this.editorApp.encodingPanelController.parseValue()
        return finalEncoding.value
    }

    showTaskDescription() {
        const overlay = document.createElement("div");
        overlay.className = "task-overlay";

        overlay.innerHTML = `
            <div class="jspsych-display-element">
                <div class="jspsych-content-wrapper">
                    <div class="task-dialog jspsych-content">
                        ${this.currentTaskDescription}

                        <div class="mt-4 text-center">
                            <button
                                id="closeTaskDescription"
                                class="btn btn-primary">
                                Back to task
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        overlay.querySelector("#closeTaskDescription")
            .onclick = () => overlay.remove();

        document.body.appendChild(overlay);
    }

    async saveTrialData() {
        this.state.currentStep++
        this.state.data.push(this.jsPsych.data.get().last(1).values()[0]) 

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    }

    async setTestState() {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (!saved) {
            this.state = {
                data: [],
                currentStep: 0,
                participantId: crypto.randomUUID()
            }
        }
        else 
            this.state = JSON.parse(saved)
    }

    async saveToServer() {
        console.log("final state = ", this.state)

        console.log('server url = ', `${import.meta.env.VITE_LOGS_SERVER_URL}`)
        const response = await fetch(`${import.meta.env.VITE_LOGS_SERVER_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.state)
        });

        sessionStorage.removeItem(STORAGE_KEY);

        console.log("response = ", response)
        if (!response.ok) {
            throw new Error("Failed to save log.");
        }

        

        // Load study complete page
        document.body.innerHTML = `
            <div id="study-complete">
                <div class="study-complete-card">
                    <i class="fa-solid fa-circle-check"></i>

                    <h1>Study Completed</h1>

                    <p>Thank you for participating in this usability study.</p>

                    <p>Your responses have been successfully recorded.</p>

                    <p class="study-complete-note">
                        You may now close this browser tab.
                    </p>
                </div>
            </div>
        `;
    }
}
