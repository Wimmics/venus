# Legends

The `legend` property controls if and how legends are displayed for color and size channels.

```js
encoding: {
  nodes: {
    color: {
      field: "speciesLabel",
      legend: { title: "Species", position: "left", display: true }
    }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `title` | `string` | A title for the legend. <br>**Possible values:** any string. <br>**Default:** channel field name. |
| `position` | `string` | Legend placement regarding the visualization component container. <br>**Possible values:** `left`, `right`, `top`, `bottom`, and corner variants (`top-left`, `bottom-right`, etc.). <br>**Default:** `"bottom"`. |
| `display` | `boolean` | Legend visibility. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
| `compact` | `boolean` | Compact/collapsible mode. <br>**Possible values:** `true`, `false`. <br>**Default:** `true`. |
