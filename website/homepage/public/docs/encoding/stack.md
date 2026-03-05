# Stack

The `stack` property controls stacked behavior in cartesian charts.

```js
encoding: {
  stack: false
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `stack` | `string`/`boolean` | Stack mode for charts. Possible values: `false` (no stacking), `true` (stacked), `"normalize"` (100% stacked proportions). <br>**Default:** `false`. When stacking is enabled and `groups.field` is not set, VENUS uses color categories when available; otherwise it stacks a single series. |
