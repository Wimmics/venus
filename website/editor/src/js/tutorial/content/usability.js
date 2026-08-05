import defaultContent from "./default.js";

export default {

    ...defaultContent,

    workflow: {
        ...defaultContent.workflow,
        description:
            defaultContent.workflow.description +
            `
            <div style="
                margin-top:16px;
                padding:12px 16px;
                border-left:4px solid #0d6efd;
                background:#eef5ff;
                border-radius:4px;
            ">
                <strong>During the study</strong><br>
                Use the editor as you naturally would. Feel free to use <strong>visualization templates</strong>, <strong>query examples</strong>, and the <strong>encoding builder</strong> whenever they are helpful. These features are provided to support visualization creation, so you are not expected to memorize the encoding syntax or build every visualization entirely from scratch.
            </div>
            `,
    },

    "template-selection": {
        title: "Visualization Templates",
        description:
            "Visualization templates provide a starting point for creating a visualization. During the study, you may use them whenever a task asks you to create or modify a visualization."
    },
    "query-selection": {
        title: "Query Examples",
        description:
            "This menu provides example SPARQL queries over DBpedia. You may use them as a starting point whenever a task requires creating a SPARQL query and a visualization from scratch."
    },
    "example-selection": {
        title: "Complete Examples",
        description: "Complete examples illustrate how VENUS can be used. They will be disabled during the experiment."
    },


    query: {
        ...defaultContent.query,
        description:
            "Some tasks require modifying the SPARQL query, while others provide it already completed."
    },

    encoding: {
        title: "Visualization Encoding",
        description:
            "Most study tasks involve modifying the visualization encoding. No prior knowledge of the encoding syntax is required; the editor provides templates and snippets to help you build it."
    },
    "encoding-toolbar": {
        title: "Encoding Tools",
        description:
            "This toolbar lets you copy or download the current encoding, restore the original encoding when working from an example, and open the <strong>Encoding Builder</strong> using the <strong>'+'</strong> button. The Encoding Builder provides reusable snippets to help create or modify an encoding and may be used freely throughout the study."
    },

    "encoding-builder": {
        title: "Encoding Builder",
        description:
            "Select a snippet from the menu and insert it at the current cursor position using the <strong>+</strong> button next to it, then customize it as needed. You may use the builder freely throughout the study to support encoding creation."
    },


    run: {
        title: "Run",
        description:
            "After making changes to the query or the encoding, click Run to update the visualization and verify the result."
    },

    documentation: {
        title: "Documentation",
        description:
            "Additional documentation is available if you wish to consult it during the study. It provides more detailed explanations of the editor and the visualization encoding than those covered in the onboarding."
    },

    finish: {
        title: "Ready to Begin",
        description: "The tutorial is complete. You will now begin the usability tasks."
    }

};