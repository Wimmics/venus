# Groups

The `groups` property defines which field splits bars into multiple side-by-side groups.

Use it when you want grouped bars (`stack: false`).

```js
encoding: {
  groups: { field: "language" },
  stack: false
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `groups.field` | `string` | Field used to split each x-category into grouped sub-categories when `stack: false`. Possible values: any categorical field present in your data rows. <br>**Default:** not set (simple non-grouped bars). |
