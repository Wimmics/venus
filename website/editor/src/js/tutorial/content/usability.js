import defaultContent from "./default.js";

export default {

    ...defaultContent,

    welcome: {
        title: "Welcome",
        description:
            "Before starting the study, this short tutorial introduces the editor that you will use throughout the experiment."
    },

    query: {
        ...defaultContent.query,
        description:
            "Some tasks require modifying the SPARQL query, while others provide it already completed."
    },

    encoding: {
        ...defaultContent.encoding,
        description:
            "Most tasks involve modifying the visualization encoding. No prior knowledge of the JSON syntax is required."
    },

    run: {
        ...defaultContent.run,
        description:
            "After modifying the query or the encoding, click Run to update the visualization."
    },

    finish: {
        title: "Ready to Begin",
        description:
            "The tutorial is complete. You will now start the usability tasks. If needed, you can reopen this tutorial later from the editor."
    }

};