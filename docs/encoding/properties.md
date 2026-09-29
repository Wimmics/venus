# Component-specific Properties

The encoding supports component-level properties that control the overall appearance and behavior of a visualization. The following properties are supported:

| Property Name | Type | Description |
|---|---|---|
| `title` | `string` | Title displayed above the visualization. Possible values: any non-empty string. <br>**Default:** none (no title is displayed). |
| `background` | `string` | Background color of the visualization. Possible values: any valid CSS color (for example `"#ffffff"`, `"white"`, `rgb(...)`). Default: `"#ffffff"`. |
| `interactions` | - | Configures user interactions, such as tooltips, selection, and zoom. See [Interactions](../encoding/interactions.md) |