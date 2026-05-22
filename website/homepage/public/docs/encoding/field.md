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
| `nodes.field` | `string` /<br> `string[]` | Node identity field or peer fields for co-occurrence graphs. <br>**Default:** none. |
| `nodes.source.field` | `string` | Source node identity field for directional and semantic graph links. |
| `nodes.target.field` | `string` | Target node identity field for directional and semantic graph links. |
| `links.context.field` | `string` | Shared context field used to construct co-occurrence links. |
| `links.relation.field` | `string` | Relation field used by semantic source-target links. |

## Practical Tips

- Prefer stable, non-null fields for color categories.
- For quantitative channels (size), ensure field values are numeric.
- When values are sparse, set fallback `value` on the channel.
