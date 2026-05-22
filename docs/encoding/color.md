# Color Channel

The `color` property sets constant color, field-based color, or supported metric-based color encoding.

```js
encoding: {
  color: {
    field: "language",
    value: "#cccccc",
    scale: { type: "ordinal", range: "Set3" },
    legend: { title: "Language", display: true }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Data key used for color mapping. Possible values: any field from the SPARQL query or results. <br>**Default:** none (if omitted, `value` is used). |
| `metric` | `string` | Transformed-data metric used for color mapping when supported by a mark. Graph nodes currently support `"degree"`. Metric color scales must use `quantitative` or `sequential` types. <br>**Default:** none. |
| `value` | `string` | Constant fallback color. Possible values: valid CSS color strings. <br>**Default:** (`"#cccccc"` for nodes, `"#999"` for links). |
| `scale` | `object` | Scale configuration for data-driven color. Possible values: see [`scale`](./scale.md) docs (`type`, `domain`, `range`, `binning`). <br>**Default:** auto-derived scale when possible. |
| `legend` | `object` | Legend display options for color channel. Possible values: see [`legend`](./legend.md) docs (`title`, `position`, `display`, `compact`). <br>**Default:** enabled with auto title. |

## Notes

- VENUS does not choose a data field for color automatically. Use `color.field` or a supported `color.metric` for data-driven color.
- When color is not data-driven, all marks of that type use the configured constant `color.value`.
- Source-target graph nodes can use `nodes.source.color` and `nodes.target.color` for role-specific color rules.
