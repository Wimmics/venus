# Data Fields

The `field` property allows to select which data key drives a visual channel.

```js
encoding: {
  nodes: {
    color: { field: "speciesLabel" },
    size: { field: "articleCount" }
  },
  links: {
    color: { field: "type" }
  }
}

encoding: {
  x: { field: "country" },
  y: { field: "languageCount" },
  color: { field: "language" }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Field name used by the channel. Possible values: any existing data key. <br>**Default:** none (required for data-driven channels). |
| `nodes.field` | `string` /<br> `string[]` | Node identity/source field(s). Possible values: one field or multiple fields. <br>**Default:** none (must be provided in graph encoding). |
| `links.field` | `string` /<br> `{ source: string, target: string }` | Link construction mode. Possible values: co-occurrence field (`string`) or explicit source-target object. <br>**Default:** none (must be provided in graph encoding). |

## Practical Tips

- Prefer stable, non-null fields for color categories.
- For quantitative channels (size), ensure field values are numeric.
- When values are sparse, set fallback `value` on the channel.
