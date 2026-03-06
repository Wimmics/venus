# Stack

The `bars.stack` property controls stacked behavior in bar charts.

```js
encoding: {
  bars: {
    stack: false
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `bars.stack` | `string`/`boolean` | Stack mode for bars. Possible values: `false` (no stacking), `true` (stacked), `"normalize"` (100% stacked proportions). <br>**Default:** `false`. When stacking is enabled and `bars.groups.field` is not set, VENUS uses color categories when available; otherwise it stacks a single series. |
