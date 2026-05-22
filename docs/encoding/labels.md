# Labels

The `labels` property controls whether text labels are drawn for marks that support them.
VENUS currently supports visible `labels` on graph nodes.

```js
encoding: {
  nodes: {
    labels: {
      display: true
    }
  }
}
```

For graph nodes, `labels.display` only shows or hides visible label text.
Use the singular [`label`](./label.md) property to set constant label text or
choose the data field used for label text.

## Properties

| Property | Type | Description |
|---|---|---|
| `labels.display` | `boolean` | Shows or hides supported mark labels. Possible values: `true`, `false`. <br>**Default for graph nodes:** `true`. |

## Examples

Show node labels:

```js
encoding: {
  nodes: {
    labels: { display: true }
  }
}
```

Hide node labels when the graph is dense:

```js
encoding: {
  nodes: {
    labels: { display: false }
  }
}
```
