# Annotations 

Annotations add additional information or behavior to a mark without changing how the underlying data is visually encoded. They can provide information directly on the visualization or when the user interacts with a mark. Examples include labels, tooltips, and other display options.

The following annotations are supported across marks:

| Annotation | Description | 
|---|---|---|:---:|
| `labels` | The `labels` property configures label text for a mark. It can also control whether visible label text is drawn on marks that support it. |
| `tooltip` | Mark-specific property. Defines tooltip format through `tooltip.title` and `tooltip.fields` |

## Labels

Labels can be customized via the following properties:

| Property | Type | Description |
|---|---|---|
| `labels.display` | `boolean` | Shows or hides supported visible mark labels. Possible values: `true`, `false`. <br>**Default:** `true` for graph nodes, `false` for bars, lines, and points. |
| `labels.value` | `string` | Constant label text for the mark. <br>**Default:** not set. |
| `labels.field` | `string` | Data field used as label text for each mark. <br>**Default:** the mark field value when text is needed. |

**Rules**

When no explicit text is provided:
- graph marks fall back to the mark field value when available
- bars fall back to the `x.field` value
- lines fall back to the series key
- points fall back to the `y.field` value

**Example**

```json
{
  	"nodes": {
    	"labels": {
      		"display": true,
      		"field": "labelField"
    	}
  	}
}
```

## Tooltips

Tooltips provide additional information about a mark when it is hovered over. They allow users to inspect the underlying data without permanently displaying labels, helping to reduce visual clutter while preserving access to detailed information.

The following properties are available to customize tooltips:

| Property | Type | Description |
|---|---|---|
| `tooltip.title` | `string` / `object` | Optional tooltip title as a constant string or `{ field }`. |
| `tooltip.fields` | `string[]` | Optional tooltip field whitelist for hovered nodes. If omitted, fields are selected automatically. <br>Global tooltip toggle is controlled by [`interactions.tooltip`](../interactions.md). |