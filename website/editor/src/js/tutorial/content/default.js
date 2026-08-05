export default {

    welcome: {
        title: "Welcome to VENUS Editor",
        description:
            "This short tutorial introduces the main features of the VENUS editor. It will help you become familiar with the interface before you start creating visualizations."
    },
    workflow: {
        title: "",
        description: `
            <img src="images/venus-workflow.svg"
                alt="VENUS workflow"
                style="width:100%; margin:12px 0;">
        `,
        popoverClass: "driver-popover-xl"
    },

    // Starting point
    "template-selection": {
        title: "Visualization Templates",
        description:
            "Use this menu to start from a visualization template. Selecting a template loads a predefined encoding that you can modify to suit your needs."
    },

    "query-selection": {
        title: "Query Examples",
        description:
            "This menu provides example SPARQL queries over DBpedia. They are useful for exploring the editor or quickly testing different visualization types."
    },

    "example-selection": {
        title: "Complete Examples",
        description:
            "Complete examples include a SPARQL query, a visualization encoding, and the resulting visualization. They are a convenient way to explore how VENUS works."
    },

    // SPARQL query
    query: {
        title: "SPARQL Query",
        description:
            "This panel contains the SPARQL query used to retrieve the data displayed in the visualization. Write a new SPARQL query or modify the existing one. The query determines which data will be retrieved for visualization."
    },

    "query-endpoint": {
        title: "SPARQL Endpoint",
        description:
            "Specify the SPARQL endpoint against which the query will be executed. The editor requires endpoints that support CORS. Endpoints without CORS can still be used through a proxy in your own application."
    },

    "query-toolbar": {
        title: "Query Tools",
        description:
            "Use these tools to copy or download the query, or restore the original query when working from an example."
    },

    "query-results": {
        title: "SPARQL Results",
        description:
            "This panel displays the query results returned by the endpoint. It allows you to inspect the data that are currently being visualized.",
    },

    "results-as-source": {
        title: "Use Results as Source",
        description:
            "Instead of executing a SPARQL query, you can provide your own SPARQL JSON results. Enable this option to use the contents of this panel directly as the visualization input."
    },

    "results-toolbar": {
        title: "Results Tools",
        description:
            "Copy the current SPARQL results to the clipboard or download them as a JSON file."
    },

    // Encoding
    encoding: {
        title: "Visualization Encoding",
        description:
            "This panel contains the JSON encoding that defines how the retrieved data are transformed into a visualization."
    },

    "encoding-toolbar": {
        title: "Encoding Tools",
        description:
            "Copy or download the encoding, restore the original encoding from an example, or insert predefined encoding snippets to help you build your visualization ('+' button)."
    },

    "encoding-builder": {
        title: "Encoding Builder",
        description:
            "The builder provides reusable encoding snippets. Select a component to insert it at the current cursor position and progressively construct the visualization encoding."
    },

    run: {
        title: "Run",
        description:
            "Click Run to execute the SPARQL query and update the visualization using the current encoding."
    },

    // Visualization
    visualization: {
        title: "Visualization",
        description:
            "The generated visualization is displayed here. Each time you run the editor, this view is updated to reflect your current query and encoding."
    },

    "visualization-toolbar": {
        title: "Visualization Tools",
        description:
            "Export the current visualization as a PNG, JPG, SVG, or PDF file."
    },

    // Integration
    integration: {
        title: "Integration Code",
        description:
            "This panel provides the HTML and JavaScript code required to embed the current visualization into your own web page or application."
    },

    "integration-toolbar": {
        title: "Integration Tools",
        description:
            "Copy the generated integration code to the clipboard or download it as an HTML file."
    },

    documentation: {
        title: "Documentation",
        description:
            "Looking for more details? The documentation provides comprehensive explanations of the supported visualizations, encoding syntax, and additional examples."
    },

    finish: {
        title: "You're Ready!",
        description:
            "You are now ready to start using the VENUS Editor. If you need a reminder of the interface or workflow, you can restart this guided tour at any time from the Guided Tour link."
    }

};