import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export class Tutorial {

    constructor({ui}) {
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
        this.ui = ui
    }

    start(definition, startAt = 0) {
        const steps = definition.map((step, i) => this._buildStep(step, i));

        this.driver.setConfig({
            allowClose: !this.mandatory
        });

        this.driver.setSteps(steps);

        const index = typeof startAt === "string"
            ? definition.findIndex(step => step.id === startAt)
            : startAt;

        this.driver.drive(index);
    }

    setContent(content) {
        this.content = content
    }

    setMandatory(mandatory = true) {
        this.mandatory = mandatory
    }

    _buildStep(step, index) {
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
                ...(step.popover || {})
            }
        };
    }
}