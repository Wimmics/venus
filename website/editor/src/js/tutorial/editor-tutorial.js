export default [

    {
        id: "welcome"
    },
    {
        id: "workflow"
    },

    // Starting points
    {
        id: "template-selection",
        element: "#visualizationTemplates"
    },
    {
        id: "query-selection",
        element: "#queryExamples"
    },
    {
        id: "example-selection",
        element: "#visualizationExamples"
    },

    // Query panel
    {
        id: "query",
        element: "#queryPanel"
    },
    {
        id: "query-endpoint",
        element: "#queryEndpoint"
    },
    {
        id: "query-content",
        element: "#queryContent"
    },
    {
        id: "query-toolbar",
        element: "#sparqlToolbar",
        beforeNext: showSPARQLResults,
    },

    // Query results
    {
        id: "query-results",
        element: "#sparqlResults",
        beforePrevious: showSPARQLQuery
    },
    {
        id: "results-as-source",
        element: "#useAsSourceToggle"
    },
    {
        id: "results-toolbar",
        element: "#resultsToolbar",
        beforeNext: showSPARQLQuery
    },

    // Encoding panel
    {
        id: "encoding",
        element: "#encodingPanel",
        beforePrevious: showSPARQLResults
    },
    {
        id: "encoding-toolbar",
        element: "#encodingToolbar",
        beforeNext: openEncodingBuilder
    },
    {
        id: "encoding-builder",
        element: "#encoding-builder-body",
        beforeNext: closeEncodingBuilder,
        beforePrevious: closeEncodingBuilder
    },
    {
        id: "run",
        element: "#encodingRunButton",
        beforePrevious: openEncodingBuilder
    },

    // Visualization panel
    {
        id: "visualization",
        element: "#visualizationHost"
    },
    {
        id: "visualization-toolbar",
        element: "#visualizationToolbar",
        beforeNext: showCodeIntegrationPanel,
    },

    // Code integration panel
    {
        id: "integration",
        element: "#generatedCode",
        beforePrevious: showVisualizationPanel
    },
    {
        id: "integration-toolbar",
        element: "#snippetToolbar",
        beforeNext: showVisualizationPanel
    },
    {
        id: "documentation",
        element: "#docs",
        beforePrevious: showCodeIntegrationPanel
    },

    {
        id: "finish",
        element: "#guided-tour"
    }

];

async function closeEncodingBuilder(editor) {
    editor.encodingPanelController.closeAddMenu()

    document
        .querySelector("#encodingToolbar")
        .classList.remove("tutorial-active");
}

async function openEncodingBuilder(editor) {
    await editor.encodingPanelController.openAddMenu()

    document
        .querySelector("#encodingToolbar")
        .classList.add("tutorial-active");
}

function showSPARQLResults() {
    document.querySelector("#results-tab").click()
}

function showSPARQLQuery() {
    document.querySelector("#sparql-tab").click()
}

function showCodeIntegrationPanel() {
    document.querySelector("#integration-tab").click()
}

function showVisualizationPanel() {
    document.querySelector("#visualization-tab").click()
}