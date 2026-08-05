import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export class Tutorial {

    constructor({ui, workflow}) {
        this.driver = driver({
            animate: true,
            smoothScroll: true,
            showProgress: true,
            allowClose: true,
            nextBtnText: "Next",
            prevBtnText: "Previous",
            doneBtnText: "Finish"
        });

        this.mandatory = false
        this.disabledSteps = []

        this.ui = ui
        this.workflow = workflow
    }

    start(startAt = 0) {
        const validSteps = this.workflow.filter(step => !this.disabledSteps.includes(step.id))

        const steps = validSteps.map((step, i) => this._buildStep(step, i, i === validSteps.length - 1));

        this.driver.setConfig({
            allowClose: !this.mandatory
        });

        this.driver.setSteps(steps);

        const index = typeof startAt === "string"
            ? this.workflow.findIndex(step => step.id === startAt)
            : startAt;

        this.driver.drive(index);
    }

    setContent(content) {
        this.content = content
    }

    setMandatory(mandatory = true) {
        this.mandatory = mandatory
    }

    setDisabledSteps(steps) {
        this.disabledSteps = steps
    }

    setDoneAction(callback) {
        this.doneAction = callback;
    }

    _buildStep(step, index, isLast) {
        return {
            ...step,

            onDeselected: async (element, stepObj, context) => {
                const movingForward =
                    context.state.activeIndex > index;

                if (movingForward) {
                    await step.beforeNext?.(this.ui);
                } else {
                    await step.beforePrevious?.(this.ui);
                }
            },

            popover: {
                ...this.content[step.id],
                ...(step.popover || {}),

                ...(isLast && this.doneAction && {
                    onNextClick: () => {
                        this.driver.destroy();
                        this.doneAction();
                    }
                })
            }
        };
    }
}