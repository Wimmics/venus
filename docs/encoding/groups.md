# Groups

Grouping is used in different ways depending on the chart type.

For bar charts, `bars.groups.field` defines which field splits bars into multiple side-by-side (or stacked) series.

```js
encoding: {
  bars: {
    groups: { field: "language" },
    stack: false
  }
}
```

For line charts, grouping is configured inside the `lines` mark:

```js
encoding: {
  lines: {
    group: { field: "countryLabel" },
    color: { field: "continentLabel" }
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `bars.groups.field` | `string` | Field used to split each x-category into grouped sub-categories when `bars.stack: false`. Possible values: any categorical field present in your data rows. <br>**Default:** not set (simple non-grouped bars). |
| `lines.group.field` | `string` | Field used to build one line per distinct value in `<venus-linechart>`. This is independent from `lines.color.field`, so you can group by one field (for example country) and color by another (for example continent). <br>**Default:** not set. Backward compatibility fallback: if missing, line grouping follows `lines.color.field` when present. |
