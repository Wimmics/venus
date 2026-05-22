# Labels

The `labels` property configures label text for a mark. It can also control
whether visible label text is drawn on marks that support it. VENUS currently
draws visible labels on graph nodes.

```js
encoding: {
  nodes: {
    labels: {
      display: true,
      field: "personName"
    }
  }
}
```

Use `labels.value` for constant text or `labels.field` to choose the data field
used as label text. If neither is provided, VENUS uses the mark field value when
label text is needed.
Directional and semantic graphs may override visibility with
`nodes.source.labels` or `nodes.target.labels`.

## Properties

| Property | Type | Description |
|---|---|---|
| `labels.display` | `boolean` | Shows or hides supported visible mark labels. Possible values: `true`, `false`. <br>**Default for graph nodes:** `true`. |
| `labels.value` | `string` | Constant label text for the mark. <br>**Default:** not set. |
| `labels.field` | `string` | Data field used as label text for each mark. <br>**Default:** the mark field value when text is needed. |

## Examples

Show node labels:

```js
encoding: {
  nodes: {
    labels: { display: true }
  }
}
```

Choose graph node label text from a field:

```js
encoding: {
  nodes: {
    labels: {
      display: true,
      field: "personName"
    }
  }
}
```

Use constant link label text:

```js
encoding: {
  links: {
    labels: { value: "works with" }
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

Show labels only for target nodes:

```js
encoding: {
  nodes: {
    labels: { display: false },
    target: {
      labels: { display: true }
    }
  }
}
```
